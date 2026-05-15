import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, detail, onClick, active }) => (
  <div
    className={`glass-card fade-in ${active ? 'active' : ''}`}
    onClick={onClick}
    style={{
      cursor: onClick ? 'pointer' : 'default',
      border: active ? `2px solid ${color}` : '1px solid var(--border)',
      transform: active ? 'translateY(-2px)' : 'none',
      transition: 'all 0.2s ease',
      boxShadow: active ? `0 8px 24px -12px ${color}` : 'none',
      position: 'relative'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
      <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>{title}</span>
      {Icon && <Icon size={16} color={color} />}
    </div>
    <div className="stat-value" style={{ color }}>{value}</div>
    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{detail}</div>
    {active && <div style={{ height: '3px', background: color, position: 'absolute', bottom: 0, left: 0, right: 0 }}></div>}
  </div>
);

export default StatCard;
