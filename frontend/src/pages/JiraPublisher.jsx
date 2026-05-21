import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle, AlertTriangle, Shield, User, FileText, Activity, RefreshCw, Search, ChevronDown } from 'lucide-react';

const JiraPublisher = () => {
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [projectKey] = useState('CI');
  const [issueType, setIssueType] = useState('Task');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('6422be0257f0c028e2f71e9a');
  const [impact, setImpact] = useState('Customer Impacted');
  const [severity, setSeverity] = useState('');
  const [remarks, setRemarks] = useState('Immediate action required.');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sourceType, setSourceType] = useState('incident');
  const [reportSearch, setReportSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCveReports = () => {
    try {
      const savedHistory = localStorage.getItem('cve_extractor_history');
      if (savedHistory) {
        return JSON.parse(savedHistory);
      }
    } catch (e) {
      console.error("Failed to parse CVE history:", e);
    }
    return [];
  };

  useEffect(() => {
    // Fetch reports
    fetch('http://localhost:8000/api/reports')
      .then(res => res.json())
      .then(data => {
        setReports(data);
        setLoadingReports(false);
      })
      .catch(err => {
        console.error("Error fetching reports:", err);
        setLoadingReports(false);
      });
  }, []);

  const handleReportChange = (reportId) => {
    setSelectedReportId(reportId);
    setResult(null);
    setSelectedFiles([]);
    if (!reportId) {
      setSummary('');
      setDescription('');
      setImpact('Customer Impacted');
      setSeverity('');
      setRemarks('Immediate action required.');
      return;
    }

    if (sourceType === 'incident') {
      const report = reports.find(r => r.id === parseInt(reportId));
      if (report) {
        setSummary(`${report.incident_title || 'Cyber Incident'} - AI Impact Report`);
        
        const desc = `[AI Forensic Analysis]
Root Cause: ${report.root_cause || 'N/A'}
Technical Analysis: ${report.technical_analysis || 'N/A'}

Affected Scope: ${report.affected_customers || 'N/A'}
Breach Method: ${report.breach_method || 'N/A'}`;
        setDescription(desc);
        
        setImpact(report.business_impact || 'Customer Impacted');
        
        const sev = report.incident?.severity || '';
        if (['Critical', 'High', 'Medium', 'Low'].includes(sev)) {
          setSeverity(sev);
        } else {
          setSeverity('');
        }

        setRemarks(`Breach Process Timeline:\n${report.breach_process || 'Immediate action required.'}`);
      }
    } else {
      const cveReports = getCveReports();
      const cve = cveReports.find(c => c.metadata.cve_id === reportId);
      if (cve) {
        setSummary(`[Vulnerability] ${cve.metadata.cve_id} | ${cve.vulnerability?.title || 'CVE Details'}`);
        
        const desc = `CVE ID: ${cve.metadata.cve_id}\n` +
          `Severity: ${cve.scoring?.cvss_severity || 'Unknown'} (${cve.scoring?.cvss_score || 'N/A'})\n` +
          `CVSS Vector: ${cve.scoring?.cvss_vector || 'N/A'}\n\n` +
          `Description:\n${cve.vulnerability?.description || 'No description available.'}\n\n` +
          `Affected Products:\n` +
          (cve.affected?.products?.map(p => `- ${p.vendor} ${p.product} (versions: ${p.versions?.map(v => `${v.version} to ${v.less_than}`).join(', ') || 'N/A'})`).join('\n') || '- None listed');
        setDescription(desc);
        
        setImpact(`CVSS Score: ${cve.scoring?.cvss_score || 'N/A'} | Severity: ${cve.scoring?.cvss_severity || 'Unknown'}`);
        
        const rawSev = (cve.scoring?.cvss_severity || '').toLowerCase();
        if (rawSev.includes('critical')) setSeverity('Critical');
        else if (rawSev.includes('high')) setSeverity('High');
        else if (rawSev.includes('medium')) setSeverity('Medium');
        else if (rawSev.includes('low')) setSeverity('Low');
        else setSeverity('');

        const rem = `CISA Assessment:\n` +
          `Exploitation: ${cve.assessment?.cisa_adp?.exploitation || 'Unknown'}\n` +
          `Automatable: ${cve.assessment?.cisa_adp?.automatable || 'Unknown'}\n` +
          `Technical Impact: ${cve.assessment?.cisa_adp?.technical_impact || 'Unknown'}`;
        setRemarks(rem);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReportId) {
      alert("Please select a source report first!");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('project_key', projectKey);
      formData.append('issue_type', issueType);
      formData.append('summary', summary);
      formData.append('description', description);
      formData.append('assignee_id', assigneeId || '');
      formData.append('impact', impact);
      formData.append('severity', severity);
      formData.append('remarks', remarks);

      selectedFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await fetch(`http://localhost:8000/api/reports/${selectedReportId}/jira`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        setSelectedFiles([]);
      }
    } catch (err) {
      console.error(err);
      setResult({ success: false, error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rb-container fade-in">
      <div className="rb-hero-v2">
        <div className="rb-hero-content">
          <div className="rb-hero-badge">
            <Activity size={14} color="#a855f7" /> <span>JIRA SERVICE DESK INTEGRATION</span>
          </div>
          <h2>Jira Incident Publisher</h2>
          <p>Push detailed forensic threat reports, severity rankings, and AI-generated impact summaries directly to Atlassian Jira.</p>
        </div>
        <div className="jira-hero-bg"></div>
      </div>

      <form onSubmit={handleSubmit} className="rb-grid">
        {/* Sidebar Configuration */}
        <div className="rb-sidebar-col">
          <div className="rb-config-panel glass-card-v2">
            <h3 className="rb-panel-title">1. Select AI Report</h3>
            
            <div className="rb-input-group" style={{ marginBottom: '15px' }}>
              <label className="rb-config-label">Report Source Type</label>
              <select
                value={sourceType}
                onChange={e => {
                  setSourceType(e.target.value);
                  setSelectedReportId('');
                  setReportSearch('');
                  setSummary('');
                  setDescription('');
                  setImpact('Customer Impacted');
                  setSeverity('');
                  setRemarks('Immediate action required.');
                }}
                className="rb-config-input"
              >
                <option value="incident">AI Incident Report</option>
                <option value="cve">CVE Extractor Report</option>
              </select>
            </div>

            <div className="rb-input-group" ref={dropdownRef} style={{ position: 'relative' }}>
              <label className="rb-config-label">Source Report</label>

              {/* Trigger button */}
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="rb-config-input"
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedReportId
                    ? (sourceType === 'incident'
                        ? (() => { const r = reports.find(r => r.id === parseInt(selectedReportId)); return r ? `ID: ${r.id} | ${r.incident_title?.substring(0, 30)}...` : selectedReportId; })()
                        : (() => { const c = getCveReports().find(c => c.metadata.cve_id === selectedReportId); return c ? `${c.metadata.cve_id} | ${c.vulnerability?.title?.substring(0, 25)}...` : selectedReportId; })()
                      )
                    : (sourceType === 'incident' ? '-- Choose Incident Report --' : '-- Choose CVE Report --')
                  }
                </span>
                <ChevronDown size={16} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </div>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div className="jira-search-dropdown">
                  {/* Search inside dropdown */}
                  <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        value={reportSearch}
                        onChange={e => setReportSearch(e.target.value)}
                        placeholder="Search by ID or title..."
                        autoFocus
                        className="rb-config-input"
                        style={{ paddingLeft: '32px', margin: 0, fontSize: '12px', padding: '8px 10px 8px 32px' }}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Options list */}
                  <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {sourceType === 'incident' ? (
                      loadingReports ? (
                        <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <RefreshCw size={14} className="animate-spin" style={{ marginRight: '6px' }} /> Loading...
                        </div>
                      ) : (
                        reports
                          .filter(r =>
                            r.id.toString().includes(reportSearch) ||
                            (r.incident_title || '').toLowerCase().includes(reportSearch.toLowerCase())
                          )
                          .map(r => (
                            <div
                              key={r.id}
                              onClick={() => { handleReportChange(String(r.id)); setDropdownOpen(false); setReportSearch(''); }}
                              className={`jira-dropdown-item ${String(r.id) === selectedReportId ? 'active' : ''}`}
                            >
                              <span style={{ fontWeight: 600, marginRight: '6px', opacity: 0.6 }}>#{r.id}</span>
                              {r.incident_title?.substring(0, 40) || 'Untitled'}...
                            </div>
                          ))
                      )
                    ) : (
                      getCveReports()
                        .filter(c =>
                          c.metadata.cve_id.toLowerCase().includes(reportSearch.toLowerCase()) ||
                          (c.vulnerability?.title || '').toLowerCase().includes(reportSearch.toLowerCase())
                        )
                        .map(c => (
                          <div
                            key={c.metadata.cve_id}
                            onClick={() => { handleReportChange(c.metadata.cve_id); setDropdownOpen(false); setReportSearch(''); }}
                            className={`jira-dropdown-item ${c.metadata.cve_id === selectedReportId ? 'active' : ''}`}
                          >
                            <span style={{ fontWeight: 600, marginRight: '6px', color: 'var(--primary)' }}>{c.metadata.cve_id}</span>
                            {c.vulnerability?.title?.substring(0, 30) || 'No title'}...
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {/* Hidden required input for form validation */}
              <input type="hidden" value={selectedReportId} required />
            </div>

            <div className="rb-divider"></div>

            <h3 className="rb-panel-title">2. JIRA Project Context</h3>
            <div className="rb-input-group">
              <label className="rb-config-label">Project Key</label>
              <input
                type="text"
                value="Cyber Incidents (CI)"
                className="rb-config-input"
                disabled
                style={{ opacity: 0.8, cursor: 'not-allowed' }}
              />
            </div>
            <div className="rb-input-group">
              <label className="rb-config-label">Issue Type</label>
              <input
                type="text"
                value={issueType}
                onChange={e => setIssueType(e.target.value)}
                className="rb-config-input"
                placeholder="e.g., Task"
                required
              />
            </div>
            <div className="rb-input-group">
              <label className="rb-config-label">Assignee ID</label>
              <div className="rb-date-input-wrapper jira-input-wrapper">
                <User size={14} className="rb-date-icon" />
                <input
                  type="text"
                  value={assigneeId}
                  onChange={e => setAssigneeId(e.target.value)}
                  className="rb-config-input with-icon"
                  placeholder="Jira User ID"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Publisher fields */}
        <div className="rb-discovery-col">
          <div className="rb-discovery-card-v2 glass-card-v2">
            <h3 className="rb-panel-title" style={{ fontSize: '16px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              3. Ticket Fields Mapping
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="rb-input-group">
                <label className="rb-config-label">Severity Level (customfield_13104)</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value)}
                  className="rb-config-input"
                  required
                >
                  <option value="">-- Select Severity --</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="rb-input-group">
                <label className="rb-config-label">Impact Scope (customfield_13102)</label>
                <input
                  type="text"
                  value={impact}
                  onChange={e => setImpact(e.target.value)}
                  className="rb-config-input"
                  placeholder="Impact Description"
                  required
                />
              </div>
            </div>

            <div className="rb-input-group" style={{ marginBottom: '20px' }}>
              <label className="rb-config-label">Ticket Summary</label>
              <input
                type="text"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                className="rb-config-input"
                placeholder="Brief ticket summary"
                required
              />
            </div>

            <div className="rb-input-group" style={{ marginBottom: '20px' }}>
              <label className="rb-config-label">Description Payload</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="rb-config-input jira-textarea-mono"
                placeholder="ADF Description Content"
                required
              />
            </div>

            <div className="rb-input-group" style={{ marginBottom: '30px' }}>
              <label className="rb-config-label">Remarks Payload (customfield_13103)</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="rb-config-input jira-textarea-mono-sm"
                placeholder="ADF Remarks Content"
                required
              />
            </div>

            <div className="rb-input-group" style={{ marginBottom: '30px' }}>
              <label className="rb-config-label">Ticket Attachments (Optional)</label>
              <input
                type="file"
                multiple
                onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
                className="rb-config-input"
                style={{ padding: '10px 16px' }}
              />
              {selectedFiles.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Files to upload:</span>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px' }}>
                    {selectedFiles.map((file, idx) => (
                      <li key={idx} style={{ color: 'var(--text-main)' }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', alignItems: 'center' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 32px' }}
                disabled={submitting}
              >
                {submitting ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                <span>Publish Ticket to Jira</span>
              </button>
            </div>

            {/* API Result Feedback */}
            {result && (
              <div className={`jira-result-card ${result.success ? 'success' : 'error'}`}>
                {result.success ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', fontWeight: 800, marginBottom: '8px' }}>
                      <CheckCircle size={18} />
                      <span>Ticket Created Successfully!</span>
                    </div>
                    <p style={{ fontSize: '13px', margin: '4px 0' }}>
                      Jira Ticket Key: <strong style={{ fontSize: '14px' }}>{result.ticket_key}</strong>
                    </p>
                    {result.attachment_error && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '12px', marginTop: '6px', marginBottom: '6px' }}>
                        <AlertTriangle size={14} />
                        <span>Ticket created but attachments failed: {result.attachment_error}</span>
                      </div>
                    )}
                    <a
                      href={`https://indiashelter.atlassian.net/browse/${result.ticket_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', color: '#6366f1', textDecoration: 'underline', fontSize: '13px', marginTop: '6px' }}
                    >
                      View Ticket in Jira Open Queue &rarr;
                    </a>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: 800, marginBottom: '8px' }}>
                      <AlertTriangle size={18} />
                      <span>Failed to Create Jira Ticket</span>
                    </div>
                    <p className="jira-code-output">
                      {result.error || JSON.stringify(result, null, 2)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default JiraPublisher;
