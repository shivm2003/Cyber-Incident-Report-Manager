import React from 'react';
import { Download, FileText } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const ImpactReports = ({
  reports, activeReport, setActiveReport, handlePublishReport, handleDeleteReport
}) => {
  // Helper to parse and render chronological breach timeline
  const renderBreachProcess = (processData) => {
    if (!processData) return <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Timeline details pending forensic capture.</div>;
    let steps = [];
    try {
      // Handle potential JSON stringified array/object
      const parsed = JSON.parse(processData);
      if (Array.isArray(parsed)) {
        steps = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        steps = Object.values(parsed);
      }
    } catch (e) {
      if (typeof processData === 'string') {
        // Try parsing stringified raw lists or split by lines/bullets
        steps = processData
          .split(/\n+/)
          .map(s => s.trim().replace(/^-\s*|^\d+\.\s*|^Step\s*\d+:\s*/i, ''))
          .filter(Boolean);
      }
    }

    if (steps.length === 0 && typeof processData === 'string') {
      steps = [processData];
    }

    return (
      <div className="timeline-steps" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
        {steps.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
            {idx < steps.length - 1 && (
              <div style={{
                position: 'absolute',
                left: '19px',
                top: '36px',
                bottom: '-20px',
                width: '2px',
                background: 'linear-gradient(to bottom, var(--primary), transparent)'
              }} />
            )}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(0, 242, 255, 0.1)',
              border: '1px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 800,
              color: 'var(--primary)',
              flexShrink: 0
            }}>
              {idx + 1}
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid var(--border)',
              padding: '16px 20px',
              borderRadius: '14px',
              flex: 1,
              fontSize: '13px',
              color: 'var(--text-main)',
              lineHeight: '1.5'
            }}>
              {step}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getClassificationColor = (classification) => {
    const cls = (classification || '').toLowerCase();
    if (cls.includes('restricted') || cls.includes('secret') || cls.includes('confidential')) return 'var(--critical)';
    if (cls.includes('internal')) return 'var(--medium)';
    return 'var(--low)';
  };

  return (
    <div className="impact-view-container fade-in">
      <div className="impact-sidebar glass-card" style={{ width: '320px', padding: '0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="var(--primary)" /> Analysis Archive
          </h3>
        </div>
        <div className="reports-list" style={{ flex: 1, overflowY: 'auto' }}>
          {reports.map(rep => (
            <div 
              key={rep.id} 
              className={`report-item ${activeReport?.id === rep.id ? 'active' : ''}`} 
              onClick={() => setActiveReport(rep)}
              style={{ padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease' }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: activeReport?.id === rep.id ? 'var(--primary)' : 'var(--text-main)' }}>
                {rep.incident_title || `AI Report #${rep.id}`}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(rep.created_at).toLocaleDateString()}</div>
            </div>
          ))}
          {reports.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No forensic reports archived yet.
            </div>
          )}
        </div>
      </div>

      <div className="report-detail-container" style={{ flex: 1, marginLeft: '24px', overflowY: 'auto' }}>
        {activeReport ? (
          <div className="cso-report-document fade-in">
            {/* Header section with Metadata */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', borderBottom: '1px solid var(--border)', paddingBottom: '28px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '9px', background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', fontWeight: 800, padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Security Operations Intelligence
                  </span>
                  <span style={{ fontSize: '9px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 800, padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Forensic Dossier
                  </span>
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, color: 'var(--text-main)', lineHeight: '1.2' }}>
                  {activeReport.incident_title}
                </h1>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  <strong>Origin/Source Incident:</strong> {activeReport.incident_title}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  REPORT ID: #{activeReport.id}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  DATE: {new Date(activeReport.created_at).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn-mini-pdf" 
                    onClick={() => window.open(`${API_BASE}/reports/${activeReport.id}/download/pdf`, '_blank')}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    PDF EXPORT
                  </button>
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '10px', borderRadius: '8px', boxShadow: 'none' }} onClick={() => handlePublishReport(activeReport.id)}>PUBLISH</button>
                  <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '10px', borderRadius: '8px' }} onClick={() => handleDeleteReport(activeReport.id)}>DELETE</button>
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="report-body" style={{ lineHeight: '1.6', fontSize: '14px' }}>
              
              {/* Executive Summary */}
              <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                  Executive Summary & Assessment
                </h3>
                <div className="cso-summary-box" style={{ padding: '20px 24px', borderRadius: '12px', fontSize: '13.5px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                  {activeReport.official_report || 'Summary details pending AI compilation.'}
                </div>
              </section>

              {/* Exposure Scope Metrics */}
              <section style={{ marginBottom: '32px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 24px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 16px 0', letterSpacing: '1px' }}>
                  Impact & Exposure Scope
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Data Classification</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: getClassificationColor(activeReport.data_classification), marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getClassificationColor(activeReport.data_classification) }}></span>
                      {activeReport.data_classification || 'Pending Review'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Affected Scope</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                      {activeReport.affected_customers || 'Assessment ongoing'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Attack Vector</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                      {activeReport.attack_type || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Fetched Date</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                      {activeReport.incident?.date_collected ? new Date(activeReport.incident.date_collected).toLocaleString() : new Date(activeReport.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Collected From</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {activeReport.incident?.source || 'Intel Feed'}
                      {activeReport.incident?.link && (
                        <a 
                          href={activeReport.incident.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '11px', fontWeight: 800 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          [Source Link]
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Threat Profile & Breach Process */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px', marginBottom: '32px' }}>
                <section>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                    Threat Vector Profile
                  </h3>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Breach Method</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '2px', fontWeight: 500 }}>{activeReport.breach_method || 'Under investigation'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Root Cause Vulnerability</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px', fontStyle: 'italic', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                        {activeReport.root_cause || 'Root cause identification ongoing.'}
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                    Chronological Breach Timeline
                  </h3>
                  {renderBreachProcess(activeReport.breach_process)}
                </section>
              </div>

              {/* Impact Deep-Dive Matrix */}
              <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                  C-Suite Business Impact Matrix
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  <div className="cso-impact-card" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', borderLeft: '3px solid var(--primary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Business Continuity</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{activeReport.business_impact || 'Impact evaluation pending.'}</div>
                  </div>
                  <div className="cso-impact-card" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', borderLeft: '3px solid #f59e0b' }}>
                    <div style={{ fontWeight: 800, fontSize: '11px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Financial Exposure</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{activeReport.financial_impact || 'Impact evaluation pending.'}</div>
                  </div>
                  <div className="cso-impact-card" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', borderLeft: '3px solid var(--low)' }}>
                    <div style={{ fontWeight: 800, fontSize: '11px', color: 'var(--low)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Systems & Operations</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{activeReport.operational_impact || 'Impact evaluation pending.'}</div>
                  </div>
                  <div className="cso-impact-card" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', borderLeft: '3px solid var(--critical)' }}>
                    <div style={{ fontWeight: 800, fontSize: '11px', color: 'var(--critical)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Reputation & Trust</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{activeReport.reputational_impact || 'Impact evaluation pending.'}</div>
                  </div>
                </div>
              </section>

              {/* Technical Forensic Deep Dive */}
              <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                  Technical Forensic Analysis
                </h3>
                <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', padding: '24px', borderRadius: '16px', fontSize: '13.5px', lineHeight: '1.8', color: 'var(--text-main)' }}>
                  {activeReport.technical_analysis ? (
                    <div dangerouslySetInnerHTML={{ __html: activeReport.technical_analysis.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>No technical analysis content available for this report.</p>
                  )}
                </div>
              </section>

              {/* Exfiltrated Intelligence */}
              <section style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                  Exfiltrated Assets & Compromised Data
                </h3>
                <div style={{ background: 'rgba(255, 77, 77, 0.03)', padding: '20px', borderRadius: '16px', fontSize: '13px', color: 'var(--critical)', border: '1px solid rgba(255, 77, 77, 0.15)', lineHeight: '1.6' }}>
                  {activeReport.data_involved || 'No specific data exfiltration detected.'}
                </div>
              </section>

              {/* Crawled Intelligence Source Content (Raw Data Summary in Footer) */}
              {activeReport.incident?.crawled_content && (
                <section style={{ borderTop: '1px dashed var(--border)', paddingTop: '24px', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 12px 0', letterSpacing: '1px' }}>
                    Crawled Intelligence Source Content
                  </h4>
                  <div style={{ background: 'rgba(0,0,0,0.1)', padding: '16px 20px', borderRadius: '12px', fontSize: '12px', color: 'var(--text-muted)', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.5', border: '1px solid var(--border)' }}>
                    {activeReport.incident.crawled_content}
                  </div>
                </section>
              )}
            </div>
            
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Confidential Intelligence Report • Generated by AI Command Core
            </div>
          </div>
        ) : (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--text-muted)',
            border: '2px dashed var(--border)',
            borderRadius: '20px'
          }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <p style={{ fontWeight: 600 }}>Select a forensic report from the archive to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImpactReports;
