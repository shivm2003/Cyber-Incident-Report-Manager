import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle, AlertTriangle, Shield, User, FileText, Activity, RefreshCw, Search, ChevronDown, Database, Target, UploadCloud, Rss, Layers, Zap, GitCommit } from 'lucide-react';

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
  const [pushHistory, setPushHistory] = useState([]);
  const [automationStatus, setAutomationStatus] = useState({ is_running: false, last_run: 'Never' });
  const [triggeringAutomation, setTriggeringAutomation] = useState(false);
  
  // Automation Config State
  const [configNvd, setConfigNvd] = useState(true);
  const [nvdTimeframe, setNvdTimeframe] = useState('month');
  const [configIncident, setConfigIncident] = useState(true);
  const [incidentTimeframe, setIncidentTimeframe] = useState('week');
  
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

    fetchPushHistory();
    fetchAutomationStatus();
  }, []);

  useEffect(() => {
    let interval;
    if (automationStatus.is_running) {
      // Fast polling when actively triggered manually
      interval = setInterval(() => {
        fetchAutomationStatus();
        fetchPushHistory();
      }, 1500);
    } else {
      // Passive 30-second polling to catch background automated tickets
      interval = setInterval(() => {
        fetchAutomationStatus();
        fetchPushHistory();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [automationStatus.is_running]);

  const fetchPushHistory = () => {
    fetch('http://localhost:8000/api/jira/push-history')
      .then(res => res.json())
      .then(data => setPushHistory(data))
      .catch(err => console.error("Error fetching push history:", err));
  };

  const fetchAutomationStatus = () => {
    fetch('http://localhost:8000/api/automation/status')
      .then(res => res.json())
      .then(data => setAutomationStatus(data))
      .catch(err => console.error("Error fetching automation status:", err));
  };

  const updateInterval = (hours) => {
    fetch('http://localhost:8000/api/automation/interval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interval_hours: parseInt(hours) })
    })
      .then(res => res.json())
      .then(data => {
        setAutomationStatus(prev => ({...prev, interval_hours: data.interval_hours}));
      })
      .catch(err => console.error("Error updating interval:", err));
  };

  const triggerAutomation = () => {
    if (!configNvd && !configIncident) {
      alert("Please select at least one sync source (NVD or Incident).");
      return;
    }
    setTriggeringAutomation(true);
    fetch('http://localhost:8000/api/automation/run', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        run_nvd: configNvd,
        nvd_timeframe: nvdTimeframe,
        run_incident: configIncident,
        incident_timeframe: incidentTimeframe
      })
    })
      .then(res => res.json())
      .then(data => {
        setAutomationStatus(prev => ({...prev, is_running: true, status_message: 'Starting automation...'}));
        setTriggeringAutomation(false);
      })
      .catch(err => {
        console.error(err);
        setTriggeringAutomation(false);
      });
  };

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
        fetchPushHistory();
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

      {/* AUTOMATION CONTROL & PUSH HISTORY SECTION */}
      <div style={{ marginTop: '40px', paddingBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-main)' }}>Jira Automation Scheduler & Push History</h2>
        
        <div className="rb-grid">
          <div className="rb-sidebar-col">
            <div className="rb-config-panel glass-card-v2" style={{ borderTop: '4px solid #8b5cf6' }}>
              <h3 className="rb-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#8b5cf6" /> Automation Status
              </h3>
              
              <div style={{ marginBottom: '20px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Background Scheduler:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>ACTIVE</span>
                    <select 
                      value={automationStatus.interval_hours || 3}
                      onChange={(e) => updateInterval(e.target.value)}
                      style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                    >
                      <option value={1}>Every 1 Hour</option>
                      <option value={3}>Every 3 Hours</option>
                      <option value={6}>Every 6 Hours</option>
                      <option value={12}>Every 12 Hours</option>
                      <option value={24}>Every 24 Hours</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Task Status:</span>
                  <span style={{ fontWeight: 'bold', color: automationStatus.is_running ? '#fbbf24' : 'var(--text-main)' }}>
                    {automationStatus.status_message || (automationStatus.is_running ? 'Syncing...' : 'Idle')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Last Automated Run:</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {automationStatus.last_run !== 'Never' ? new Date(automationStatus.last_run).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>

              {/* Automation Config UI */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Manual Sync Configuration</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-main)' }}>
                    <input type="checkbox" checked={configNvd} onChange={e => setConfigNvd(e.target.checked)} />
                    NVD API Sync
                  </label>
                  <select 
                    value={nvdTimeframe} 
                    onChange={e => setNvdTimeframe(e.target.value)}
                    disabled={!configNvd}
                    style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: configNvd ? 'var(--bg-color)' : 'var(--surface-color)', color: 'var(--text-main)' }}
                  >
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-main)' }}>
                    <input type="checkbox" checked={configIncident} onChange={e => setConfigIncident(e.target.checked)} />
                    Incident Feed Sync
                  </label>
                  <select 
                    value={incidentTimeframe} 
                    onChange={e => setIncidentTimeframe(e.target.value)}
                    disabled={!configIncident}
                    style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: configIncident ? 'var(--bg-color)' : 'var(--surface-color)', color: 'var(--text-main)' }}
                  >
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>
              </div>

              <button
                onClick={triggerAutomation}
                className="btn-primary"
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
                disabled={triggeringAutomation || automationStatus.is_running}
              >
                {triggeringAutomation || automationStatus.is_running ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Activity size={16} />
                )}
                <span>Sync & Analyze Now</span>
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px', lineHeight: '1.4' }}>
                Instantly crawls NVD and RSS feeds, runs Impact Radar on new threats, generates PDF reports, and pushes to Jira if impact &gt;= 70.
              </p>

              {/* Pipeline Visualization */}
              <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="#8b5cf6" /> Execution Pipeline
                </h4>
                
                <div style={{ position: 'relative', paddingLeft: '15px' }}>
                  {/* Vertical Line */}
                  <div style={{ position: 'absolute', left: '22px', top: '20px', bottom: '20px', width: '2px', backgroundColor: 'var(--border)' }}></div>
                  
                  {/* Phase 1 */}
                  <div style={{ marginBottom: '20px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phase 1: NVD Processing</span>
                    </div>
                    
                    <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Database size={12} /> Fetch NVD API data
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Target size={12} /> Run AI Impact Radar
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <FileText size={12} /> Generate PDF reports
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <GitCommit size={12} /> Check for Duplicacy
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <UploadCloud size={12} color="#10b981" /> Push to Jira
                      </div>
                    </div>
                  </div>

                  {/* Phase 2 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phase 2: Incident Crawling</span>
                    </div>
                    
                    <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Rss size={12} /> Crawl RSS feeds
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Zap size={12} /> Impact Radar (CVE mapping)
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Target size={12} /> Deep AI Impact & Mitre
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <GitCommit size={12} /> Check for Duplicacy
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <UploadCloud size={12} color="#10b981" /> Push Incident & PDFs
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rb-discovery-col">
            <div className="rb-discovery-card-v2 glass-card-v2" style={{ height: '100%' }}>
              <h3 className="rb-panel-title" style={{ marginBottom: '20px' }}>Ticket Publishing History</h3>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="rb-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Date/Time</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Entity</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Summary</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Ticket</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pushHistory.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No Jira tickets pushed yet.
                        </td>
                      </tr>
                    ) : (
                      pushHistory.map(history => (
                        <tr key={history.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>
                            {new Date(history.pushed_at).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              backgroundColor: history.entity_type === 'cve' ? '#fee2e2' : '#e0e7ff',
                              color: history.entity_type === 'cve' ? '#ef4444' : '#4f46e5',
                              fontWeight: 'bold',
                              textTransform: 'uppercase'
                            }}>
                              {history.entity_type}
                            </span>
                            <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 600 }}>{history.entity_id}</div>
                          </td>
                          <td style={{ padding: '12px 8px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={history.summary}>
                            {history.summary}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            {history.ticket_key ? (
                              <div>
                                <a 
                                  href={`https://indiashelter.atlassian.net/browse/${history.ticket_key}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#6366f1', textDecoration: 'underline', fontWeight: 600, display: 'block' }}
                                >
                                  {history.ticket_key}
                                </a>
                                {history.entity_type === 'cve' && history.entity_id && (
                                  <a
                                    href={`http://localhost:8000/api/cve/by-cve-id/${history.entity_id}/report`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#10b981', fontSize: '11px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: 600 }}
                                  >
                                    <FileText size={12} /> View PDF Report
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            {history.status === 'success' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 600 }}>
                                <CheckCircle size={14} /> Success
                              </span>
                            ) : (
                              <span 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontWeight: 600, cursor: 'help' }}
                                title={history.error_message || 'Unknown Error'}
                              >
                                <AlertTriangle size={14} /> Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JiraPublisher;
