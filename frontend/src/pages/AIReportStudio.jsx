import React, { useCallback, useEffect, useState } from 'react';
import { Bot, FileText, Download, RefreshCw, Send, Search, CheckSquare, Square, ExternalLink, Sparkles } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';
const asDate = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const safeHttpUrl = (value) => {
  try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined; }
  catch { return undefined; }
};

export default function AIReportStudio() {
  const [range, setRange] = useState({
    from_date: asDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    to_date: asDate(new Date()),
  });
  const [candidates, setCandidates] = useState({ incidents: [], cves: [] });
  const [selectedIncidents, setSelectedIncidents] = useState([]);
  const [selectedCves, setSelectedCves] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [title, setTitle] = useState('Financial Sector Incident Brief');
  const [command, setCommand] = useState('Prepare an executive incident brief. For each incident, assess the reported impact and confidence based only on the records. Compare incidents, identify practical recommendations, and list sources. Clearly flag allegations and unverified reports.');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [reports, setReports] = useState([]);
  const [question, setQuestion] = useState(localStorage.getItem('aiReportStudioDraft') || '');
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/ai-reports/candidates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...range, limit: 100 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not load local records.');
      setCandidates({ incidents: data.incidents || [], cves: data.cves || [] });
      setSelectedIncidents([]);
      setSelectedCves([]);
    } catch (err) { setError(err.message); }
    finally { setLoadingCandidates(false); }
  }, [range]);

  const loadReports = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/ai-reports`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
        if (data.length) {
          const latest = await fetch(`${API_BASE}/ai-reports/${data[0].id}`);
          if (latest.ok) setGenerated(await latest.json());
        }
      }
    } catch (err) { console.error('Could not load AI report history:', err); }
  }, []);

  const openSavedReport = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/ai-reports/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not reopen this report.');
      setGenerated(data);
    } catch (err) { setError(err.message); }
  };

  const openConversation = useCallback(async (conversationId) => {
    setLoadingConversation(true);
    try {
      const response = await fetch(`${API_BASE}/ai-chat/conversations/${conversationId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not reopen this chat.');
      setActiveConversationId(data.id);
      localStorage.setItem('aiReportStudioConversationId', String(data.id));
      setMessages(data.messages || []);
    } catch (err) { setError(err.message); }
    finally { setLoadingConversation(false); }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/ai-chat/conversations`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not load saved chats.');
      setConversations(data);
      const savedId = Number(localStorage.getItem('aiReportStudioConversationId'));
      const resume = data.find((item) => item.id === savedId) || data[0];
      if (resume) await openConversation(resume.id);
      else {
        setActiveConversationId(null);
        setMessages([]);
        localStorage.removeItem('aiReportStudioConversationId');
      }
    } catch (err) { setError(err.message); }
  }, [openConversation]);

  useEffect(() => { loadCandidates(); loadReports(); loadConversations(); }, [loadCandidates, loadReports, loadConversations]);

  const toggle = (list, setter, id) => setter(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

  const generateReport = async () => {
    if (!selectedIncidents.length && !selectedCves.length) {
      setError('Select at least one incident or CVE to ground the report.');
      return;
    }
    setGenerating(true); setError(''); setGenerated(null);
    try {
      const response = await fetch(`${API_BASE}/ai-reports/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_title: title, command, incident_ids: selectedIncidents, cve_ids: selectedCves }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Report generation failed.');
      setGenerated(data); loadReports();
    } catch (err) { setError(err.message); }
    finally { setGenerating(false); }
  };

  const ask = async (event) => {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt) return;
    const previous = messages;
    setMessages([...previous, { role: 'user', content: prompt }]);
    setQuestion(''); localStorage.removeItem('aiReportStudioDraft'); setChatLoading(true); setError('');
    try {
      let conversationId = activeConversationId;
      if (!conversationId) {
        const createResponse = await fetch(`${API_BASE}/ai-chat/conversations`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: prompt.slice(0, 80) }),
        });
        const created = await createResponse.json();
        if (!createResponse.ok) throw new Error(created.detail || 'Could not start a saved chat.');
        conversationId = created.id;
        setActiveConversationId(conversationId);
        localStorage.setItem('aiReportStudioConversationId', String(conversationId));
        setConversations((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      }
      const response = await fetch(`${API_BASE}/ai-chat/conversations/${conversationId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Gemma could not answer the question.');
      setMessages((items) => [...items, { role: 'assistant', content: data.answer, sources: data.sources || [] }]);
      setConversations((items) => {
        const updated = { id: data.conversation_id, title: data.title, updated_at: new Date().toISOString() };
        return [updated, ...items.filter((item) => item.id !== updated.id)];
      });
      if (data.error) setError(data.error);
    } catch (err) {
      setError(err.message);
      setMessages((items) => [...items, { role: 'assistant', content: 'I could not complete that answer. Please check the Gemma/Ollama connection and try again.' }]);
    } finally { setChatLoading(false); }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError('');
    localStorage.removeItem('aiReportStudioConversationId');
  };

  const download = (id, format) => window.open(`${API_BASE}/ai-reports/${id}/download/${format}`, '_blank');
  const date = (value) => value ? new Date(value).toLocaleDateString() : 'Date not recorded';

  return (
    <div className="ai-studio page-content">
      <section className="ai-studio-hero">
        <div>
          <div className="ai-studio-eyebrow"><Sparkles size={15} /> GEMMA · GROUNDED INTELLIGENCE</div>
          <h1>AI Report Studio</h1>
          <p>Ask questions over crawled incident articles, or command Gemma to prepare a report from selected local incident and CVE records.</p>
        </div>
        <div className="ai-studio-model"><Bot size={17} /> Ollama / Gemma</div>
      </section>

      {error && <div className="ai-studio-error">{error}</div>}

      <div className="ai-studio-columns">
        <section className="ai-studio-card ai-report-card">
          <div className="ai-studio-card-title"><FileText size={19} /><div><h2>Build a data-backed report</h2><p>Only selected records from this app are sent as report evidence.</p></div></div>
          <div className="ai-studio-fields">
            <label>Report title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={500} /></label>
            <label>Report command<textarea rows={4} value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Tell Gemma what to analyze and how to structure the report." /></label>
            <div className="ai-studio-date-row">
              <label>From<input type="date" value={range.from_date} onChange={(e) => setRange({ ...range, from_date: e.target.value })} /></label>
              <label>To<input type="date" value={range.to_date} onChange={(e) => setRange({ ...range, to_date: e.target.value })} /></label>
              <button className="ai-studio-secondary" onClick={loadCandidates} disabled={loadingCandidates}>{loadingCandidates ? <RefreshCw className="spin" size={15} /> : <Search size={15} />} Load records</button>
            </div>
          </div>

          <div className="ai-candidate-heading"><span>Incidents (up to 100 recent)</span><small>{selectedIncidents.length} selected</small></div>
          <div className="ai-candidate-list">
            {candidates.incidents.length ? candidates.incidents.map((incident) => {
              const checked = selectedIncidents.includes(incident.id);
              return <button key={`i-${incident.id}`} className={`ai-candidate ${checked ? 'selected' : ''}`} onClick={() => toggle(selectedIncidents, setSelectedIncidents, incident.id)}>
                {checked ? <CheckSquare size={16} /> : <Square size={16} />}<span><strong>{incident.title}</strong><small>{date(incident.happened_at)} · {incident.severity || 'Unrated'} · {incident.source || 'Unknown source'}</small></span>
              </button>;
            }) : <p className="ai-empty">No incidents found in this date range.</p>}
          </div>
          <div className="ai-candidate-heading"><span>CVEs (up to 100 recent)</span><small>{selectedCves.length} selected</small></div>
          <div className="ai-candidate-list compact">
            {candidates.cves.length ? candidates.cves.map((cve) => {
              const checked = selectedCves.includes(cve.id);
              return <button key={`c-${cve.id}`} className={`ai-candidate ${checked ? 'selected' : ''}`} onClick={() => toggle(selectedCves, setSelectedCves, cve.id)}>
                {checked ? <CheckSquare size={16} /> : <Square size={16} />}<span><strong>{cve.cve_id}</strong><small>{cve.severity || 'Unrated'} · CVSS {cve.cvss_score || 'N/A'} · {cve.company_name || cve.product_name || 'No product listed'}</small></span>
              </button>;
            }) : <p className="ai-empty">No CVEs found in this date range.</p>}
          </div>

          <button className="ai-studio-primary" onClick={generateReport} disabled={generating || (!selectedIncidents.length && !selectedCves.length)}>
            {generating ? <RefreshCw className="spin" size={17} /> : <FileText size={17} />} {generating ? 'Gemma is writing…' : 'Generate report'}
          </button>

          {generated && <div className="ai-generated-report">
            <div className="ai-generated-header"><div><h3>{generated.report_title}</h3><small>Generated from {generated.sources.length} selected records</small></div><div className="ai-downloads"><button onClick={() => download(generated.id, 'pdf')}><Download size={14} /> PDF</button><button onClick={() => download(generated.id, 'docx')}><Download size={14} /> Word</button></div></div>
            <pre>{generated.content}</pre>
            <div className="ai-source-list"><strong>Evidence records</strong>{generated.sources.map((source) => <div key={source.citation}><span>[{source.citation}] {source.title}</span>{safeHttpUrl(source.url) && <a href={safeHttpUrl(source.url)} target="_blank" rel="noreferrer"><ExternalLink size={13} /></a>}</div>)}</div>
          </div>}

          <div className="ai-history">
            <h3>Recent generated reports</h3>
            {reports.length ? reports.map((report) => <div className="ai-history-item" key={report.id}><div><strong>{report.report_title}</strong><small>{date(report.created_at)} · {report.incident_count} incidents · {report.cve_count} CVEs</small></div><button title="View report" onClick={() => openSavedReport(report.id)}><FileText size={15} /></button><button title="Download PDF" onClick={() => download(report.id, 'pdf')}><Download size={15} /></button><button title="Download Word" onClick={() => download(report.id, 'docx')}><Download size={15} /></button></div>) : <p className="ai-empty">Generated reports will appear here.</p>}
          </div>
        </section>

        <section className="ai-studio-card ai-chat-card">
          <div className="ai-studio-card-title"><Bot size={19} /><div><h2>Ask the incident library</h2><p>Gemma retrieves matching passages from crawled incident articles and cites them.</p></div></div>
          <div className="ai-chat-toolbar">
            <button type="button" onClick={startNewChat} disabled={chatLoading}>+ New chat</button>
            <select value={activeConversationId || ''} onChange={(event) => event.target.value && openConversation(Number(event.target.value))} aria-label="Saved conversations" disabled={chatLoading || loadingConversation}>
              <option value="">New conversation</option>
              {conversations.map((conversation) => <option value={conversation.id} key={conversation.id}>{conversation.title}</option>)}
            </select>
          </div>
          <div className="ai-chat-transcript">
            {loadingConversation && <div className="ai-chat-thinking"><RefreshCw className="spin" size={15} /> Restoring saved conversation…</div>}
            {!messages.length && !loadingConversation && <div className="ai-chat-welcome"><Bot size={30} /><strong>Ask about crawled incidents</strong><span>For example: “Which financial incidents mention credential theft, and what evidence was reported?”</span></div>}
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`ai-chat-message ${message.role}`}>
              <div className="ai-chat-bubble">{message.content}</div>
              {message.sources?.length > 0 && <div className="ai-chat-sources"><strong>Retrieved sources</strong>{message.sources.map((source) => <a key={source.citation} href={safeHttpUrl(source.url)} target="_blank" rel="noreferrer"><span>[{source.citation}] {source.title}</span><small>{date(source.date)} · {source.source || 'Crawled incident'}{safeHttpUrl(source.url) ? ' · Open source' : ''}</small></a>)}</div>}
            </div>)}
            {chatLoading && <div className="ai-chat-thinking"><RefreshCw className="spin" size={15} /> Searching crawled incidents and asking Gemma…</div>}
          </div>
          <form className="ai-chat-form" onSubmit={ask}><textarea value={question} onChange={(e) => { setQuestion(e.target.value); localStorage.setItem('aiReportStudioDraft', e.target.value); }} rows={3} placeholder="Ask about an incident, organization, actor, technique, or trend…" disabled={chatLoading} /><button aria-label="Send question" disabled={chatLoading || !question.trim()}><Send size={17} /></button></form>
          <div className="ai-chat-footnote">Answers use crawled incident text in the local database. If no relevant source is found, Gemma is asked to say so.</div>
        </section>
      </div>
    </div>
  );
}
