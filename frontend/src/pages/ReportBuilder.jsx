import React, { useState } from 'react';
import { 
  ShieldAlert, RefreshCw, Search, History, Trash2, Check, FileDown, Database, Calendar
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const ReportBuilder = ({
  reportBuilderData, reportBuilderSelection, setReportBuilderSelection,
  reportBuilderFilters, setReportBuilderFilters, reportBuilderTitle,
  setReportBuilderTitle, reportBuilderGenerating, handleGenerateCombinedReport,
  reportHistory, reportHistoryLoading, handleDeleteReportBuilderConfig,
  fetchReportBuilderPreview
}) => {
  const [reportBuilderPreviewLoading, setReportBuilderPreviewLoading] = useState(false);

  const handleSyncCandidates = async () => {
    setReportBuilderPreviewLoading(true);
    await fetchReportBuilderPreview();
    setReportBuilderPreviewLoading(false);
  };

  return (
    <div className="rb-container fade-in">
      <div className="rb-hero-v2">
        <div className="rb-hero-content">
          <div className="rb-hero-badge"><ShieldAlert size={14} color="#6366f1" /> <span>INTELLIGENCE COMPILER</span></div>
          <h2>Global Threat Report Command</h2>
          <p>Compile multi-source intelligence into board-ready forensic exports with advanced filtering.</p>
        </div>
        <div className="rb-hero-actions">
          <button 
            className="rb-btn-danger" 
            onClick={() => { if(window.confirm('Clear all report configurations?')) {/* handle logic if needed */} }}
          >
            <Trash2 size={16} /> Purge Configs
          </button>
          <button className="rb-btn-primary" onClick={handleGenerateCombinedReport} disabled={reportBuilderGenerating}>
            {reportBuilderGenerating ? <RefreshCw className="animate-spin" size={18} /> : <FileDown size={18} />} 
            <span>Compile & Export</span>
          </button>
        </div>
        <div className="rb-hero-bg"></div>
      </div>

      <div className="rb-grid">
        {/* Configuration Sidebar */}
        <div className="rb-sidebar-col">
          <div className="rb-config-panel glass-card-v2">
            <h3 className="rb-panel-title">Report Configuration</h3>
            
            <div className="rb-input-group">
              <label className="rb-config-label">Report Title</label>
              <input 
                type="text" 
                value={reportBuilderTitle} 
                onChange={e => setReportBuilderTitle(e.target.value)} 
                className="rb-config-input" 
                placeholder="e.g., Q3 Threat Summary"
              />
            </div>

            <div className="rb-divider"></div>

            <h3 className="rb-panel-title">Timeframe Analysis</h3>
            <div className="rb-date-filters">
              <div className="rb-input-group">
                <label className="rb-config-label">From Date</label>
                <div className="rb-date-input-wrapper">
                  <Calendar size={14} className="rb-date-icon" />
                  <input 
                    type="date" 
                    value={reportBuilderFilters.from_date} 
                    onChange={e => setReportBuilderFilters({...reportBuilderFilters, from_date: e.target.value})} 
                    className="rb-config-input with-icon" 
                  />
                </div>
              </div>
              <div className="rb-input-group">
                <label className="rb-config-label">To Date</label>
                <div className="rb-date-input-wrapper">
                  <Calendar size={14} className="rb-date-icon" />
                  <input 
                    type="date" 
                    value={reportBuilderFilters.to_date} 
                    onChange={e => setReportBuilderFilters({...reportBuilderFilters, to_date: e.target.value})} 
                    className="rb-config-input with-icon" 
                  />
                </div>
              </div>
            </div>

            <div className="rb-divider"></div>

            <h3 className="rb-panel-title">Intelligence Sources</h3>
            <div className="rb-sources-list">
              <label className="rb-source-toggle">
                <input 
                  type="checkbox" 
                  checked={reportBuilderFilters.sources.includes('crawl')} 
                  onChange={e => {
                    const s = e.target.checked 
                      ? [...reportBuilderFilters.sources, 'crawl'] 
                      : reportBuilderFilters.sources.filter(x => x !== 'crawl');
                    setReportBuilderFilters({...reportBuilderFilters, sources: s});
                  }} 
                />
                <div className="rb-source-info">
                  <div className="rb-source-name">Threat Intelligence</div>
                  <div className="rb-source-desc">RSS crawl incidents & AI analysis</div>
                </div>
                <div className="rb-source-indicator"></div>
              </label>
              <label className="rb-source-toggle purple">
                <input 
                  type="checkbox" 
                  checked={reportBuilderFilters.sources.includes('cve')} 
                  onChange={e => {
                    const s = e.target.checked 
                      ? [...reportBuilderFilters.sources, 'cve'] 
                      : reportBuilderFilters.sources.filter(x => x !== 'cve');
                    setReportBuilderFilters({...reportBuilderFilters, sources: s});
                  }} 
                />
                <div className="rb-source-info">
                  <div className="rb-source-name">NVD Vulnerabilities</div>
                  <div className="rb-source-desc">CVE records & scoring metrics</div>
                </div>
                <div className="rb-source-indicator"></div>
              </label>
            </div>
            
            <div className="rb-divider"></div>

            <h3 className="rb-panel-title">Advanced Filtering</h3>
            <div className="rb-sources-list">
              <label className="rb-source-toggle" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: reportBuilderFilters.impact_only ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                <input 
                  type="checkbox" 
                  checked={reportBuilderFilters.impact_only} 
                  onChange={e => setReportBuilderFilters({...reportBuilderFilters, impact_only: e.target.checked})} 
                />
                <div className="rb-source-info">
                  <div className="rb-source-name" style={{ color: '#ef4444' }}>Impact Radar Detections Only</div>
                  <div className="rb-source-desc">Only include threats that match your Tech Stack</div>
                </div>
                <div className="rb-source-indicator" style={{ background: '#ef4444' }}></div>
              </label>
            </div>

            <div style={{ marginTop: '28px' }}>
              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 800 }} 
                onClick={handleSyncCandidates} 
                disabled={reportBuilderPreviewLoading}
              >
                {reportBuilderPreviewLoading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                <span>Sync Intelligence Targets</span>
              </button>
            </div>
          </div>

          <div className="rb-stats-card-v2">
            <div className="rb-stats-header">
              <div className="rb-stats-dot"></div>
              <span>COMPILATION PAYLOAD</span>
            </div>
            <div className="rb-stats-grid">
              <div className="rb-stat-box">
                <span className="rb-stat-label">Threats</span>
                <span className="rb-stat-value">{reportBuilderSelection.incident_ids.length}</span>
              </div>
              <div className="rb-stat-box purple">
                <span className="rb-stat-label">CVEs</span>
                <span className="rb-stat-value">{reportBuilderSelection.cve_ids.length}</span>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="rb-config-panel glass-card-v2" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="rb-panel-title" style={{ margin: 0 }}>Report History</h3>
              <History size={16} color="var(--text-muted)" />
            </div>
            <div className="rb-scroll rb-history-list">
              {reportHistoryLoading ? (
                <div style={{ textAlign: 'center', padding: '30px' }}><RefreshCw size={20} className="animate-spin" color="#6366f1" /></div>
              ) : reportHistory.length === 0 ? (
                <div className="rb-empty-state">
                  <History size={24} color="rgba(255,255,255,0.1)" style={{marginBottom:'10px'}}/>
                  No archive records available.
                </div>
              ) : reportHistory.map(h => (
                <div key={h.id} className="rb-history-item">
                  <div className="rb-history-header">
                    <div className="rb-history-title">{h.report_title}</div>
                    <button className="rb-btn-icon-danger" onClick={() => handleDeleteReportBuilderConfig(h.id)}><Trash2 size={14} /></button>
                  </div>
                  <div className="rb-history-date">{new Date(h.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                  <div className="rb-history-actions">
                    <button onClick={() => window.open(`${API_BASE}/reports/builder/download/${h.id}/pdf`, '_blank')} className="btn-mini pdf">PDF Export</button>
                    <button onClick={() => window.open(`${API_BASE}/reports/builder/download/${h.id}/docx`, '_blank')} className="btn-mini docx">Word Export</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Discovery Area */}
        <div className="rb-discovery-col">
          {/* Threats Table */}
          {reportBuilderFilters.sources.includes('crawl') && (
            <div className="rb-discovery-card-v2 glass-card-v2">
              <div className="rb-discovery-header-v2">
                <div className="rb-discovery-title">
                  <div className="rb-icon-wrapper blue"><ShieldAlert size={18} /></div>
                  <div>
                    <h3>Threat Intelligence</h3>
                    <span>{reportBuilderData.incidents?.length || 0} candidates retrieved</span>
                  </div>
                </div>
                <button 
                  className="rb-select-all-btn blue"
                  onClick={() => {
                    const allIds = reportBuilderData?.incidents?.map(i => i.id) || [];
                    const allSelected = allIds.length > 0 && allIds.every(id => reportBuilderSelection?.incident_ids?.includes(id));
                    setReportBuilderSelection(prev => ({...prev, incident_ids: allSelected ? [] : allIds}));
                  }}
                >
                  {reportBuilderSelection.incident_ids.length === (reportBuilderData.incidents?.length || 0) && (reportBuilderData.incidents?.length || 0) > 0 ? 'Unselect All' : 'Select All'}
                </button>
              </div>
              <div className="rb-scroll" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {!reportBuilderData.incidents || reportBuilderData.incidents.length === 0 ? (
                  <div className="rb-empty-table">No incidents found for the selected timeframe.</div>
                ) : (
                  <table className="rb-table">
                    <tbody>
                      {reportBuilderData.incidents.map(inc => (
                        <tr key={inc.id} className={`rb-row ${reportBuilderSelection?.incident_ids?.includes(inc.id) ? 'selected' : ''}`} onClick={() => {
                          const ids = reportBuilderSelection?.incident_ids?.includes(inc.id)
                            ? reportBuilderSelection.incident_ids.filter(x => x !== inc.id)
                            : [...(reportBuilderSelection?.incident_ids || []), inc.id];
                          setReportBuilderSelection({...reportBuilderSelection, incident_ids: ids});
                        }}>
                          <td style={{ width: '50px', paddingLeft: '24px' }}>
                            <div className={`rb-checkbox ${reportBuilderSelection?.incident_ids?.includes(inc.id) ? 'checked' : ''}`}>
                              {reportBuilderSelection?.incident_ids?.includes(inc.id) && <Check size={14} />}
                            </div>
                          </td>
                          <td style={{ width: '120px' }}><span className={`badge ${(inc.severity || 'Low').toLowerCase()}`}>{inc.severity}</span></td>
                          <td>
                            <div className="rb-row-title">{inc.title}</div>
                            <div className="rb-row-meta">{inc.happened_at ? new Date(inc.happened_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'} • {inc.country || 'Global'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* CVEs Table */}
          {reportBuilderFilters.sources.includes('cve') && (
            <div className="rb-discovery-card-v2 glass-card-v2">
              <div className="rb-discovery-header-v2">
                <div className="rb-discovery-title">
                  <div className="rb-icon-wrapper purple"><Database size={18} /></div>
                  <div>
                    <h3>CVE Landscape</h3>
                    <span>{reportBuilderData.cves?.length || 0} vulnerabilities retrieved</span>
                  </div>
                </div>
                <button 
                  className="rb-select-all-btn purple"
                  onClick={() => {
                    const allIds = reportBuilderData?.cves?.map(c => c.id) || [];
                    const allSelected = allIds.length > 0 && allIds.every(id => reportBuilderSelection?.cve_ids?.includes(id));
                    setReportBuilderSelection(prev => ({...prev, cve_ids: allSelected ? [] : allIds}));
                  }}
                >
                  {reportBuilderSelection.cve_ids.length === (reportBuilderData.cves?.length || 0) && (reportBuilderData.cves?.length || 0) > 0 ? 'Unselect All' : 'Select All'}
                </button>
              </div>
              <div className="rb-scroll" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {!reportBuilderData.cves || reportBuilderData.cves.length === 0 ? (
                  <div className="rb-empty-table">No CVEs found for the selected timeframe.</div>
                ) : (
                  <table className="rb-table">
                    <tbody>
                      {reportBuilderData.cves.map(cve => (
                        <tr key={cve.id} className={`rb-row purple ${reportBuilderSelection?.cve_ids?.includes(cve.id) ? 'selected-purple' : ''}`} onClick={() => {
                          const ids = reportBuilderSelection?.cve_ids?.includes(cve.id)
                            ? reportBuilderSelection.cve_ids.filter(x => x !== cve.id)
                            : [...(reportBuilderSelection?.cve_ids || []), cve.id];
                          setReportBuilderSelection({...reportBuilderSelection, cve_ids: ids});
                        }}>
                          <td style={{ width: '50px', paddingLeft: '24px' }}>
                            <div className={`rb-checkbox purple ${reportBuilderSelection?.cve_ids?.includes(cve.id) ? 'checked' : ''}`}>
                              {reportBuilderSelection?.cve_ids?.includes(cve.id) && <Check size={14} />}
                            </div>
                          </td>
                          <td style={{ width: '120px' }}><span className={`badge ${(cve.severity || 'Low').toLowerCase()}`}>{cve.severity}</span></td>
                          <td>
                            <div className="rb-row-title purple">{cve.cve_id}</div>
                            <div className="rb-row-meta">{cve.company_name} / {cve.product_name} • Published: {cve.published_date ? new Date(cve.published_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ReportBuilder;
