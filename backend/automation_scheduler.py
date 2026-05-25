import os
import asyncio
from sqlalchemy.orm import Session
import datetime
import re

import models
from collectors.rss_collector import fetch_rss_feeds
from collectors.nvd_api_collector import fetch_nvd_cves, fetch_single_cve, save_cve_to_db

# We need a new session per loop iteration
from database import SessionLocal

def process_cve_scan(db: Session, cve_db_id: int):
    """
    Phase 1: Run Impact Radar scan on a single CVE and persist results to DB.
    This does NOT push to Jira — that happens in the batch grouping phase.
    """
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
    cve.ai_processed = 1  # Mark as scanned

    print(f"[*] Impact Radar Scan for {cve.cve_id} complete. Score: {res['score']}")

    if res["score"] >= 60:
        cve.impact_flag = 1
        cve.review_status = "Pending"
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
            details=f"Impact {cve.company_impact_score} < 60."
        )
        db.add(audit)
    
    db.commit()


def _get_product_grouping_key(cve):
    """
    Determine the product grouping key for a CVE.
    Priority 1: Product name from CPE extraction (literal product affected)
    Priority 2: Vendor/company name
    Priority 3: Matched product from Impact Radar
    """
    # Priority 1: Exact product name from NVD data
    if cve.product_name:
        return cve.product_name.lower()
        
    # Priority 2: Vendor/company name
    if cve.company_name:
        return cve.company_name.lower()

    # Priority 3: Matched product from Impact Radar
    if cve.heuristic_match_details:
        products = set()
        for match in cve.heuristic_match_details:
            if isinstance(match, dict) and match.get("product"):
                products.add(match["product"].lower())
        if products:
            return ", ".join(sorted(products))
    
    # Fallback
    return "unclassified"


def process_grouped_jira_push(db: Session, cve_db_ids: list):
    """
    Phase 2: Group high-impact CVEs by matched product and push batch Jira tickets.
    Each product group gets ONE ticket with multiple individual PDF attachments.
    """
    from jira_publisher import check_existing_ticket, create_jira_issue, upload_jira_attachments
    from reporting import generate_single_cve_pdf
    
    # 1. Load all high-impact CVEs from this batch
    high_impact_cves = db.query(models.CVE).filter(
        models.CVE.id.in_(cve_db_ids),
        models.CVE.impact_flag == 1
    ).all()
    
    if not high_impact_cves:
        print("[*] Scheduler: No high-impact CVEs to push to Jira.")
        return
    
    # 2. Filter out CVEs that already have individual tickets
    unpushed_cves = []
    for cve in high_impact_cves:
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
                details=f"Impact {cve.company_impact_score} >= 60. Skipped pushing to Jira (duplicate)."
            )
            db.add(audit)
            db.commit()
        else:
            unpushed_cves.append(cve)
    
    if not unpushed_cves:
        print("[*] Scheduler: All high-impact CVEs already have tickets.")
        return
    
    # 2.5 Upgrade NVD data to MITRE Vulnrichment for accurate product names BEFORE grouping
    from collectors.mitre_api_collector import fetch_mitre_cve
    import json
    for cve in unpushed_cves:
        if not cve.raw_data or "cveMetadata" not in cve.raw_data:
            mitre_data = fetch_mitre_cve(cve.cve_id)
            if mitre_data and "cveMetadata" in mitre_data:
                cve.raw_data = mitre_data
                # Extract product name if NVD didn't have it
                if not cve.product_name:
                    try:
                        from Cve_parser import CVEParser
                        parser = CVEParser(json.dumps(cve.raw_data))
                        affected = parser.get_affected_products()
                        if affected:
                            cve.company_name = affected[0].vendor
                            cve.product_name = affected[0].product
                    except Exception as e:
                        print(f"[*] Scheduler: Failed to extract product name from MITRE data for {cve.cve_id}: {e}")
                db.commit()

    # 3. Group by product
    product_groups = {}
    for cve in unpushed_cves:
        key = _get_product_grouping_key(cve)
        
        # If product name is completely unknown, skip automated batching.
        # User must use manual send button from UI.
        if key == "unclassified":
            print(f"[*] Scheduler: CVE {cve.cve_id} lacks product details. Skipping automated Jira push (requires manual action).")
            continue
            
        if key not in product_groups:
            product_groups[key] = []
        product_groups[key].append(cve)
    
    print(f"[*] Scheduler: Grouped {len(unpushed_cves)} CVEs into {len(product_groups)} product batch(es).")
    
    # 4. Create one Jira ticket per product group
    for product_key, cve_list in product_groups.items():
        _push_product_batch_ticket(db, product_key, cve_list)


def _push_product_batch_ticket(db: Session, product_key: str, cve_list: list):
    """
    Creates a single Jira ticket for a product group containing multiple CVEs.
    Attaches individual PDF reports for each CVE.
    """
    from jira_publisher import create_jira_issue, upload_jira_attachments
    from reporting import generate_single_cve_pdf
    
    # Build severity summary
    severity_counts = {}
    max_cvss = 0.0
    highest_severity = "Low"
    severity_priority = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    
    for cve in cve_list:
        sev = (cve.severity or "Low").capitalize()
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        try:
            score = float(cve.cvss_score or 0)
            if score > max_cvss:
                max_cvss = score
                highest_severity = sev
        except (ValueError, TypeError):
            pass
    
    sev_summary = ", ".join([f"{k}: {v}" for k, v in sorted(severity_counts.items(), key=lambda x: severity_priority.get(x[0].lower(), 0), reverse=True)])
    cve_id_list = [cve.cve_id for cve in cve_list]
    
    # Build ticket fields
    product_display = product_key.title()
    summary = f"[Vulnerability Batch] {product_display} — {len(cve_list)} CVEs Detected ({sev_summary})"
    
    # Build rich description listing all CVEs
    desc_lines = [
        f"Product: {product_display}",
        f"Total CVEs: {len(cve_list)}",
        f"Highest CVSS: {max_cvss} ({highest_severity})",
        f"Severity Breakdown: {sev_summary}",
        "",
        "--- CVE Details ---",
    ]
    for idx, cve in enumerate(cve_list, 1):
        desc_lines.append(f"")
        desc_lines.append(f"[{idx}] {cve.cve_id} | Severity: {cve.severity or 'Unknown'} | CVSS: {cve.cvss_score or 'N/A'}")
        desc_lines.append(f"Description: {(cve.description or 'No description.')[:200]}")
    
    desc = "\n".join(desc_lines)
    impact = f"Highest CVSS: {max_cvss} | Severity: {highest_severity} | {len(cve_list)} CVEs"
    remarks = f"Automated Batch Vulnerability Detection — {len(cve_list)} CVEs affecting {product_display}"
    
    try:
        res_jira = create_jira_issue(
            project_key="CI",
            issue_type="Task",
            summary=summary,
            description=desc,
            assignee_id="6422be0257f0c028e2f71e9a",
            impact=impact,
            severity=highest_severity,
            remarks=remarks
        )
        
        if res_jira["success"]:
            ticket_key = res_jira["data"]["key"]
            print(f"[+] Batch ticket created: {ticket_key} for {product_display} ({len(cve_list)} CVEs)")
            
            # Generate and attach individual PDF reports for each CVE
            for cve in cve_list:
                try:

                    cve_pdf_path = generate_single_cve_pdf(cve)
                    if os.path.exists(cve_pdf_path):
                        filename = os.path.basename(cve_pdf_path)
                        with open(cve_pdf_path, 'rb') as f:
                            content = f.read()
                        upload_jira_attachments(ticket_key, [('file', (filename, content, 'application/pdf'))])
                        print(f"    [+] Attached PDF for {cve.cve_id}")
                except Exception as pdf_err:
                    print(f"    [!] Failed to attach PDF for {cve.cve_id}: {pdf_err}")
            
            # Record push history for the batch
            batch_entity_id = f"{product_key}:{','.join(cve_id_list)}"
            push_history = models.JiraPushHistory(
                entity_type="cve_batch",
                entity_id=batch_entity_id,
                summary=summary,
                ticket_key=ticket_key,
                status="success"
            )
            db.add(push_history)
            
            # Also record individual CVE push history so they aren't re-pushed
            for cve in cve_list:
                individual_history = models.JiraPushHistory(
                    entity_type="cve",
                    entity_id=cve.cve_id,
                    summary=f"Pushed as part of batch ticket {ticket_key}",
                    ticket_key=ticket_key,
                    status="success"
                )
                db.add(individual_history)
            
            audit = models.AutomationAuditLog(
                entity_type="cve_batch",
                entity_id=batch_entity_id,
                entity_title=product_display,
                scan_status="Success",
                match_status="Matched",
                impact_score=max(cve.company_impact_score for cve in cve_list),
                details=f"Batch ticket {ticket_key}: {len(cve_list)} CVEs for {product_display}"
            )
            db.add(audit)
            db.commit()
        else:
            # Record failure
            batch_entity_id = f"{product_key}:{','.join(cve_id_list)}"
            push_history = models.JiraPushHistory(
                entity_type="cve_batch",
                entity_id=batch_entity_id,
                summary=summary,
                status="failed",
                error_message=res_jira.get("error", "Unknown JIRA error")
            )
            db.add(push_history)
            
            audit = models.AutomationAuditLog(
                entity_type="cve_batch",
                entity_id=batch_entity_id,
                entity_title=product_display,
                scan_status="Failed",
                match_status="Matched",
                impact_score=max(cve.company_impact_score for cve in cve_list),
                details=f"Jira batch push failed: {res_jira.get('error', 'Unknown error')}"
            )
            db.add(audit)
            db.commit()
    except Exception as e:
        batch_entity_id = f"{product_key}:{','.join(cve_id_list)}"
        push_history = models.JiraPushHistory(
            entity_type="cve_batch",
            entity_id=batch_entity_id,
            summary=f"Batch Automation for {product_display} ({len(cve_list)} CVEs)",
            status="failed",
            error_message=str(e)
        )
        db.add(push_history)
        
        audit = models.AutomationAuditLog(
            entity_type="cve_batch",
            entity_id=batch_entity_id,
            entity_title=product_display,
            scan_status="Failed",
            match_status="Matched",
            impact_score=max(cve.company_impact_score for cve in cve_list),
            details=f"Exception during batch Jira push: {str(e)}"
        )
        db.add(audit)
        db.commit()


# Keep legacy function name for backward compatibility (manual pushes still use this)
def process_cve_automation(db: Session, cve_db_id: int):
    """Legacy wrapper: runs scan only. Jira push is now handled by batch processing."""
    process_cve_scan(db, cve_db_id)


current_status_message = "Idle"

def run_automation_cycle(timeframe_nvd="today", run_nvd=True):
    global current_status_message
    """Runs a single iteration of the scheduled automation."""
    print(f"[*] Automation Scheduler running: NVD={run_nvd}({timeframe_nvd})...")
    db = SessionLocal()
    try:
        # Fetch dynamic Auto-Retry cutoff date from DB
        profile = db.query(models.CompanyProfile).first()
        target_date = profile.auto_retry_start_date if profile and profile.auto_retry_start_date else datetime.datetime(2026, 5, 20)
        
        # 1. NVD CVE Sync (Done FIRST as requested)
        if run_nvd:
            current_status_message = "Fetching NVD API..."
            nvd_result = fetch_nvd_cves(db, timeframe=timeframe_nvd)
            new_cve_ids = nvd_result.get("new_ids", []) if isinstance(nvd_result, dict) else []
            
            # Auto-Retry: Find CVEs that were skipped or failed the scan
            missed_cves = db.query(models.CVE).filter(
                models.CVE.ai_processed == 0,
                models.CVE.published_date >= target_date
            ).all()
            if missed_cves:
                missed_ids = [c.id for c in missed_cves]
                new_cve_ids = list(set(new_cve_ids + missed_ids))
                print(f"[*] Auto-Retry: Injected {len(missed_ids)} previously missed CVEs into the current scan cycle.")
            
            if new_cve_ids:
                # Phase 1: Scan all CVEs (Impact Radar only, no Jira push)
                current_status_message = f"Scanning {len(new_cve_ids)} CVEs (Impact Radar)..."
                print(f"[*] Scheduler: Scanning {len(new_cve_ids)} CVEs...")
                for idx, cve_db_id in enumerate(new_cve_ids, 1):
                    process_cve_scan(db, cve_db_id)
                
                # Phase 2: Group by product and push batch tickets
                current_status_message = f"Grouping CVEs by product and pushing to Jira..."
                print(f"[*] Scheduler: Grouping CVEs by product for batch Jira push...")
                process_grouped_jira_push(db, new_cve_ids)
                
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
                    await asyncio.to_thread(run_automation_cycle, "today", True)
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
            run_nvd=request.run_nvd
        )
        last_automation_run = datetime.datetime.utcnow()
    finally:
        is_automation_running = False
