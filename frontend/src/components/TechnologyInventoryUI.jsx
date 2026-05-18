import React, { useState, useEffect } from 'react';
import { Trash2, Plus, AlertTriangle, CheckCircle, Edit2, Save } from 'lucide-react';

const TechnologyInventoryUI = ({ profile, onUpdate, isSaving }) => {
  const [localStack, setLocalStack] = useState([]);
  const [localCompany, setLocalCompany] = useState(profile.company_name || '');
  const [localIndustry, setLocalIndustry] = useState(profile.industry || '');
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemVersion, setNewItemVersion] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editVersion, setEditVersion] = useState('');

  // Sync local state when profile is loaded from backend
  useEffect(() => {
    if (profile.tech_stack) {
      // Handle both string format and object format gracefully
      const formattedStack = profile.tech_stack.map(t => {
        if (typeof t === 'string') return { name: t, version: '' };
        return { name: t.name, version: t.version || '' };
      });
      setLocalStack(formattedStack);
    }
    if (profile.company_name) setLocalCompany(profile.company_name);
    if (profile.industry) setLocalIndustry(profile.industry);
  }, [profile]);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setLocalStack([...localStack, { name: newItemName.trim(), version: newItemVersion.trim() }]);
    setNewItemName('');
    setNewItemVersion('');
  };

  const handleRemoveItem = (index) => {
    const newStack = [...localStack];
    newStack.splice(index, 1);
    setLocalStack(newStack);
  };

  const handleEditVersion = (index) => {
    setEditingIndex(index);
    setEditVersion(localStack[index].version || '');
  };

  const handleSaveVersion = (index) => {
    const newStack = [...localStack];
    newStack[index] = { ...newStack[index], version: editVersion.trim() };
    setLocalStack(newStack);
    setEditingIndex(null);
    setEditVersion('');
  };

  const versionedCount = localStack.filter(t => t.version).length;
  const unversionedCount = localStack.filter(t => !t.version).length;

  return (
    <div className="inventory-manager-container fade-in">
      <div className="glass-card" style={{ maxWidth: '850px', margin: '0 auto', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>🏢 Core Technology Inventory</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '14px' }}>
          Define the products, vendors, and frameworks used in your organization. <strong style={{ color: '#f59e0b' }}>Adding version numbers enables intelligent version-range matching</strong> for precise threat detection.
        </p>

        {/* Version Coverage Indicator */}
        {localStack.length > 0 && (
          <div style={{ 
            display: 'flex', gap: '16px', marginBottom: '32px', padding: '16px', borderRadius: '12px',
            background: unversionedCount > 0 ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.05)',
            border: `1px solid ${unversionedCount > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              {unversionedCount > 0 ? (
                <AlertTriangle size={18} color="#f59e0b" />
              ) : (
                <CheckCircle size={18} color="#10b981" />
              )}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Version Coverage: {versionedCount}/{localStack.length} ({Math.round((versionedCount / localStack.length) * 100)}%)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {unversionedCount > 0 
                    ? `${unversionedCount} item(s) without versions — these will only match by product name, not by version range.`
                    : 'All items have versions. Version-aware matching is fully active.'
                  }
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ textAlign: 'center', padding: '4px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#10b981' }}>{versionedCount}</div>
                <div style={{ fontSize: '8px', color: '#10b981', fontWeight: 800 }}>VERSIONED</div>
              </div>
              <div style={{ textAlign: 'center', padding: '4px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#f59e0b' }}>{unversionedCount}</div>
                <div style={{ fontSize: '8px', color: '#f59e0b', fontWeight: 800 }}>NO VERSION</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
          <div className="input-group">
            <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)' }}>Company Name</label>
            <input 
              type="text"
              value={localCompany}
              onChange={e => setLocalCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              style={{ padding: '16px', fontSize: '15px', background: 'rgba(0,0,0,0.2)' }}
            />
          </div>
          <div className="input-group">
            <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)' }}>Industry</label>
            <input 
              type="text"
              value={localIndustry}
              onChange={e => setLocalIndustry(e.target.value)}
              placeholder="e.g. Finance, Healthcare"
              style={{ padding: '16px', fontSize: '15px', background: 'rgba(0,0,0,0.2)' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', margin: 0, letterSpacing: '1px' }}>Current Tech Stack</h3>
            {profile.last_updated && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                LAST SYNC: {new Date(profile.last_updated).toLocaleString()}
              </span>
            )}
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Technology Name</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Version</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, width: '120px', textAlign: 'center' }}>Match Type</th>
                  <th style={{ padding: '12px 16px', width: '90px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {localStack.map((tech, i) => (
                  <tr key={i} style={{ borderBottom: i < localStack.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-main)', fontWeight: 600 }}>{tech.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingIndex === i ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={editVersion}
                            onChange={e => setEditVersion(e.target.value)}
                            placeholder="e.g. 11.0.15"
                            style={{ padding: '6px 10px', fontSize: '13px', background: 'rgba(0,0,0,0.3)', border: '1px solid #10b981', borderRadius: '6px', color: 'var(--text-main)', width: '120px' }}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveVersion(i); if (e.key === 'Escape') setEditingIndex(null); }}
                          />
                          <button 
                            onClick={() => handleSaveVersion(i)}
                            style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                          >
                            <Save size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {tech.version ? (
                            <span style={{ color: '#10b981', fontWeight: 600 }}>{tech.version}</span>
                          ) : (
                            <span style={{ color: '#f59e0b', fontSize: '12px', fontStyle: 'italic' }}>Not set</span>
                          )}
                          <button
                            onClick={() => handleEditVersion(i)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', opacity: 0.6 }}
                            title="Edit version"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {tech.version ? (
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)', textTransform: 'uppercase' }}>
                          Version-Aware
                        </span>
                      ) : (
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.2)', textTransform: 'uppercase' }}>
                          Name Only
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleRemoveItem(i)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {localStack.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No technologies added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '12px', marginBottom: '40px', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)' }}>Add Technology</label>
            <input 
              type="text"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="e.g. Java, React, Apache Tomcat"
              style={{ padding: '12px', fontSize: '14px', background: 'rgba(0,0,0,0.2)' }}
            />
          </div>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#10b981' }}>Version (Recommended)</label>
            <input 
              type="text"
              value={newItemVersion}
              onChange={e => setNewItemVersion(e.target.value)}
              placeholder="e.g. 11.0.15"
              style={{ padding: '12px', fontSize: '14px', background: 'rgba(0,0,0,0.2)', borderColor: newItemName && !newItemVersion ? 'rgba(245, 158, 11, 0.5)' : undefined }}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ padding: '12px 16px', height: '45px', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={!newItemName.trim()}>
            <Plus size={16} /> Add
          </button>
        </form>

        {/* Info Box */}
        <div style={{ 
          padding: '16px', borderRadius: '10px', marginBottom: '24px',
          background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', marginBottom: '8px', textTransform: 'uppercase' }}>
            How Version Matching Works
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.7' }}>
            <strong style={{ color: 'var(--text-main)' }}>With Version:</strong> If you have <code style={{ color: '#10b981' }}>Java 11.0.15</code> and a threat says <code style={{ color: '#ef4444' }}>"affects Java 8-21"</code>, the engine detects that 11.0.15 is within range 8-21 → <strong style={{ color: '#ef4444' }}>MATCH</strong><br/>
            <strong style={{ color: 'var(--text-main)' }}>Without Version:</strong> If you have <code style={{ color: '#f59e0b' }}>Java</code> (no version), any threat mentioning Java is flagged with lower confidence.
          </div>
        </div>

        <button 
          className="btn-primary" 
          onClick={() => onUpdate({ 
            company_name: localCompany.trim() || 'Unknown Company', 
            tech_stack: localStack, 
            industry: localIndustry.trim() || 'General'
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
