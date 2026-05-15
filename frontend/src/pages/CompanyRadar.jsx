import React, { useState } from 'react';
import { 
  Settings, RefreshCw, Zap, Shield, Database, Activity, FileText, 
  ArrowRight, Search, UserCheck, Bell, Filter, ShieldAlert, Cpu, Server, Network
} from 'lucide-react';

const CompanyRadar = ({
  incidents, cves = [], companyProfile, setSelectedRawIncident, setView,
  handleCompanyScan, handleStopScan, reviewQueue, companyScanning, scanProgress
}) => {
  const [engineView, setEngineView] = useState('heuristic'); // 'heuristic' | 'ai'

  // Combine Incidents and CVEs into a unified threat pool
  const unifiedThreats = [
    ...incidents.map(i => ({ ...i, source_type: 'incident' })),
    ...cves.map(c => ({ ...c, source_type: 'cve' }))
  ];

  // Filter based on detection method and sort by impact score
  const heuristicThreats = unifiedThreats.filter(t => t.detection_method === 'Heuristic').sort((a, b) => (b.company_impact_score || 0) - (a.company_impact_score || 0));
  const aiThreats = unifiedThreats.filter(t => t.detection_method === 'AI Map').sort((a, b) => (b.company_impact_score || 0) - (a.company_impact_score || 0));

  // Active dataset based on view
  const activeThreats = engineView === 'heuristic' ? heuristicThreats : aiThreats;

  // Reusable Step Component for Flowchart
  const FlowStep = ({ icon, label, sub, color, pulse, delay }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '120px' }}>
      <div 
        className="glass-card"
        style={{ 
          width: '70px', 
          height: '70px', 
          borderRadius: '18px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: color,
          border: `1px solid ${color}40`,
          boxShadow: pulse ? `0 0 20px ${color}33` : `0 8px 16px rgba(0,0,0,0.2)`,
          background: `linear-gradient(145deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2))`,
          position: 'relative',
          zIndex: 2,
          animation: pulse ? `pulse-glow 2s infinite ${delay || '0s'}` : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        {icon}
        {pulse && (
          <div style={{ 
            position: 'absolute', 
            top: '-4px', 
            right: '-4px', 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            background: color, 
            boxShadow: `0 0 12px ${color}`
          }}></div>
        )}
      </div>
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>{sub}</div>
      </div>
    </div>
  );

  const FlowArrow = () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '30px', zIndex: 1 }}>
      <div style={{ height: '2px', background: 'var(--border)', flex: 1, position: 'relative' }}>
         <ArrowRight size={14} color="var(--text-muted)" style={{ position: 'absolute', right: '-6px', top: '-6px', background: '#0a0a0f' }} />
      </div>
    </div>
  );

  return (
    <div className="radar-v3-container fade-in" style={{ paddingBottom: '40px' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 900, background: 'linear-gradient(90deg, #fff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dual-Engine Impact Radar
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', maxWidth: '600px' }}>
            Autonomous threat processing pipeline. Select an engine to view its specific processing flow and the exact threats it isolated against your inventory.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-ghost" onClick={() => setView('inventory')}><Settings size={14} /> Adjust Stack</button>
          <button 
            className="btn-ghost" 
            onClick={() => handleCompanyScan(false, engineView)}
            style={{ border: '1px solid #10b981', color: '#10b981', padding: '10px 16px', fontSize: '12px' }}
          >
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> New Threat Scan
          </button>
          <button 
            className="btn-ghost" 
            onClick={() => handleCompanyScan(true, engineView)}
            style={{ border: '1px solid #ef4444', color: '#ef4444', padding: '10px 16px', fontSize: '12px' }}
          >
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> Full Scan
          </button>
        </div>
      </div>

      {/* Real-time Scan Progress */}
      {companyScanning && (
        <div className="glass-card fade-in" style={{ padding: '24px', marginBottom: '32px', border: '1px solid var(--primary)', background: 'rgba(99, 102, 241, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} className="animate-spin" color={scanProgress.activeEngine === 'heuristic' ? '#10b981' : '#818cf8'} />
              {scanProgress.activeEngine === 'heuristic' ? 'Heuristic Engine Active...' : 'AI Engine (Gemma) Active...'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>
                {scanProgress.percentage}%
              </div>
              <button 
                onClick={handleStopScan}
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
              >
                STOP SCAN
              </button>
            </div>
          </div>
          
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ width: `${scanProgress.percentage}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', transition: 'width 0.5s ease' }}></div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)' }}>{scanProgress.scanned} / {scanProgress.total}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, marginTop: '4px' }}>RECORDS SCANNED</div>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444' }}>{scanProgress.threatsYes}</div>
              <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 800, marginTop: '4px' }}>IMPACT FOUND</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>{scanProgress.threatsNo}</div>
              <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 800, marginTop: '4px' }}>NO IMPACT</div>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#f59e0b' }}>{scanProgress.threatsPending}</div>
              <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800, marginTop: '4px' }}>PENDING SCAN</div>
            </div>
          </div>
        </div>
      )}

      {/* Engine Toggle Buttons */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
        <button 
          onClick={() => setEngineView('heuristic')}
          style={{
            flex: 1,
            padding: '24px',
            borderRadius: '16px',
            border: `2px solid ${engineView === 'heuristic' ? '#10b981' : 'var(--border)'}`,
            background: engineView === 'heuristic' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: engineView === 'heuristic' ? '0 0 30px rgba(16, 185, 129, 0.1)' : 'none'
          }}
        >
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px', marginBottom: '12px', color: '#10b981' }}>
            <Database size={28} />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '1px' }}>HEURISTIC ENGINE</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Deterministic Exact-Match Scanning</div>
          <div style={{ marginTop: '16px', fontSize: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontWeight: 800 }}>
            {heuristicThreats.length} THREATS ISOLATED
          </div>
        </button>

        <button 
          onClick={() => setEngineView('ai')}
          style={{
            flex: 1,
            padding: '24px',
            borderRadius: '16px',
            border: `2px solid ${engineView === 'ai' ? '#818cf8' : 'var(--border)'}`,
            background: engineView === 'ai' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: engineView === 'ai' ? '0 0 30px rgba(99, 102, 241, 0.1)' : 'none'
          }}
        >
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '12px', marginBottom: '12px', color: '#818cf8' }}>
            <Cpu size={28} />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '1px' }}>AI ENGINE (GEMMA)</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Probabilistic Contextual Risk Scoring</div>
          <div style={{ marginTop: '16px', fontSize: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '4px 12px', borderRadius: '20px', fontWeight: 800 }}>
            {aiThreats.length} THREATS ISOLATED
          </div>
        </button>
      </div>

      {/* Pipeline Flowchart Visualization */}
      <div className="glass-card fade-in" style={{ padding: '40px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '40px', textAlign: 'center' }}>
          {engineView === 'heuristic' ? 'Deterministic Processing Pipeline' : 'Contextual Intelligence Pipeline'}
        </h3>
        
        {engineView === 'heuristic' ? (
          /* HEURISTIC FLOWCHART */
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '900px', margin: '0 auto' }}>
            <FlowStep icon={<Zap size={24} />} label="Threat Arrives" sub="CVE / RSS Data" color="#f59e0b" pulse delay="0s" />
            <FlowArrow />
            <FlowStep icon={<Filter size={24} />} label="Header Filter" sub="Tech Stack Match" color="#10b981" pulse delay="0.5s" />
            <FlowArrow />
            <FlowStep icon={<Database size={24} />} label="Exact Match" sub="Saved Inventory" color="#10b981" pulse delay="1s" />
            <FlowArrow />
            <FlowStep icon={<ShieldAlert size={24} />} label="Review Queue" sub="Analyst Action" color="#ef4444" pulse delay="1.5s" />
          </div>
        ) : (
          /* AI FLOWCHART */
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1000px', margin: '0 auto' }}>
            <FlowStep icon={<Zap size={22} />} label="Threat Arrives" sub="Raw Intelligence" color="#f59e0b" />
            <FlowArrow />
            <FlowStep icon={<Network size={22} />} label="Pass Headers" sub="Full Context" color="#818cf8" pulse delay="0s" />
            <FlowArrow />
            <FlowStep icon={<Search size={22} />} label="Fuzzy Match" sub="Deep Inventory" color="#a855f7" pulse delay="0.3s" />
            <FlowArrow />
            <FlowStep icon={<Activity size={22} />} label="Risk Score" sub="Gemma Analysis" color="#ec4899" pulse delay="0.6s" />
            <FlowArrow />
            <FlowStep icon={<ShieldAlert size={22} />} label="Review Queue" sub="Pending Action" color="#ef4444" pulse delay="0.9s" />
            <FlowArrow />
            <FlowStep icon={<UserCheck size={22} />} label="Validation" sub="Analyst Sign-off" color="#10b981" />
            <FlowArrow />
            <FlowStep icon={<Bell size={22} />} label="Alert & Report" sub="CISO Dispatch" color="#3b82f6" />
          </div>
        )}
      </div>

      {/* Main Content Area Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        
        {/* Engine-Specific Threat List */}
        <div className="glass-card fade-in" style={{ padding: '24px', minHeight: '400px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             {engineView === 'heuristic' ? <Database size={18} color="#10b981" /> : <Cpu size={18} color="#818cf8" />}
             Threats Caught by {engineView === 'heuristic' ? 'Heuristic Match' : 'AI Analysis'}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeThreats.length > 0 ? activeThreats.map(inc => (
              <div 
                key={`${inc.source_type}-${inc.id || inc.cve_id}`} 
                className="hover-card"
                style={{ 
                  padding: '16px', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border)', 
                  borderLeft: `4px solid ${inc.company_impact_score >= 70 ? '#ef4444' : '#f59e0b'}`,
                  borderRadius: '8px', 
                  cursor: inc.source_type === 'incident' ? 'pointer' : 'default',
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 100px',
                  gap: '16px',
                  alignItems: 'center'
                }} 
                onClick={() => { if(inc.source_type === 'incident') setSelectedRawIncident(inc); }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: inc.company_impact_score >= 70 ? '#ef4444' : '#f59e0b' }}>
                    {inc.company_impact_score || 0}%
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)', marginTop: '4px' }}>CONFIDENCE</div>
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {inc.source_type === 'cve' ? (
                      <span style={{ fontSize: '8px', fontWeight: 900, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>VULNERABILITY</span>
                    ) : (
                      <span style={{ fontSize: '8px', fontWeight: 900, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>INCIDENT</span>
                    )}
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {inc.cve_id ? inc.cve_id : inc.title}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }} className="text-truncate-2">
                    {inc.company_impact_reason}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    background: inc.review_status === 'Pending' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: inc.review_status === 'Pending' ? '#ef4444' : '#10b981',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${inc.review_status === 'Pending' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                  }}>
                    {inc.review_status || 'Unknown'}
                  </span>
                </div>
              </div>
            )) : (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                 <Shield size={40} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                 <div style={{ fontSize: '14px', fontWeight: 800 }}>Clear Skies</div>
                 <div style={{ fontSize: '12px', marginTop: '8px' }}>This engine has not detected any matching threats currently.</div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Review Status Section */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} color="#f59e0b" /> Action Required
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#ef4444' }}>{reviewQueue.incidents.length + reviewQueue.cves.length}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, marginTop: '4px' }}>TOTAL PENDING</div>
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--border)' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981' }}>{incidents.filter(i => i.review_status === 'Reviewed').length}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, marginTop: '4px' }}>RESOLVED</div>
              </div>
            </div>
            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '20px', fontSize: '12px', fontWeight: 800 }} 
              onClick={() => setView('review')}
            >
              Open Review Console
            </button>
          </div>

          {/* Tech Stack Summary */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={16} color="#3b82f6" /> Inventory State
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {companyProfile.tech_stack.map((tech, idx) => (
                <span key={idx} style={{ 
                  fontSize: '11px', 
                  fontWeight: 600,
                  background: 'rgba(59, 130, 246, 0.1)', 
                  color: '#60a5fa',
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  border: '1px solid rgba(59, 130, 246, 0.2)' 
                }}>
                  {tech}
                </span>
              ))}
              {companyProfile.tech_stack.length === 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '10px', width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  No technologies configured in inventory.
                </span>
              )}
            </div>
            <button 
              className="btn-ghost" 
              style={{ width: '100%', marginTop: '20px', fontSize: '11px' }} 
              onClick={() => setView('inventory')}
            >
              Manage Inventory
            </button>
          </div>

        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 20px 5px rgba(255,255,255,0.2); transform: scale(1.02); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.1); }
        }
      `}} />
    </div>
  );
};

export default CompanyRadar;
