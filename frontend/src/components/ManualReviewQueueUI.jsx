import React, { useState } from 'react';
import { Shield, Check } from 'lucide-react';

const ManualReviewQueueUI = ({ queue, onUpdateStatus, onSelectItem }) => {
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents' or 'cves'

  const items = activeTab === 'incidents' ? queue.incidents : queue.cves;

  return (
    <div className="review-queue-container fade-in">
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <button 
          className={`nav-item ${activeTab === 'incidents' ? 'active' : ''}`} 
          onClick={() => setActiveTab('incidents')}
          style={{ flex: 1, margin: 0, justifyContent: 'center' }}
        >
          Intelligence Incidents ({queue.incidents.length})
        </button>
        <button 
          className={`nav-item ${activeTab === 'cves' ? 'active' : ''}`} 
          onClick={() => setActiveTab('cves')}
          style={{ flex: 1, margin: 0, justifyContent: 'center' }}
        >
          NVD Vulnerabilities ({queue.cves.length})
        </button>
      </div>

      <div className="intel-table-container glass-card" style={{ border: '1px solid var(--border)' }}>
        <table className="intel-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '120px', textAlign: 'center' }}>PROXIMITY</th>
              <th>THREAT VECTOR</th>
              <th>FORENSIC REASONING</th>
              <th style={{ width: '250px', textAlign: 'center' }}>RESOLUTIONS</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="intel-row">
                <td>
                  <div style={{ 
                    color: item.company_impact_score > 80 ? '#ef4444' : '#f59e0b', 
                    fontWeight: 900, 
                    fontSize: '24px', 
                    textAlign: 'center',
                    textShadow: `0 0 10px ${item.company_impact_score > 80 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                  }}>
                    {item.company_impact_score}%
                  </div>
                </td>
                <td style={{ maxWidth: '400px', cursor: 'pointer' }} onClick={() => onSelectItem(item)}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ 
                      background: activeTab === 'incidents' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(168, 85, 247, 0.1)', 
                      color: activeTab === 'incidents' ? '#818cf8' : '#a855f7', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      fontSize: '10px', 
                      fontWeight: 900,
                      border: `1px solid ${activeTab === 'incidents' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`
                    }}>
                      {activeTab === 'incidents' ? `INC-${item.id}` : item.cve_id}
                    </span>
                    
                    {item.detection_method && (
                      <span style={{ 
                        background: item.detection_method.includes('Version') ? 'rgba(245, 158, 11, 0.1)' : item.detection_method.includes('Industry') ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                        color: item.detection_method.includes('Version') ? '#f59e0b' : item.detection_method.includes('Industry') ? '#818cf8' : '#10b981', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '9px', 
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        border: `1px solid ${item.detection_method.includes('Version') ? 'rgba(245, 158, 11, 0.2)' : item.detection_method.includes('Industry') ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                      }}>
                        {item.detection_method}
                      </span>
                    )}

                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)', width: '100%' }}>
                      {activeTab === 'incidents' ? item.title : 'NVD Vulnerability Detected'}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }} className="text-truncate-2">
                    {item.description}
                  </div>
                  {item.extracted_versions && Object.keys(item.extracted_versions).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                      {Object.entries(item.extracted_versions).map(([prod, vers]) => (
                        <span key={prod} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          {prod} Threat Range: {Array.isArray(vers) ? vers.join(', ') : vers}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.heuristic_match_details && item.heuristic_match_details.length > 0 && (
                    <div style={{ marginTop: '12px', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Version Overlaps:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.heuristic_match_details.map((m, idx) => (
                          <div key={idx} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>• {m.product}</span>
                            <span style={{ color: 'var(--text-muted)' }}>({m.inventory_version} matches threat {m.threat_versions})</span>
                            <span style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>{m.match_type.replace('_', ' ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-main)', 
                    background: 'rgba(0, 242, 255, 0.03)', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-bright)',
                    lineHeight: '1.6'
                  }}>
                    {item.company_impact_reason}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '10px', padding: '0 20px' }}>
                    <button 
                      className="btn-primary" 
                      style={{ fontSize: '11px', padding: '10px 16px', flex: 1, borderRadius: '10px' }}
                      onClick={() => onUpdateStatus(item.id, activeTab === 'incidents' ? 'incident' : 'cve', 'Reviewed')}
                    >
                      <Check size={14} style={{ marginRight: '6px' }} /> Mitigate
                    </button>
                    <button 
                      className="btn-ghost" 
                      style={{ fontSize: '11px', padding: '10px 16px', border: '1px solid var(--border)', borderRadius: '10px' }}
                      onClick={() => onUpdateStatus(item.id, activeTab === 'incidents' ? 'incident' : 'cve', 'Dismissed')}
                    >
                      Dismiss
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '100px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <Shield size={40} style={{ opacity: 0.3 }} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-main)' }}>NEURAL CLEARANCE</div>
                  <p style={{ marginTop: '8px', fontSize: '13px' }}>No pending threats require manual resolution at this time.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManualReviewQueueUI;
