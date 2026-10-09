import React from 'react';

// Decorative sparkline SVGs for each card type
const SparkLine = ({ color }) => (
  <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none" style={{ display: 'block', marginTop: '12px', opacity: 0.6 }}>
    <defs>
      <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
      </linearGradient>
    </defs>
    <path
      d="M0,35 Q20,30 40,28 T80,20 T120,15 T160,8 T200,5"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M0,35 Q20,30 40,28 T80,20 T120,15 T160,8 T200,5 L200,40 L0,40 Z"
      fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, '')})`}
    />
  </svg>
);

const SparkBars = ({ color }) => (
  <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none" style={{ display: 'block', marginTop: '12px', opacity: 0.6 }}>
    {[10, 20, 30, 15, 25, 35, 18, 28, 22, 32, 12, 38, 16, 26, 34, 20, 30, 24, 36, 14].map((h, i) => (
      <rect
        key={i}
        x={i * 10 + 1}
        y={40 - h}
        width="6"
        height={h}
        rx="1"
        fill={color}
        opacity={0.4 + (h / 38) * 0.6}
      />
    ))}
  </svg>
);

const SparkWave = ({ color }) => (
  <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none" style={{ display: 'block', marginTop: '12px', opacity: 0.6 }}>
    <defs>
      <linearGradient id={`wave-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
      </linearGradient>
    </defs>
    <path
      d="M0,25 C30,15 50,30 80,20 S130,10 160,22 S190,18 200,15"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M0,25 C30,15 50,30 80,20 S130,10 160,22 S190,18 200,15 L200,40 L0,40 Z"
      fill={`url(#wave-${color.replace(/[^a-z0-9]/gi, '')})`}
    />
  </svg>
);

const sparkComponents = {
  line: SparkLine,
  bars: SparkBars,
  wave: SparkWave,
};

const StatCard = ({ title, value, icon: Icon, color, detail, onClick, active, sparkType = 'line' }) => {
  const SparkComponent = sparkComponents[sparkType] || SparkLine;

  return (
    <div
      className={`stat-card-v2 ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `4px solid ${color}`,
        transform: active ? 'translateY(-2px)' : 'none',
        boxShadow: active ? `0 8px 24px -12px ${color}` : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, color, letterSpacing: '-2px', lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {detail}
          </div>
        </div>
        {Icon && (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={20} color={color} />
          </div>
        )}
      </div>
      <SparkComponent color={color} />
      {active && <div style={{ height: '3px', background: color, position: 'absolute', bottom: 0, left: 0, right: 0, borderRadius: '0 0 0 4px' }}></div>}
    </div>
  );
};

export default StatCard;
