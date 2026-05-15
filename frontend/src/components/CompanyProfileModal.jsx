import React from 'react';
import { X, RefreshCw } from 'lucide-react';

const CompanyProfileModal = ({ isOpen, onClose, tempProfile, setTempProfile, onSave, isSaving }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: '20px', fontWeight: 900 }}>Configure Company Stack</h2>
          <button className="btn-ghost" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: '30px' }}>
          <div className="input-group">
            <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)', display: 'block', marginBottom: '8px' }}>Company Name</label>
            <input 
              type="text" 
              value={tempProfile.company_name} 
              onChange={e => setTempProfile({...tempProfile, company_name: e.target.value})} 
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '6px', color: '#fff' }}
            />
          </div>
          <div className="input-group" style={{ marginTop: '20px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)', display: 'block', marginBottom: '8px' }}>Technology Stack (Comma separated)</label>
            <textarea 
              rows="4" 
              value={tempProfile.tech_stack_str} 
              onChange={e => setTempProfile({...tempProfile, tech_stack_str: e.target.value})} 
              placeholder="React, Node.js, AWS..." 
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '6px', color: '#fff', fontFamily: 'monospace' }}
            />
          </div>
          <div className="input-group" style={{ marginTop: '20px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)', display: 'block', marginBottom: '8px' }}>Industry</label>
            <select 
              value={tempProfile.industry} 
              onChange={e => setTempProfile({...tempProfile, industry: e.target.value})}
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '6px', color: '#fff' }}
            >
              <option value="Finance">Finance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Technology">Technology</option>
              <option value="Government">Government</option>
            </select>
          </div>
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={onSave} disabled={isSaving}>
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileModal;
