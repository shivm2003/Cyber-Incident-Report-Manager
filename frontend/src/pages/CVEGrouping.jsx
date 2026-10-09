import React, { useState, useEffect } from 'react';
import { formatIST } from '../utils/dateUtils';
import { 
  Layers, RefreshCw, Download, FileText, Trash2, ChevronDown, ChevronRight, 
  Package, AlertTriangle, Shield, Archive, ExternalLink, Search
} from 'lucide-react';

const SEVERITY_COLORS = {
  Critical: '#ff4d4d',
  High: '#fbbf24',
  Medium: '#fde047',
  Low: '#34d399'
};

const CVEGrouping = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [groupCves, setGroupCves] = useState({});
  const [loadingCves, setLoadingCves] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [downloadingZip, setDownloadingZip] = useState(null);
  const [downloadingFilteredZip, setDownloadingFilteredZip] = useState(null);
  const [downloadingFilteredTxt, setDownloadingFilteredTxt] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [jiraDateFrom, setJiraDateFrom] = useState('');
  const [jiraDateTo, setJiraDateTo] = useState('');
  const [inputJiraDateFrom, setInputJiraDateFrom] = useState('');
  const [inputJiraDateTo, setInputJiraDateTo] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [subSearchTerm, setSubSearchTerm] = useState('');
  const [subDateFrom, setSubDateFrom] = useState('');
  const [subDateTo, setSubDateTo] = useState('');
  const [inputSubDateFrom, setInputSubDateFrom] = useState('');
  const [inputSubDateTo, setInputSubDateTo] = useState('');
  const itemsPerPage = 50;
  const [generateResult, setGenerateResult] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/cve-groups');
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      console.error("Failed to fetch CVE groups:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/cve-groups/generate', { method: 'POST' });
      const data = await res.json();
      setGenerateResult(data);
      await fetchGroups();
    } catch (err) {
      console.error("Failed to generate groups:", err);
      setGenerateResult({ status: "Error: " + err.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleExpand = async (groupId) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
      setSubSearchTerm('');
      setSubDateFrom('');
      setSubDateTo('');
      setInputSubDateFrom('');
      setInputSubDateTo('');
      return;
    }
    setExpandedGroup(groupId);
    setSubSearchTerm('');
    setSubDateFrom('');
    setSubDateTo('');
    setInputSubDateFrom('');
    setInputSubDateTo('');

    if (!groupCves[groupId]) {
      setLoadingCves(groupId);
      try {
        const res = await fetch(`http://localhost:8000/api/cve-groups/${groupId}/cves`);
        const data = await res.json();
        setGroupCves(prev => ({ ...prev, [groupId]: data.cves || [] }));
      } catch (err) {
        console.error("Failed to fetch group CVEs:", err);
      } finally {
        setLoadingCves(null);
      }
    }
  };

  const handleDelete = async (groupId, groupName) => {
    if (!window.confirm(`Delete group "${groupName}"? This only removes the grouping, not the CVEs.`)) return;
    try {
      await fetch(`http://localhost:8000/api/cve-groups/${groupId}`, { method: 'DELETE' });
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (expandedGroup === groupId) setExpandedGroup(null);
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  const handleDownloadPdf = async (groupId) => {
    setDownloadingPdf(groupId);
    try {
      const res = await fetch(`http://localhost:8000/api/cve-groups/${groupId}/download/pdf`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `CVE_Group_${groupId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF:", err);
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadZip = async (groupId) => {
    setDownloadingZip(groupId);
    try {
      const res = await fetch(`http://localhost:8000/api/cve-groups/${groupId}/download/zip`);
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CVE_Group_${groupId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download ZIP:", err);
    } finally {
      setDownloadingZip(null);
    }
  };

  const handleDownloadFilteredZip = async (groupId, cveIds) => {
    if (!cveIds || cveIds.length === 0) return;
    setDownloadingFilteredZip(groupId);
    try {
      const res = await fetch(`http://localhost:8000/api/cve-groups/${groupId}/download/filtered-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cve_ids: cveIds })
      });
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CVE_Group_Filtered_${groupId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download filtered ZIP:", err);
    } finally {
      setDownloadingFilteredZip(null);
    }
  };

  const handleDownloadFilteredTxt = async (groupId, cveIds) => {
    if (!cveIds || cveIds.length === 0) return;
    setDownloadingFilteredTxt(groupId);
    try {
      const res = await fetch(`http://localhost:8000/api/cve-groups/${groupId}/download/filtered-txt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cve_ids: cveIds })
      });
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CVE_Group_Filtered_${groupId}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download filtered TXT:", err);
    } finally {
      setDownloadingFilteredTxt(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      const res = await fetch('http://localhost:8000/api/cve-groups/download-all/zip');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'All_CVE_Groups.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download all groups:", err);
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadSingleCvePdf = async (cveId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/cve/by-cve-id/${cveId}/report`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cveId}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download CVE PDF:", err);
    }
  };

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.cve_ids || []).some(id => id.toLowerCase().includes(searchTerm.toLowerCase()));
      
    let matchesDate = true;
    if (jiraDateFrom || jiraDateTo) {
      if (!g.jira_pushed_at) {
        matchesDate = false;
      } else {
        const pushedDate = new Date(g.jira_pushed_at).toISOString().split('T')[0];
        if (jiraDateFrom && pushedDate < jiraDateFrom) matchesDate = false;
        if (jiraDateTo && pushedDate > jiraDateTo) matchesDate = false;
      }
    }
    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, jiraDateFrom, jiraDateTo]);

  // Summary stats
  const totalGroups = groups.length;
  const totalCves = groups.reduce((sum, g) => sum + (g.total_cves || 0), 0);
  const criticalGroups = groups.filter(g => g.highest_severity === 'Critical').length;
  const withJira = groups.filter(g => g.jira_ticket_key).length;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <Layers size={22} color="#6366f1" />
            </div>
            CVE Product Grouping
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px' }}>
            Automatically groups all CVEs by product/vendor. Download individual or bulk PDF reports per group.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 800,
              cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s ease',
              opacity: generating ? 0.7 : 1
            }}
            onMouseOver={e => !generating && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {generating ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {generating ? 'Generating...' : 'Generate / Refresh Groups'}
          </button>

          {groups.length > 0 && (
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: 800,
                cursor: downloadingAll ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease',
                opacity: downloadingAll ? 0.7 : 1
              }}
              onMouseOver={e => !downloadingAll && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {downloadingAll ? <RefreshCw size={16} className="animate-spin" /> : <Archive size={16} />}
              Download All Groups (ZIP)
            </button>
          )}
        </div>
      </div>

      {/* Generate Result Notification */}
      {generateResult && (
        <div style={{
          padding: '16px 20px',
          borderRadius: '10px',
          marginBottom: '24px',
          background: generateResult.status?.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${generateResult.status?.includes('Error') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: 'var(--text-main)',
          animation: 'fadeIn 0.3s ease'
        }}>
          {generateResult.status?.includes('Error') ? <AlertTriangle size={16} color="#ef4444" /> : <Shield size={16} color="#10b981" />}
          <span>
            {generateResult.status} — 
            <strong> {generateResult.groups_created || 0}</strong> created, 
            <strong> {generateResult.groups_updated || 0}</strong> updated, 
            <strong> {generateResult.total_groups || 0}</strong> total groups
          </span>
          <button onClick={() => setGenerateResult(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Groups', value: totalGroups, color: '#6366f1', icon: <Layers size={18} /> },
          { label: 'Total CVEs', value: totalCves, color: '#a855f7', icon: <FileText size={18} /> },
          { label: 'Critical Groups', value: criticalGroups, color: '#ef4444', icon: <AlertTriangle size={18} /> },
          { label: 'With Jira Ticket', value: withJira, color: '#10b981', icon: <ExternalLink size={18} /> },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-main)' }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by product name or CVE ID..."
            style={{
              width: '100%',
              padding: '12px 16px 12px 42px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Jira Pushed:</label>
          <input 
            type="date"
            value={inputJiraDateFrom}
            onChange={e => setInputJiraDateFrom(e.target.value)}
            title="From Date"
            style={{
              padding: '11px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '14px',
              outline: 'none',
              colorScheme: 'dark'
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>to</span>
          <input 
            type="date"
            value={inputJiraDateTo}
            onChange={e => setInputJiraDateTo(e.target.value)}
            title="To Date"
            style={{
              padding: '11px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '14px',
              outline: 'none',
              colorScheme: 'dark'
            }}
          />
          <button 
            onClick={() => { setJiraDateFrom(inputJiraDateFrom); setJiraDateTo(inputJiraDateTo); }}
            style={{
              background: '#6366f1',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              padding: '8px 12px',
              borderRadius: '8px',
              marginLeft: '4px'
            }}
          >
            Apply
          </button>
          {(jiraDateFrom || jiraDateTo || inputJiraDateFrom || inputJiraDateTo) && (
            <button 
              onClick={() => { setJiraDateFrom(''); setJiraDateTo(''); setInputJiraDateFrom(''); setInputJiraDateTo(''); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                padding: '8px'
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Groups Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '12px' }} />
          <p>Loading CVE Groups...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border)'
        }}>
          <Layers size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.3 }} />
          <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>No CVE Groups Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {groups.length === 0 
              ? 'Click "Generate / Refresh Groups" to scan and group your CVE database.' 
              : 'No groups match your search term.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {paginatedGroups.map(group => (
            <div key={group.id} style={{
              flexShrink: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              borderLeft: `4px solid ${SEVERITY_COLORS[group.highest_severity] || '#6366f1'}`
            }}>
              {/* Group Header Row */}
              <div
                onClick={() => handleExpand(group.id)}
                style={{
                  padding: '18px 24px',
                  display: 'grid',
                  gridTemplateColumns: '32px 2fr 1fr 1.5fr 1fr 1fr auto',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Expand Icon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {expandedGroup === group.id 
                    ? <ChevronDown size={18} color="var(--text-muted)" /> 
                    : <ChevronRight size={18} color="var(--text-muted)" />}
                </div>

                {/* Product Name */}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} color="#6366f1" />
                    {group.group_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {group.total_cves} CVE{group.total_cves !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Highest CVSS */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '16px', fontWeight: 900, 
                    color: SEVERITY_COLORS[group.highest_severity] || 'var(--text-main)' 
                  }}>
                    {group.highest_cvss || 'N/A'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CVSS Score</div>
                </div>

                {/* Severity Breakdown */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(group.severity_breakdown || {})
                    .sort((a, b) => {
                      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
                      return (order[a[0]] ?? 4) - (order[b[0]] ?? 4);
                    })
                    .map(([sev, count]) => (
                    <span key={sev} style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: SEVERITY_COLORS[sev] || '#888',
                      background: `${SEVERITY_COLORS[sev] || '#888'}18`,
                      border: `1px solid ${SEVERITY_COLORS[sev] || '#888'}30`,
                      whiteSpace: 'nowrap'
                    }}>
                      {sev}: {count}
                    </span>
                  ))}
                </div>

                {/* Jira Ticket */}
                <div style={{ textAlign: 'center' }}>
                  {group.jira_ticket_key ? (
                    <a
                      href={`https://indiashelter.atlassian.net/browse/${group.jira_ticket_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        color: '#6366f1',
                        fontWeight: 700,
                        fontSize: '13px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: 'center'
                      }}
                    >
                      {group.jira_ticket_key}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                  )}
                </div>

                {/* Updated */}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {formatIST(group.updated_at)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleDownloadPdf(group.id)}
                    disabled={downloadingPdf === group.id}
                    title="Download merged PDF"
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-main)',
                      color: '#6366f1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    {downloadingPdf === group.id ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                  </button>
                  <button
                    onClick={() => handleDownloadZip(group.id)}
                    disabled={downloadingZip === group.id}
                    title="Download as ZIP"
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-main)',
                      color: '#10b981',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    {downloadingZip === group.id ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(group.id, group.group_name)}
                    title="Delete group"
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-main)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded CVE Sub-Table */}
              {expandedGroup === group.id && (
                <div style={{
                  borderTop: '1px solid var(--border)',
                  padding: '0',
                  background: 'rgba(0,0,0,0.15)',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  {loadingCves === group.id ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      <RefreshCw size={16} className="animate-spin" style={{ marginRight: '8px' }} />
                      Loading CVEs...
                    </div>
                  ) : (
                    <div>
                      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
                          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                              type="text"
                              value={subSearchTerm}
                              onChange={e => setSubSearchTerm(e.target.value)}
                              placeholder="Search CVE ID or description..."
                              style={{
                                width: '100%',
                                padding: '8px 16px 8px 36px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '13px',
                                outline: 'none'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Published:</label>
                            <input 
                              type="date"
                              value={inputSubDateFrom}
                              onChange={e => setInputSubDateFrom(e.target.value)}
                              title="From Date"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '12px',
                                outline: 'none',
                                colorScheme: 'dark'
                              }}
                            />
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
                            <input 
                              type="date"
                              value={inputSubDateTo}
                              onChange={e => setInputSubDateTo(e.target.value)}
                              title="To Date"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '12px',
                                outline: 'none',
                                colorScheme: 'dark'
                              }}
                            />
                            <button 
                              onClick={() => { setSubDateFrom(inputSubDateFrom); setSubDateTo(inputSubDateTo); }}
                              style={{
                                background: '#10b981',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '6px 10px',
                                borderRadius: '6px',
                                marginLeft: '4px'
                              }}
                            >
                              Apply
                            </button>
                            {(subDateFrom || subDateTo || inputSubDateFrom || inputSubDateTo) && (
                              <button 
                                onClick={() => { setSubDateFrom(''); setSubDateTo(''); setInputSubDateFrom(''); setInputSubDateTo(''); }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '4px'
                                }}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              const filteredCves = (groupCves[group.id] || []).filter(cve => {
                                const matchesSearch = (cve.cve_id || '').toLowerCase().includes(subSearchTerm.toLowerCase()) || 
                                                      (cve.description || '').toLowerCase().includes(subSearchTerm.toLowerCase());
                                let matchesDate = true;
                                if (subDateFrom || subDateTo) {
                                  if (!cve.published_date) {
                                    matchesDate = false;
                                  } else {
                                    const pubDate = new Date(cve.published_date).toISOString().split('T')[0];
                                    if (subDateFrom && pubDate < subDateFrom) matchesDate = false;
                                    if (subDateTo && pubDate > subDateTo) matchesDate = false;
                                  }
                                }
                                return matchesSearch && matchesDate;
                              });
                              handleDownloadFilteredZip(group.id, filteredCves.map(c => c.cve_id));
                            }}
                            disabled={downloadingFilteredZip === group.id}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-main)',
                              color: '#10b981',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              transition: 'all 0.2s'
                            }}
                          >
                            {downloadingFilteredZip === group.id ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                            Filtered ZIP
                          </button>
                          <button
                            onClick={() => {
                              const filteredCves = (groupCves[group.id] || []).filter(cve => {
                                const matchesSearch = (cve.cve_id || '').toLowerCase().includes(subSearchTerm.toLowerCase()) || 
                                                      (cve.description || '').toLowerCase().includes(subSearchTerm.toLowerCase());
                                let matchesDate = true;
                                if (subDateFrom || subDateTo) {
                                  if (!cve.published_date) {
                                    matchesDate = false;
                                  } else {
                                    const pubDate = new Date(cve.published_date).toISOString().split('T')[0];
                                    if (subDateFrom && pubDate < subDateFrom) matchesDate = false;
                                    if (subDateTo && pubDate > subDateTo) matchesDate = false;
                                  }
                                }
                                return matchesSearch && matchesDate;
                              });
                              handleDownloadFilteredTxt(group.id, filteredCves.map(c => c.cve_id));
                            }}
                            disabled={downloadingFilteredTxt === group.id}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-main)',
                              color: '#6366f1',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              transition: 'all 0.2s'
                            }}
                          >
                            {downloadingFilteredTxt === group.id ? <RefreshCw size={12} className="animate-spin" /> : <FileText size={12} />}
                            Filtered TXT
                          </button>
                        </div>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '12px 20px', fontWeight: 700, textAlign: 'left' }}>CVE ID</th>
                            <th style={{ padding: '12px 12px', fontWeight: 700, textAlign: 'center' }}>Severity</th>
                            <th style={{ padding: '12px 12px', fontWeight: 700, textAlign: 'center' }}>CVSS</th>
                            <th style={{ padding: '12px 12px', fontWeight: 700, textAlign: 'left' }}>Description</th>
                            <th style={{ padding: '12px 12px', fontWeight: 700, textAlign: 'center' }}>Published</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>PDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(groupCves[group.id] || [])
                            .filter(cve => {
                              const matchesSearch = (cve.cve_id || '').toLowerCase().includes(subSearchTerm.toLowerCase()) || 
                                                    (cve.description || '').toLowerCase().includes(subSearchTerm.toLowerCase());
                              let matchesDate = true;
                              if (subDateFrom || subDateTo) {
                                if (!cve.published_date) {
                                  matchesDate = false;
                                } else {
                                  const pubDate = new Date(cve.published_date).toISOString().split('T')[0];
                                  if (subDateFrom && pubDate < subDateFrom) matchesDate = false;
                                  if (subDateTo && pubDate > subDateTo) matchesDate = false;
                                }
                              }
                              return matchesSearch && matchesDate;
                            })
                            .map(cve => (
                            <tr key={cve.cve_id || cve.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 20px', fontWeight: 700, color: '#6366f1' }}>
                              {cve.cve_id}
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: SEVERITY_COLORS[cve.severity] || '#888',
                                background: `${SEVERITY_COLORS[cve.severity] || '#888'}18`,
                                border: `1px solid ${SEVERITY_COLORS[cve.severity] || '#888'}30`
                              }}>
                                {cve.severity || 'Unknown'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 700, color: SEVERITY_COLORS[cve.severity] || 'var(--text-main)' }}>
                              {cve.cvss_score || 'N/A'}
                            </td>
                            <td style={{ padding: '12px 12px', color: 'var(--text-muted)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(cve.description || 'No description.').substring(0, 120)}...
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                              {cve.published_date ? new Date(cve.published_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleDownloadSingleCvePdf(cve.cve_id)}
                                title={`Download ${cve.cve_id} PDF`}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-main)',
                                  color: '#a855f7',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Download size={12} /> PDF
                              </button>
                            </td>
                          </tr>
                          ))}
                          {(groupCves[group.id] || []).filter(cve => {
                            const matchesSearch = (cve.cve_id || '').toLowerCase().includes(subSearchTerm.toLowerCase()) || 
                                                  (cve.description || '').toLowerCase().includes(subSearchTerm.toLowerCase());
                            let matchesDate = true;
                            if (subDateFrom || subDateTo) {
                              if (!cve.published_date) {
                                matchesDate = false;
                              } else {
                                const pubDate = new Date(cve.published_date).toISOString().split('T')[0];
                                if (subDateFrom && pubDate < subDateFrom) matchesDate = false;
                                if (subDateTo && pubDate > subDateTo) matchesDate = false;
                              }
                            }
                            return matchesSearch && matchesDate;
                          }).length === 0 && (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                No CVE data found matching your search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              padding: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px'
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredGroups.length)} of {filteredGroups.length} groups
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: currentPage === 1 ? 'transparent' : 'var(--bg-main)',
                    color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Previous
                </button>
                <span style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  fontSize: '13px',
                  fontWeight: 800
                }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: currentPage === totalPages ? 'transparent' : 'var(--bg-main)',
                    color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CVEGrouping;
