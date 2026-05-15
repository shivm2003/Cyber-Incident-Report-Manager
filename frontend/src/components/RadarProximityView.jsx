import React from 'react';
import { ShieldAlert } from 'lucide-react';

const RadarProximityView = ({ incidents, profile, onPointClick }) => {
  const rings = [
    { radius: 80, color: 'rgba(239, 68, 68, 0.15)', stroke: '#ef4444', label: 'CRITICAL' },
    { radius: 160, color: 'rgba(245, 158, 11, 0.1)', stroke: '#f59e0b', label: 'HIGH' },
    { radius: 240, color: 'rgba(59, 130, 246, 0.05)', stroke: '#3b82f6', label: 'MEDIUM' }
  ];

  const center = { x: 300, y: 300 };

  return (
    <div className="radar-visual-wrapper" style={{ position: 'relative', width: '600px', height: '600px', margin: '0 auto' }}>
      <svg width="600" height="600" viewBox="0 0 600 600" style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}>
        {/* Background Rings */}
        {[...rings].reverse().map((ring, i) => (
          <React.Fragment key={i}>
            <circle
              cx={center.x}
              cy={center.y}
              r={ring.radius}
              fill={ring.color}
              stroke={ring.stroke}
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.4"
            />
            <text
              x={center.x}
              y={center.y - ring.radius + 15}
              fill={ring.stroke}
              fontSize="9"
              fontWeight="900"
              textAnchor="middle"
              opacity="0.6"
              letterSpacing="1px"
            >
              {ring.label}
            </text>
          </React.Fragment>
        ))}

        {/* Axes */}
        <line x1="300" y1="60" x2="300" y2="540" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <line x1="60" y1="300" x2="540" y2="300" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

        {/* Scanning Beam */}
        <defs>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0.2)" />
          </linearGradient>
        </defs>
        <path d="M 300 300 L 300 0 A 300 300 0 0 1 512 88 Z" fill="url(#beamGradient)">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 300 300"
            to="360 300 300"
            dur="10s"
            repeatCount="indefinite"
          />
        </path>

        {/* Company Center */}
        <defs>
          <radialGradient id="centerGradient">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </radialGradient>
        </defs>
        <circle cx={center.x} cy={center.y} r="35" fill="url(#centerGradient)" style={{ filter: 'drop-shadow(0 0 25px rgba(99, 102, 241, 0.6))' }} />
        
        <text x={center.x} y={center.y + 5} fill="#fff" fontSize="10" fontWeight="900" textAnchor="middle" pointerEvents="none">
          {profile.company_name?.substring(0, 8).toUpperCase()}
        </text>

        {/* Connection Lines for Critical Threats */}
        {incidents.filter(inc => inc.company_impact_score >= 80).map((inc, i) => {
          const score = inc.company_impact_score || 0;
          const radius = 300 - (score * 2.6);
          const angle = (i * 137.5) * (Math.PI / 180);
          const px = center.x + radius * Math.cos(angle);
          const py = center.y + radius * Math.sin(angle);
          return (
            <line 
              key={`line-${inc.id}`}
              x1={center.x} y1={center.y} x2={px} y2={py}
              stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.3"
            />
          );
        })}

        {/* Incident Points */}
        {incidents.filter(inc => inc.company_impact_score > 0).map((inc, i) => {
          const score = inc.company_impact_score || 0;
          const radius = 300 - (score * 2.6);
          const angle = (i * 137.5) * (Math.PI / 180);
          
          const px = center.x + radius * Math.cos(angle);
          const py = center.y + radius * Math.sin(angle);

          const isPending = inc.review_status === "Pending";

          return (
            <g key={inc.id} className="radar-point" onClick={() => onPointClick(inc)} style={{ cursor: 'pointer' }}>
              <circle
                cx={px}
                cy={py}
                r={isPending ? "8" : "5"}
                fill={inc.severity === 'Critical' ? '#ef4444' : inc.severity === 'High' ? '#f59e0b' : '#3b82f6'}
                className={isPending ? "animate-pulse" : ""}
                style={{ 
                  filter: isPending ? `drop-shadow(0 0 12px ${inc.severity === 'Critical' ? '#ef4444' : '#f59e0b'})` : "none",
                  opacity: isPending ? 1 : 0.6
                }}
              />
              {isPending && (
                <circle
                  cx={px}
                  cy={py}
                  r="14"
                  fill="transparent"
                  stroke={inc.severity === 'Critical' ? '#ef4444' : '#f59e0b'}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  style={{ animation: 'spin 10s linear infinite' }}
                />
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Legend Overlay */}
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(0,0,0,0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Threat Proximity Legend</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
            <span>Critical Hit (Score &gt; 80)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></div>
            <span>High Risk (Score 50-80)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
            <span>Medium Concern (Score &lt; 50)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarProximityView;
