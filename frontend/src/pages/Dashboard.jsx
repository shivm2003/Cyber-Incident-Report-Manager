import React from 'react';
import { 
  ShieldAlert, Activity, Globe, MapPin, Search, Filter, 
  RotateCcw, X, Zap, RefreshCw, FileText, Database
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import StatCard from '../components/StatCard';

const SEVERITY_COLORS = {
  Critical: '#ff4d4d',
  High: '#fbbf24',
  Medium: '#fde047',
  Low: '#34d399'
};

const Dashboard = ({
  view, stats, filtered, severityData, geoData, intelMode,
  searchTerm, setSearchTerm, filterSeverity, setFilterSeverity,
  showFilters, setShowFilters, incidentDateFrom, setIncidentDateFrom,
  incidentDateTo, setIncidentDateTo, loadData, handleClearCrawl,
  handleDeleteIncident, handleRegenerateSummary, handleGenerateImpact,
  setSelectedRawIncident, setView, reports, setActiveReport,
  mitreMappings, generatingSummary, generatingReport, loading,
  handleCollect, collecting, timeframe, setTimeframe, handleCompanyScan
}) => {

  const renderStats = () => (
    <div className="stats-grid">
      <StatCard 
        title={view === 'india' ? "India Incidents" : "Global Threats"} 
        value={view === 'india' ? stats.india : stats.total} 
        icon={view === 'india' ? MapPin : Globe} 
        color="var(--primary)" 
        detail={`${stats.new_24h} new in 24h`}
      />
      <StatCard 
        title="Critical Risks" 
        value={stats.severity.Critical} 
        icon={ShieldAlert} 
        color="#ff4d4d" 
        detail="Immediate action req"
      />
      <StatCard 
        title="Financial Impact" 
        value={stats.financial_total} 
        icon={Activity} 
        color="#fbbf24" 
        detail={`${stats.india_financial} in India`}
      />
      <StatCard 
        title="Intelligence Coverage" 
        value={`${Math.min(100, Math.round((filtered.length / Math.max(1, stats.total)) * 100))}%`} 
        icon={Zap} 
        color="#8b5cf6" 
        detail="Active monitoring"
      />
    </div>
  );

  return (
    <div className="fade-in">
      {renderStats()}

      <div className="charts-container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div className="glass-card" style={{ height: '350px', padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-muted)' }}>THREAT VELOCITY</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={geoData}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
              <YAxis stroke="var(--text-muted)" fontSize={10} />
              <RechartsTooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorVal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card" style={{ height: '350px', padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-muted)' }}>SEVERITY DISTRIBUTION</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={severityData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || '#8884d8'} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="intel-header" style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--primary-glow)', padding: '8px', borderRadius: '10px' }}>
            <Activity size={20} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)' }}>Intelligence Command Feed</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span className="badge-live">LIVE COMMAND</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Real-time synchronization active</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
             {['today', 'yesterday', 'week', 'month'].map(t => (
               <button 
                 key={t}
                 onClick={(e) => { e.stopPropagation(); setTimeframe(t); handleCollect('rss', t); }}
                 className={`timeframe-btn ${timeframe === t ? 'active' : ''}`}
                 style={{ 
                   fontSize: '10px', 
                   padding: '8px 16px', 
                   textTransform: 'uppercase', 
                   fontWeight: 800,
                   background: timeframe === t ? 'var(--primary)' : 'transparent',
                   color: timeframe === t ? '#000' : 'var(--text-muted)',
                   borderRadius: '10px',
                   border: 'none',
                   cursor: 'pointer',
                   transition: 'all 0.2s ease',
                   letterSpacing: '0.5px'
                 }}
               >
                 {t}
               </button>
             ))}
          </div>

          <button 
            className="btn-primary" 
            onClick={() => handleCollect('rss')}
            disabled={collecting}
            style={{ padding: '10px 20px', fontSize: '12px', height: '40px', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
          >
            {collecting ? <RefreshCw size={14} className="animate-spin" style={{ marginRight: '8px' }} /> : <Zap size={14} style={{ marginRight: '8px' }} />} 
            {collecting ? 'Crawling RSS...' : 'Sync Feed Intel'}
          </button>
          <button 
            className="btn-ghost" 
            onClick={() => setShowFilters(!showFilters)}
            style={{ border: showFilters ? '1px solid var(--primary)' : '1px solid var(--border)', background: showFilters ? 'var(--primary-glow)' : 'var(--bg-elevated)', height: '40px', fontSize: '12px' }}
          >
            <Filter size={14} />
          </button>

          <div className="search-box" style={{ height: '40px' }}>
            <Search size={14} />
            <input 
              type="text" 
              placeholder="Search feed..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="glass-card fade-in" style={{ marginTop: '16px', padding: '24px', border: '1px solid var(--border-bright)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', alignItems: 'flex-end' }}>
            <div className="input-group">
              <label>Filter Severity</label>
              <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                <option value="All">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="input-group">
              <label>Intelligence From</label>
              <input type="date" value={incidentDateFrom} onChange={(e) => setIncidentDateFrom(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Intelligence To</label>
              <input type="date" value={incidentDateTo} onChange={(e) => setIncidentDateTo(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={loadData}>Apply Filters</button>
              <button className="btn-ghost" style={{ flex: 1, color: '#ef4444' }} onClick={() => handleClearCrawl('all')}>Purge Feed</button>
            </div>
          </div>
        </div>
      )}

      <div className="intel-table-container glass-card" style={{ marginTop: '24px' }}>
        <table className="intel-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>Type & Source</th>
              <th>Severity</th>
              <th>Intelligence</th>
              <th>Entity</th>
              <th>Incident Date</th>
              <th>Collected At</th>
              <th style={{ textAlign: 'center' }}>Heuristic Scan</th>
              <th style={{ textAlign: 'center' }}>Gemma Scan</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inc => (
              <tr key={inc.id} className="intel-row" onClick={() => setSelectedRawIncident(inc)} style={{ cursor: 'pointer' }}>
                <td><span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>#{inc.id}</span></td>
                <td>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>{inc.attack_type || 'General'}</div>
                  {inc.source && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                      via {inc.source}
                    </div>
                  )}
                </td>
                <td><span className={`badge ${(inc.severity || 'Low').toLowerCase()}`}>{inc.severity}</span></td>
                <td style={{ maxWidth: '400px' }}>
                  {intelMode === 'gemma' && (
                    <div style={{ fontSize: '9px', fontWeight: 900, color: '#a855f7', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={10} fill="#a855f7" /> REPORT AI IMPACT
                    </div>
                  )}
                  <div style={{ fontWeight: 600 }}>{inc.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {intelMode === 'gemma' ? (
                      <>
                        {generatingSummary === inc.id ? (
                          <span style={{ color: '#00f2ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <RefreshCw size={10} className="animate-spin" /> Regenerating Summary...
                          </span>
                        ) : (
                          inc.ai_summary || 'Analyzing...'
                        )}
                      </>
                    ) : inc.description}
                  </div>
                  {mitreMappings[inc.id] && mitreMappings[inc.id].length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {mitreMappings[inc.id].map((m, idx) => (
                        <div key={idx} style={{ fontSize: '9px', background: 'rgba(0, 163, 255, 0.1)', color: '#00a3ff', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, border: '1px solid rgba(0, 163, 255, 0.2)' }}>
                          {m.technique_id}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    {(() => {
                      const existingReport = reports.find(r => r.incident_id === inc.id);
                      if (existingReport) {
                        return (
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px', fontWeight: 800 }}
                            onClick={(e) => { e.stopPropagation(); setActiveReport(existingReport); setView('impact'); }}
                          >
                            <FileText size={12} style={{ marginRight: '6px' }} /> View Analysis
                          </button>
                        );
                      } else {
                        return (
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '10px', color: '#a855f7', fontWeight: 800, background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '6px 12px', opacity: generatingReport === inc.id ? 0.7 : 1 }}
                            onClick={(e) => { e.stopPropagation(); handleGenerateImpact(inc.id); }}
                            disabled={generatingReport === inc.id}
                          >
                            {generatingReport === inc.id ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <RefreshCw size={12} className="animate-spin" /> Analyzing...
                              </span>
                            ) : (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Zap size={12} /> AI Impact Analysis
                              </span>
                            )}
                          </button>
                        );
                      }
                    })()}
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '10px', color: 'var(--primary)', background: 'var(--primary-glow)', border: '1px solid var(--border-bright)', padding: '6px 12px', fontWeight: 800 }}
                      onClick={(e) => { e.stopPropagation(); handleRegenerateSummary(inc.id); }}
                    >
                      <RefreshCw size={12} style={{ marginRight: '6px' }} /> Refresh Intel
                    </button>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{inc.target_entity || inc.country}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{inc.country}</div>
                </td>
                <td>{inc.happened_at ? new Date(inc.happened_at).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <div style={{ fontSize: '12px' }}>{new Date(inc.date_collected).toLocaleDateString()}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(inc.date_collected).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {inc.company_impact_status && inc.detection_method === 'Heuristic' ? (
                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>True</span>
                  ) : (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>False</span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {inc.company_impact_status && inc.detection_method === 'AI Map' ? (
                    <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>True</span>
                  ) : (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>False</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      className="btn-ghost" 
                      onClick={(e) => { e.stopPropagation(); handleClearCrawl(inc.id); }}
                      style={{ padding: '6px', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.2)', minWidth: 'unset', width: '32px', height: '32px' }}
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button 
                      className="btn-ghost" 
                      onClick={(e) => { e.stopPropagation(); handleDeleteIncident(inc.id); }}
                      style={{ padding: '6px', color: '#ff4d4d', background: 'rgba(255, 77, 77, 0.1)', borderColor: 'rgba(255, 77, 77, 0.2)', minWidth: 'unset', width: '32px', height: '32px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
