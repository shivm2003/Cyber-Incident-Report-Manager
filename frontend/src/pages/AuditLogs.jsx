import React from 'react';
import { Terminal, ShieldCheck, Database, Zap } from 'lucide-react';

const AuditLogs = ({ auditLogs }) => {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>Intelligence Audit Log</h2>
        <p style={{ color: 'var(--text-muted)' }}>Historical trace of automated and manual intelligence synchronization sessions</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {auditLogs.map(session => (
          <div 
            key={session.session_id} 
            className="intel-card" 
            style={{ 
              padding: '24px', 
              borderLeft: '4px solid #a855f7',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              borderLeftWidth: '4px',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  background: 'rgba(168, 85, 247, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#a855f7'
                }}>
                  {session.pull_type === 'Manual CVE Pull' ? <ShieldCheck size={24} /> : 
                   session.pull_type === 'Advanced Intelligence Pull' ? <Zap size={24} /> : 
                   <Database size={24} />}
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#a855f7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>{session.pull_type}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>Session: {session.session_id.substring(0, 12)}...</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(session.timestamp).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-main)' }}>{session.count}</div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Items Extracted</div>
              </div>
            </div>
            
            {/* CVE Items List */}
            {session.items && session.items.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700, textTransform: 'uppercase' }}>Identified Vulnerabilities:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {session.items.map(item => (
                    <div 
                      key={item.id} 
                      style={{ 
                        background: 'rgba(168, 85, 247, 0.05)', 
                        border: '1px solid rgba(168, 85, 247, 0.2)', 
                        borderRadius: '6px', 
                        padding: '4px 10px',
                        fontSize: '11px',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Database size={10} color="#a855f7" />
                      {item.cve_id}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {auditLogs.length === 0 && (
          <div style={{ 
            padding: '80px', 
            textAlign: 'center', 
            background: 'var(--bg-card)', 
            borderRadius: '20px', 
            border: '1px dashed var(--border)' 
          }}>
            <Terminal size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No synchronization logs found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
