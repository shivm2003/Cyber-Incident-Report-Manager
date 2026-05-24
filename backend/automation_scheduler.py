import os
import asyncio
from sqlalchemy.orm import Session
import datetime
import re

import models
from collectors.rss_collector import fetch_rss_feeds
from collectors.nvd_api_collector import fetch_nvd_cves, fetch_single_cve, save_cve_to_db, process_cve_ai

# We need a new session per loop iteration
from database import SessionLocal

def process_cve_automation(db: Session, cve_db_id: int):
    cve = db.query(models.CVE).filter(models.CVE.id == cve_db_id).first()
    if not cve: return
    
    # 1. Fetch Company Profile
    profile_obj = db.query(models.CompanyProfile).first()
    profile = {
        "company_name": profile_obj.company_name if profile_obj else "India Shelter Finance Corp",
        "tech_stack": profile_obj.tech_stack if profile_obj else [],
        "industry": profile_obj.industry if profile_obj else "Finance"
    }

    # 2. Impact Scan
    from analyzer import analyze_cve_impact
    res = analyze_cve_impact(cve.cve_id, cve.description or "", cve.affected_products or [], profile, 'all')
    cve.company_impact_score = res["score"]
    cve.company_impact_reason = res["reason"]
    cve.detection_method = res.get("method", "Heuristic (Version-Aware)")
    cve.extracted_versions = res.get("extracted_versions")
    cve.heuristic_match_details = res.get("heuristic_match_details")
    cve.version_relevance = res.get("version_relevance", 0)

    print(f"[*] Impact Radar Scan for {cve.cve_id} complete. Score: {res['score']}")

    if res["score"] >= 70:
        cve.impact_flag = 1
        cve.review_status = "Pending"
        db.commit()
        
        # 3. Check Duplicacy Before Pushing to JIRA
        from jira_publisher import check_existing_ticket
        existing_ticket = check_existing_ticket(db, "cve", cve.cve_id)
        if existing_ticket:
            print(f"[*] Scheduler: Ticket for CVE {cve.cve_id} already exists ({existing_ticket}). Skipping.")
            audit = models.AutomationAuditLog(
                entity_type="cve",
                entity_id=cve.cve_id,
                entity_title=cve.product_name,
                scan_status="Success",
                match_status="Matched",
                impact_score=cve.company_impact_score,
                details=f"Impact {cve.company_impact_score} >= 70. Skipped pushing to Jira (duplicate)."
            )
            db.add(audit)
            db.commit()
            return
            
        # 4. Create Jira Ticket & Push History
        try:
            summary = f"[Vulnerability] {cve.cve_id} | {cve.company_name or 'Global Vulnerability'} - Automated Alert"
            desc = f"CVE ID: {cve.cve_id}\n" \
                   f"Severity: {cve.severity or 'Unknown'} ({cve.cvss_score or 'N/A'})\n" \
                   f"Description:\n{cve.description or 'No description available.'}\n\n" \
                   f"AI Summary:\n{cve.ai_summary or 'No AI summary.'}"
            impact = f"CVSS Score: {cve.cvss_score or 'N/A'} | Severity: {cve.severity or 'Unknown'}"
            
            severity_level = cve.severity or "Low"
            if severity_level.lower() == "critical": severity_level = "Critical"
            elif severity_level.lower() == "high": severity_level = "High"
            elif severity_level.lower() == "medium": severity_level = "Medium"
            else: severity_level = "Low"
            
            remarks = "Automated Vulnerability Detection (CVE Extractor)"
            
            # 4a. Use the API first to create the ticket
            from jira_publisher import create_jira_issue, upload_jira_attachments
            res_jira = create_jira_issue(
                project_key="CI",
                issue_type="Task",
                summary=summary,
                description=desc,
                assignee_id="6422be0257f0c028e2f71e9a",
                impact=impact,
                severity=severity_level,
                remarks=remarks
            )
            
            if res_jira["success"]:
                ticket_key = res_jira["data"]["key"]
                
                # 4b. THEN make the report using CVE Extractor
                from reporting import generate_single_cve_pdf
                cve_pdf_path = generate_single_cve_pdf(cve)
                
                # 4c. THEN add attachments
                if os.path.exists(cve_pdf_path):
                    filename = os.path.basename(cve_pdf_path)
                    with open(cve_pdf_path, 'rb') as f:
                        content = f.read()
                    upload_jira_attachments(ticket_key, [('file', (filename, content, 'application/pdf'))])
                    
                push_history = models.JiraPushHistory(
                    entity_type="cve",
                    entity_id=cve.cve_id,
                    summary=summary,
                    ticket_key=ticket_key,
                    status="success"
                )
                db.add(push_history)
                
                audit = models.AutomationAuditLog(
                    entity_type="cve",
                    entity_id=cve.cve_id,
                    entity_title=cve.product_name,
                    scan_status="Success",
                    match_status="Matched",
                    impact_score=cve.company_impact_score,
                    details=f"Pushed to Jira: {ticket_key}"
                )
                db.add(audit)
                db.commit()
            else:
                push_history = models.JiraPushHistory(
                    entity_type="cve",
                    entity_id=cve.cve_id,
                    summary=summary,
                    status="failed",
                    error_message=res_jira.get("error", "Unknown JIRA error")
                )
                db.add(push_history)
                
                audit = models.AutomationAuditLog(
                    entity_type="cve",
                    entity_id=cve.cve_id,
                    entity_title=cve.product_name,
                    scan_status="Failed",
                    match_status="Matched",
                    impact_score=cve.company_impact_score,
                    details=f"Jira push failed: {res_jira.get('error', 'Unknown error')}"
                )
                db.add(audit)
                db.commit()
        except Exception as e:
            push_history = models.JiraPushHistory(
                entity_type="cve",
                entity_id=cve.cve_id,
                summary=f"CVE Automation Run for {cve.cve_id}",
                status="failed",
                error_message=str(e)
            )
            db.add(push_history)
            
            audit = models.AutomationAuditLog(
                entity_type="cve",
                entity_id=cve.cve_id,
                entity_title=cve.product_name,
                scan_status="Failed",
                match_status="Matched",
                impact_score=cve.company_impact_score,
                details=f"Exception during Jira push: {str(e)}"
            )
            db.add(audit)
            db.commit()
    else:
        cve.impact_flag = 0
        cve.review_status = "Reviewed"
        
        audit = models.AutomationAuditLog(
            entity_type="cve",
            entity_id=cve.cve_id,
            entity_title=cve.product_name,
            scan_status="Success",
            match_status="Not Matched",
            impact_score=cve.company_impact_score,
            details=f"Impact {cve.company_impact_score} < 70."
        )
        db.add(audit)
        db.commit()

def process_incident_automation(db: Session, incident_id: int):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident: return
    
    # 1. Fetch company profile
    profile_obj = db.query(models.CompanyProfile).first()
    profile = {
        "company_name": profile_obj.company_name if profile_obj else "India Shelter Finance Corp",
        "tech_stack": profile_obj.tech_stack if profile_obj else [],
        "industry": profile_obj.industry if profile_obj else "Finance"
    }
    
    # 2. Run Impact Radar Scan
    from analyzer import analyze_dynamic_impact
    res = analyze_dynamic_impact(incident.title, incident.description or "", profile, 'all')
    incident.company_impact_status = res["status"]
    incident.company_impact_reason = res["reason"]
    incident.company_impact_score = res["score"]
    incident.detection_method = res.get("method", "Heuristic (Version-Aware)")
    incident.extracted_versions = res.get("extracted_versions")
    incident.heuristic_match_details = res.get("heuristic_match_details")
    incident.version_relevance = res.get("version_relevance", 0)
    
    if res["score"] >= 70:
        incident.impact_flag = 1
        incident.review_status = "Pending"
        db.commit()
        
        # 3. Generate AI Deep-Dive Impact Report
        from analyzer import analyze_deep_impact
        try:
            report = db.query(models.ImpactReport).filter_by(incident_id=incident_id).first()
            if not report:
                if incident.link and not incident.crawled_content:
                    from crawler import fetch_article_content
                    incident.crawled_content = fetch_article_content(incident.link)
                    db.commit()
                    
                impact_data = analyze_deep_impact(
                    incident.title,
                    incident.description or "",
                    incident.raw_data or {},
                    incident.crawled_content or ""
                )
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
                db.commit()
                db.refresh(report)
                
            report.incident = incident
            
            # --- MITRE mappings ---
            mitre_mappings = db.query(models.MitreMapping).filter(models.MitreMapping.incident_id == incident_id).all()
            if not mitre_mappings:
                from analyzer import analyze_mitre_ttp
                mitre_data = analyze_mitre_ttp(incident.title, incident.description or "")
                for m in mitre_data:
                    mapping = models.MitreMapping(
                        incident_id=incident_id,
                        tactic=m.get("tactic", "Unknown"),
                        technique_id=m.get("technique_id", "Unknown"),
                        technique_name=m.get("technique_name", "Unknown"),
                        confidence=m.get("confidence", 0),
                        analysis_justification=m.get("analysis_justification", "Automated extraction by Shivam AI")
                    )
                    db.add(mapping)
                    mitre_mappings.append(mapping)
                db.commit()
                
            # 4. Extract CVEs from incident
            extracted_cve_ids = []
            text_to_search = f"{incident.title or ''} {incident.description or ''} {incident.crawled_content or ''}"
            cve_matches = re.findall(r'\bCVE-\d{4}-\d{4,7}\b', text_to_search, re.IGNORECASE)
            if cve_matches:
                extracted_cve_ids = list(set(c.upper() for c in cve_matches))
                
            attachments_files = []
            
            from reporting import generate_single_impact_pdf, generate_single_cve_pdf
            incident_pdf_path = generate_single_impact_pdf(report, mitre_mappings, forensic_content=incident.full_analysis)
            attachments_files.append(incident_pdf_path)
            
            for cve_id in extracted_cve_ids:
                cve_obj = db.query(models.CVE).filter_by(cve_id=cve_id).first()
                if not cve_obj:
                    nvd_data = fetch_single_cve(cve_id)
                    if nvd_data:
                        cve_obj = save_cve_to_db(db, nvd_data)
                        process_cve_ai(db, cve_obj.id)
                        db.refresh(cve_obj)
                    else:
                        cve_obj = models.CVE(
                            cve_id=cve_id,
                            description=f"Extracted from Incident: {incident.title}",
                            severity="Unknown",
                            pull_type="Extracted from Incident"
                        )
                        db.add(cve_obj)
                        db.commit()
                        db.refresh(cve_obj)
                
                cve_pdf_path = generate_single_cve_pdf(cve_obj)
                attachments_files.append(cve_pdf_path)
                
            # 5. Check Duplicacy Before Pushing to JIRA
            existing_ticket = check_existing_ticket(db, "incident", str(incident_id))
            if existing_ticket:
                print(f"[*] Scheduler: Ticket for Incident {incident_id} already exists ({existing_ticket}). Skipping JIRA push.")
                
                audit = models.AutomationAuditLog(
                    entity_type="incident",
                    entity_id=str(incident_id),
                    entity_title=incident.title,
                    scan_status="Success",
                    match_status="Matched",
                    impact_score=incident.company_impact_score,
                    details=f"Impact {incident.company_impact_score} >= 70. Skipped pushing to Jira (duplicate)."
                )
                db.add(audit)
                db.commit()
                return

            from jira_publisher import create_jira_issue, upload_jira_attachments
            summary = f"[AI Incident] {incident.title} - Automated Alert"
            desc = f"[AI Forensic Analysis]\n" \
                   f"Incident Title: {incident.title}\n" \
                   f"Severity: {incident.severity or 'Low'}\n" \
                   f"Root Cause: {report.root_cause or 'N/A'}\n" \
                   f"Technical Analysis: {report.technical_analysis or 'N/A'}\n" \
                   f"Affected Scope: {report.affected_customers or 'N/A'}\n" \
                   f"Breach Method: {report.breach_method or 'N/A'}"
            impact = report.business_impact or "Customer Impacted"
            
            severity_level = incident.severity or "Low"
            if severity_level.lower() == "critical": severity_level = "Critical"
            elif severity_level.lower() == "high": severity_level = "High"
            elif severity_level.lower() == "medium": severity_level = "Medium"
            else: severity_level = "Low"
            
            remarks = f"Breach Process Timeline:\n{report.breach_process or 'Immediate action required.'}"
            
            res_jira = create_jira_issue(
                project_key="CI",
                issue_type="Task",
                summary=summary,
                description=desc,
                assignee_id="6422be0257f0c028e2f71e9a",
                impact=impact,
                severity=severity_level,
                remarks=remarks
            )
            
            if res_jira["success"]:
                ticket_key = res_jira["data"]["key"]
                files_payload = []
                for filepath in attachments_files:
                    if os.path.exists(filepath):
                        filename = os.path.basename(filepath)
                        with open(filepath, 'rb') as f:
                            content = f.read()
                        files_payload.append(('file', (filename, content, 'application/pdf')))
                
                if files_payload:
                    upload_jira_attachments(ticket_key, files_payload)
                
                push_history = models.JiraPushHistory(
                    entity_type="incident",
                    entity_id=str(incident_id),
                    summary=summary,
                    ticket_key=ticket_key,
                    status="success"
                )
                db.add(push_history)
                
                audit = models.AutomationAuditLog(
                    entity_type="incident",
                    entity_id=str(incident_id),
                    entity_title=incident.title,
                    scan_status="Success",
                    match_status="Matched",
                    impact_score=incident.company_impact_score,
                    details=f"Pushed to Jira: {ticket_key}"
                )
                db.add(audit)
                db.commit()
            else:
                push_history = models.JiraPushHistory(
                    entity_type="incident",
                    entity_id=str(incident_id),
                    summary=summary,
                    status="failed",
                    error_message=res_jira.get("error", "Unknown JIRA error")
                )
                db.add(push_history)
                
                audit = models.AutomationAuditLog(
                    entity_type="incident",
                    entity_id=str(incident_id),
                    entity_title=incident.title,
                    scan_status="Failed",
                    match_status="Matched",
                    impact_score=incident.company_impact_score,
                    details=f"Jira push failed: {res_jira.get('error', 'Unknown error')}"
                )
                db.add(audit)
                db.commit()
                
        except Exception as deep_e:
            push_history = models.JiraPushHistory(
                entity_type="incident",
                entity_id=str(incident_id),
                summary=f"Incident Automation Run for {incident.title}",
                status="failed",
                error_message=str(deep_e)
            )
            db.add(push_history)
            
            audit = models.AutomationAuditLog(
                entity_type="incident",
                entity_id=str(incident_id),
                entity_title=incident.title,
                scan_status="Failed",
                match_status="Matched",
                impact_score=incident.company_impact_score,
                details=f"Exception during Jira push: {str(deep_e)}"
            )
            db.add(audit)
            db.commit()
    else:
        incident.impact_flag = 0
        incident.review_status = "Reviewed"
        
        audit = models.AutomationAuditLog(
            entity_type="incident",
            entity_id=str(incident_id),
            entity_title=incident.title,
            scan_status="Success",
            match_status="Not Matched",
            impact_score=incident.company_impact_score,
            details=f"Impact {incident.company_impact_score} < 70."
        )
        db.add(audit)
        db.commit()

current_status_message = "Idle"

def run_automation_cycle(timeframe_nvd="today", timeframe_rss="today", run_nvd=True, run_rss=True):
    global current_status_message
    """Runs a single iteration of the scheduled automation."""
    print(f"[*] Automation Scheduler running: NVD={run_nvd}({timeframe_nvd}), RSS={run_rss}({timeframe_rss})...")
    db = SessionLocal()
    try:
        # 1. NVD CVE Sync (Done FIRST as requested)
        if run_nvd:
            current_status_message = "Fetching NVD API..."
            nvd_result = fetch_nvd_cves(db, timeframe=timeframe_nvd)
            new_cve_ids = nvd_result.get("new_ids", []) if isinstance(nvd_result, dict) else []
            
            # Auto-Retry: Find CVEs that were skipped or failed the AI scan (from 2026-05-20 onwards, no limit)
            target_date = datetime.datetime(2026, 5, 20)
            missed_cves = db.query(models.CVE).filter(
                models.CVE.ai_processed == 0,
                models.CVE.published_date >= target_date
            ).all()
            if missed_cves:
                missed_ids = [c.id for c in missed_cves]
                new_cve_ids = list(set(new_cve_ids + missed_ids))
                print(f"[*] Auto-Retry: Injected {len(missed_ids)} previously missed CVEs into the current scan cycle.")
            
            if new_cve_ids:
                current_status_message = f"Processing {len(new_cve_ids)} CVEs (including retries)..."
                print(f"[*] Scheduler: AI processing and scanning {len(new_cve_ids)} CVEs...")
                for idx, cve_db_id in enumerate(new_cve_ids, 1):
                    process_cve_ai(db, cve_db_id)
                    process_cve_automation(db, cve_db_id)
                
        # 2. RSS Feed Sync (Done SECOND)
        if run_rss:
            current_status_message = "Crawling Incident Data..."
            rss_result = fetch_rss_feeds(db, timeframe=timeframe_rss)
            
            current_status_message = "Analyzing incident data..."
            from main import run_analysis_on_new_incidents
            run_analysis_on_new_incidents(db)
            
            new_incident_ids = rss_result.get("new_ids", []) if isinstance(rss_result, dict) else []
            
            # Auto-Retry: Find Incidents that didn't finish the Impact Radar (from 2026-05-20 onwards, no limit)
            missed_incidents = db.query(models.Incident).filter(
                models.Incident.company_impact_status == None,
                models.Incident.date_collected >= target_date
            ).all()
            if missed_incidents:
                missed_inc_ids = [i.id for i in missed_incidents]
                new_incident_ids = list(set(new_incident_ids + missed_inc_ids))
                print(f"[*] Auto-Retry: Injected {len(missed_inc_ids)} previously missed Incidents into the current scan cycle.")
                
            if new_incident_ids:
                current_status_message = f"Analyzing impact for {len(new_incident_ids)} incidents (including retries)..."
                print(f"[*] Scheduler: Analyzing impact for {len(new_incident_ids)} incidents...")
                for idx, inc_id in enumerate(new_incident_ids, 1):
                    process_incident_automation(db, inc_id)
                
    except Exception as e:
        print(f"[X] Scheduler inner error: {e}")
    finally:
        current_status_message = "Idle"
        db.close()

scheduler_interval_hours = 3
last_automation_run = None
is_automation_running = False

async def start_automation_scheduler():
    global last_automation_run, is_automation_running, scheduler_interval_hours
    print(f"[*] Starting Cyber Incident Intelligence Automation Scheduler ({scheduler_interval_hours}h cycle)...")
    while True:
        try:
            now = datetime.datetime.utcnow()
            if last_automation_run is None:
                # Initialize the timer on boot so it waits for the first full cycle
                last_automation_run = now
            elif not is_automation_running and (now - last_automation_run).total_seconds() >= (scheduler_interval_hours * 3600):
                is_automation_running = True
                try:
                    await asyncio.to_thread(run_automation_cycle, "today", "today", True, True)
                    last_automation_run = datetime.datetime.utcnow()
                finally:
                    is_automation_running = False
        except Exception as e:
            print(f"[X] Scheduler outer error: {e}")
            
        # Sleep for 60 seconds before checking again
        await asyncio.sleep(60)

def run_manual_automation(request):
    global last_automation_run, is_automation_running
    if is_automation_running:
        return
    is_automation_running = True
    try:
        run_automation_cycle(
            timeframe_nvd=request.nvd_timeframe, 
            timeframe_rss=request.incident_timeframe,
            run_nvd=request.run_nvd,
            run_rss=request.run_incident
        )
        last_automation_run = datetime.datetime.utcnow()
    finally:
        is_automation_running = False
