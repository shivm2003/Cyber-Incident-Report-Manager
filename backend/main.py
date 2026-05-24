import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, Depends, BackgroundTasks, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

import models
import schemas
from database import engine, get_db
from collectors.rss_collector import fetch_rss_feeds
from collectors.nvd_api_collector import fetch_nvd_india_incidents, fetch_single_cve, save_cve_to_db, fetch_nvd_advanced, process_cve_ai
from analyzer import classify_attack
import reporting
import datetime
from typing import List

# --- DATABASE INITIALIZATION ---
# models.Base.metadata.create_all(bind=engine)

def ensure_schema_ready():
    pass

def ensure_impact_table():
    pass

def ensure_combined_reports_table():
    pass

# ensure_schema_ready()
# ensure_impact_table()
# ensure_combined_reports_table()

# --- APP INITIALIZATION ---
app = FastAPI(title="Smart Cyber Incident Monitor API")

SCAN_CANCEL_REQUESTED = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from automation_scheduler import start_automation_scheduler
import asyncio

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(start_automation_scheduler())

# --- BACKGROUND TASKS ---
def run_analysis_on_new_incidents(db: Session):
    """Background task to run Shivam AI classification and description enhancement."""
    incidents = db.query(models.Incident).filter(models.Incident.attack_type == None).all()
    for incident in incidents:
        from analyzer import classify_attack
        # Shivam AI rewrites the description and extracts intelligence
        res = classify_attack(incident.title, incident.description or "")
        
        incident.description = res.get("description", incident.description)
        incident.ai_summary = res.get("ai_summary", "")
        incident.attack_type = res["attack_type"]
        incident.country = res["country"]
        incident.is_financial = res["is_financial"]
        incident.financial_sector = res["financial_sector"]
        incident.severity = res.get("severity", "Low")
        incident.threat_level = res.get("threat_level", "Information")
        incident.impact_summary = res.get("impact_summary", "")
        incident.target_entity = res.get("target_entity", "")
        
        # --- MITRE ATT&CK MAPPING ---
        try:
            # Check if mapping already exists to avoid duplicates
            existing_mapping = db.query(models.MitreMapping).filter(models.MitreMapping.incident_id == incident.id).first()
            if not existing_mapping:
                from analyzer import analyze_mitre_ttp
                mitre_data = analyze_mitre_ttp(incident.title, incident.description or "")
                for m in mitre_data:
                    mapping = models.MitreMapping(
                        incident_id=incident.id,
                        tactic=m.get("tactic", "Unknown"),
                        technique_id=m.get("technique_id", "Unknown"),
                        technique_name=m.get("technique_name", "Unknown"),
                        confidence=m.get("confidence", 0),
                        analysis_justification=m.get("analysis_justification", "Extracted by Shivam AI")
                    )
                    db.add(mapping)
        except Exception as e:
            print(f"[*] MITRE Background Task Error: {e}")
            
        # --- CRAWL SOURCE ARTICLE ---
        try:
            if not incident.crawled_content and incident.link:
                from crawler import fetch_article_content
                incident.crawled_content = fetch_article_content(incident.link)
                db.commit()
        except Exception as e:
            print(f"[*] Crawling Task Error: {e}")
            
        # --- FULL 500+ WORD FORENSIC ANALYSIS ---
        try:
            if not incident.full_analysis:
                from analyzer import analyze_full_incident
                incident.full_analysis = analyze_full_incident(
                    incident.title, 
                    incident.description or "", 
                    incident.raw_data or {},
                    incident.crawled_content or ""
                )
        except Exception as e:
            print(f"[*] Full Analysis Background Task Error: {e}")
            
    db.commit()

# --- ROUTES ---
@app.get("/")
async def root():
    return {"status": "online", "message": "Smart Cyber Incident Monitor API is running. Visit /docs for documentation."}

@app.get("/api/ai/status")
def get_ai_status():
    """Checks the status of the local Gemma (Ollama) service."""
    import requests
    import os
    ollama_base = os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
    try:
        res = requests.get(f"{ollama_base}/api/tags", timeout=5)
        if res.status_code == 200:
            models_data = res.json()
            # Check if our target model is available
            target_model = os.getenv('OLLAMA_MODEL', 'gemma:2b')
            available_models = [m['name'] for m in models_data.get('models', [])]
            return {
                "online": True,
                "model": target_model,
                "available": target_model in available_models or any(target_model in m for m in available_models),
                "all_models": available_models
            }
        return {"online": False, "error": f"Ollama returned {res.status_code}"}
    except Exception as e:
        return {"online": False, "error": str(e)}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    # Return a dummy favicon to silence 404s
    return Response(content="", media_type="image/x-icon")

@app.get("/api/collect")
def collect_data(background_tasks: BackgroundTasks, timeframe: str = "today", db: Session = Depends(get_db)):
    """Trigger RSS intelligence collection."""
    print(f"[*] Starting RSS collection for timeframe: {timeframe}")
    rss_result = fetch_rss_feeds(db, timeframe=timeframe)
    background_tasks.add_task(run_analysis_on_new_incidents, db)
    
    # Also trigger the Jira and Impact automation pipeline
    from automation_scheduler import process_incident_automation
    if isinstance(rss_result, dict) and "new_ids" in rss_result:
        for inc_id in rss_result["new_ids"]:
            background_tasks.add_task(process_incident_automation, db, inc_id)
            
    return {"rss": rss_result}

@app.get("/api/collect/nvd")
def collect_nvd_data(background_tasks: BackgroundTasks, timeframe: str = "today", db: Session = Depends(get_db)):
    """Trigger NVD CVE collection and background AI processing."""
    print(f"[*] Starting NVD collection for timeframe: {timeframe}")
    nvd_result = fetch_nvd_india_incidents(db, timeframe=timeframe)
    
    # Process the new CVEs with AI and Automation in the background
    from automation_scheduler import process_cve_automation
    if isinstance(nvd_result, dict) and "new_ids" in nvd_result:
        for cve_id in nvd_result["new_ids"]:
            background_tasks.add_task(process_cve_ai, db, cve_id)
            background_tasks.add_task(process_cve_automation, db, cve_id)
            
    return {"nvd": nvd_result}

@app.post("/api/collect/nvd/advanced")
def collect_nvd_advanced(params: schemas.NVDSearchParams, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Advanced NVD Intelligence Sync with all v2.0 parameters."""
    print(f"[*] Starting Advanced NVD Search: {params.dict()}")
    search_dict = params.dict()
    nvd_result = fetch_nvd_advanced(db, search_dict)
    
    from automation_scheduler import process_cve_automation
    if isinstance(nvd_result, dict) and "new_ids" in nvd_result:
        for cve_id in nvd_result["new_ids"]:
            background_tasks.add_task(process_cve_ai, db, cve_id)
            background_tasks.add_task(process_cve_automation, db, cve_id)
            
    return nvd_result

from automation_scheduler import run_manual_automation
import automation_scheduler

@app.post("/api/automation/run")
def trigger_manual_automation(request: schemas.AutomationRunRequest, background_tasks: BackgroundTasks):
    if automation_scheduler.is_automation_running:
        return {"status": "Already running"}
    background_tasks.add_task(run_manual_automation, request)
    return {"status": "Automation cycle triggered"}

@app.get("/api/automation/status")
def get_automation_status():
    last_run = automation_scheduler.last_automation_run
    return {
        "is_running": automation_scheduler.is_automation_running,
        "status_message": automation_scheduler.current_status_message,
        "last_run": last_run.isoformat() if last_run else "Never",
        "interval_hours": automation_scheduler.scheduler_interval_hours
    }

class IntervalUpdateRequest(schemas.BaseModel):
    interval_hours: int

@app.post("/api/automation/interval")
def set_automation_interval(request: IntervalUpdateRequest):
    automation_scheduler.scheduler_interval_hours = request.interval_hours
    return {"status": "success", "interval_hours": automation_scheduler.scheduler_interval_hours}

@app.get("/api/jira/push-history", response_model=List[schemas.JiraPushHistoryResponse])
def get_jira_push_history(db: Session = Depends(get_db)):
    history = db.query(models.JiraPushHistory).order_by(models.JiraPushHistory.pushed_at.desc()).limit(100).all()
    return history

@app.get("/api/automation/audit-logs", response_model=List[schemas.AutomationAuditLogResponse])
def get_automation_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(models.AutomationAuditLog).order_by(models.AutomationAuditLog.created_at.desc()).limit(100).all()
    return logs

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    import datetime
    last_24h = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    new_24h_count = db.query(models.Incident).filter(models.Incident.date_collected >= last_24h).count()

    total = db.query(models.Incident).count()
    india_count = db.query(models.Incident).filter(models.Incident.country == "India").count()
    financial_total = db.query(models.Incident).filter(models.Incident.is_financial == 1).count()
    india_financial = db.query(models.Incident).filter(models.Incident.is_financial == 1, models.Incident.country == "India").count()

    severity_counts = {
        "Critical": db.query(models.Incident).filter(models.Incident.severity == "Critical").count(),
        "High": db.query(models.Incident).filter(models.Incident.severity == "High").count(),
        "Medium": db.query(models.Incident).filter(models.Incident.severity == "Medium").count(),
        "Low": db.query(models.Incident).filter(models.Incident.severity == "Low").count()
    }

    # Attack Type Distribution
    types = db.query(models.Incident.attack_type).all()
    type_counts = {}
    for t in types:
        name = t[0] or "Unknown"
        type_counts[name] = type_counts.get(name, 0) + 1

    # Financial Sector Breakdown
    sectors = db.query(models.Incident.financial_sector).filter(models.Incident.is_financial == 1).all()
    sector_counts = {}
    for s in sectors:
        name = s[0] or "General"
        if name == "None": continue
        sector_counts[name] = sector_counts.get(name, 0) + 1
        
    return {
        "total": total,
        "india": india_count,
        "global": total - india_count,
        "financial_total": financial_total,
        "india_financial": india_financial,
        "new_24h": new_24h_count,
        "types": type_counts,
        "severity": severity_counts,
        "financial_sectors": sector_counts
    }

@app.get("/api/cves")
def get_cves(
    skip: int = 0,
    limit: int = 100,
    sort_order: str = "desc",
    date_from: str = None,
    date_to: str = None,
    severity: str = None,
    company: str = None,
    source: str = None,
    search: str = None,
    sort_by: str = "published_date",
    db: Session = Depends(get_db)
):
    """Fetches CVE Vulnerability Database from LOCAL storage with optional filters."""
    query = db.query(models.CVE)

    # Filter by severity
    if severity and severity != "All":
        query = query.filter(models.CVE.severity == severity)

    # Filter by company
    if company and company != "All":
        query = query.filter(models.CVE.company_name == company)

    # Filter by intelligence source (pull_type)
    if source and source != "All":
        query = query.filter(models.CVE.pull_type == source)

    # Filter by published date range
    if date_from:
        try:
            from datetime import datetime
            from_date = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(models.CVE.published_date >= from_date)
        except ValueError:
            pass
    if date_to:
        try:
            from datetime import datetime
            to_date = datetime.strptime(date_to, "%Y-%m-%d")
            to_date = to_date.replace(hour=23, minute=59, second=59)
            query = query.filter(models.CVE.published_date <= to_date)
        except ValueError:
            pass

    # Search by CVE ID or description
    if search:
        query = query.filter(
            (models.CVE.cve_id.ilike(f"%{search}%")) |
            (models.CVE.description.ilike(f"%{search}%")) |
            (models.CVE.company_name.ilike(f"%{search}%")) |
            (models.CVE.product_name.ilike(f"%{search}%"))
        )

    # Sorting
    sort_field = models.CVE.published_date
    if sort_by == "created_at":
        sort_field = models.CVE.created_at
    elif sort_by == "version_relevance":
        sort_field = models.CVE.version_relevance

    if sort_by == "version_relevance":
        if sort_order == "desc":
            query = query.order_by(models.CVE.version_relevance.desc().nullslast(), models.CVE.published_date.desc().nullslast())
        else:
            query = query.order_by(models.CVE.version_relevance.asc().nullsfirst(), models.CVE.published_date.asc().nullsfirst())
    else:
        if sort_order == "desc":
            query = query.order_by(sort_field.desc().nullslast())
        else:
            query = query.order_by(sort_field.asc().nullsfirst())

    total = query.count()
    data = query.offset(skip).limit(limit).all()
    return {"data": data, "total": total}

@app.get("/api/cves/audit")
def get_cve_audit(db: Session = Depends(get_db)):
    """Groups Advanced Intelligence pulls into sessions for auditing."""
    # We want sessions where pull_type is set (Manual, Advanced, etc.)
    cves = db.query(models.CVE).filter(models.CVE.pull_type != None).all()
    
    sessions = {}
    for cve in cves:
        sid = cve.search_session_id or "untracked"
        if sid not in sessions:
            sessions[sid] = {
                "session_id": sid,
                "pull_params": cve.pull_params,
                "pull_type": cve.pull_type,
                "timestamp": cve.created_at,
                "count": 0,
                "items": []
            }
        sessions[sid]["count"] += 1
        sessions[sid]["items"].append({
            "id": cve.id,
            "cve_id": cve.cve_id,
            "company_name": cve.company_name,
            "ai_summary": cve.ai_summary,
            "description": cve.description
        })
    
    # Convert to list and sort by timestamp
    audit_list = list(sessions.values())
    import datetime
    audit_list.sort(key=lambda x: x["timestamp"] if x["timestamp"] else datetime.datetime.min, reverse=True)
    return audit_list

@app.get("/api/companies", response_model=list[schemas.CompanyResponse])
def get_companies(db: Session = Depends(get_db)):
    """Fetches the list of companies tracked in the vulnerability database."""
    comps = db.query(models.Company).order_by(models.Company.total_cves.desc()).all()
    result = []
    for c in comps:
        result.append({
            "id": c.id,
            "name": c.name or "",
            "total_cves": c.total_cves or 0,
            "critical_cves": c.critical_cves or 0,
            "high_cves": c.high_cves or 0,
            "latest_cve": c.latest_cve,
            "vulnerability_types": c.vulnerability_types or [],
            "last_updated": c.last_updated
        })
    return result

@app.get("/api/cves/nvd/{cve_id}", response_model=schemas.CVEResponse)
def get_nvd_cve(cve_id: str, db: Session = Depends(get_db)):
    """Specifically fetches a CVE from the NVD API (not local). Saves it to DB if found."""
    # First check if it ALREADY exists locally to inform the UI
    local_cve = db.query(models.CVE).filter(models.CVE.cve_id == cve_id.upper()).first()
    if local_cve:
        local_cve.is_local = True
        return local_cve
        
    nvd_data = fetch_single_cve(cve_id.upper())
    if not nvd_data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="CVE not found in NVD API")
        
    # Save to local DB automatically as per user request
    saved_cve = save_cve_to_db(db, nvd_data)
    saved_cve.is_local = False # Mark that it was JUST pulled
    return saved_cve

@app.post("/api/cves/save")
def save_cve(cve_data: dict, db: Session = Depends(get_db)):
    """Saves a CVE record to the local database."""
    try:
        saved_cve = save_cve_to_db(db, cve_data)
        return {"status": "success", "id": saved_cve.id}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cves/mitre/parse-and-save")
def parse_and_save_mitre_cve(payload: dict, save: bool = True, db: Session = Depends(get_db)):
    """Parses raw JSON CVE from MITRE using CVEParser. Optionally saves to local DB."""
    from fastapi import HTTPException
    import json
    from datetime import datetime
    import dateutil.parser
    from Cve_parser import CVEParser
    import dataclasses
    
    try:
        raw_json = json.dumps(payload)
        parser = CVEParser(raw_json)
        report = parser.generate_report()
        
        # Convert dataclasses to dicts for JSON serialization
        if 'affected' in report and 'products' in report['affected']:
            report['affected']['products'] = [dataclasses.asdict(p) for p in report['affected']['products']]
            
        cve_id = report["metadata"]["cve_id"]
        if not cve_id or cve_id == "N/A":
            raise HTTPException(status_code=400, detail="Invalid CVE data provided")

        existing_cve = db.query(models.CVE).filter(models.CVE.cve_id == cve_id.upper()).first()
        
        # Determine primary vendor and product
        primary_vendor = None
        primary_product = None
        if report.get("affected") and report["affected"].get("products") and len(report["affected"]["products"]) > 0:
            first_prod = report["affected"]["products"][0]
            primary_vendor = first_prod.get("vendor")
            primary_product = first_prod.get("product")

        # Auto-heal existing record even if not fully saving
        if existing_cve and not save:
            healed = False
            if not existing_cve.company_name and primary_vendor:
                existing_cve.company_name = primary_vendor
                healed = True
            if not existing_cve.product_name and primary_product:
                existing_cve.product_name = primary_product
                healed = True
            if healed:
                db.commit()

        if not save:
            return {"status": "success", "report": report}
            
        # Save to DB (Full save)
        if not existing_cve:
            existing_cve = models.CVE(cve_id=cve_id.upper())
            db.add(existing_cve)
            
        existing_cve.description = report["vulnerability"]["description"]
        if report["scoring"]["cvss_score"]:
            existing_cve.cvss_score = str(report["scoring"]["cvss_score"])
        if report["scoring"]["cvss_severity"]:
            existing_cve.severity = report["scoring"]["cvss_severity"].capitalize()
            
        if not existing_cve.company_name and primary_vendor:
            existing_cve.company_name = primary_vendor
        if not existing_cve.product_name and primary_product:
            existing_cve.product_name = primary_product
            
        # Format affected products simply
        affected_list = []
        for p in report["affected"]["products"]:
            affected_list.append(f"{p['vendor']} {p['product']}")
        existing_cve.affected_products = affected_list
        
        # References
        existing_cve.references = [r["url"] for r in report["references"]]
        
        # Dates
        try:
            if report["metadata"]["date_published"] and report["metadata"]["date_published"] != "N/A":
                existing_cve.published_date = dateutil.parser.isoparse(report["metadata"]["date_published"]).replace(tzinfo=None)
            if report["metadata"]["date_updated"] and report["metadata"]["date_updated"] != "N/A":
                existing_cve.last_modified_date = dateutil.parser.isoparse(report["metadata"]["date_updated"]).replace(tzinfo=None)
        except Exception as date_e:
            print(f"Date parsing error: {date_e}")
            
        existing_cve.pull_type = "MITRE Extractor"
        existing_cve.raw_data = payload
        
        db.commit()
        db.refresh(existing_cve)
        
        return {"status": "success", "report": report, "db_id": existing_cve.id}
        
    except Exception as e:
        print(f"Error parsing/saving MITRE CVE: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process CVE: {str(e)}")

@app.get("/api/map-data")
def get_map_data(db: Session = Depends(get_db)):
    """Provides incident data aggregated by country for the world map."""
    incidents = db.query(models.Incident).all()
    locations = []
    
    for inc in incidents:
        lat, lng = 20, 0
        if inc.country == "India":
            lat, lng = 20.5937, 78.9629
        else:
            desc = (inc.description or "").lower()
            if "usa" in desc or "united states" in desc: lat, lng = 37.0902, -95.7129
            elif "russia" in desc: lat, lng = 61.5240, 105.3188
            elif "china" in desc: lat, lng = 35.8617, 104.1954
            elif "uk" in desc or "united kingdom" in desc: lat, lng = 55.3781, -3.4360
            elif "germany" in desc: lat, lng = 51.1657, 10.4515
            elif "japan" in desc: lat, lng = 36.2048, 138.2529
            elif "australia" in desc: lat, lng = -25.2744, 133.7751
            
        locations.append({
            "id": inc.id,
            "title": inc.title,
            "severity": inc.severity,
            "coordinates": [lng, lat], # Swapped to [lon, lat] for react-simple-maps
            "country": inc.country
        })
        
    return locations

@app.get("/api/incidents")
def get_incidents(
    skip: int = 0, 
    limit: int = 100, 
    country: str = None, 
    is_financial: int = None, 
    severity: str = None,
    happened_from: str = None,
    happened_to: str = None,
    collected_from: str = None,
    collected_to: str = None,
    company_impact: str = None,
    search: str = None,
    sort_by: str = "date_collected",
    sort_order: str = "desc",
    db: Session = Depends(get_db)
):
    query = db.query(models.Incident)
    
    if country:
        query = query.filter(models.Incident.country == country)
    if is_financial is not None:
        query = query.filter(models.Incident.is_financial == is_financial)
    if severity and severity != "All":
        query = query.filter(models.Incident.severity == severity)
    
    # Filter by incident happened date
    if happened_from:
        try:
            from datetime import datetime
            from_date = datetime.strptime(happened_from, "%Y-%m-%d")
            query = query.filter(models.Incident.happened_at >= from_date)
        except ValueError:
            pass
    if happened_to:
        try:
            from datetime import datetime
            to_date = datetime.strptime(happened_to, "%Y-%m-%d")
            # Add one day to include the full day
            to_date = to_date.replace(hour=23, minute=59, second=59)
            query = query.filter(models.Incident.happened_at <= to_date)
        except ValueError:
            pass
    
    # Filter by data collected date
    if collected_from:
        try:
            from datetime import datetime
            from_date = datetime.strptime(collected_from, "%Y-%m-%d")
            query = query.filter(models.Incident.date_collected >= from_date)
        except ValueError:
            pass
    if collected_to:
        try:
            from datetime import datetime
            to_date = datetime.strptime(collected_to, "%Y-%m-%d")
            to_date = to_date.replace(hour=23, minute=59, second=59)
            query = query.filter(models.Incident.date_collected <= to_date)
        except ValueError:
            pass
            
    if company_impact:
        query = query.filter(models.Incident.company_impact_status == company_impact)
        
    if search:
        query = query.filter(
            (models.Incident.title.ilike(f"%{search}%")) |
            (models.Incident.description.ilike(f"%{search}%"))
        )
        
    # Sorting
    sort_field = models.Incident.date_collected
    if sort_by == "happened_at":
        sort_field = models.Incident.happened_at
    elif sort_by == "version_relevance":
        sort_field = models.Incident.version_relevance

    if sort_by == "version_relevance":
        if sort_order == "desc":
            query = query.order_by(models.Incident.version_relevance.desc(), models.Incident.date_collected.desc())
        else:
            query = query.order_by(models.Incident.version_relevance.asc(), models.Incident.date_collected.asc())
    else:
        if sort_order == "desc":
            query = query.order_by(sort_field.desc())
        else:
            query = query.order_by(sort_field.asc())

    total = query.count()
    data = query.offset(skip).limit(limit).all()
    return {"data": data, "total": total}

@app.get("/api/reports/download/{format}")
def download_report(format: str, is_india: bool = False, db: Session = Depends(get_db)):
    query = db.query(models.Incident)
    title = "Global Cyber Intelligence Report"
    
    if is_india:
        query = query.filter(models.Incident.country == "India")
        title = "India Cyber Intelligence Report"
        
    incidents = query.all()
    
    if format == "pdf":
        file_path = reporting.generate_pdf_report(incidents, report_title=title)
        return FileResponse(file_path, filename=f"report.pdf", media_type="application/pdf")
    elif format == "excel":
        file_path = reporting.generate_excel_report(incidents)
        return FileResponse(file_path, filename=f"report.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    
    return {"error": "Invalid format"}

@app.get("/api/cve/by-cve-id/{cve_id_str}/report")
def get_cve_report_by_name(cve_id_str: str, db: Session = Depends(get_db)):
    cve = db.query(models.CVE).filter(models.CVE.cve_id == cve_id_str).first()
    if not cve:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="CVE not found")
    
    from reporting import generate_single_cve_pdf
    import os
    try:
        pdf_path = generate_single_cve_pdf(cve)
        if os.path.exists(pdf_path):
            return FileResponse(pdf_path, filename=f"{cve_id_str}_Report.pdf", media_type="application/pdf")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

def run_company_impact_scan(db: Session, full_scan: bool = False, engine: str = 'all'):
    global SCAN_CANCEL_REQUESTED
    SCAN_CANCEL_REQUESTED = False
    from analyzer import analyze_dynamic_impact, analyze_cve_impact
    import datetime
    
    # Fetch company profile
    profile_obj = db.query(models.CompanyProfile).first()
    if not profile_obj:
        print("[!] No company profile found. Using defaults.")
        profile = {"company_name": "India Shelter Finance Corp", "tech_stack": [], "industry": "Finance"}
    else:
        profile = {
            "company_name": profile_obj.company_name,
            "tech_stack": profile_obj.tech_stack,
            "industry": profile_obj.industry
        }

    # Determine scan iteration
    latest_scan = db.query(models.ScanHistory).order_by(models.ScanHistory.iteration.desc()).first()
    current_iteration = (latest_scan.iteration + 1) if latest_scan else 1
    
    # Create scan history record
    scan_record = models.ScanHistory(
        iteration=current_iteration,
        scan_type='full' if full_scan else 'new',
        status='running'
    )
    db.add(scan_record)
    db.commit()
    db.refresh(scan_record)
    
    print(f"[+] Starting scan iteration #{current_iteration} ({'Full' if full_scan else 'New Only'})")
    
    # If this is iteration 3+, purge the oldest iteration (keep last 2)
    if full_scan and current_iteration >= 3:
        purge_iteration = current_iteration - 2
        print(f"[*] Purging scan iteration #{purge_iteration} (keeping last 2 iterations)")
        
        # Clear impact data for incidents from the oldest iteration
        old_incidents = db.query(models.Incident).filter(models.Incident.scan_iteration == purge_iteration).all()
        for inc in old_incidents:
            inc.company_impact_status = None
            inc.company_impact_reason = None
            inc.company_impact_score = 0
            inc.impact_flag = 0
            inc.detection_method = None
            inc.scan_iteration = 0
            inc.review_status = "Pending"
        
        # Clear impact data for CVEs from the oldest iteration
        old_cves = db.query(models.CVE).filter(models.CVE.scan_iteration == purge_iteration).all()
        for cve in old_cves:
            cve.company_impact_score = 0
            cve.company_impact_reason = None
            cve.impact_flag = 0
            cve.detection_method = None
            cve.scan_iteration = 0
            cve.review_status = "Pending"
        
        # Remove old scan history record
        db.query(models.ScanHistory).filter(models.ScanHistory.iteration == purge_iteration).delete()
        db.commit()
        print(f"[+] Purged {len(old_incidents)} incidents and {len(old_cves)} CVEs from iteration #{purge_iteration}")

    inc_scanned = 0
    inc_threats = 0
    inc_no_impact = 0

    # 1. SCAN INCIDENTS
    offset = 0
    while True:
        if SCAN_CANCEL_REQUESTED:
            print("[!] Scan canceled by user during incidents phase.")
            break
            
        query = db.query(models.Incident)
        if not full_scan:
            query = query.filter(models.Incident.company_impact_status == None)
        
        incidents = query.offset(offset).limit(50).all()
        if not incidents: break
            
        print(f"[*] Analyzing {len(incidents)} incidents for {profile['company_name']}...")
        for incident in incidents:
            if SCAN_CANCEL_REQUESTED:
                break
                
            res = analyze_dynamic_impact(incident.title, incident.description or "", profile, engine)
            incident.company_impact_status = res["status"]
            incident.company_impact_reason = res["reason"]
            incident.company_impact_score = res["score"]
            incident.detection_method = res.get("method", "Heuristic (Version-Aware)")
            incident.scan_iteration = current_iteration
            incident.extracted_versions = res.get("extracted_versions")
            incident.heuristic_match_details = res.get("heuristic_match_details")
            incident.version_relevance = res.get("version_relevance", 0)
            # Flag for manual review if score is high
            if res["score"] >= 60:
                incident.impact_flag = 1
                incident.review_status = "Pending"
                inc_threats += 1
            else:
                incident.impact_flag = 0
                incident.review_status = "Reviewed" # Auto-reviewed if low
                inc_no_impact += 1
            inc_scanned += 1
            db.commit()
            
        if full_scan:
            offset += 50

    cve_scanned = 0
    cve_threats = 0
    cve_no_impact = 0

    # 2. SCAN CVES
    offset = 0
    while True:
        if SCAN_CANCEL_REQUESTED:
            print("[!] Scan canceled by user during CVEs phase.")
            break
            
        query = db.query(models.CVE)
        if not full_scan:
            query = query.filter(models.CVE.company_impact_reason == None)
        
        cves = query.offset(offset).limit(50).all()
        if not cves: break
            
        print(f"[*] Analyzing {len(cves)} CVEs for {profile['company_name']}...")
        for cve in cves:
            if SCAN_CANCEL_REQUESTED:
                break
                
            res = analyze_cve_impact(cve.cve_id, cve.description or "", cve.affected_products or [], profile, engine)
            cve.company_impact_score = res["score"]
            cve.company_impact_reason = res["reason"]
            cve.detection_method = res.get("method", "Heuristic (Version-Aware)")
            cve.scan_iteration = current_iteration
            cve.extracted_versions = res.get("extracted_versions")
            cve.heuristic_match_details = res.get("heuristic_match_details")
            cve.version_relevance = res.get("version_relevance", 0)
            if res["score"] >= 60:
                cve.impact_flag = 1
                cve.review_status = "Pending"
                cve_threats += 1
            else:
                cve.impact_flag = 0
                cve.review_status = "Reviewed"
                cve_no_impact += 1
            cve_scanned += 1
            db.commit()
        
        if full_scan:
            offset += 50
            
    # Update scan history record
    scan_record.incidents_scanned = inc_scanned
    scan_record.cves_scanned = cve_scanned
    scan_record.threats_found = inc_threats + cve_threats
    scan_record.threats_no_impact = inc_no_impact + cve_no_impact
    scan_record.completed_at = datetime.datetime.utcnow()
    scan_record.status = "canceled" if SCAN_CANCEL_REQUESTED else "completed"
    db.commit()
    
    print(f"[+] Scan iteration #{current_iteration} complete! Threats: {inc_threats + cve_threats}, No Impact: {inc_no_impact + cve_no_impact}")

@app.post("/api/scan-company-impact")
def scan_company_impact(background_tasks: BackgroundTasks, full: bool = False, engine: str = 'all', db: Session = Depends(get_db)):
    global SCAN_CANCEL_REQUESTED
    SCAN_CANCEL_REQUESTED = False
    background_tasks.add_task(run_company_impact_scan, db, full, engine)
    return {"status": "Scan queued", "full": full, "engine": engine}

@app.post("/api/scan-company-impact/stop")
def stop_company_impact_scan():
    global SCAN_CANCEL_REQUESTED
    SCAN_CANCEL_REQUESTED = True
    return {"status": "Scan stop requested"}

@app.get("/api/scan-history")
def get_scan_history(db: Session = Depends(get_db)):
    scans = db.query(models.ScanHistory).order_by(models.ScanHistory.iteration.desc()).limit(5).all()
    return [{
        "id": s.id,
        "iteration": s.iteration,
        "scan_type": s.scan_type,
        "incidents_scanned": s.incidents_scanned,
        "cves_scanned": s.cves_scanned,
        "threats_found": s.threats_found,
        "threats_no_impact": s.threats_no_impact,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        "status": s.status
    } for s in scans]

@app.get("/api/company-profile", response_model=schemas.CompanyProfile)
def get_company_profile(db: Session = Depends(get_db)):
    profile = db.query(models.CompanyProfile).first()
    if not profile:
        profile = models.CompanyProfile(company_name="India Shelter Finance Corp", tech_stack=[], industry="Finance")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@app.post("/api/company-profile", response_model=schemas.CompanyProfile)
def update_company_profile(req: schemas.CompanyProfileBase, db: Session = Depends(get_db)):
    profile = db.query(models.CompanyProfile).first()
    if not profile:
        profile = models.CompanyProfile()
        db.add(profile)
    
    profile.company_name = req.company_name
    profile.tech_stack = [t.model_dump() if hasattr(t, 'model_dump') else t.dict() if hasattr(t, 'dict') else t for t in req.tech_stack]
    profile.industry = req.industry
    if req.auto_retry_start_date is not None:
        profile.auto_retry_start_date = req.auto_retry_start_date
    profile.last_updated = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(profile)
    return profile

@app.get("/api/intelligence/review-queue")
def get_review_queue(db: Session = Depends(get_db)):
    incidents = db.query(models.Incident).filter(models.Incident.impact_flag == 1, models.Incident.review_status == "Pending").all()
    cves = db.query(models.CVE).filter(models.CVE.impact_flag == 1, models.CVE.review_status == "Pending").all()
    return {"incidents": incidents, "cves": cves}

@app.post("/api/intelligence/update-review-status")
def update_review_status(req: schemas.ReviewStatusUpdate, db: Session = Depends(get_db)):
    if req.type == 'incident':
        item = db.query(models.Incident).filter(models.Incident.id == req.id).first()
    else:
        item = db.query(models.CVE).filter(models.CVE.id == req.id).first()
        
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
        
    item.review_status = req.status
    db.commit()
    return {"status": "Updated", "new_status": req.status}

@app.post("/api/incidents/{incident_id}/regenerate-summary", response_model=schemas.Incident)
def regenerate_incident_summary(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Incident not found")
        
    print(f"[*] Regenerating AI Summary for Incident #{incident_id}...")
    from analyzer import classify_attack
    res = classify_attack(incident.title, incident.description or "")
    
    incident.description = res.get("description", incident.description)
    incident.ai_summary = res.get("ai_summary", "")
    incident.attack_type = res["attack_type"]
    incident.country = res["country"]
    incident.is_financial = res["is_financial"]
    incident.financial_sector = res["financial_sector"]
    incident.severity = res.get("severity", "Low")
    incident.threat_level = res.get("threat_level", "Information")
    incident.impact_summary = res.get("impact_summary", "")
    incident.target_entity = res.get("target_entity", "")
    
    db.commit()
    db.refresh(incident)
    print(f"[+] Successfully regenerated summary for Incident #{incident_id}")
    return incident

@app.post("/api/incidents/{incident_id}/recrawl", response_model=schemas.Incident)
def recrawl_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Incident not found")
        
    print(f"[*] Manual Recrawl triggered for Incident #{incident_id}...")
    from crawler import fetch_article_content
    incident.crawled_content = fetch_article_content(incident.link)
    db.commit()
    db.refresh(incident)
    return incident

@app.post("/api/incidents/{incident_id}/clear-crawl", response_model=schemas.Incident)
def clear_incident_crawl(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident.crawled_content = None
    incident.full_analysis = None
    db.commit()
    db.refresh(incident)
    return incident

@app.post("/api/incidents/clear-all-crawl")
def clear_all_incident_crawl(db: Session = Depends(get_db)):
    db.query(models.Incident).update({
        models.Incident.crawled_content: None,
        models.Incident.full_analysis: None
    })
    db.commit()
    return {"status": "all_cleared"}

@app.delete("/api/incidents/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Delete linked data to avoid foreign key issues
    db.query(models.MitreMapping).filter(models.MitreMapping.incident_id == incident_id).delete()
    db.query(models.ImpactReport).filter(models.ImpactReport.incident_id == incident_id).delete()
    
    db.delete(incident)
    db.commit()
    return {"status": "deleted"}

# --- IMPACT & REPORT ENDPOINTS ---

@app.get("/api/incidents/{incident_id}/mitre")
def get_mitre_mapping(incident_id: int, db: Session = Depends(get_db)):
    """Fetches MITRE ATT&CK techniques mapped to a specific incident."""
    return db.query(models.MitreMapping).filter(models.MitreMapping.incident_id == incident_id).all()

@app.post("/api/incidents/{incident_id}/mitre/analyze")
def trigger_mitre_analysis(incident_id: int, db: Session = Depends(get_db)):
    """Manually triggers Shivam AI to map MITRE TTPs for an incident."""
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    from analyzer import analyze_mitre_ttp
    mitre_data = analyze_mitre_ttp(incident.title, incident.description or "")
    
    # Clear existing mappings for this incident to avoid duplicates on re-analysis
    db.query(models.MitreMapping).filter(models.MitreMapping.incident_id == incident_id).delete()
    
    results = []
    for m in mitre_data:
        mapping = models.MitreMapping(
            incident_id=incident_id,
            tactic=m.get("tactic", "Unknown"),
            technique_id=m.get("technique_id", "Unknown"),
            technique_name=m.get("technique_name", "Unknown"),
            confidence=m.get("confidence", 0),
            analysis_justification=m.get("analysis_justification", "Manually triggered Shivam AI extraction")
        )
        db.add(mapping)
        results.append(mapping)
        
    db.commit()
    return results

@app.post("/api/incidents/{incident_id}/analyze-impact", response_model=schemas.ImpactReport)
def analyze_incident_impact(incident_id: int, db: Session = Depends(get_db)):
    print(f"\n=======================================================")
    print(f"[API CALLED] POST /api/incidents/{incident_id}/analyze-impact")
    print(f"[*] Fetching incident #{incident_id} from database...")
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        from fastapi import HTTPException
        print("[-] Incident not found!")
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Automatically crawl the source link if it has not been crawled yet
    if incident.link and not incident.crawled_content:
        print(f"[*] Incident has not been crawled yet. Crawling link: {incident.link}...")
        try:
            from crawler import fetch_article_content
            crawled = fetch_article_content(incident.link)
            if crawled:
                incident.crawled_content = crawled
                db.commit()
                print("[+] Auto-crawling complete!")
        except Exception as e:
            print(f"[-] Auto-crawling failed: {e}")
            
    print(f"[*] Sending details to Shivam AI for Deep-Dive Analysis...")
    print(f"[*] (Please wait, local model generation may take 1-5 minutes)")
    from analyzer import analyze_deep_impact
    impact_data = analyze_deep_impact(
        incident.title, 
        incident.description or "",
        incident.raw_data or {},
        incident.crawled_content or ""
    )
    
    print(f"[+] Report AI analysis complete! Saving report to database...")
    report = models.ImpactReport(
        incident_id=incident_id,
        breach_process=impact_data["breach_process"],
        affected_customers=impact_data["affected_customers"],
        technical_analysis=impact_data["technical_analysis"],
        official_report=impact_data["official_report"],
        incident_title=impact_data.get("incident_title"),
        root_cause=impact_data.get("root_cause"),
        business_impact=impact_data.get("business_impact"),
        operational_impact=impact_data.get("operational_impact"),
        financial_impact=impact_data.get("financial_impact"),
        reputational_impact=impact_data.get("reputational_impact"),
        data_involved=impact_data.get("data_involved"),
        data_classification=impact_data.get("data_classification"),
        attack_type=impact_data.get("attack_type"),
        breach_method=impact_data.get("breach_method"),
        debug_prompt=impact_data.get("_debug_prompt"),
        debug_response=impact_data.get("_debug_response"),
        published=0
    )
    db.add(report)
    
    # --- MITRE ATT&CK MAPPING (Trigger on Deep-Dive) ---
    try:
        existing_mapping = db.query(models.MitreMapping).filter(models.MitreMapping.incident_id == incident_id).first()
        if not existing_mapping:
            from analyzer import analyze_mitre_ttp
            mitre_data = analyze_mitre_ttp(incident.title, incident.description or "")
            for m in mitre_data:
                mapping = models.MitreMapping(
                    incident_id=incident_id,
                    tactic=m.get("tactic", "Unknown"),
                    technique_id=m.get("technique_id", "Unknown"),
                    technique_name=m.get("technique_name", "Unknown"),
                    confidence=m.get("confidence", 0),
                    analysis_justification=m.get("analysis_justification", "Deep-Dive extraction by Shivam AI")
                )
                db.add(mapping)
    except Exception as e:
        print(f"[*] MITRE Deep-Dive Mapping Error: {e}")

    db.commit()
    db.refresh(report)
    report.incident = incident
    return report

@app.get("/api/reports", response_model=list[schemas.ImpactReport])
def get_all_reports(db: Session = Depends(get_db)):
    reports = db.query(models.ImpactReport).order_by(models.ImpactReport.created_at.desc()).all()
    for r in reports:
        r.incident = db.query(models.Incident).filter(models.Incident.id == r.incident_id).first()
    return reports

@app.get("/api/reports/{id}", response_model=schemas.ImpactReport)
def get_report(id: int, db: Session = Depends(get_db)):
    report = db.query(models.ImpactReport).filter(models.ImpactReport.id == id).first()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    report.incident = db.query(models.Incident).filter(models.Incident.id == report.incident_id).first()
    return report

@app.post("/api/reports/{id}/publish")
def publish_report(id: int, db: Session = Depends(get_db)):
    report = db.query(models.ImpactReport).filter(models.ImpactReport.id == id).first()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    report.published = 1
    db.commit()
    return {"status": "published"}

@app.post("/api/reports/{id}/jira")
def publish_report_to_jira(
    id: str,
    project_key: str = Form(...),
    issue_type: str = Form(...),
    summary: str = Form(...),
    description: str = Form(...),
    impact: str = Form(...),
    severity: str = Form(...),
    remarks: str = Form(...),
    assignee_id: str = Form(None),
    attachments: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    from fastapi import HTTPException
    
    # Check if id represents a database ImpactReport
    if id.isdigit() and id != "0":
        report = db.query(models.ImpactReport).filter(models.ImpactReport.id == int(id)).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
    
    from jira_publisher import create_jira_issue, upload_jira_attachments
    try:
        res = create_jira_issue(
            project_key=project_key,
            issue_type=issue_type,
            summary=summary,
            description=description,
            assignee_id=assignee_id,
            impact=impact,
            severity=severity,
            remarks=remarks
        )
        if res["success"]:
            ticket_key = res["data"]["key"]
            
            import os
            from reporting import generate_single_cve_pdf, generate_single_impact_pdf
            
            files_payload = []
            
            # Auto-generate PDF report and add to attachments
            generated_pdf_path = None
            try:
                if str(id).startswith("CVE"):
                    cve_obj = db.query(models.CVE).filter(models.CVE.cve_id == str(id)).first()
                    if cve_obj:
                        generated_pdf_path = generate_single_cve_pdf(cve_obj)
                elif str(id).isdigit() and str(id) != "0":
                    impact_rep = db.query(models.ImpactReport).filter(models.ImpactReport.id == int(id)).first()
                    if impact_rep:
                        impact_rep.incident = db.query(models.Incident).filter(models.Incident.id == impact_rep.incident_id).first()
                        mitre_mappings = db.query(models.MitreMapping).filter(models.MitreMapping.incident_id == impact_rep.incident_id).all()
                        forensic = impact_rep.incident.full_analysis if impact_rep.incident and impact_rep.incident.full_analysis else None
                        generated_pdf_path = generate_single_impact_pdf(impact_rep, mitre_mappings, forensic_content=forensic)
                        
                if generated_pdf_path and os.path.exists(generated_pdf_path):
                    filename = os.path.basename(generated_pdf_path)
                    with open(generated_pdf_path, 'rb') as f:
                        pdf_content = f.read()
                    files_payload.append(('file', (filename, pdf_content, 'application/pdf')))
            except Exception as e:
                print(f"Error generating PDF for Jira: {e}")
            
            # Process manual attachments if present
            if attachments:
                for attach in attachments:
                    if attach.filename:
                        content = attach.file.read()
                        files_payload.append(
                            ('file', (attach.filename, content, attach.content_type))
                        )
                        
            if files_payload:
                upload_res = upload_jira_attachments(ticket_key, files_payload)
                if not upload_res["success"]:
                    entity_type = "cve" if str(id).startswith("CVE") else "incident"
                        push_history = models.JiraPushHistory(
                            entity_type=entity_type,
                            entity_id=str(id),
                            summary=summary,
                            ticket_key=ticket_key,
                            status="success",
                            error_message="Attachment error: " + upload_res["error"]
                        )
                        db.add(push_history)
                        db.commit()
                        return {
                            "success": True, 
                            "ticket_key": ticket_key, 
                            "attachment_error": upload_res["error"]
                        }
            
            entity_type = "cve" if str(id).startswith("CVE") else "incident"
            push_history = models.JiraPushHistory(
                entity_type=entity_type,
                entity_id=str(id),
                summary=summary,
                ticket_key=ticket_key,
                status="success"
            )
            db.add(push_history)
            db.commit()
            return {"success": True, "ticket_key": ticket_key}
        else:
            entity_type = "cve" if str(id).startswith("CVE") else "incident"
            push_history = models.JiraPushHistory(
                entity_type=entity_type,
                entity_id=str(id),
                summary=summary,
                status="failed",
                error_message=res.get("error", "Unknown JIRA error")
            )
            db.add(push_history)
            db.commit()
            return {"success": False, "status_code": res["status_code"], "error": res["error"]}
    except Exception as e:
        entity_type = "cve" if str(id).startswith("CVE") else "incident"
        push_history = models.JiraPushHistory(
            entity_type=entity_type,
            entity_id=str(id),
            summary=summary,
            status="failed",
            error_message=str(e)
        )
        db.add(push_history)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jira/projects")
def get_jira_projects_endpoint():
    from fastapi import HTTPException
    from jira_publisher import get_jira_projects
    try:
        projects = get_jira_projects()
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/reports/{id}")
def delete_report(id: int, db: Session = Depends(get_db)):
    report = db.query(models.ImpactReport).filter(models.ImpactReport.id == id).first()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"status": "deleted"}
@app.get("/api/reports/{id}/download/{format}")
def download_single_report(id: int, format: str, include_forensic: bool = False, db: Session = Depends(get_db)):
    """Downloads a specific AI Impact Report in PDF or DOCX format.
    Optionally includes the AI Forensic Deep-Dive analysis from the linked incident.
    """
    report = db.query(models.ImpactReport).filter(models.ImpactReport.id == id).first()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Attach incident and fetch MITRE mappings
    report.incident = db.query(models.Incident).filter(models.Incident.id == report.incident_id).first()
    mitre_mappings = db.query(models.MitreMapping).filter(models.MitreMapping.incident_id == report.incident_id).all()
    
    # Get forensic deep-dive content from the linked incident
    forensic_content = None
    if include_forensic and report.incident and report.incident.full_analysis:
        forensic_content = report.incident.full_analysis
    
    if format.lower() == "pdf":
        file_path = reporting.generate_single_impact_pdf(report, mitre_mappings, forensic_content=forensic_content)
        return FileResponse(file_path, filename=f"AI_Impact_Report_{id}.pdf", media_type="application/pdf")
    elif format.lower() in ["word", "docx"]:
        file_path = reporting.generate_single_impact_docx(report, mitre_mappings, forensic_content=forensic_content)
        return FileResponse(file_path, filename=f"AI_Impact_Report_{id}.docx", media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    
    return {"error": "Invalid format. Use 'pdf' or 'word'."}

@app.get("/api/reports/by-incident/{incident_id}/download/pdf")
def download_report_by_incident(incident_id: int, include_forensic: bool = True, db: Session = Depends(get_db)):
    """Downloads a specific AI Impact Report in PDF format using the Incident ID."""
    report = db.query(models.ImpactReport).filter(models.ImpactReport.incident_id == incident_id).first()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Impact Report not found for this incident")
    
    report.incident = db.query(models.Incident).filter(models.Incident.id == report.incident_id).first()
    mitre_mappings = db.query(models.MitreMapping).filter(models.MitreMapping.incident_id == report.incident_id).all()
    
    forensic_content = None
    if include_forensic and report.incident and report.incident.full_analysis:
        forensic_content = report.incident.full_analysis
    
    file_path = reporting.generate_single_impact_pdf(report, mitre_mappings, forensic_content=forensic_content)
    return FileResponse(file_path, filename=f"AI_Impact_Report_INC_{incident_id}.pdf", media_type="application/pdf")

@app.get("/api/automation/report/latest")
def get_latest_automation_report(timeframe_hours: int = 24, db: Session = Depends(get_db)):
    """Generates and downloads a summary report of the latest automation execution."""
    file_path = reporting.generate_automation_summary_pdf(db, timeframe_hours=timeframe_hours)
    return FileResponse(file_path, filename=f"Automation_Execution_Report_{timeframe_hours}h.pdf", media_type="application/pdf")

# --- REPORT BUILDER ENDPOINTS ---

@app.post("/api/reports/builder/preview")
def preview_report_data(req: schemas.ReportBuilderPreviewRequest, db: Session = Depends(get_db)):
    """Fetches candidate incidents and CVEs within the specified date ranges."""
    from datetime import datetime
    try:
        from_dt = datetime.fromisoformat(req.from_date.replace('Z', '+00:00'))
        to_dt = datetime.fromisoformat(req.to_date.replace('Z', '+00:00'))
        # Adjust to_dt to the end of the day to ensure we capture all events on that day
        to_dt = to_dt.replace(hour=23, minute=59, second=59)
    except:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601.")

    results = {
        "incidents": [],
        "cves": []
    }

    if 'crawl' in req.data_sources:
        query = db.query(models.Incident).filter(
            models.Incident.happened_at >= from_dt,
            models.Incident.happened_at <= to_dt
        )
        if req.impact_only:
            query = query.filter(models.Incident.company_impact_status == 'Yes')
        incidents = query.all()
        results["incidents"] = incidents

    if 'cve' in req.data_sources:
        query = db.query(models.CVE).filter(
            models.CVE.published_date >= from_dt,
            models.CVE.published_date <= to_dt
        )
        if req.impact_only:
            query = query.filter(models.CVE.impact_flag == 1)
        cves = query.all()
        results["cves"] = cves

    return results

@app.post("/api/reports/builder/generate", response_model=schemas.CombinedReportResponse)
def generate_combined_report(req: schemas.CombinedReportCreate, db: Session = Depends(get_db)):
    """Saves a combined report configuration."""
    new_report = models.CombinedReport(
        report_title=req.report_title,
        from_date=req.from_date,
        to_date=req.to_date,
        incident_ids=req.incident_ids,
        cve_ids=req.cve_ids
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

@app.get("/api/reports/builder/history", response_model=List[schemas.CombinedReportResponse])
def get_report_history(db: Session = Depends(get_db)):
    """Returns the history of generated reports."""
    return db.query(models.CombinedReport).order_by(models.CombinedReport.created_at.desc()).all()

@app.delete("/api/reports/builder/{id}")
def delete_report(id: int, db: Session = Depends(get_db)):
    """Deletes a report configuration."""
    report = db.query(models.CombinedReport).filter(models.CombinedReport.id == id).first()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}

@app.get("/api/reports/builder/download/{id}/{format}")
def download_combined_report(id: int, format: str, include_crawled_content: bool = True, db: Session = Depends(get_db)):
    """Generates and downloads a combined PDF or DOCX report."""
    report = db.query(models.CombinedReport).filter(models.CombinedReport.id == id).first()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report configuration not found")

    # Fetch all linked items
    incidents = db.query(models.Incident).filter(models.Incident.id.in_(report.incident_ids)).all()
    cves = db.query(models.CVE).filter(models.CVE.id.in_(report.cve_ids)).all()
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_title = report.report_title.replace(" ", "_")[:30]

    if format.lower() == 'pdf':
        file_path = reporting.generate_combined_pdf(report, incidents, cves, include_crawled_content)
        return FileResponse(file_path, filename=f"IntelReport_{clean_title}_{timestamp}.pdf", media_type="application/pdf")
    elif format == 'docx':
        file_path = reporting.generate_combined_docx(report, incidents, cves, include_crawled_content)
        filename = f"IntelReport_{clean_title}_{timestamp}.docx"
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        return FileResponse(file_path, filename=filename, media_type=media_type)
    elif format == 'xlsx':
        file_path = reporting.generate_combined_excel(report, incidents, cves, include_crawled_content)
        filename = f"IntelReport_{clean_title}_{timestamp}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        return FileResponse(file_path, filename=filename, media_type=media_type)
    
    return {"error": "Unsupported format. Use 'pdf', 'docx' or 'xlsx'."}
