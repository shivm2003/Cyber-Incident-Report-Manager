import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Activity, Globe, MapPin,
  Download, RefreshCw, AlertTriangle, Search, Filter,
  Terminal, BarChart2, FileText, ChevronRight, Zap,
  LayoutDashboard, ShieldCheck, Landmark, Settings,
  ArrowUpRight, Info, AlertOctagon, Shield, X, Sun, Moon, ExternalLink, Database,
  ArrowUpDown, ArrowUp, ArrowDown, Calendar, RotateCcw, Check, FileDown, History, Trash2, FilePlus
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
  Legend
} from 'recharts';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import AIWorkflowModal from './components/AIWorkflowModal';
import RawIntelligenceModal from './components/RawIntelligenceModal';
import StatCard from './components/StatCard';
import RadarProximityView from './components/RadarProximityView';
import TechnologyInventoryUI from './components/TechnologyInventoryUI';
import ManualReviewQueueUI from './components/ManualReviewQueueUI';
import CompanyProfileModal from './components/CompanyProfileModal';

// Page Imports
import Dashboard from './pages/Dashboard';
import ReportBuilder from './pages/ReportBuilder';
import VulnerabilityDB from './pages/VulnerabilityDB';
import ImpactReports from './pages/ImpactReports';
import AuditLogs from './pages/AuditLogs';
import CompanyRadar from './pages/CompanyRadar';
import ManualReview from './pages/ManualReview';
import TechInventory from './pages/TechInventory';
import CVEReportViewer from './pages/CVEReportViewer';
import JiraPublisher from './pages/JiraPublisher';

const API_BASE = 'http://localhost:8000/api';
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const SEVERITY_COLORS = {
  Critical: '#ff4d4d',
  High: '#fbbf24',
  Medium: '#fde047',
  Low: '#34d399'
};
const FINANCIAL_COLORS = ['#6366f1', '#00f2ff', '#8b5cf6', '#34d399', '#fbbf24'];

function App() {
  const [view, setView] = useState('overview'); // overview, india, financial, impact, company
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [incidents, setIncidents] = useState([]);
  const [cves, setCves] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [mitreMappings, setMitreMappings] = useState({}); // {incidentId: [mappings]}
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(null);
  const [analyzingMitre, setAnalyzingMitre] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(null);
  const [companyImpactIncidents, setCompanyImpactIncidents] = useState([]);
  const [companyScanning, setCompanyScanning] = useState(false);
  const [selectedRawIncident, setSelectedRawIncident] = useState(null);
  // Real-time progress tracking for company impact scan
  const [scanProgress, setScanProgress] = useState({
    total: 0,
    scanned: 0,
    threats: 0,
    startTime: null,
    percentage: 0,
    elapsedTime: 0,
    threatsYes: 0,
    threatsNo: 0,
    threatsPending: 0
  });
  const [stats, setStats] = useState({
    total: 0, new_24h: 0, india: 0, global: 0, financial_total: 0, india_financial: 0,
    types: {}, severity: { Critical: 0, High: 0, Medium: 0, Low: 0 },
    financial_sectors: {}
  });
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [aiStatus, setAiStatus] = useState({ online: false, model: 'gemma4:e4b', available: false });
  const [showAiWorkflow, setShowAiWorkflow] = useState(false);
  const [workflowData, setWorkflowData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [timeframe, setTimeframe] = useState('week');

  // Report Builder State
  const [reportBuilderData, setReportBuilderData] = useState({ incidents: [], cves: [] });
  const [reportBuilderSelection, setReportBuilderSelection] = useState({ incident_ids: [], cve_ids: [] });
  const [reportBuilderFilters, setReportBuilderFilters] = useState({
    from_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    sources: ['crawl', 'cve'],
    impact_only: false
  });
  const [reportBuilderTitle, setReportBuilderTitle] = useState('Custom Intelligence Report');
  const [reportBuilderPreviewLoading, setReportBuilderPreviewLoading] = useState(false);
  const [reportBuilderGenerating, setReportBuilderGenerating] = useState(false);
  const [reportBuilderFormat, setReportBuilderFormat] = useState('pdf');
  const [showReportConfirmModal, setShowReportConfirmModal] = useState(false);
  const [currentGeneratedReportId, setCurrentGeneratedReportId] = useState(null);
  const [reportHistory, setReportHistory] = useState([]);
  const [reportHistoryLoading, setReportHistoryLoading] = useState(false);

  const [incidentDateFrom, setIncidentDateFrom] = useState('');
  const [incidentDateTo, setIncidentDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [intelMode, setIntelMode] = useState('heuristic'); // heuristic, gemma

  // --- Radar v3.0 State ---
  const [companyProfile, setCompanyProfile] = useState({ company_name: "My Company", tech_stack: [], industry: "Finance" });
  const [reviewQueue, setReviewQueue] = useState({ incidents: [], cves: [] });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [tempProfile, setTempProfile] = useState({ company_name: "", tech_stack: [], industry: "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  // CVE Vulnerability Database Filters
  const [cveSortOrder, setCveSortOrder] = useState('desc');
  const [cveDateFrom, setCveDateFrom] = useState('');
  const [cveDateTo, setCveDateTo] = useState('');
  const [cveSeverityFilter, setCveSeverityFilter] = useState('All');
  const [cveCompanyFilter, setCveCompanyFilter] = useState('All');
  const [cveSourceFilter, setCveSourceFilter] = useState('All');
  const [cveSearch, setCveSearch] = useState('');
  const [manualCveId, setManualCveId] = useState('');
  const [pullingNvd, setPullingNvd] = useState(false);
  const [extractorCveId, setExtractorCveId] = useState('');
  const [showCveFilters, setShowCveFilters] = useState(false);
  const [showAdvancedNvd, setShowAdvancedNvd] = useState(false);
  const [selectedCve, setSelectedCve] = useState(null);
  const [cveSortBy, setCveSortBy] = useState('published_date');
  const [advNvdLoading, setAdvNvdLoading] = useState(false);
  const [advNvdParams, setAdvNvdParams] = useState({
    cveId: '', cpeName: '', cweId: '', cvssV3Severity: '', cvssV2Severity: '',
    cvssV3Metrics: '', cvssV2Metrics: '', cvssV4Severity: '', cvssV4Metrics: '',
    keywordSearch: '', keywordExactMatch: false, hasCertAlerts: false, 
    hasCertNotes: false, hasKev: false, hasOval: false, isVulnerable: false,
    noRejected: true, pubStartDate: '', pubEndDate: '', lastModStartDate: '',
    lastModEndDate: '', kevStartDate: '', kevEndDate: '', resultsPerPage: 20,
    sourceIdentifier: '', virtualMatchString: '', versionStart: '', versionEnd: ''
  });
  const [cveTimeframe, setCveTimeframe] = useState('week');

  // Pagination State
  const [incidentPage, setIncidentPage] = useState(1);
  const [incidentLimit, setIncidentLimit] = useState(50);
  const [cvePage, setCvePage] = useState(1);
  const [cveLimit, setCveLimit] = useState(50);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [totalCves, setTotalCves] = useState(0);

  useEffect(() => {
    setIncidentPage(1);
  }, [searchTerm, filterSeverity, incidentDateFrom, incidentDateTo]);

  useEffect(() => {
    setCvePage(1);
  }, [cveSearch, cveSeverityFilter, cveCompanyFilter, cveSourceFilter, cveDateFrom, cveDateTo, cveSortBy, cveSortOrder]);

  const loadData = useCallback(async () => {
    try {
      let incidentQuery = `limit=${incidentLimit}&skip=${(incidentPage - 1) * incidentLimit}`;
      if (view === 'india') incidentQuery += `&country=India`;
      if (view === 'financial') incidentQuery += `&is_financial=1`;
      if (filterSeverity !== 'All') incidentQuery += `&severity=${filterSeverity}`;
      if (searchTerm) incidentQuery += `&search=${encodeURIComponent(searchTerm)}`;

      let fromDate = incidentDateFrom;
      let toDate = incidentDateTo;

      if (fromDate) incidentQuery += `&happened_from=${fromDate}`;
      if (toDate) incidentQuery += `&happened_to=${toDate}`;

      // Build CVE query string
      let cveQuery = `limit=${cveLimit}&skip=${(cvePage - 1) * cveLimit}&sort_order=${cveSortOrder}&sort_by=${cveSortBy}`;
      if (cveSeverityFilter !== 'All') cveQuery += `&severity=${cveSeverityFilter}`;
      if (cveCompanyFilter !== 'All') cveQuery += `&company=${encodeURIComponent(cveCompanyFilter)}`;
      if (cveSourceFilter !== 'All') cveQuery += `&source=${encodeURIComponent(cveSourceFilter)}`;
      if (cveSearch) cveQuery += `&search=${encodeURIComponent(cveSearch)}`;
      if (cveDateFrom) cveQuery += `&date_from=${cveDateFrom}`;
      if (cveDateTo) cveQuery += `&date_to=${cveDateTo}`;

      const [sRes, iRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/incidents?${incidentQuery}`),
        fetch(`${API_BASE}/cves?${cveQuery}`)
      ]);
      const sData = await sRes.json();
      const iData = await iRes.json();
      const cData = await cRes.json();
      setStats(sData);
      setIncidents(iData.data || iData);
      setTotalIncidents(iData.total || (iData.data ? iData.data.length : iData.length));
      setCves(cData.data || cData);
      setTotalCves(cData.total || (cData.data ? cData.data.length : cData.length));
    } catch (e) {
      console.error("SOC DATA ERROR:", e);
    } finally {
      setLoading(false);
    }
  }, [view, filterSeverity, incidentDateFrom, incidentDateTo, timeframe, cveSortOrder, cveSortBy, cveDateFrom, cveDateTo, cveSeverityFilter, cveCompanyFilter, cveSourceFilter, cveSearch, cveTimeframe, incidentPage, incidentLimit, cvePage, cveLimit, searchTerm]);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/cves/audit`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) { console.error("Error loading audit logs:", e); }
  }, []);

  const loadReportHistory = useCallback(async () => {
    setReportHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/builder/history`);
      if (res.ok) {
        const data = await res.json();
        setReportHistory(data);
      }
    } catch (e) { console.error("Error loading report history:", e); }
    finally { setReportHistoryLoading(false); }
  }, []);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/companies`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (e) { console.error("Error loading companies:", e); }
  }, []);


  const loadReports = useCallback(async () => {
    try {
      const statsRes = await fetch(`${API_BASE}/stats`);
      const statsData = await statsRes.json();
      setStats(statsData);

      const mapRes = await fetch(`${API_BASE}/map-data`);
      const mapPoints = await mapRes.json();
      setMapData(mapPoints);

      const res = await fetch(`${API_BASE}/reports`);
      const data = await res.json();
      setReports(data);
      setLoading(false);
    } catch (e) { console.error(e); }
  }, []);

  const checkAiStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/status`);
      const data = await res.json();
      setAiStatus(data);
    } catch (e) {
      setAiStatus({ online: false, model: 'gemma4:e4b', available: false });
    }
  }, []);

  const fetchMitreData = async (incidentId, force = false) => {
    if (!force && mitreMappings[incidentId]) return;

    if (force) setAnalyzingMitre(incidentId);
    try {
      const endpoint = force ? `${API_BASE}/incidents/${incidentId}/mitre/analyze` : `${API_BASE}/incidents/${incidentId}/mitre`;
      const res = await fetch(endpoint, { method: force ? 'POST' : 'GET' });
      const data = await res.json();
      setMitreMappings(prev => ({ ...prev, [incidentId]: data }));
    } catch (e) {
      console.error("[Frontend] MITRE Mapping Error:", e);
    } finally {
      if (force) setAnalyzingMitre(null);
    }
  };

  const handleSaveCve = async (cve) => {
    try {
      const res = await fetch(`${API_BASE}/cves/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cve)
      });
      if (res.ok) {
        alert(`${cve.cve_id} saved to local database successfully!`);
        loadData(); // Refresh to update local status
      }
    } catch (e) {
      console.error("Save CVE failed:", e);
    }
  };

  const handleCollect = async (type = 'rss', tf = timeframe) => {
    setCollecting(true);
    try {
      const endpoint = type === 'rss' ? '/collect' : '/collect/nvd';
      const res = await fetch(`${API_BASE}${endpoint}?timeframe=${tf}`);
      const data = await res.json();
      alert(`Intelligence Sync Triggered [${tf.toUpperCase()}]: ${JSON.stringify(data)}`);
      loadData();
    } catch (e) {
      alert("Intelligence Sync failed: " + e.message);
    } finally {
      setCollecting(false);
    }
  };

  const handleNvdPull = async () => {
    if (!manualCveId || !manualCveId.toUpperCase().startsWith('CVE-')) {
      alert("Please enter a valid CVE ID (e.g., CVE-2024-1234)");
      return;
    }

    setPullingNvd(true);
    try {
      const res = await fetch(`${API_BASE}/cves/nvd/${manualCveId.toUpperCase()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "CVE not found in NVD");
      }
      const data = await res.json();
      
      setCves(prev => {
        const exists = prev.find(c => c.cve_id === data.cve_id);
        if (exists) return prev;
        return [data, ...prev];
      });
      setManualCveId('');
      alert(data.is_local ? "CVE already exists in local database." : "CVE successfully pulled from NVD API!");
    } catch (e) {
      alert(e.message);
    } finally {
      setPullingNvd(false);
    }
  };

  const fetchReportBuilderPreview = async () => {
    setReportBuilderPreviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/builder/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_date: reportBuilderFilters.from_date,
          to_date: reportBuilderFilters.to_date,
          data_sources: reportBuilderFilters.sources,
          impact_only: reportBuilderFilters.impact_only
        })
      });
      const data = await res.json();
      setReportBuilderData(data);
      setReportBuilderSelection({ incident_ids: [], cve_ids: [] });
    } catch (e) {
      console.error("Preview fetch failed:", e);
    } finally {
      setReportBuilderPreviewLoading(false);
    }
  };

  const handleGenerateCombinedReport = async () => {
    if (reportBuilderSelection.incident_ids.length === 0 && reportBuilderSelection.cve_ids.length === 0) {
      alert("Please select at least one incident or CVE to generate a report.");
      return;
    }

    setReportBuilderGenerating(true);
    try {
      const resp = await fetch(`${API_BASE}/reports/builder/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_title: reportBuilderTitle,
          from_date: reportBuilderFilters.from_date,
          to_date: reportBuilderFilters.to_date,
          incident_ids: reportBuilderSelection.incident_ids,
          cve_ids: reportBuilderSelection.cve_ids
        })
      });
      const data = await resp.json();
      if (data.id) {
        setCurrentGeneratedReportId(data.id);
        setShowReportConfirmModal(true);
        loadReportHistory(); 
      }
    } catch (e) {
      alert("Failed to generate report.");
    } finally {
      setReportBuilderGenerating(false);
    }
  };

  const handleDeleteReportBuilderConfig = async (id) => {
    if (!window.confirm("Are you sure you want to delete this report configuration?")) return;
    try {
      const res = await fetch(`${API_BASE}/reports/builder/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadReportHistory();
      }
    } catch (e) { console.error("Delete failed:", e); }
  };

  const confirmAndDownload = (includeCrawled) => {
    window.open(`${API_BASE}/reports/builder/download/${currentGeneratedReportId}/${reportBuilderFormat}?include_crawled_content=${includeCrawled}`, '_blank');
    setShowReportConfirmModal(false);
    setCurrentGeneratedReportId(null);
  };

  const handleGenerateImpact = async (incidentId) => {
    setGeneratingReport(incidentId);
    
    const currentIncident = incidents.find(inc => inc.id === incidentId);
    setWorkflowData({ incident: currentIncident, status: 'processing' });
    setShowAiWorkflow(true);

    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}/analyze-impact`, { method: 'POST' });
      const data = await res.json();
      setReports([data, ...reports]);
      setActiveReport(data);
      setWorkflowData(prev => ({ ...prev, report: data, status: 'complete' }));
      setView('impact');
    } catch (e) {
      console.error("[Frontend] API Call Failed:", e);
      setShowAiWorkflow(false);
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleRegenerateSummary = async (incidentId) => {
    setGeneratingSummary(incidentId);
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}/regenerate-summary`, { method: 'POST' });
      const updatedIncident = await res.json();
      setIncidents(incidents.map(inc => inc.id === incidentId ? updatedIncident : inc));
    } catch (e) {
      console.error("[Frontend] Summary regeneration failed:", e);
    } finally {
      setGeneratingSummary(null);
    }
  };

  const handleClearCrawl = async (incidentId) => {
    if (!window.confirm('Clear all crawled source content and forensic analysis for this incident?')) return;
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}/clear-crawl`, { method: 'POST' });
      const updated = await res.json();
      setIncidents(incidents.map(inc => inc.id === incidentId ? updated : inc));
      if (selectedRawIncident?.id === incidentId) setSelectedRawIncident(updated);
      alert('Crawl data cleared successfully.');
    } catch (e) {
      console.error("Clear crawl failed:", e);
    }
  };

  const handleDeleteIncident = async (incidentId) => {
    if (!window.confirm('Permanently delete this incident and all associated reports? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}`, { method: 'DELETE' });
      if (res.ok) {
        setIncidents(prev => prev.filter(inc => inc.id !== incidentId));
        if (selectedRawIncident?.id === incidentId) setSelectedRawIncident(null);
        alert('Incident deleted successfully.');
        loadData(); 
      }
    } catch (e) {
      console.error("Delete incident failed:", e);
    }
  };

  const handlePublishReport = async (reportId) => {
    try {
      await fetch(`${API_BASE}/reports/${reportId}/publish`, { method: 'POST' });
      await loadReports();
      alert("Report Published to Intelligence Group Successfully!");
    } catch (e) { console.error(e); }
  };

  const handleDeleteReport = async (reportId) => {
    const confirmed = window.confirm('Delete this AI Impact Analysis report? This cannot be undone.');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/reports/${reportId}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Unable to delete report');
      }
      setReports(prev => prev.filter(report => report.id !== reportId));
      if (activeReport?.id === reportId) {
        setActiveReport(null);
        setView('overview');
      }
      alert('AI Impact Analysis report deleted successfully.');
    } catch (e) {
      console.error('[Frontend] Delete report failed:', e);
      alert('Failed to delete the report. Please try again.');
    }
  };
  const loadCompanyProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/company-profile`);
      const data = await res.json();
      setCompanyProfile(data);
      setTempProfile({
        company_name: data.company_name,
        tech_stack_str: data.tech_stack.join(', '),
        industry: data.industry
      });
    } catch (e) { console.error("Load profile failed:", e); }
  }, []);

  const loadReviewQueue = useCallback(async () => {
    setIsReviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/intelligence/review-queue`);
      if (res.ok) {
        const data = await res.json();
        setReviewQueue(data);
      }
    } catch (e) { console.error("Load review queue failed:", e); }
    finally { setIsReviewLoading(false); }
  }, []);

  const loadScanHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/scan-history`);
      if (res.ok) {
        const data = await res.json();
        setScanHistory(data);
      }
    } catch (e) { console.error("Load scan history failed:", e); }
  }, []);

  useEffect(() => {
    (async () => {
      await loadData();
      await loadReports();
      await loadCompanies();
      await loadAuditLogs();
      await loadCompanyProfile();
      await loadReviewQueue();
      await loadScanHistory();
      await checkAiStatus();
    })();

    const interval = setInterval(() => {
      loadData();
      loadReports();
    }, 60000);

    const aiInterval = setInterval(checkAiStatus, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(aiInterval);
    };
  }, [loadData, loadReports, checkAiStatus, loadAuditLogs, loadCompanies, loadCompanyProfile, loadReviewQueue, loadScanHistory]);


  const updateReviewStatus = async (id, type, status) => {
    try {
      const res = await fetch(`${API_BASE}/intelligence/update-review-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, status })
      });
      if (res.ok) {
        loadReviewQueue();
        loadData(); 
      }
    } catch (e) { console.error("Update status failed:", e); }
  };

  const handleSaveProfile = async (updatedData = null) => {
    setIsSavingProfile(true);
    try {
      const payload = updatedData ? {
        company_name: updatedData.company_name,
        tech_stack: updatedData.tech_stack,
        industry: updatedData.industry
      } : {
        company_name: tempProfile.company_name,
        tech_stack: tempProfile.tech_stack || [],
        industry: tempProfile.industry
      };

      const res = await fetch(`${API_BASE}/company-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setCompanyProfile(data);
        setTempProfile({
          company_name: data.company_name,
          tech_stack: data.tech_stack,
          industry: data.industry
        });
        setIsProfileModalOpen(false);
        loadData();
        alert("Inventory Updated Successfully!");
      }
    } catch (e) { console.error("Save profile failed:", e); }
    finally { setIsSavingProfile(false); }
  };

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleCompanyScan = async (full = false, engine = 'all') => {
    setCompanyScanning(true);
    setScanProgress({
      total: 0,
      scanned: 0,
      threats: 0,
      startTime: Date.now(),
      percentage: 0,
      elapsedTime: 0,
      threatsYes: 0,
      threatsNo: 0,
      threatsPending: 0,
      activeEngine: engine
    });

    try {
      let countQuery = `limit=2000`;
      const [allIncidentsRes, allCvesRes] = await Promise.all([
        fetch(`${API_BASE}/incidents?${countQuery}`),
        fetch(`${API_BASE}/cves?${countQuery}`)
      ]);
      const allIncidentsData = (await allIncidentsRes.json()).data || [];
      const allCvesData = (await allCvesRes.json()).data || [];

      const targetMethod = engine === 'heuristic' ? 'Heuristic' : engine === 'version' ? 'Heuristic (Version-Aware)' : null;

      const totalIncToScan = full ? allIncidentsData.length : allIncidentsData.filter(inc => !inc.company_impact_status || inc.company_impact_status === 'Pending' || (targetMethod && inc.detection_method !== targetMethod)).length;
      const totalCvesToScan = full ? allCvesData.length : allCvesData.filter(cve => !cve.company_impact_reason || (targetMethod && cve.detection_method !== targetMethod)).length;
      const totalToScan = totalIncToScan + totalCvesToScan;

      if (totalToScan === 0) {
        alert("No new threats to scan for this engine.");
        setCompanyScanning(false);
        return;
      }

      const res = await fetch(`${API_BASE}/scan-company-impact?full=${full}&engine=${engine}`, { method: 'POST' });
      await res.json();

      let isProcessing = true;
      let pollCount = 0;
      const startTime = Date.now();

      while (isProcessing && pollCount < 300) { 
        await new Promise(resolve => setTimeout(resolve, 2000)); 
        pollCount++;

        const [checkIncRes, checkCveRes] = await Promise.all([
          fetch(`${API_BASE}/incidents?limit=2000`),
          fetch(`${API_BASE}/cves?limit=2000`)
        ]);
        const currentData = (await checkIncRes.json()).data || [];
        const currentCveData = (await checkCveRes.json()).data || [];

        const incYes = currentData.filter(inc => inc.company_impact_status === 'Yes' && (!targetMethod || inc.detection_method === targetMethod)).length;
        const incNo = currentData.filter(inc => inc.company_impact_status === 'No' && (!targetMethod || inc.detection_method === targetMethod)).length;
        const incPending = currentData.filter(inc => !inc.company_impact_status || inc.company_impact_status === 'Pending' || (targetMethod && inc.detection_method !== targetMethod)).length;

        const cveYes = currentCveData.filter(cve => cve.company_impact_reason && cve.company_impact_score >= 60 && (!targetMethod || cve.detection_method === targetMethod)).length;
        const cveNo = currentCveData.filter(cve => cve.company_impact_reason && cve.company_impact_score < 60 && (!targetMethod || cve.detection_method === targetMethod)).length;
        const cvePending = currentCveData.filter(cve => !cve.company_impact_reason || (targetMethod && cve.detection_method !== targetMethod)).length;

        const threatsYes = incYes + cveYes;
        const threatsNo = incNo + cveNo;
        const threatsPending = incPending + cvePending;

        const scanned = threatsYes + threatsNo;
        const totalItems = currentData.length + currentCveData.length;
        const percentage = totalItems > 0 ? Math.round((scanned / totalItems) * 100) : 100;

        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

        setScanProgress({
          total: totalItems,
          scanned: scanned,
          threats: threatsYes,
          startTime: startTime,
          percentage: Math.min(100, percentage),
          elapsedTime: elapsedSeconds,
          threatsYes: threatsYes,
          threatsNo: threatsNo,
          threatsPending: threatsPending,
          activeEngine: engine
        });

        if (threatsPending === 0) isProcessing = false;
      }
    } catch (e) {
      console.error("Company scan error:", e);
      alert("Error starting company impact scan");
    } finally {
      setCompanyScanning(false);
      loadData();
      loadScanHistory();
    }
  };

  const handleStopScan = async () => {
    try {
      await fetch(`${API_BASE}/scan-company-impact/stop`, { method: 'POST' });
      setCompanyScanning(false);
      loadData();
      loadScanHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = incidents.filter(inc => {
    const matchesSearch = (inc.title + inc.description).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSev = filterSeverity === 'All' || inc.severity === filterSeverity;

    if (view === 'india') return matchesSearch && matchesSev && inc.country === 'India';
    if (view === 'financial') return matchesSearch && matchesSev && inc.is_financial === 1;
    return matchesSearch && matchesSev;
  });

  const severityData = stats?.severity ? Object.entries(stats.severity).map(([name, value]) => ({ name, value })) : [];
  const geoData = [
    { name: 'India', value: stats?.india || 0 },
    { name: 'Global', value: stats?.global || 0 }
  ];

  if (loading && incidents.length === 0) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#06080a', gap: '20px' }}>
        <div style={{ padding: '20px', borderRadius: '50%', background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.1)' }}>
          <ShieldAlert size={48} color="#00f2ff" className="animate-pulse" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', letterSpacing: '1px' }}>INITIALIZING INTEL CORE</h2>
          <p style={{ fontSize: '12px', color: '#8b949e', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '2px' }}>Connecting to global threat nodes...</p>
        </div>
        <div style={{ width: '200px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' }}>
          <div style={{ height: '100%', background: '#00f2ff', width: '60%', borderRadius: '2px' }} className="animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${theme}-theme`}>
      <aside className="sidebar">
        <div className="nav-logo">
          <ShieldAlert color="var(--primary)" size={28} />
          <h2>INTEL COMMAND</h2>
        </div>

        <div className={`nav-item ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>
          <LayoutDashboard size={18} /> Overview
        </div>
        
        <div className={`nav-item ${view === 'company' ? 'active' : ''}`} onClick={() => setView('company')}>
          <AlertOctagon size={18} color={view === 'company' ? '#ff6b6b' : 'inherit'} /> Impact Radar
        </div>

        <div className={`nav-item ${view === 'review' ? 'active' : ''}`} onClick={() => { setView('review'); loadReviewQueue(); }}>
          <Shield size={18} color={view === 'review' ? '#10b981' : 'inherit'} /> Manual Review
          {reviewQueue.incidents.length + reviewQueue.cves.length > 0 && (
            <span className="count-badge">{reviewQueue.incidents.length + reviewQueue.cves.length}</span>
          )}
        </div>

        <div className={`nav-item ${view === 'inventory' ? 'active' : ''}`} onClick={() => setView('inventory')}>
          <Settings size={18} /> Tech Stack
        </div>

        <div className="sidebar-divider"></div>

        <div className={`nav-item ${view === 'cves' ? 'active' : ''}`} onClick={() => setView('cves')}>
          <Database size={18} color={view === 'cves' ? '#a855f7' : 'inherit'} /> Vulnerability DB
        </div>

        <div className={`nav-item ${view === 'cve_extractor' ? 'active' : ''}`} onClick={() => setView('cve_extractor')}>
          <Search size={18} color={view === 'cve_extractor' ? '#3b82f6' : 'inherit'} /> CVE Extractor
        </div>

        <div className={`nav-item ${view === 'audit' ? 'active' : ''}`} onClick={() => setView('audit')}>
          <Terminal size={18} /> Intelligence Audit
        </div>

        <div className="sidebar-divider"></div>

        <div className={`nav-item ${view === 'report_builder' ? 'active' : ''}`} onClick={() => setView('report_builder')}>
          <FilePlus size={18} color={view === 'report_builder' ? '#6366f1' : 'inherit'} /> Report Builder
        </div>

        <div className={`nav-item ${view === 'jira' ? 'active' : ''}`} onClick={() => setView('jira')}>
          <ArrowUpRight size={18} color={view === 'jira' ? '#a855f7' : 'inherit'} /> Jira Publisher
        </div>

        <div className={`nav-item ${view === 'impact' ? 'active' : ''}`} onClick={() => setView('impact')}>
          <FileText size={18} /> Analysis Archive
        </div>

        <div style={{ marginTop: 'auto', padding: '24px' }}>
          <div className="nav-item theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="main-header">
          <div className="header-search">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search global intelligence..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="header-actions">
            {/* Gemma AI Status Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)', marginRight: '10px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: aiStatus.online ? '#10b981' : '#ef4444', 
                boxShadow: aiStatus.online ? '0 0 10px #10b981' : 'none',
                transition: 'all 0.3s ease'
              }} className={aiStatus.online ? "animate-pulse" : ""}></div>
              <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                AI MODEL ({aiStatus.model || 'gemma4:e4b'}): <span style={{ color: aiStatus.online ? '#10b981' : '#ef4444' }}>{aiStatus.online ? 'ONLINE' : 'OFFLINE'}</span>
              </span>
            </div>

            <button className="btn-ghost" onClick={loadData} style={{ gap: '6px' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 
              {loading ? 'Syncing...' : 'Sync Intel'}
            </button>
          </div>
        </header>

        <main className="main-content">
          {view === 'overview' && (
            <Dashboard 
              stats={stats}
              incidents={incidents}
              severityData={severityData}
              geoData={geoData}
              intelMode={intelMode}
              setIntelMode={setIntelMode}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterSeverity={filterSeverity}
              setFilterSeverity={setFilterSeverity}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              incidentDateFrom={incidentDateFrom}
              setIncidentDateFrom={setIncidentDateFrom}
              incidentDateTo={incidentDateTo}
              setIncidentDateTo={setIncidentDateTo}
              loadData={loadData}
              handleClearCrawl={handleClearCrawl}
              handleDeleteIncident={handleDeleteIncident}
              handleRegenerateSummary={handleRegenerateSummary}
              handleGenerateImpact={handleGenerateImpact}
              setSelectedRawIncident={setSelectedRawIncident}
              setView={setView}
              reports={reports}
              setActiveReport={setActiveReport}
              mitreMappings={mitreMappings}
              generatingSummary={generatingSummary}
              generatingReport={generatingReport}
              loading={loading}
              handleCollect={handleCollect}
              collecting={collecting}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              handleCompanyScan={handleCompanyScan}
              incidentPage={incidentPage}
              setIncidentPage={setIncidentPage}
              incidentLimit={incidentLimit}
              setIncidentLimit={setIncidentLimit}
              totalIncidents={totalIncidents}
            />
          )}

          {view === 'company' && (
            <CompanyRadar 
              incidents={incidents}
              cves={cves}
              companyProfile={companyProfile}
              setSelectedRawIncident={setSelectedRawIncident}
              setView={setView}
              handleCompanyScan={handleCompanyScan}
              handleStopScan={handleStopScan}
              reviewQueue={reviewQueue}
              companyScanning={companyScanning}
              scanProgress={scanProgress}
              scanHistory={scanHistory}
            />
          )}

          {view === 'review' && (
            <ManualReview 
              reviewQueue={reviewQueue}
              updateReviewStatus={updateReviewStatus}
              setSelectedRawIncident={setSelectedRawIncident}
            />
          )}

          {view === 'inventory' && (
            <TechInventory 
              companyProfile={companyProfile}
              handleSaveProfile={handleSaveProfile}
              isSavingProfile={isSavingProfile}
            />
          )}

          {view === 'cves' && (
            <VulnerabilityDB 
              cves={cves}
              manualCveId={manualCveId}
              setManualCveId={setManualCveId}
              handleNvdPull={handleNvdPull}
              pullingNvd={pullingNvd}
              showCveFilters={showCveFilters}
              setShowCveFilters={setShowCveFilters}
              cveSeverityFilter={cveSeverityFilter}
              setCveSeverityFilter={setCveSeverityFilter}
              cveSearch={cveSearch}
              setCveSearch={setCveSearch}
              loadData={loadData}
              setSelectedCve={setSelectedCve}
              selectedCve={selectedCve}
              advNvdParams={advNvdParams}
              setAdvNvdParams={setAdvNvdParams}
              advNvdLoading={advNvdLoading}
              setAdvNvdLoading={setAdvNvdLoading}
              API_BASE={API_BASE}
              cveSourceFilter={cveSourceFilter}
              setCveSourceFilter={setCveSourceFilter}
              handleCollect={handleCollect}
              collecting={collecting}
              cveTimeframe={cveTimeframe}
              setCveTimeframe={setCveTimeframe}
              cveDateFrom={cveDateFrom}
              setCveDateFrom={setCveDateFrom}
              cveDateTo={cveDateTo}
              setCveDateTo={setCveDateTo}
              handleCompanyScan={handleCompanyScan}
              handleOpenExtractor={(id) => { setExtractorCveId(id); setView('cve_extractor'); }}
              cvePage={cvePage}
              setCvePage={setCvePage}
              cveLimit={cveLimit}
              setCveLimit={setCveLimit}
              totalCves={totalCves}
              cveSortBy={cveSortBy}
              setCveSortBy={setCveSortBy}
              cveSortOrder={cveSortOrder}
              setCveSortOrder={setCveSortOrder}
            />
          )}

          {view === 'cve_extractor' && (
            <CVEReportViewer 
                extractorCveId={extractorCveId}
                setExtractorCveId={setExtractorCveId}
            />
          )}

          {view === 'jira' && (
            <JiraPublisher />
          )}

          {view === 'audit' && <AuditLogs auditLogs={auditLogs} />}

          {view === 'report_builder' && (
            <ReportBuilder 
              reportBuilderData={reportBuilderData}
              reportBuilderSelection={reportBuilderSelection}
              setReportBuilderSelection={setReportBuilderSelection}
              reportBuilderFilters={reportBuilderFilters}
              setReportBuilderFilters={setReportBuilderFilters}
              reportBuilderTitle={reportBuilderTitle}
              setReportBuilderTitle={setReportBuilderTitle}
              reportBuilderGenerating={reportBuilderGenerating}
              handleGenerateCombinedReport={handleGenerateCombinedReport}
              reportHistory={reportHistory}
              reportHistoryLoading={reportHistoryLoading}
              handleDeleteReportBuilderConfig={handleDeleteReportBuilderConfig}
              fetchReportBuilderPreview={fetchReportBuilderPreview}
            />
          )}

          {view === 'impact' && (
            <ImpactReports 
              reports={reports}
              activeReport={activeReport}
              setActiveReport={setActiveReport}
              handlePublishReport={handlePublishReport}
              handleDeleteReport={handleDeleteReport}
            />
          )}
        </main >
      </div>

      {showAiWorkflow && (
        <AIWorkflowModal
          data={workflowData}
          onClose={() => setShowAiWorkflow(false)}
          theme={theme}
          model={aiStatus.model}
        />
      )}

      {selectedRawIncident && (
        <RawIntelligenceModal
          incident={selectedRawIncident}
          onClose={() => setSelectedRawIncident(null)}
          theme={theme}
          onRefresh={(updated) => {
            setIncidents(prev => prev.map(inc => inc.id === updated.id ? updated : inc));
            setSelectedRawIncident(updated);
          }}
        />
      )}

      {showAdvancedNvd && (
        <div className="modal-overlay" onClick={() => setShowAdvancedNvd(false)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>National Vulnerability Database</div>
                <h2 style={{ fontSize: '22px', fontWeight: 900, margin: 0 }}>Advanced Intelligence Search</h2>
              </div>
              <button className="btn-ghost" onClick={() => setShowAdvancedNvd(false)} style={{ padding: '8px', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <section>
                    <h4 style={{ color: '#6366f1', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 800 }}>General Identities</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="input-group">
                        <label>CVE ID</label>
                        <input type="text" placeholder="CVE-2024-..." value={advNvdParams.cveId} onChange={e => setAdvNvdParams({...advNvdParams, cveId: e.target.value})} />
                      </div>
                      <div className="input-group">
                        <label>CWE ID</label>
                        <input type="text" placeholder="CWE-79" value={advNvdParams.cweId} onChange={e => setAdvNvdParams({...advNvdParams, cweId: e.target.value})} />
                      </div>
                    </div>
                    <div style={{ marginTop: '12px' }} className="input-group">
                      <label>CPE Name</label>
                      <input type="text" placeholder="cpe:2.3:o:microsoft:windows_10:..." value={advNvdParams.cpeName} onChange={e => setAdvNvdParams({...advNvdParams, cpeName: e.target.value})} />
                    </div>
                  </section>
                  <section>
                    <h4 style={{ color: '#f59e0b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 800 }}>Severity & Metrics</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="input-group">
                        <label>CVSS v3 Severity</label>
                        <select value={advNvdParams.cvssV3Severity} onChange={e => setAdvNvdParams({...advNvdParams, cvssV3Severity: e.target.value})}>
                          <option value="">Any</option>
                          <option value="CRITICAL">Critical</option>
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label>CVSS v2 Severity</label>
                        <select value={advNvdParams.cvssV2Severity} onChange={e => setAdvNvdParams({...advNvdParams, cvssV2Severity: e.target.value})}>
                          <option value="">Any</option>
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <section>
                    <h4 style={{ color: '#10b981', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 800 }}>Date Range Filters</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="input-group">
                        <label>Published Start</label>
                        <input type="date" value={advNvdParams.pubStartDate} onChange={e => setAdvNvdParams({...advNvdParams, pubStartDate: e.target.value})} />
                      </div>
                      <div className="input-group">
                        <label>Published End</label>
                        <input type="date" value={advNvdParams.pubEndDate} onChange={e => setAdvNvdParams({...advNvdParams, pubEndDate: e.target.value})} />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
              <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                <button className="btn-ghost" onClick={() => setShowAdvancedNvd(false)}>Cancel</button>
                <button className="btn-primary" onClick={() => setShowAdvancedNvd(false)}>Search</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCve && (
        <div className="modal-overlay" onClick={() => setSelectedCve(null)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', padding: 0 }}>
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', padding: '30px', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0 }}>{selectedCve.cve_id}</h2>
                <X size={24} onClick={() => setSelectedCve(null)} style={{ cursor: 'pointer' }} />
              </div>
            </div>
            <div style={{ padding: '30px', background: 'var(--bg-main)' }}>
              <p>{selectedCve.ai_summary || selectedCve.description}</p>
              <button className="btn-primary" onClick={() => setSelectedCve(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showReportConfirmModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setShowReportConfirmModal(false)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'center', padding: '40px', background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <FileDown size={30} color="#6366f1" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '12px', color: 'var(--text-main)' }}>Export Configuration</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
              Would you like to include the <strong>Full Source Article Details</strong> (crawled content) for each incident, or just the AI intelligence summary?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <button 
                className="btn-primary" 
                style={{ padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 800 }}
                onClick={() => confirmAndDownload(true)}
              >
                Yes, Include Full Article Details
              </button>
              <button 
                className="btn-ghost" 
                style={{ padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, border: '1px solid var(--border)', color: 'var(--text-main)' }}
                onClick={() => confirmAndDownload(false)}
              >
                No, Summary Intelligence Only
              </button>
            </div>
          </div>
        </div>
      )}

      <CompanyProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        tempProfile={tempProfile}
        setTempProfile={setTempProfile}
        onSave={handleSaveProfile}
        isSaving={isSavingProfile}
      />
    </div>
  );
}

export default App;
