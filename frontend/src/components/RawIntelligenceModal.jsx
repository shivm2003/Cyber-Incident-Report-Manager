import React from 'react';
import { X, Info, ExternalLink, Terminal, RefreshCw, ShieldAlert } from 'lucide-react';

const RawIntelligenceModal = ({ incident, onClose, theme, onRefresh }) => {
  const [recrawlLoading, setRecrawlLoading] = React.useState(false);

  const handleManualRecrawl = async () => {
    setRecrawlLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/incidents/${incident.id}/recrawl`, { method: 'POST' });
      const updated = await res.json();
      if (onRefresh) onRefresh(updated);
    } catch (e) {
      console.error("Recrawl failed:", e);
    } finally {
      setRecrawlLoading(false);
    }
  };

  if (!incident) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>
              Intelligence Details
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: 'var(--text-main)' }}>{incident.title || incident.cve_id}</h2>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '8px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="raw-data-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={14} /> Intelligence Summary</h4>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.6' }}>{incident.description}</p>
            </div>
          </div>

          {(incident.company_impact_reason || incident.company_impact_score > 0) && (
            <div className="raw-data-section">
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={14} color="#f59e0b" /> Impact Radar Assessment
              </h4>
              <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, color: incident.company_impact_score >= 60 ? '#ef4444' : '#f59e0b', marginBottom: '12px' }}>
                  Impact Score: {incident.company_impact_score}/100
                </div>
                {incident.company_impact_reason && (
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                    <strong>Reasoning:</strong> {incident.company_impact_reason}
                  </p>
                )}
                {incident.heuristic_match_details && incident.heuristic_match_details.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Specific Match Details:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-dim)' }}>
                      {incident.heuristic_match_details.map((detail, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>[{detail.type}]</span> {detail.tech || detail.product} 
                          {detail.target_version && ` (Version matched: ${detail.target_version})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="raw-data-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ExternalLink size={14} color="#3b82f6" /> Source Article Details (Crawled Content)</h4>
            <div style={{
              background: 'rgba(59, 130, 246, 0.05)',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '24px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              maxHeight: '300px',
              overflowY: 'auto',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--text-dim)',
              whiteSpace: 'pre-wrap'
            }}>
              {incident.crawled_content ? (
                incident.crawled_content
              ) : (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                  <p style={{ marginBottom: '15px' }}>No crawled content available for this intelligence source.</p>
                  {(!incident.cve_id && incident.id) && (
                    <button
                      className="btn-ghost"
                      onClick={handleManualRecrawl}
                      disabled={recrawlLoading}
                      style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '12px' }}
                    >
                      <RefreshCw size={14} className={recrawlLoading ? 'animate-spin' : ''} style={{ marginRight: '8px' }} />
                      {recrawlLoading ? 'Attempting High-Fidelity Recrawl...' : 'Trigger Manual High-Fidelity Recrawl'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="raw-data-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Terminal size={14} /> Raw Data Feed (JSON)</h4>
            <div className="raw-data-viewer" style={{ background: '#000', color: '#10b981', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', overflowX: 'auto', border: '1px solid #10b98122' }}>
              <pre>{incident.raw_data ? JSON.stringify(incident.raw_data, null, 2) : "// No raw payload captured for this incident."}</pre>
            </div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            {incident.link && (
              <a href={incident.link} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={16} /> Source Documentation
              </a>
            )}
            <button className="btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RawIntelligenceModal;
