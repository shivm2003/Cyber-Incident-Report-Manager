import React from 'react';
import { X, ChevronRight, RefreshCw } from 'lucide-react';

const AIWorkflowModal = ({ data, onClose, theme, model }) => {
  if (!data) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{
        background: '#0a0a0c',
        border: '1px solid #1e1e26',
        maxWidth: '900px',
        padding: '0'
      }}>
        <div style={{
          padding: '20px 30px',
          borderBottom: '1px solid #1e1e26',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #0a0a0c, #16161d)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 10px #a855f7' }}></div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>REPORT AI PROCESSING PIPELINE</h2>
            </div>
            <p style={{ margin: '4px 0 0 18px', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Real-time Forensic Extraction & Restructuring</p>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '8px', borderRadius: '50%', color: '#666' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '30px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* STEP 1: DATA INGESTION */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900 }}>1</div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>Stage: Intelligence Ingestion</h3>
            </div>
            <div style={{ padding: '20px', background: '#121218', border: '1px solid #1e1e26', borderRadius: '12px' }}>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px' }}>Consolidating telemetry and source evidence for AI analysis...</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ background: '#0a0a0c', padding: '12px', borderRadius: '6px', border: '1px solid #1a1a20' }}>
                  <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 800, marginBottom: '6px' }}>CORE DESCRIPTION</div>
                  <div style={{ fontSize: '12px', color: '#ccc', maxHeight: '120px', overflowY: 'auto' }}>{data.incident?.description?.substring(0, 1000)}...</div>
                </div>
                <div style={{ background: '#0a0a0c', padding: '12px', borderRadius: '6px', border: '1px solid #1a1a20' }}>
                  <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 800, marginBottom: '6px' }}>CRAWLED EVIDENCE</div>
                  <div style={{ fontSize: '12px', color: '#ccc', maxHeight: '120px', overflowY: 'auto' }}>{data.incident?.crawled_content?.substring(0, 1000) || "No source content available."}</div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: GEMMA REASONING */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900 }}>2</div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>Stage: LLM Reasoning ({model || 'gemma4:e4b'})</h3>
            </div>
            <div style={{ padding: '20px', background: '#121218', border: '1px solid #1e1e26', borderRadius: '12px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Executing instruction-tuned forensic prompt...</p>
                {data.report?._debug_prompt && (
                  <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>RAW PAYLOAD CAPTURED</span>
                )}
              </div>
              
              <div style={{
                background: '#000',
                padding: '15px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#10b981',
                lineHeight: '1.5',
                border: '1px solid #10b98122',
                maxHeight: '250px',
                overflowY: 'auto'
              }}>
                <div style={{ color: '#666', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>// TECHNICAL_PAYLOAD_SENT_TO_GEMMA</span>
                  <span style={{ color: '#444' }}>TOKEN_COUNT: ~{(data.report?._debug_prompt?.length / 4).toFixed(0)}</span>
                </div>
                {data.report?._debug_prompt ? (
                  <div style={{ whiteSpace: 'pre-wrap', color: '#888' }}>
                    {data.report._debug_prompt}
                  </div>
                ) : (
                  <div>"You are a Senior Cyber Forensic Analyst. Analyze the incident: <span style={{ color: '#fff' }}>{data.incident?.title}</span> and provide a forensic deep-dive in JSON format with 14 keys including root_cause, business_impact, and breach_process..."</div>
                )}
                
                {data.status === 'processing' && (
                  <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Inference active: Generating structured forensic intelligence...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 3: DATA RESTRUCTURING */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900 }}>3</div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>Stage: Report Reconstruction</h3>
            </div>
            <div style={{ padding: '20px', background: '#121218', border: '1px solid #1e1e26', borderRadius: '12px' }}>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px' }}>Mapping raw AI output to professional report schema...</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#0a0a0c', borderRadius: '4px', fontSize: '11px', border: '1px solid #1a1a20' }}>
                  <span style={{ color: '#666', fontFamily: 'monospace' }}>RAW_JSON.root_cause</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#444' }}>
                    <span style={{ fontSize: '9px' }}>MAPPING</span>
                    <ChevronRight size={12} />
                  </div>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>report.technical_vector</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#0a0a0c', borderRadius: '4px', fontSize: '11px', border: '1px solid #1a1a20' }}>
                  <span style={{ color: '#666', fontFamily: 'monospace' }}>RAW_JSON.breach_process</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#444' }}>
                    <span style={{ fontSize: '9px' }}>MAPPING</span>
                    <ChevronRight size={12} />
                  </div>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>report.breach_timeline</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#0a0a0c', borderRadius: '4px', fontSize: '11px', border: '1px solid #1a1a20' }}>
                  <span style={{ color: '#666', fontFamily: 'monospace' }}>RAW_JSON.official_report</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#444' }}>
                    <span style={{ fontSize: '9px' }}>MAPPING</span>
                    <ChevronRight size={12} />
                  </div>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>report.executive_statement</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 30px', background: '#0a0a0c', borderTop: '1px solid #1e1e26', textAlign: 'right' }}>
          <button className="btn-primary" onClick={onClose} style={{ borderRadius: '6px', fontSize: '12px', padding: '10px 24px' }}>Close Pipeline View</button>
        </div>
      </div>
    </div>
  );
};

export default AIWorkflowModal;
