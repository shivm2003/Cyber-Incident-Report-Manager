import React, { useState, useEffect } from 'react';

const TechnologyInventoryUI = ({ profile, onUpdate, isSaving }) => {
  const [localStack, setLocalStack] = useState(profile.tech_stack?.join(', ') || '');

  // Sync local state when profile is loaded from backend
  useEffect(() => {
    if (profile.tech_stack) {
      setLocalStack(profile.tech_stack.join(', '));
    }
  }, [profile.tech_stack]);

  return (
    <div className="inventory-manager-container fade-in">
      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>🏢 Core Technology Inventory</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '14px' }}>
          Define the products, vendors, and frameworks used in your organization to drive automated threat correlation.
        </p>

        {/* Current Active Inventory */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', margin: 0, letterSpacing: '1px' }}>Current Active Inventory</h3>
            {profile.last_updated && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                LAST SYNC: {new Date(profile.last_updated).toLocaleString()}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profile.tech_stack?.map((tech, i) => (
              <span key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>
                {tech}
              </span>
            ))}
            {(!profile.tech_stack || profile.tech_stack.length === 0) && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No items in inventory.</div>}
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: '40px' }}>
          <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)' }}>Update Technology Stack (Comma Separated)</label>
          <textarea 
            rows="6"
            value={localStack}
            onChange={e => setLocalStack(e.target.value)}
            placeholder="e.g. Microsoft Azure, AWS S3, React, Node.js, Vercel, Google Chrome, Windows 11..."
            style={{ padding: '20px', fontSize: '15px', lineHeight: '1.6', fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)' }}
          />
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PREVIEW NEW ITEMS:</span>
            {localStack.split(',').filter(t => t.trim()).map((tech, i) => (
              <span key={i} style={{ color: 'var(--primary)', fontSize: '10px', fontWeight: 700 }}>
                {tech.trim()}{i < localStack.split(',').filter(t => t.trim()).length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        </div>

        <button 
          className="btn-primary" 
          onClick={() => onUpdate({ 
            company_name: profile.company_name, 
            tech_stack: localStack.split(',').map(s => s.trim()).filter(s => s), 
            industry: profile.industry 
          })}
          disabled={isSaving}
          style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 900 }}
        >
          {isSaving ? 'Synchronizing Inventory...' : 'Update Inventory & Refresh Radar'}
        </button>
      </div>
    </div>
  );
};

export default TechnologyInventoryUI;
