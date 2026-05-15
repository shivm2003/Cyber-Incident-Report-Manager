import React from 'react';
import { Download, FileText } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const ImpactReports = ({
  reports, activeReport, setActiveReport, handlePublishReport
}) => {
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
              style={{ padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>{rep.incident_title || `AI Report #${rep.id}`}</div>
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
          <div className="cso-report-document fade-in" style={{ padding: '60px 80px', margin: '0 auto', maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '60px', borderBottom: '2px solid #1a1a1a', paddingBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Security Operations Intelligence</div>
                <h1 style={{ fontSize: '32px', fontWeight: 900, margin: 0, color: '#1a1a1a' }}>Forensic Impact Analysis</h1>
                <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>Target: {activeReport.incident_title}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a1a1a' }}>REPORT ID: {activeReport.id}</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>DATE: {new Date(activeReport.created_at).toLocaleDateString()}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                   <button 
                    className="btn-mini-pdf" 
                    onClick={() => window.open(`${API_BASE}/reports/${activeReport.id}/download/pdf`, '_blank')}
                  >
                    PDF EXPORT
                  </button>
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '10px' }} onClick={() => handlePublishReport(activeReport.id)}>PUBLISH</button>
                </div>
              </div>
            </div>
            
            <div className="report-body" style={{ lineHeight: '1.6', fontSize: '15px', color: '#1a1a1a' }}>
              <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#1e293b' }}>Executive Summary</h3>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #6366f1' }}>
                   {activeReport.official_report || 'Summary pending...'}
                </div>
              </section>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                <section>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '12px' }}>Incident Overview</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '13px' }}><strong>Attack Type:</strong> {activeReport.attack_type || 'N/A'}</div>
                    <div style={{ fontSize: '13px' }}><strong>Breach Method:</strong> {activeReport.breach_method || 'N/A'}</div>
                    <div style={{ fontSize: '13px' }}><strong>Data Classification:</strong> {activeReport.data_classification || 'N/A'}</div>
                  </div>
                </section>
                <section>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '12px' }}>Root Cause</h3>
                  <div style={{ fontSize: '13px', fontStyle: 'italic' }}>{activeReport.root_cause || 'Root cause analysis in progress...'}</div>
                </section>
              </div>

              <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#1e293b' }}>Impact Deep-Dive</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="impact-box">
                    <div style={{ fontWeight: 800, fontSize: '11px', color: '#6366f1', textTransform: 'uppercase' }}>Business Impact</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>{activeReport.business_impact || 'N/A'}</div>
                  </div>
                  <div className="impact-box">
                    <div style={{ fontWeight: 800, fontSize: '11px', color: '#f59e0b', textTransform: 'uppercase' }}>Financial Impact</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>{activeReport.financial_impact || 'N/A'}</div>
                  </div>
                  <div className="impact-box">
                    <div style={{ fontWeight: 800, fontSize: '11px', color: '#10b981', textTransform: 'uppercase' }}>Operational Impact</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>{activeReport.operational_impact || 'N/A'}</div>
                  </div>
                  <div className="impact-box">
                    <div style={{ fontWeight: 800, fontSize: '11px', color: '#ef4444', textTransform: 'uppercase' }}>Reputational Impact</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>{activeReport.reputational_impact || 'N/A'}</div>
                  </div>
                </div>
              </section>

              <section style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#1e293b' }}>Technical Forensic Analysis</h3>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  {activeReport.technical_analysis ? (
                    <div dangerouslySetInnerHTML={{ __html: activeReport.technical_analysis.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p>No technical analysis content available for this report.</p>
                  )}
                </div>
              </section>

              <section>
                <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '12px' }}>Exfiltrated Intelligence</h3>
                <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '6px', fontSize: '13px', color: '#991b1b', border: '1px solid #fee2e2' }}>
                  {activeReport.data_involved || 'No specific data exfiltration detected.'}
                </div>
              </section>
            </div>
            
            <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', fontSize: '10px', color: '#94a3b8', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
