import React, { useState, useEffect } from 'react';
import { Search, Loader2, Loader, Save, AlertCircle, CheckCircle, ShieldAlert, Activity, GitBranch, Cpu, Database, Network, ChevronRight, Download, FileText, FileSpreadsheet, Clock, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
const API_BASE = 'http://localhost:8000/api';

export default function CVEReportViewer({ extractorCveId, setExtractorCveId, isModal = false, previewOnly = false, onReportLoaded }) {
    const [cveId, setCveId] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedProducts, setExpandedProducts] = useState({});
    
    // History State
    const [history, setHistory] = useState([]);
    const [historySearch, setHistorySearch] = useState('');

    useEffect(() => {
        if (isModal) return; // Don't load history if it's just a modal preview
        const savedHistory = localStorage.getItem('cve_extractor_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Failed to parse history");
            }
        }
    }, [isModal]);

    // Effect to handle auto-extraction when redirected from VulnerabilityDB
    useEffect(() => {
        if (extractorCveId && extractorCveId !== '') {
            setCveId(extractorCveId);
            handleExtract(extractorCveId);
            if (setExtractorCveId) {
                setExtractorCveId(''); // Clear it so it doesn't re-trigger on unmount/remount
            }
        }
    }, [extractorCveId]);

    const saveToHistory = (newReport) => {
        if (previewOnly) return; // Don't save to local history in preview mode
        setHistory(prev => {
            // Remove if already exists to put it at the top
            const filtered = prev.filter(h => h.metadata.cve_id !== newReport.metadata.cve_id);
            const newHistory = [newReport, ...filtered];
            localStorage.setItem('cve_extractor_history', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const clearHistory = () => {
        if (window.confirm('Clear all extraction history?')) {
            localStorage.removeItem('cve_extractor_history');
            setHistory([]);
            setReport(null);
            setCveId('');
        }
    };

    const exportAllToExcel = () => {
        if (history.length === 0) return;
        const wb = XLSX.utils.book_new();

        history.forEach((h) => {
            const sheetName = h.metadata.cve_id.substring(0, 31).replace(/[\[\]\*\\\/\?]/g, '_'); 
            
            const data = [
                ['CVE Report', h.metadata.cve_id],
                ['Title', h.vulnerability.title || 'N/A'],
                ['Published', h.metadata.date_published?.split('T')[0] || 'N/A'],
                ['Updated', h.metadata.date_updated?.split('T')[0] || 'N/A'],
                ['Assigner', h.metadata.assigner || 'N/A'],
                [],
                ['CVSS Score', h.scoring.cvss_score || 'N/A'],
                ['Severity', h.scoring.cvss_severity || 'N/A'],
                ['Vector', h.scoring.cvss_vector || 'N/A'],
                [],
                ['Description', h.vulnerability.description || 'N/A'],
                [],
                ['Affected Products']
            ];

            if (h.affected && h.affected.products && h.affected.products.length > 0) {
                data.push(['Vendor', 'Product', 'Platforms', 'Versions']);
                h.affected.products.forEach(p => {
                    const versions = p.versions?.map(v => `${v.version} to ${v.less_than}`).join(', ') || 'N/A';
                    data.push([p.vendor, p.product, (p.platforms || []).join(', '), versions]);
                });
            } else {
                data.push(['No specific products listed.']);
            }

            const ws = XLSX.utils.aoa_to_sheet(data);
            
            // Make columns wider
            ws['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 30 }, { wch: 30 }];
            
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        XLSX.writeFile(wb, 'All_CVE_History_Reports.xlsx');
    };

    const exportAllToPDF = () => {
        if (history.length === 0) return;
        
        const doc = new jsPDF();
        
        history.forEach((h, idx) => {
            if (idx > 0) doc.addPage();
            
            // Header
            doc.setFontSize(18);
            doc.text(`CVE Report: ${h.metadata.cve_id}`, 14, 20);
            
            doc.setFontSize(12);
            doc.text(`Title: ${h.vulnerability.title || 'N/A'}`, 14, 30);
            doc.text(`Assigner: ${h.metadata.assigner || 'N/A'}`, 14, 38);
            doc.text(`Published: ${h.metadata.date_published?.split('T')[0] || 'N/A'}`, 14, 46);
            doc.text(`Severity: ${h.scoring.cvss_severity || 'N/A'} (${h.scoring.cvss_score || 'N/A'})`, 14, 54);
            
            // Description (wrap text)
            doc.setFontSize(11);
            doc.text('Description:', 14, 66);
            doc.setFontSize(10);
            const descLines = doc.splitTextToSize(h.vulnerability.description || 'No description available.', 180);
            doc.text(descLines, 14, 74);
            
            // Affected Products Table
            const startY = 75 + (descLines.length * 4) + 10;
            
            const tableData = [];
            if (h.affected && h.affected.products && h.affected.products.length > 0) {
                h.affected.products.forEach(p => {
                    const platforms = (p.platforms || []).join(', ') || 'N/A';
                    const versions = p.versions?.map(v => `${v.version} to ${v.less_than}`).join('\n') || 'N/A';
                    tableData.push([p.vendor, p.product, platforms, versions]);
                });
                
                autoTable(doc, {
                    startY: startY,
                    head: [['Vendor', 'Product', 'Platforms', 'Versions']],
                    body: tableData,
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [55, 138, 221] }
                });
            } else {
                doc.text('No specific products listed.', 14, startY + 4);
            }
        });
        
        doc.save('All_CVE_History_Reports.pdf');
    };

    const loadFromHistory = (historicalReport) => {
        setReport(historicalReport);
        setCveId(historicalReport.metadata.cve_id);
        setExpandedProducts({});
        setError(null);
    };

    const handleExportPDF = () => {
        window.print();
    };

    const handleExportExcel = () => {
        if (!report || !report.affected || !report.affected.products) return;

        let csvContent = "data:text/csv;charset=utf-8,Vendor,Product,Platforms,Version,Less Than,Status\n";
        
        report.affected.products.forEach(p => {
            const vendor = `"${p.vendor || ''}"`;
            const product = `"${p.product || ''}"`;
            const platforms = `"${(p.platforms || []).join('; ')}"`;
            
            if (p.versions && p.versions.length > 0) {
                p.versions.forEach(v => {
                    const version = `"${v.version || ''}"`;
                    const lessThan = `"${v.less_than || ''}"`;
                    const status = `"${v.status || ''}"`;
                    csvContent += `${vendor},${product},${platforms},${version},${lessThan},${status}\n`;
                });
            } else {
                csvContent += `${vendor},${product},${platforms},,,\n`;
            }
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${report.metadata.cve_id}_Affected_Products.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Bulk Extraction State
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkCves, setBulkCves] = useState('');
    const [bulkProgress, setBulkProgress] = useState(null);

    const handleBulkExtract = async () => {
        const ids = bulkCves.split(/[,\s\n]+/).map(i => i.trim().toUpperCase()).filter(i => i.startsWith('CVE-'));
        
        if (ids.length === 0) {
            setError("Please enter valid CVE IDs (e.g., CVE-2023-38545).");
            return;
        }

        if (!navigator.onLine) {
            setError("Internet Not connected. Please check your connection.");
            return;
        }

        setLoading(true);
        setError(null);
        setReport(null);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < ids.length; i++) {
            const targetId = ids[i];
            setBulkProgress(`Processing ${i + 1} of ${ids.length}: ${targetId}...`);
            
            try {
                let mitreData;
                try {
                    const mitreRes = await fetch(`https://cveawg.mitre.org/api/cve/${targetId}`);
                    if (!mitreRes.ok) throw new Error(`MITRE Error`);
                    mitreData = await mitreRes.json();
                } catch (fetchErr) {
                    throw new Error("API unreachable");
                }

                const res = await fetch(`${API_BASE}/cves/mitre/parse-and-save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mitreData)
                });
                
                if (!res.ok) throw new Error("Backend parse failed");
                
                const data = await res.json();
                saveToHistory(data.report);
                successCount++;
                
                // If it's the last one, set it to the viewer so they see something
                if (i === ids.length - 1) {
                    setReport(data.report);
                }
            } catch (e) {
                console.error(`Failed ${targetId}:`, e);
                failCount++;
            }
        }

        setLoading(false);
        setBulkProgress(null);
        if (failCount > 0) {
            setError(`Completed: ${successCount} successful, ${failCount} failed.`);
        } else {
            setError(null);
            // We can optionally show a success message or just let them see the last report
        }
        setBulkCves('');
        setIsBulkMode(false);
    };

    const handleExtract = async (idToFetch = null) => {
        if (isBulkMode) {
            return handleBulkExtract();
        }

        // If an event is passed (e.g. from onClick), it won't be a string.
        const targetId = typeof idToFetch === 'string' ? idToFetch : cveId;
        
        if (!targetId || !targetId.toUpperCase().startsWith('CVE-')) {
            setError("Please enter a valid CVE ID (e.g., CVE-2026-21530)");
            return;
        }

        if (!navigator.onLine) {
            setError("Internet Not connected. Please check your connection.");
            return;
        }

        setLoading(true);
        setError(null);
        setReport(null);
        
        try {
            // 1. Fetch from MITRE directly using internet
            let mitreData;
            try {
                const mitreRes = await fetch(`https://cveawg.mitre.org/api/cve/${targetId}`);
                if (!mitreRes.ok) {
                    if (mitreRes.status === 404) throw new Error("CVE not found on MITRE API");
                    throw new Error(`MITRE API Error: ${mitreRes.statusText}`);
                }
                mitreData = await mitreRes.json();
            } catch (fetchErr) {
                if (fetchErr.message === 'Failed to fetch') {
                    throw new Error("Internet Not connected or MITRE API is unreachable.");
                }
                throw fetchErr;
            }

            // 2. Send the raw MITRE JSON to backend for parsing and saving
            const backendUrl = previewOnly 
                ? `${API_BASE}/cves/mitre/parse-and-save?save=false` 
                : `${API_BASE}/cves/mitre/parse-and-save`;

            const res = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mitreData)
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to process CVE data");
            }
            
            const data = await res.json();
            setReport(data.report);
            if (!previewOnly) {
                saveToHistory(data.report);
            }
            if (onReportLoaded) {
                onReportLoaded(data.report);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleProduct = (index) => {
        setExpandedProducts(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    // Styling from cve_report.html
    const styles = {
        container: {
            maxWidth: isModal ? '100%' : '900px',
            margin: '0 auto',
            padding: '2rem',
            backgroundColor: '#ffffff',
            color: '#1a1a1a',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            lineHeight: 1.6,
            borderRadius: '12px',
            boxShadow: isModal ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        },
        header: {
            borderBottom: '1px solid #e5e5e5',
            paddingBottom: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '2rem'
        },
        headerLabel: {
            fontSize: '12px',
            color: '#666',
            fontWeight: 600,
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
            textTransform: 'uppercase'
        },
        headerTitle: {
            fontSize: '28px',
            fontWeight: 500,
            margin: '0.5rem 0 1rem',
            lineHeight: 1.2,
            color: '#1a1a1a'
        },
        headerCve: {
            fontSize: '14px',
            color: '#666'
        },
        cvssBadge: (severity) => {
            const sev = (severity || "").toUpperCase();
            let bg = '#BA7517'; // Medium
            let color = '#FAEEDA';
            if (sev === 'CRITICAL') { bg = '#E24B4A'; color = '#FCEBEB'; }
            if (sev === 'HIGH') { bg = '#D85A30'; color = '#FAECE7'; }
            if (sev === 'LOW') { bg = '#639922'; color = '#EAF3DE'; }
            return {
                background: bg,
                color: color,
                padding: '1.25rem',
                borderRadius: '12px',
                minWidth: '120px',
                textAlign: 'center',
                minHeight: 'fit-content'
            }
        },
        section: { marginBottom: '2rem' },
        h2: { fontSize: '16px', fontWeight: 500, marginBottom: '0.75rem', color: '#1a1a1a' },
        h3: { fontSize: '14px', fontWeight: 500, marginBottom: '0.75rem', color: '#1a1a1a' },
        description: { fontSize: '14px', lineHeight: 1.7, color: '#666' },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '2rem'
        },
        infoCard: { background: '#f5f5f5', padding: '1rem', borderRadius: '8px', fontSize: '14px' },
        infoCardLabel: { fontSize: '12px', color: '#666', marginBottom: '0.5rem' },
        infoCardValue: { fontSize: '15px', fontWeight: 500, color: '#1a1a1a' },
        infoCardDetail: { fontSize: '12px', color: '#666', marginTop: '0.5rem' },
        cvssVector: { background: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' },
        cvssCode: {
            fontSize: '12px', fontFamily: '"Courier New", monospace', color: '#666',
            wordBreak: 'break-all', background: '#fff', padding: '0.75rem', borderRadius: '8px', display: 'block'
        },
        productList: { display: 'flex', flexDirection: 'column', gap: '8px' },
        productItem: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '1rem' },
        productButton: {
            width: '100%', background: 'transparent', border: '1px solid #e5e5e5', borderRadius: '8px',
            padding: '1rem', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', fontSize: '14px', transition: 'all 0.2s ease'
        },
        productDetails: {
            background: '#f9f9f9', borderLeft: '2px solid #378ADD', padding: '1rem',
            borderRadius: '0 8px 8px 0', fontSize: '13px', marginTop: '-1px'
        },
        cisaAssessment: {
            background: '#f5f5f5', padding: '1.25rem', borderRadius: '12px',
            marginBottom: '2rem', borderLeft: '4px solid #BA7517'
        },
        referenceLink: {
            display: 'block', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px',
            padding: '1rem', textDecoration: 'none', transition: 'all 0.2s ease', marginBottom: '8px'
        },
        referenceName: { fontSize: '14px', fontWeight: 500, color: '#378ADD', marginBottom: '4px' },
        tag: { display: 'inline-block', background: '#f5f5f5', padding: '2px 8px', borderRadius: '6px', marginRight: '6px', marginBottom: '4px', fontSize: '11px', color: '#666' }
    };

    return (
        <div style={{ padding: isModal ? '0' : '20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* Main Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {!isModal && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ShieldAlert /> CVE Extractor & Analyzer
                            </h1>
                            <button 
                                onClick={() => setIsBulkMode(!isBulkMode)}
                                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Database size={14} /> {isBulkMode ? 'Single Extraction Mode' : 'Bulk Extraction Mode'}
                            </button>
                        </div>

                        {/* Extraction Control Bar */}
                        <div style={{ display: 'flex', flexDirection: isBulkMode ? 'column' : 'row', gap: '10px', marginBottom: '20px', background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            {isBulkMode ? (
                                <div style={{ width: '100%' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Enter multiple CVE IDs (separated by commas or newlines):</label>
                                    <textarea 
                                        value={bulkCves}
                                        onChange={(e) => setBulkCves(e.target.value)}
                                        placeholder="CVE-2023-38545&#10;CVE-2023-38546"
                                        style={{ width: '100%', height: '120px', padding: '12px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '14px', resize: 'vertical' }}
                                    />
                                </div>
                            ) : (
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Enter CVE ID (e.g., CVE-2023-38545)"
                                        value={cveId}
                                        onChange={(e) => setCveId(e.target.value)}
                                        style={{ width: '100%', padding: '12px 15px 12px 40px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '16px' }}
                                    />
                                </div>
                            )}
                            <button 
                                onClick={handleExtract}
                                disabled={loading}
                                style={{ alignSelf: isBulkMode ? 'flex-end' : 'stretch', background: 'var(--primary)', color: 'white', border: 'none', padding: '0 25px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', height: isBulkMode ? '44px' : 'auto' }}
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                {loading ? 'Extracting...' : isBulkMode ? 'Extract & Save All' : 'Extract & Save'}
                            </button>
                        </div>
                        {bulkProgress && (
                            <div style={{ background: '#EAF3DE', color: '#639922', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: 500 }}>
                                <Loader2 className="animate-spin" size={14} style={{ display: 'inline', marginRight: '8px' }} />
                                {bulkProgress}
                            </div>
                        )}
                    </>
                )}

                {loading && isModal && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <Loader className="animate-spin" size={40} style={{ marginBottom: '16px', color: 'var(--primary)' }} />
                        <h3 style={{ margin: 0, fontWeight: 600 }}>Fetching Official MITRE Intelligence...</h3>
                        <p style={{ fontSize: '14px', marginTop: '8px' }}>Directly connecting to cveawg.mitre.org</p>
                    </div>
                )}

                {error && (
                    <div style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', marginBottom: '20px' }}>
                        <strong>Error:</strong> {error}
                    </div>
                )}

            {/* Generated Report View */}
            {report && (
                <div style={styles.container}>
                    {/* Header */}
                    <div style={{ ...styles.header, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: '8px' }}>
                            <button 
                                onClick={handleExportPDF}
                                style={{ background: '#f5f5f5', color: '#1a1a1a', border: '1px solid #e5e5e5', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500 }}
                            >
                                <FileText size={14} /> Save PDF
                            </button>
                            <button 
                                onClick={handleExportExcel}
                                style={{ background: '#f5f5f5', color: '#1a1a1a', border: '1px solid #e5e5e5', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500 }}
                            >
                                <Download size={14} /> Export Excel
                            </button>
                        </div>
                        <div style={{ flex: 1, marginTop: '20px' }}>
                            <div style={styles.headerLabel}>Vulnerability Report</div>
                            <h1 style={styles.headerTitle}>{report.vulnerability.title || "No Title Available"}</h1>
                            <div style={styles.headerCve}>{report.metadata.cve_id} • {report.metadata.assigner} • {report.metadata.state}</div>
                        </div>
                        {report.scoring.cvss_score && (
                            <div style={{ ...styles.cvssBadge(report.scoring.cvss_severity), marginTop: '20px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 500, opacity: 0.9, marginBottom: '0.5rem' }}>
                                    CVSS v{report.scoring.cvss_version}
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 500, lineHeight: 1 }}>
                                    {report.scoring.cvss_score}
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '0.5rem', textTransform: 'capitalize' }}>
                                    {report.scoring.cvss_severity}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <section style={styles.section}>
                        <h2 style={styles.h2}>Description</h2>
                        <p style={styles.description}>{report.vulnerability.description}</p>
                    </section>

                    {/* Key Info Grid */}
                    <div style={styles.grid}>
                        <div style={styles.infoCard}>
                            <div style={styles.infoCardLabel}>CWE</div>
                            <div style={styles.infoCardValue}>{report.vulnerability.cwes.length > 0 ? report.vulnerability.cwes[0].id : 'N/A'}</div>
                            <div style={styles.infoCardDetail}>{report.vulnerability.cwes.length > 0 ? report.vulnerability.cwes[0].description : ''}</div>
                        </div>
                        <div style={styles.infoCard}>
                            <div style={styles.infoCardLabel}>Published</div>
                            <div style={styles.infoCardValue}>{report.metadata.date_published?.split('T')[0] || 'N/A'}</div>
                            <div style={styles.infoCardDetail}>Updated {report.metadata.date_updated?.split('T')[0] || 'N/A'}</div>
                        </div>
                        <div style={styles.infoCard}>
                            <div style={styles.infoCardLabel}>Affected Products</div>
                            <div style={styles.infoCardValue}>{report.affected?.product_count || 0} products</div>
                            <div style={styles.infoCardDetail}>From multiple vendors</div>
                        </div>
                        <div style={styles.infoCard}>
                            <div style={styles.infoCardLabel}>Attack Vector</div>
                            <div style={styles.infoCardValue}>{report.scoring.cvss_vector ? report.scoring.cvss_vector.includes('AV:N') ? 'Network' : report.scoring.cvss_vector.includes('AV:L') ? 'Local' : 'Other' : 'Unknown'}</div>
                            <div style={styles.infoCardDetail}>From CVSS Vector</div>
                        </div>
                    </div>

                    {/* CVSS Vector */}
                    {report.scoring.cvss_vector && (
                        <div style={styles.cvssVector}>
                            <h3 style={styles.h3}>CVSS Vector</h3>
                            <code style={styles.cvssCode}>{report.scoring.cvss_vector}</code>
                        </div>
                    )}

                    {/* Affected Products Accordion */}
                    {report.affected?.products?.length > 0 && (
                        <section style={styles.section}>
                            <h2 style={styles.h2}>Affected Products ({report.affected.product_count} total)</h2>
                            <div style={styles.productList}>
                                {report.affected.products.map((prod, idx) => (
                                    <div key={idx} style={styles.productItem}>
                                        <div style={{ ...styles.productButton, cursor: 'default' }}>
                                            <div>
                                                <div style={{ fontWeight: 500, marginBottom: '4px', color: '#1a1a1a' }}>
                                                    {prod.vendor} {prod.product}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                    {prod.platforms?.join(', ') || "No platforms specified"}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style={styles.productDetails}>
                                            <div style={{ marginBottom: '0.75rem' }}>
                                                <div style={{ color: '#666', fontWeight: 500, marginBottom: '4px' }}>Vulnerable Versions</div>
                                                {prod.versions?.map((v, vIdx) => (
                                                    <div key={vIdx} style={{ color: '#1a1a1a', fontFamily: '"Courier New", monospace', marginBottom: '4px' }}>
                                                        <span style={{ color: '#E24B4A' }}>≥</span> {v.version} 
                                                        <span style={{ color: '#666' }}> → </span> 
                                                        <span style={{ color: '#378ADD' }}>&lt;</span> {v.less_than} 
                                                        <span style={{ color: '#666', fontSize: '11px', marginLeft: '10px' }}>({v.status})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* CISA Assessment */}
                    {report.assessment?.cisa_adp && (
                        <section style={styles.section}>
                            <div style={styles.cisaAssessment}>
                                <h3 style={styles.h3}>CISA Assessment</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Exploitation</div>
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', textTransform: 'capitalize' }}>{report.assessment.cisa_adp.exploitation}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Automatable</div>
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', textTransform: 'capitalize' }}>{report.assessment.cisa_adp.automatable}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Technical Impact</div>
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', textTransform: 'capitalize' }}>{report.assessment.cisa_adp.technical_impact}</div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* References */}
                    {report.references?.length > 0 && (
                        <section style={styles.section}>
                            <h2 style={styles.h2}>References</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {report.references.map((ref, idx) => (
                                    <a key={idx} href={ref.url} target="_blank" rel="noreferrer" style={styles.referenceLink}>
                                        <div style={styles.referenceName}>{ref.name !== 'N/A' ? ref.name : ref.url} ↗</div>
                                        <div style={{ fontSize: '12px', color: '#666', fontFamily: '"Courier New", monospace', wordBreak: 'break-all' }}>{ref.url}</div>
                                        {ref.tags?.length > 0 && (
                                            <div style={{ marginTop: '6px' }}>
                                                {ref.tags.map((tag, tidx) => (
                                                    <span key={tidx} style={styles.tag}>{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}

                    <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '1.5rem', color: '#666', fontSize: '12px' }}>
                        <p>This report was extracted directly from MITRE CVE Records and automatically saved to your Vulnerability Database.</p>
                    </div>
                </div>
            )}
            </div>

            {/* History Sidebar */}
            {!isModal && (
                <div style={{ width: '300px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', flexShrink: 0, height: 'calc(100vh - 40px)', position: 'sticky', top: '20px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                            <Clock size={16} /> History
                        </h2>
                        {history.length > 0 && (
                            <button onClick={clearHistory} title="Clear History" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '12px', padding: '4px' }}>
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                    
                    {history.length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <button 
                                onClick={exportAllToExcel}
                                style={{ flex: 1, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-main)' }}
                                className="export-btn"
                            >
                                <FileSpreadsheet size={14} /> Excel
                            </button>
                            <button 
                                onClick={exportAllToPDF}
                                style={{ flex: 1, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-main)' }}
                                className="export-btn"
                            >
                                <FileText size={14} /> PDF
                            </button>
                        </div>
                    )}

                    <div style={{ position: 'relative', marginBottom: '15px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Search history..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px 8px 30px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '13px' }}
                        />
                    </div>

                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '30px' }}>
                            No extraction history yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {history
                                .filter(h => h.metadata.cve_id.toLowerCase().includes(historySearch.toLowerCase()) || 
                                             (h.vulnerability.title && h.vulnerability.title.toLowerCase().includes(historySearch.toLowerCase())))
                                .map((h, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => loadFromHistory(h)}
                                    style={{ 
                                        background: report?.metadata?.cve_id === h.metadata.cve_id ? 'var(--bg-main)' : 'transparent',
                                        border: '1px solid var(--border)', 
                                        borderRadius: '8px', 
                                        padding: '12px', 
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    className="history-item-hover"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--primary)', marginBottom: '4px' }}>
                                            {h.metadata.cve_id}
                                        </div>
                                        {h.scoring.cvss_severity && (
                                            <div style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: h.scoring.cvss_severity === 'CRITICAL' ? '#E24B4A' : h.scoring.cvss_severity === 'HIGH' ? '#D85A30' : h.scoring.cvss_severity === 'MEDIUM' ? '#BA7517' : '#639922', color: '#fff', fontWeight: 600 }}>
                                                {h.scoring.cvss_severity}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.8 }}>
                                        {h.vulnerability.title || "No Title Available"}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>{h.metadata.date_published?.split('T')[0]}</span>
                                        <ChevronRight size={12} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add tiny bit of CSS for hover effect in history items without breaking existing stuff */}
            <style>{`
                .history-item-hover:hover {
                    border-color: var(--primary) !important;
                    background: var(--bg-main) !important;
                }
                .export-btn:hover {
                    background: var(--primary) !important;
                    color: white !important;
                    border-color: var(--primary) !important;
                }
                @media print {
                    .history-item-hover { display: none !important; }
                    button, input, aside { display: none !important; }
                    body { background: white !important; }
                    .main-content { margin: 0 !important; padding: 0 !important; width: 100% !important; }
                    .print-only-all { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: white; z-index: 999999; }
                    .hide-on-print { display: none !important; }
                }
            `}</style>
        </div>
    );
}
