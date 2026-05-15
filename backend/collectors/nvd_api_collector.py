import requests
from sqlalchemy.orm import Session
import models
from datetime import datetime, timedelta
import time
import os
import uuid

NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"

def process_cve_ai(db: Session, cve_id: int):
    """
    Background worker to extract company, product, and AI summary for a CVE.
    """
    cve = db.query(models.CVE).filter(models.CVE.id == cve_id).first()
    if not cve or cve.ai_processed == 1:
        return

    from analyzer import analyze_cve
    print(f"[*] AI Processing for CVE: {cve.cve_id}...")
    result = analyze_cve(cve.description)

    if result:
        company_name = result.get("company_name", "Unknown Vendor")
        cve.company_name = company_name
        cve.product_name = result.get("product_name", "Unknown Product")
        cve.ai_summary = result.get("summary", "")
        cve.ai_tags = result.get("tags", [])
        cve.ai_processed = 1

        # Update Company Intelligence
        company = db.query(models.Company).filter(models.Company.name == company_name).first()
        v_type = result.get("vulnerability_type")
        
        if not company:
            company = models.Company(
                name=company_name,
                total_cves=1,
                critical_cves=1 if cve.severity == "Critical" else 0,
                high_cves=1 if cve.severity == "High" else 0,
                latest_cve=cve.cve_id,
                vulnerability_types=[v_type] if v_type else []
            )
            db.add(company)
        else:
            company.total_cves += 1
            company.latest_cve = cve.cve_id
            if v_type:
                types = list(company.vulnerability_types or [])
                if v_type not in types:
                    types.append(v_type)
                company.vulnerability_types = types
            
            # Update severity counts
            if cve.severity == "Critical": company.critical_cves += 1
            if cve.severity == "High": company.high_cves += 1
            
            company.last_updated = datetime.utcnow()

        db.commit()
        print(f"[+] AI Enrichment complete for {cve.cve_id} ({company_name})")

def fetch_nvd_cves(db: Session, timeframe: str = "today"):
    """
    Queries NVD for vulnerabilities within a specific timeframe and saves them to the CVE table.
    """
    collected_count = 0
    session_id = str(uuid.uuid4())
    new_ids = []
    api_key = os.environ.get("NVD_API_KEY")
    headers = {}
    if api_key and api_key != "your_nvd_api_key_here":
        headers["apiKey"] = api_key
    
    # Calculate date range
    now = datetime.utcnow()
    if timeframe == "yesterday":
        start_date = (now - timedelta(days=1)).strftime("%Y-%m-%dT00:00:00.000")
        end_date = (now - timedelta(days=1)).strftime("%Y-%m-%dT23:59:59.999")
    elif timeframe == "week":
        start_date = (now - timedelta(days=7)).strftime("%Y-%m-%dT00:00:00.000")
        end_date = now.strftime("%Y-%m-%dT%H:%M:%S.000")
    elif timeframe == "month":
        start_date = (now - timedelta(days=30)).strftime("%Y-%m-%dT00:00:00.000")
        end_date = now.strftime("%Y-%m-%dT%H:%M:%S.000")
    else: # today
        start_date = now.strftime("%Y-%m-%dT00:00:00.000")
        end_date = now.strftime("%Y-%m-%dT%H:%M:%S.000")

    params = {
        "pubStartDate": start_date,
        "pubEndDate": end_date,
        "resultsPerPage": 2000 # Increased to pull max allowed per batch
    }
    
    try:
        print(f"[*] Querying NVD ({timeframe})...")
        response = requests.get(NVD_API_URL, headers=headers, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            vulnerabilities = data.get('vulnerabilities', [])
            
            for vuln in vulnerabilities:
                cve = vuln.get('cve', {})
                cve_id = cve.get('id')
                if not cve_id: continue
                
                descriptions = cve.get('descriptions', [])
                summary = next((d['value'] for d in descriptions if d['lang'] == 'en'), 'No description available.')
                
                # Extract metrics (CVSS)
                cvss_score = None
                severity = "Low"
                metrics = cve.get('metrics', {})
                
                if 'cvssMetricV31' in metrics:
                    cvss_data = metrics['cvssMetricV31'][0].get('cvssData', {})
                    cvss_score = str(cvss_data.get('baseScore', ''))
                    severity = cvss_data.get('baseSeverity', 'Low').capitalize()
                elif 'cvssMetricV30' in metrics:
                    cvss_data = metrics['cvssMetricV30'][0].get('cvssData', {})
                    cvss_score = str(cvss_data.get('baseScore', ''))
                    severity = cvss_data.get('baseSeverity', 'Low').capitalize()
                elif 'cvssMetricV2' in metrics:
                    cvss_data = metrics['cvssMetricV2'][0].get('cvssData', {})
                    cvss_score = str(cvss_data.get('baseScore', ''))
                    severity = metrics['cvssMetricV2'][0].get('baseSeverity', 'Low').capitalize()

                # Extract Affected Products (CPEs)
                affected_products = []
                configurations = cve.get('configurations', [])
                for config in configurations:
                    nodes = config.get('nodes', [])
                    for node in nodes:
                        cpe_matches = node.get('cpeMatch', [])
                        for match in cpe_matches:
                            criteria = match.get('criteria')
                            if criteria: affected_products.append(criteria)

                # Fallback: Extract from description if NVD is still "Evaluating"
                if not affected_products:
                    words = summary.split()
                    hint = " ".join(words[:4]) if len(words) >= 4 else summary
                    affected_products = [f"Likely: {hint}"]

                # Extract References
                references = []
                refs = cve.get('references', [])
                for r in refs:
                    if r.get('url'): references.append(r.get('url'))

                # Dates
                pub_date_str = cve.get('published')
                mod_date_str = cve.get('lastModified')
                pub_date = None
                mod_date = None
                
                try:
                    if pub_date_str: pub_date = datetime.fromisoformat(pub_date_str.replace('Z', '+00:00'))
                    if mod_date_str: mod_date = datetime.fromisoformat(mod_date_str.replace('Z', '+00:00'))
                except: pass

                # Duplicacy Check
                existing_cve = db.query(models.CVE).filter(models.CVE.cve_id == cve_id).first()
                if not existing_cve:
                    new_cve = models.CVE(
                        cve_id=cve_id,
                        description=summary,
                        cvss_score=cvss_score,
                        severity=severity,
                        affected_products=affected_products[:50],
                        references=references,
                        published_date=pub_date,
                        last_modified_date=mod_date,
                        pull_type="Standard Intelligence Pull",
                        pull_params={"timeframe": timeframe},
                        search_session_id=session_id,
                        raw_data=vuln
                    )
                    db.add(new_cve)
                    db.flush() # Get the ID
                    new_ids.append(new_cve.id)
                    collected_count += 1
            
            db.commit()
            
            # Start background processing for the new CVEs
            # Note: In a real FastAPI app, we'd pass this to BackgroundTasks
            # Here, we return the IDs so the caller can trigger them
            return {"message": f"NVD CVEs ({timeframe}): {collected_count} new items.", "new_ids": new_ids}
        else:
            print(f"[!] NVD returned status {response.status_code}")
            return {"error": f"NVD returned {response.status_code}"}

    except Exception as e:
        print(f"[!] NVD Connection Error: {str(e)}")
        return {"error": str(e)}

def fetch_nvd_advanced(db: Session, search_params: dict):
    """
    Advanced NVD query supporting all v2.0 parameters.
    """
    collected_count = 0
    session_id = str(uuid.uuid4())
    new_ids = []
    api_key = os.environ.get("NVD_API_KEY")
    headers = {}
    if api_key and api_key != "your_nvd_api_key_here":
        headers["apiKey"] = api_key

    # Clean up params: remove None and convert booleans to flags
    params = {}
    for k, v in search_params.items():
        if v is None or v == "" or v is False or v == []:
            continue
        
        # NVD uses flags (no value) for these booleans
        if k in ['hasCertAlerts', 'hasCertNotes', 'hasKev', 'hasOval', 'isVulnerable', 'noRejected', 'keywordExactMatch']:
            if v is True:
                params[k] = "" # Sends key= in URL, which works for NVD
        elif k == 'cveIds' and isinstance(v, list):
            params[k] = ",".join(v) # NVD expects comma-separated list
        else:
            params[k] = v

    # Force max limit per API rules
    if 'resultsPerPage' not in params:
        params['resultsPerPage'] = 2000
        
    # VALIDATION: NVD API v2.0 limits date ranges to 120 days
    if search_params.get('pubStartDate') and search_params.get('pubEndDate'):
        try:
            start = datetime.fromisoformat(search_params['pubStartDate'].replace('Z', '+00:00'))
            end = datetime.fromisoformat(search_params['pubEndDate'].replace('Z', '+00:00'))
            if (end - start).days > 120:
                return {"error": f"Date range exceeds 120 days (requested {(end-start).days} days). NVD API v2.0 requires ranges to be <= 120 days."}
        except: pass

    try:
        print(f"[*] Querying NVD Advanced Intelligence...")
        response = requests.get(NVD_API_URL, headers=headers, params=params, timeout=45)
        
        if response.status_code == 200:
            data = response.json()
            vulnerabilities = data.get('vulnerabilities', [])
            
            for vuln in vulnerabilities:
                cve_data = vuln.get('cve', {})
                cve_id = cve_data.get('id')
                
                # Extract description
                descriptions = cve_data.get('descriptions', [])
                summary = next((d['value'] for d in descriptions if d['lang'] == 'en'), 'No description.')
                
                # Extract Severity
                cvss_score = "0.0"
                severity = "Low"
                metrics = cve_data.get('metrics', {})
                if 'cvssMetricV31' in metrics:
                    m = metrics['cvssMetricV31'][0]['cvssData']
                    cvss_score = str(m.get('baseScore'))
                    severity = m.get('baseSeverity', 'Low').capitalize()
                elif 'cvssMetricV30' in metrics:
                    m = metrics['cvssMetricV30'][0]['cvssData']
                    cvss_score = str(m.get('baseScore'))
                    severity = m.get('baseSeverity', 'Low').capitalize()
                elif 'cvssMetricV2' in metrics:
                    m = metrics['cvssMetricV2'][0]['cvssData']
                    cvss_score = str(m.get('baseScore'))
                    severity = metrics['cvssMetricV2'][0].get('baseSeverity', 'Low').capitalize()

                # Extract Products
                affected_products = []
                for config in cve_data.get('configurations', []):
                    for node in config.get('nodes', []):
                        for match in node.get('cpeMatch', []):
                            cpe = match.get('criteria')
                            if cpe: affected_products.append(cpe)

                # Dates
                pub_date_str = cve_data.get('published')
                mod_date_str = cve_data.get('lastModified')
                pub_date = None
                mod_date = None
                try:
                    if pub_date_str: pub_date = datetime.fromisoformat(pub_date_str.replace('Z', '+00:00'))
                    if mod_date_str: mod_date = datetime.fromisoformat(mod_date_str.replace('Z', '+00:00'))
                except: pass

                # References
                references = [ref.get('url') for ref in cve_data.get('references', [])]

                # Save to DB
                existing = db.query(models.CVE).filter(models.CVE.cve_id == cve_id).first()
                if not existing:
                    new_cve = models.CVE(
                        cve_id=cve_id,
                        description=summary,
                        cvss_score=cvss_score,
                        severity=severity,
                        affected_products=affected_products[:50],
                        references=references,
                        published_date=pub_date,
                        last_modified_date=mod_date,
                        pull_type="Advanced Intelligence Pull",
                        pull_params=search_params,
                        search_session_id=session_id,
                        raw_data=vuln
                    )
                    db.add(new_cve)
                    db.flush()
                    new_ids.append(new_cve.id)
                    collected_count += 1
            
            db.commit()
            return {"message": f"NVD Advanced: {collected_count} new items.", "new_ids": new_ids}
        else:
            print(f"[!] NVD Advanced returned {response.status_code}")
            return {"error": f"NVD Status {response.status_code}"}
    except Exception as e:
        print(f"[!] NVD Advanced Error: {str(e)}")
        return {"error": str(e)}

# Keep the old function definition around just in case it's called elsewhere, 
# but route it to the new one or return empty to not break things
def fetch_nvd_india_incidents(db: Session, timeframe: str = "today"):
    return fetch_nvd_cves(db, timeframe)

def fetch_single_cve(cve_id: str):
    """
    Fetches a specific CVE from NVD by its ID.
    Returns a dictionary of the processed CVE data or None if not found.
    """
    api_key = os.environ.get("NVD_API_KEY")
    headers = {}
    if api_key and api_key != "your_nvd_api_key_here":
        headers["apiKey"] = api_key
    
    params = {"cveId": cve_id}
    
    try:
        print(f"[*] Querying NVD for specific CVE: {cve_id}...")
        response = requests.get(NVD_API_URL, headers=headers, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            vulnerabilities = data.get('vulnerabilities', [])
            if not vulnerabilities:
                return None
                
            vuln = vulnerabilities[0]
            cve = vuln.get('cve', {})
            
            descriptions = cve.get('descriptions', [])
            summary = next((d['value'] for d in descriptions if d['lang'] == 'en'), 'No description available.')
            
            cvss_score = None
            severity = "Low"
            metrics = cve.get('metrics', {})
            
            if 'cvssMetricV31' in metrics:
                cvss_data = metrics['cvssMetricV31'][0].get('cvssData', {})
                cvss_score = str(cvss_data.get('baseScore', ''))
                severity = cvss_data.get('baseSeverity', 'Low').capitalize()
            elif 'cvssMetricV30' in metrics:
                cvss_data = metrics['cvssMetricV30'][0].get('cvssData', {})
                cvss_score = str(cvss_data.get('baseScore', ''))
                severity = cvss_data.get('baseSeverity', 'Low').capitalize()
            elif 'cvssMetricV2' in metrics:
                cvss_data = metrics['cvssMetricV2'][0].get('cvssData', {})
                cvss_score = str(cvss_data.get('baseScore', ''))
                severity = metrics['cvssMetricV2'][0].get('baseSeverity', 'Low').capitalize()

            affected_products = []
            configurations = cve.get('configurations', [])
            for config in configurations:
                nodes = config.get('nodes', [])
                for node in nodes:
                    cpe_matches = node.get('cpeMatch', [])
                    for match in cpe_matches:
                        criteria = match.get('criteria')
                        if criteria: affected_products.append(criteria)

            if not affected_products:
                words = summary.split()
                hint = " ".join(words[:4]) if len(words) >= 4 else summary
                affected_products = [f"Likely: {hint}"]

            references = []
            refs = cve.get('references', [])
            for r in refs:
                if r.get('url'): references.append(r.get('url'))

            pub_date_str = cve.get('published')
            mod_date_str = cve.get('lastModified')
            pub_date = None
            mod_date = None
            
            try:
                if pub_date_str: pub_date = datetime.fromisoformat(pub_date_str.replace('Z', '+00:00'))
                if mod_date_str: mod_date = datetime.fromisoformat(mod_date_str.replace('Z', '+00:00'))
            except: pass

            return {
                "cve_id": cve_id,
                "description": summary,
                "cvss_score": cvss_score,
                "severity": severity,
                "affected_products": affected_products[:50],
                "references": references,
                "published_date": pub_date.isoformat() if pub_date else None,
                "last_modified_date": mod_date.isoformat() if mod_date else None,
                "raw_data": vuln
            }
        return None
    except Exception as e:
        print(f"[!] NVD Fetch Error: {e}")
        return None

def save_cve_to_db(db: Session, cve_data: dict):
    """
    Saves a CVE dictionary to the local database.
    """
    existing_cve = db.query(models.CVE).filter(models.CVE.cve_id == cve_data["cve_id"]).first()
    if existing_cve:
        return existing_cve

    pub_date = None
    mod_date = None
    if cve_data.get("published_date"):
        pub_date = datetime.fromisoformat(cve_data["published_date"])
    if cve_data.get("last_modified_date"):
        mod_date = datetime.fromisoformat(cve_data["last_modified_date"])

    new_cve = models.CVE(
        cve_id=cve_data["cve_id"],
        description=cve_data["description"],
        cvss_score=cve_data["cvss_score"],
        severity=cve_data["severity"],
        affected_products=cve_data["affected_products"],
        references=cve_data["references"],
        published_date=pub_date,
        last_modified_date=mod_date,
        pull_type="Manual CVE Pull",
        pull_params={"source": "manual_sync"},
        search_session_id=str(uuid.uuid4()),
        raw_data=cve_data.get("raw_data")
    )
    db.add(new_cve)
    db.commit()
    db.refresh(new_cve)
    
    # Process AI
    process_cve_ai(db, new_cve.id)
    
    return new_cve
