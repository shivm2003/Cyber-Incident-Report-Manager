import React, { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';

const TechnologyInventoryUI = ({ profile, onUpdate, isSaving }) => {
  const [localStack, setLocalStack] = useState([]);
  const [localCompany, setLocalCompany] = useState(profile.company_name || '');
  const [localIndustry, setLocalIndustry] = useState(profile.industry || '');
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemVersion, setNewItemVersion] = useState('');

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

  return (
    <div className="inventory-manager-container fade-in">
      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>🏢 Core Technology Inventory</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '14px' }}>
          Define the products, vendors, and frameworks used in your organization to drive automated threat correlation.
        </p>

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
                  <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {localStack.map((tech, i) => (
                  <tr key={i} style={{ borderBottom: i < localStack.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-main)', fontWeight: 600 }}>{tech.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{tech.version || '-'}</td>
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
                    <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
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
              placeholder="e.g. React"
              style={{ padding: '12px', fontSize: '14px', background: 'rgba(0,0,0,0.2)' }}
            />
          </div>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)' }}>Version (Optional)</label>
            <input 
              type="text"
              value={newItemVersion}
              onChange={e => setNewItemVersion(e.target.value)}
              placeholder="e.g. 18.0.2"
              style={{ padding: '12px', fontSize: '14px', background: 'rgba(0,0,0,0.2)' }}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ padding: '12px 16px', height: '45px', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={!newItemName.trim()}>
            <Plus size={16} /> Add
          </button>
        </form>

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
