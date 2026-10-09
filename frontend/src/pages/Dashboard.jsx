import React from 'react';
import { formatIST, formatISTDate, formatISTTime } from '../utils/dateUtils';
import { 
  ShieldAlert, Activity, Globe, MapPin, Search, Filter, 
  RotateCcw, X, Zap, RefreshCw, FileText, Database, AlertOctagon, ChevronDown, Trash2
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
  view, stats, incidents, severityData, geoData, intelMode,
  searchTerm, setSearchTerm, filterSeverity, setFilterSeverity,
  showFilters, setShowFilters, incidentDateFrom, setIncidentDateFrom,
  incidentDateTo, setIncidentDateTo, loadData, handleClearCrawl,
  handleDeleteIncident, handleRegenerateSummary, handleGenerateImpact,
  setSelectedRawIncident, setView, reports, setActiveReport,
  mitreMappings, generatingSummary, generatingReport, loading,
  handleCollect, collecting, timeframe, setTimeframe, handleCompanyScan,
  incidentPage, setIncidentPage, incidentLimit, setIncidentLimit, totalIncidents
}) => {
  const totalPages = Math.max(1, Math.ceil(totalIncidents / incidentLimit));
  
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, incidentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const renderStats = () => (
    <div className="stats-grid">
      <StatCard 
        title={view === 'india' ? "India Incidents" : "Global Threats"} 
        value={view === 'india' ? stats.india : stats.total} 
        icon={view === 'india' ? MapPin : Globe} 
        color="#3b82f6" 
        detail={`${stats.new_24h} new in 24h`}
        sparkType="line"
      />
      <StatCard 
        title="Critical Risks" 
        value={stats.severity.Critical} 
        icon={ShieldAlert} 
        color="#ef4444" 
        detail="Immediate action required"
        sparkType="bars"
      />
      <StatCard 
        title="Financial Impact" 
        value={stats.financial_total} 
        icon={Activity} 
        color="#f59e0b" 
        detail={`${stats.india_financial} in India`}
        sparkType="wave"
      />
      <StatCard 
        title="Intelligence Coverage" 
        value={`${Math.min(100, Math.round((totalIncidents / Math.max(1, stats.total)) * 100))}%`} 
        icon={Zap} 
        color="#8b5cf6" 
        detail="Active monitoring"
        sparkType="wave"
      />
    </div>
  );

  return (
    <div className="fade-in">
      {renderStats()}

      <div className="charts-container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '0' }}>
        <div className="chart-card" style={{ height: '350px' }}>
          <div className="chart-card-header">
            <h3 className="chart-card-title">Threat Velocity</h3>
            <select className="chart-dropdown">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={geoData}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip 
                contentStyle={{ 
                  background: 'var(--bg-sidebar)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  fontSize: '12px',
                  fontWeight: 600
                }} 
              />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVal)" dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card" style={{ height: '350px' }}>
          <div className="chart-card-header">
            <h3 className="chart-card-title">Severity Distribution</h3>
          </div>
          <div style={{ position: 'relative', width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} innerRadius={70} outerRadius={95} paddingAngle={3} dataKey="value" cx="50%" cy="45%">
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || '#8884d8'} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend 
                  verticalAlign="bottom" 
                  height={40}
                  formatter={(value, entry) => (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>
                      {value} ({entry.payload.value})
                    </span>
                  )}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {severityData.reduce((sum, d) => sum + d.value, 0)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Total</div>
            </div>
          </div>
        </div>
      </div>

      <div className="intel-feed-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
            <ShieldAlert size={22} color="#3b82f6" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>Intelligence Command Feed</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span className="badge-live">LIVE COMMAND</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· Real-time synchronization active</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)' }}>
             {['Today', 'Yesterday', 'Week', 'Month'].map(t => (
               <button 
                 key={t}
                 onClick={(e) => { e.stopPropagation(); setTimeframe(t.toLowerCase()); handleCollect('rss', t.toLowerCase()); }}
                 className={`timeframe-btn ${timeframe === t.toLowerCase() ? 'active' : ''}`}
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
            {collecting ? 'Crawling...' : 'Sync Feed Intel'}
          </button>
          <button 
            className="btn-ghost" 
            onClick={() => setShowFilters(!showFilters)}
            style={{ border: showFilters ? '1px solid var(--primary)' : '1px solid var(--border)', background: showFilters ? 'var(--primary-glow)' : 'var(--bg-elevated)', height: '40px', width: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 'unset' }}
          >
            <Filter size={16} />
          </button>

          <div className="search-box" style={{ height: '40px' }}>
            <Search size={14} color="var(--text-muted)" />
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
              <th style={{ textAlign: 'center' }}>Impact Radar</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(incidents || []).map(inc => (
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
                  {inc.company_impact_status === 'Yes' && (
                    <div style={{ fontSize: '10px', fontWeight: 900, color: '#ef4444', letterSpacing: '1px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)', width: 'fit-content' }}>
                      <AlertOctagon size={12} fill="rgba(239, 68, 68, 0.2)" /> 🚨 COMPANY IMPACT DETECTED ({inc.detection_method?.toUpperCase() || 'UNKNOWN'})
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
                            style={{ fontSize: '10px', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', fontWeight: 800 }}
                            onClick={(e) => { e.stopPropagation(); setActiveReport(existingReport); setView('impact'); }}
                          >
                            <FileText size={12} style={{ marginRight: '6px' }} /> View Report
                          </button>
                        );
                      } else {
                        return (
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '10px', color: 'var(--text-main)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', fontWeight: 800 }}
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
                <td>{inc.happened_at ? formatISTDate(inc.happened_at) : 'N/A'}</td>
                <td>
                  <div style={{ fontSize: '12px' }}>{formatISTDate(inc.date_collected)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatISTTime(inc.date_collected)}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {inc.company_impact_status === 'Yes' ? (
                    <span style={{ 
                      fontSize: '9px', fontWeight: 800, 
                      background: inc.detection_method?.includes('Version') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                      color: inc.detection_method?.includes('Version') ? '#f59e0b' : '#10b981', 
                      padding: '4px 8px', borderRadius: '4px', 
                      border: `1px solid ${inc.detection_method?.includes('Version') ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                      textTransform: 'uppercase'
                    }}>
                      {inc.detection_method || 'Heuristic'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>—</span>
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
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 24px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Items per page:</span>
          <select 
            value={incidentLimit} 
            onChange={(e) => { setIncidentLimit(Number(e.target.value)); setIncidentPage(1); }}
            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {(incidentPage - 1) * incidentLimit + 1} to {Math.min(incidentPage * incidentLimit, totalIncidents)} of {totalIncidents} entries
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="btn-ghost" 
            disabled={incidentPage === 1}
            onClick={() => setIncidentPage(prev => Math.max(prev - 1, 1))}
            style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border)', opacity: incidentPage === 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          
          {getPageNumbers().map(num => (
            <button
              key={num}
              onClick={() => setIncidentPage(num)}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                borderRadius: '6px',
                border: incidentPage === num ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: incidentPage === num ? 'var(--primary)' : 'transparent',
                color: incidentPage === num ? '#fff' : 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              {num}
            </button>
          ))}

          <button 
            className="btn-ghost" 
            disabled={incidentPage === totalPages}
            onClick={() => setIncidentPage(prev => Math.min(prev + 1, totalPages))}
            style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border)', opacity: incidentPage === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
