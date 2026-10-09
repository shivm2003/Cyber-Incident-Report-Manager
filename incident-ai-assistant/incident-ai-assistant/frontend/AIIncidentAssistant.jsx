import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./AIIncidentAssistant.css";

const DEFAULT_API_BASE = "http://127.0.0.1:8010";

function formatDate(value) {
  if (!value) return "";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.message || `Request failed (${response.status})`);
  return data;
}

export default function AIIncidentAssistant({ apiBase = DEFAULT_API_BASE }) {
  const base = apiBase.replace(/\/$/, "");
  const [tab, setTab] = useState("chat");
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [reportCommand, setReportCommand] = useState("Generate an incident intelligence report covering the key incidents, supported severity, impact, and recommended next steps. Cite the source records and identify missing evidence.");
  const [reportTitle, setReportTitle] = useState("Incident Intelligence Report");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  const refreshHealth = useCallback(async () => {
    try {
      const res = await fetch(`${base}/api/health`);
      const data = await readResponse(res);
      setHealth(data);
      setHealthError("");
    } catch (error) {
      setHealthError(error.message || "API unavailable");
    }
  }, [base]);

  const refreshReports = useCallback(async () => {
    try {
      const data = await readResponse(await fetch(`${base}/api/reports`));
      setHistory(data.reports || []);
    } catch { /* Keep the section usable even if history retrieval fails. */ }
  }, [base]);

  useEffect(() => {
    refreshHealth();
    refreshReports();
  }, [refreshHealth, refreshReports]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chatLoading]);

  const sourceCount = health?.knowledge?.sources?.length || 0;
  const chunkCount = health?.knowledge?.chunk_count || 0;
  const modelReady = Boolean(health?.ollama_reachable && health?.chat_model_installed && health?.embedding_model_installed);

  const uploadFiles = async () => {
    if (!selectedFiles.length) {
      fileInputRef.current?.click();
      return;
    }
    setIngesting(true);
    setUploadMessage(null);
    try {
      const form = new FormData();
      selectedFiles.forEach(file => form.append("files", file));
      const data = await readResponse(await fetch(`${base}/api/knowledge/ingest`, { method: "POST", body: form }));
      const indexed = (data.results || []).reduce((sum, item) => sum + item.chunks_indexed, 0);
      const failures = (data.errors || []).length;
      setUploadMessage({ kind: failures ? "warning" : "success", text: `${indexed} chunks indexed from ${(data.results || []).length} file(s).${failures ? ` ${failures} file(s) could not be indexed.` : ""}`, errors: data.errors || [] });
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshHealth();
    } catch (error) {
      setUploadMessage({ kind: "error", text: error.message || "Could not index files." });
    } finally {
      setIngesting(false);
    }
  };

  const sendChat = async (event) => {
    event?.preventDefault();
    const prompt = question.trim();
    if (!prompt || chatLoading) return;
    setChatError("");
    setQuestion("");
    const userMessage = { id: crypto.randomUUID?.() || String(Date.now()), role: "user", content: prompt };
    const historyForRequest = messages.filter(m => ["user", "assistant"].includes(m.role)).slice(-8).map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMessage]);
    setChatLoading(true);
    try {
      const data = await readResponse(await fetch(`${base}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, history: historyForRequest }),
      }));
      setMessages(prev => [...prev, { id: crypto.randomUUID?.() || `${Date.now()}-answer`, role: "assistant", content: data.answer, sources: data.sources || [] }]);
    } catch (error) {
      setChatError(error.message || "Unable to get an answer.");
    } finally {
      setChatLoading(false);
    }
  };

  const generateReport = async (event) => {
    event?.preventDefault();
    if (reportCommand.trim().length < 5 || reportLoading) return;
    setReportLoading(true);
    setReportError("");
    setReport(null);
    try {
      const data = await readResponse(await fetch(`${base}/api/reports/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: reportCommand.trim(), title: reportTitle.trim() || "Incident Intelligence Report" }),
      }));
      setReport(data);
      await refreshReports();
    } catch (error) {
      setReportError(error.message || "Report generation failed.");
    } finally {
      setReportLoading(false);
    }
  };

  const downloadUrl = useCallback((reportId, format) => `${base}/api/reports/${reportId}/download?format=${format}`, [base]);
  const sourceList = useMemo(() => health?.knowledge?.sources || [], [health]);

  return (
    <main className="ia-shell">
      <header className="ia-header">
        <div className="ia-brand-mark" aria-hidden="true"><span>IA</span></div>
        <div className="ia-heading">
          <div className="ia-eyebrow">LOCAL AI WORKSPACE</div>
          <h1>Incident Intelligence</h1>
          <p>Ask Gemma about your crawled data. Generate traceable reports from your evidence.</p>
        </div>
        <button className="ia-icon-button" onClick={refreshHealth} title="Refresh system status" aria-label="Refresh system status">↻</button>
      </header>

      <section className="ia-status-row" aria-label="System status">
        <div className={`ia-status-pill ${modelReady ? "is-good" : "is-warn"}`}><span className="ia-status-dot" />{modelReady ? "Local AI ready" : "Setup check needed"}</div>
        <div className="ia-stat"><strong>{sourceCount}</strong><span>sources</span></div>
        <div className="ia-stat"><strong>{chunkCount.toLocaleString()}</strong><span>indexed chunks</span></div>
        <div className="ia-model-caption">Gemma: <b>{health?.chat_model || "checking…"}</b></div>
      </section>

      {(healthError || (health && !modelReady)) && <section className="ia-notice ia-notice-warning">
        <strong>{healthError ? "API connection unavailable" : "Local model setup required"}</strong>
        <p>{healthError || `Ollama reachable: ${health.ollama_reachable ? "yes" : "no"}. Chat model installed: ${health.chat_model_installed ? "yes" : "no"}. Embedding model installed: ${health.embedding_model_installed ? "yes" : "no"}. Check the setup guide for the pull commands.`}</p>
      </section>}

      <div className="ia-layout">
        <aside className="ia-sidebar">
          <div className="ia-side-label">WORKSPACE</div>
          <button className={`ia-nav-item ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}><span className="ia-nav-icon">◌</span><span><b>RAG Chat</b><small>Ask about incidents</small></span></button>
          <button className={`ia-nav-item ${tab === "report" ? "active" : ""}`} onClick={() => setTab("report")}><span className="ia-nav-icon">▤</span><span><b>Report Studio</b><small>Generate attachments</small></span></button>
          <div className="ia-side-divider" />
          <div className="ia-source-heading"><div className="ia-side-label">KNOWLEDGE BASE</div><span>{sourceCount}</span></div>
          <p className="ia-helper">Upload exports from your incident crawler or reference files. They are indexed locally for retrieval.</p>
          <input ref={fileInputRef} className="ia-hidden-file" type="file" multiple accept=".txt,.md,.log,.json,.jsonl,.csv,.html,.htm,.pdf,.docx" onChange={e => setSelectedFiles(Array.from(e.target.files || []))} />
          <button className="ia-upload-button" onClick={() => fileInputRef.current?.click()}><span>＋</span> Add source files</button>
          {selectedFiles.length > 0 && <div className="ia-selected-files">
            {selectedFiles.map(file => <div key={`${file.name}-${file.size}`} className="ia-selected-file"><span>▧</span><span title={file.name}>{file.name}</span><small>{Math.max(1, Math.round(file.size / 1024))} KB</small></div>)}
            <button className="ia-primary ia-full" onClick={uploadFiles} disabled={ingesting}>{ingesting ? "Indexing documents…" : "Index selected files"}</button>
          </div>}
          {uploadMessage && <div className={`ia-upload-result ${uploadMessage.kind}`}>
            <p>{uploadMessage.text}</p>
            {uploadMessage.errors?.map(err => <small key={`${err.filename}-${err.error}`}>{err.filename}: {err.error}</small>)}
          </div>}
          <div className="ia-side-divider" />
          <div className="ia-side-label">INDEXED SOURCES</div>
          {sourceList.length === 0 ? <p className="ia-helper ia-muted">No files indexed yet.</p> : <div className="ia-source-list">{sourceList.slice(0, 8).map(source => <div key={source.source_name} className="ia-source-item"><span className="ia-file-icon">▤</span><div><b title={source.source_name}>{source.source_name}</b><small>{source.chunks} chunks</small></div></div>)}</div>}
        </aside>

        <section className="ia-workspace">
          {tab === "chat" ? <>
            <div className="ia-panel-head"><div><div className="ia-eyebrow">EVIDENCE-GROUNDED ASSISTANT</div><h2>Ask your incident data</h2><p>Answers use retrieved records and show which sources were used.</p></div><span className="ia-rag-tag">RAG ENABLED</span></div>
            <div className="ia-chat-area">
              {messages.length === 0 && <div className="ia-empty-state"><div className="ia-empty-art">⌕</div><h3>What would you like to investigate?</h3><p>Try one of these commands to get started.</p><div className="ia-suggestions">
                {["Summarize the incidents by severity and status.", "Which incidents mention authentication or access-control issues?", "List the evidence and data gaps for the highest-risk incidents."].map(suggestion => <button key={suggestion} onClick={() => setQuestion(suggestion)}>{suggestion}<span>↗</span></button>)}
              </div></div>}
              {messages.map(message => <article key={message.id} className={`ia-message ${message.role}`}>
                <div className="ia-avatar">{message.role === "user" ? "YOU" : "AI"}</div>
                <div className="ia-message-body"><div className="ia-message-role">{message.role === "user" ? "You" : "Gemma · evidence-grounded answer"}</div><div className="ia-message-content">{message.content}</div>
                  {message.sources?.length > 0 && <div className="ia-citations"><strong>Retrieved evidence</strong>{message.sources.map(source => <div key={`${message.id}-${source.source_id}`} className="ia-citation"><span>{source.source_id}</span><div><b>{source.filename}</b><small>Chunk {source.chunk} · score {source.score}</small><p>{source.excerpt}</p></div></div>)}</div>}
                </div>
              </article>)}
              {chatLoading && <div className="ia-loading-line"><span className="ia-spinner" /> Retrieving evidence and asking Gemma…</div>}
              <div ref={bottomRef} />
            </div>
            {chatError && <div className="ia-error">{chatError}</div>}
            <form className="ia-composer" onSubmit={sendChat}><textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question about your indexed incidents…" rows={2} maxLength={6000} /><div className="ia-composer-footer"><span>Enter to submit via button · Answers are grounded in indexed records</span><button className="ia-primary" type="submit" disabled={chatLoading || question.trim().length < 2}>{chatLoading ? "Working…" : "Send question  ↗"}</button></div></form>
          </> : <>
            <div className="ia-panel-head"><div><div className="ia-eyebrow">COMMAND-DRIVEN GENERATION</div><h2>Report Studio</h2><p>Describe the report you need. The report and its attachments will be based on retrieved records.</p></div><span className="ia-report-tag">DOCX · PDF · MD</span></div>
            <form className="ia-report-form" onSubmit={generateReport}>
              <label htmlFor="ia-report-title">Report title</label><input id="ia-report-title" value={reportTitle} onChange={e => setReportTitle(e.target.value)} maxLength={160} placeholder="e.g. Weekly Incident Risk Report" />
              <label htmlFor="ia-report-command">Your command</label><textarea id="ia-report-command" value={reportCommand} onChange={e => setReportCommand(e.target.value)} rows={6} maxLength={8000} placeholder="Tell Gemma what report to create, which incidents to focus on, and what details to include…" />
              <div className="ia-report-hint"><span>✦</span> Gemma will use the closest matching evidence, cite sources, and call out missing information.</div>
              {reportError && <div className="ia-error">{reportError}</div>}
              <button className="ia-primary ia-generate-button" type="submit" disabled={reportLoading || reportCommand.trim().length < 5}>{reportLoading ? <><span className="ia-spinner ia-spinner-light" /> Generating from your data…</> : <>Generate report <span>↗</span></>}</button>
            </form>
            {report && <section className="ia-report-result"><div className="ia-report-result-head"><div><span className="ia-success-dot" /> <b>Report generated</b><small>{report.sources?.length || 0} evidence chunks retrieved</small></div><div className="ia-downloads"><a href={downloadUrl(report.id, "docx")} target="_blank" rel="noreferrer">↓ DOCX</a><a href={downloadUrl(report.id, "pdf")} target="_blank" rel="noreferrer">↓ PDF</a><a href={downloadUrl(report.id, "md")} target="_blank" rel="noreferrer">↓ Markdown</a></div></div><pre className="ia-report-preview">{report.markdown}</pre></section>}
            {history.length > 0 && <section className="ia-history"><h3>Recent reports</h3>{history.map(item => <button key={item.id} className="ia-history-row" onClick={async () => { try { const data = await readResponse(await fetch(`${base}/api/reports/${item.id}`)); setReport({ ...data, downloads: { docx: `/api/reports/${item.id}/download?format=docx` } }); } catch (e) { setReportError(e.message); } }}><span className="ia-history-icon">▤</span><span><b>{item.title}</b><small>{formatDate(item.created_at)} · {item.command}</small></span><span>↗</span></button>)}</section>}
          </>}
        </section>
      </div>
      <footer className="ia-footer"><span>Private by default · Local Ollama inference</span><span>Always validate security findings before external distribution</span></footer>
    </main>
  );
}
