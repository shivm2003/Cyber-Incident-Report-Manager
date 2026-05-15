import React from 'react';
import { 
  ShieldAlert, RefreshCw, Search, History, Trash2, Check, FileDown, Database 
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const ReportBuilder = ({
  reportBuilderData, reportBuilderSelection, setReportBuilderSelection,
  reportBuilderFilters, setReportBuilderFilters, reportBuilderTitle,
  setReportBuilderTitle, reportBuilderGenerating, handleGenerateCombinedReport,
  reportHistory, reportHistoryLoading, handleDeleteReportBuilderConfig,
  fetchReportBuilderPreview
}) => {
  return (
    <div className="rb-container fade-in">
      <div className="rb-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-1px' }}>Report Command Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Compile multi-source intelligence into board-ready forensic exports</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            className="btn-ghost" 
            onClick={() => { if(window.confirm('Clear all report configurations?')) {/* handle logic if needed */} }}
            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}
          >
            <Trash2 size={16} /> Purge Configs
          </button>
          <button className="btn-primary" onClick={handleGenerateCombinedReport} disabled={reportBuilderGenerating} style={{ padding: '12px 24px' }}>
            {reportBuilderGenerating ? <RefreshCw className="animate-spin" size={18} /> : <FileDown size={18} />} 
            <span style={{ marginLeft: '8px' }}>Compile & Export</span>
          </button>
        </div>
      </div>

      <div className="rb-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px' }}>
        {/* Configuration Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="rb-config-panel glass-card" style={{ padding: '24px' }}>
            <label className="rb-config-label">Report Title</label>
            <input 
              type="text" 
              value={reportBuilderTitle} 
              onChange={e => setReportBuilderTitle(e.target.value)} 
              className="rb-config-input" 
              placeholder="e.g., Weekly Threat Summary"
            />

            <label className="rb-config-label" style={{ marginTop: '20px' }}>Intelligence Sources</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                <div>
                  <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 600 }}>Threat Intelligence</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>RSS crawl incidents</div>
                </div>
              </label>
              <label className="rb-source-toggle">
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
                <div>
                  <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 600 }}>NVD Vulnerabilities</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>CVE/CVSS records</div>
                </div>
              </label>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button className="rb-sync-btn" onClick={fetchReportBuilderPreview} disabled={reportHistoryLoading}>
                {reportHistoryLoading ? <RefreshCw className="animate-spin" size={15} /> : <Search size={15} />}
                Sync Candidates
              </button>
            </div>
          </div>

          <div className="rb-stats-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="rb-stats-dot"></div>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Compilation Ready</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Threats Selected</span>
              <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '16px' }}>{reportBuilderSelection.incident_ids.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>CVEs Selected</span>
              <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '16px' }}>{reportBuilderSelection.cve_ids.length}</span>
            </div>
          </div>

          {/* History */}
          <div className="rb-config-panel glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <label className="rb-config-label" style={{ margin: 0 }}>Report History</label>
              <History size={14} color="var(--text-muted)" />
            </div>
            <div className="rb-scroll" style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reportHistoryLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}><RefreshCw size={16} className="animate-spin" color="var(--primary)" /></div>
              ) : reportHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                  No history available.
                </div>
              ) : reportHistory.map(h => (
                <div key={h.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>{h.report_title}</div>
                    <button onClick={() => handleDeleteReportBuilderConfig(h.id)} style={{ color: 'var(--critical)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>{new Date(h.created_at).toLocaleString()}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => window.open(`${API_BASE}/reports/builder/download/${h.id}/pdf`, '_blank')} className="btn-mini-pdf">PDF</button>
                    <button onClick={() => window.open(`${API_BASE}/reports/builder/download/${h.id}/docx`, '_blank')} className="btn-mini-docx">DOCX</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Discovery Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Threats Table */}
          {reportBuilderFilters.sources.includes('crawl') && (
            <div className="rb-discovery-card glass-card">
              <div className="rb-discovery-header">
                <h3><ShieldAlert size={16} color="#818cf8" /> Threat Intelligence ({reportBuilderData.incidents.length})</h3>
                <button 
                  className="rb-select-all-btn"
                  onClick={() => {
                    const allIds = reportBuilderData?.incidents?.map(i => i.id) || [];
                    const allSelected = allIds.length > 0 && allIds.every(id => reportBuilderSelection?.incident_ids?.includes(id));
                    setReportBuilderSelection(prev => ({...prev, incident_ids: allSelected ? [] : allIds}));
                  }}
                >
                  {reportBuilderSelection.incident_ids.length === reportBuilderData.incidents.length ? 'Unselect All' : 'Select All'}
                </button>
              </div>
              <div className="rb-scroll" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <tbody>
                    {reportBuilderData?.incidents?.map(inc => (
                      <tr key={inc.id} className={`rb-row ${reportBuilderSelection?.incident_ids?.includes(inc.id) ? 'selected' : ''}`} onClick={() => {
                        const ids = reportBuilderSelection?.incident_ids?.includes(inc.id)
                          ? reportBuilderSelection.incident_ids.filter(x => x !== inc.id)
                          : [...(reportBuilderSelection?.incident_ids || []), inc.id];
                        setReportBuilderSelection({...reportBuilderSelection, incident_ids: ids});
                      }}>
                        <td style={{ width: '40px', paddingLeft: '20px' }}>
                          <div className={`rb-checkbox ${reportBuilderSelection?.incident_ids?.includes(inc.id) ? 'checked' : ''}`}>
                            {reportBuilderSelection?.incident_ids?.includes(inc.id) && <Check size={12} />}
                          </div>
                        </td>
                        <td style={{ width: '100px' }}><span className={`badge ${(inc.severity || 'Low').toLowerCase()}`}>{inc.severity}</span></td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>{inc.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{inc.happened_at ? new Date(inc.happened_at).toLocaleDateString() : 'N/A'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CVEs Table */}
          {reportBuilderFilters.sources.includes('cve') && (
            <div className="rb-discovery-card glass-card">
              <div className="rb-discovery-header">
                <h3><Database size={16} color="#c084fc" /> CVE Landscape ({reportBuilderData.cves.length})</h3>
                <button 
                  className="rb-select-all-btn purple"
                  onClick={() => {
                    const allIds = reportBuilderData?.cves?.map(c => c.id) || [];
                    const allSelected = allIds.length > 0 && allIds.every(id => reportBuilderSelection?.cve_ids?.includes(id));
                    setReportBuilderSelection(prev => ({...prev, cve_ids: allSelected ? [] : allIds}));
                  }}
                >
                  {reportBuilderSelection.cve_ids.length === reportBuilderData.cves.length ? 'Unselect All' : 'Select All'}
                </button>
              </div>
              <div className="rb-scroll" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <tbody>
                    {reportBuilderData?.cves?.map(cve => (
                      <tr key={cve.id} className={`rb-row ${reportBuilderSelection?.cve_ids?.includes(cve.id) ? 'selected-purple' : ''}`} onClick={() => {
                        const ids = reportBuilderSelection?.cve_ids?.includes(cve.id)
                          ? reportBuilderSelection.cve_ids.filter(x => x !== cve.id)
                          : [...(reportBuilderSelection?.cve_ids || []), cve.id];
                        setReportBuilderSelection({...reportBuilderSelection, cve_ids: ids});
                      }}>
                        <td style={{ width: '40px', paddingLeft: '20px' }}>
                          <div className={`rb-checkbox purple ${reportBuilderSelection?.cve_ids?.includes(cve.id) ? 'checked' : ''}`}>
                            {reportBuilderSelection?.cve_ids?.includes(cve.id) && <Check size={12} />}
                          </div>
                        </td>
                        <td style={{ width: '100px' }}><span className={`badge ${(cve.severity || 'Low').toLowerCase()}`}>{cve.severity}</span></td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: '13px' }}>{cve.cve_id}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cve.company_name} / {cve.product_name}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ReportBuilder;
