import re
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
OLLAMA_API_URL = f"{OLLAMA_BASE_URL}/api/generate"

def clean_html(text: str) -> str:
    """Utility to strip HTML tags and clean whitespace."""
    if not text:
        return ""
    # Basic regex to strip tags (lightweight, no bs4 dependency needed here)
    clean = re.compile('<.*?>')
    text = re.sub(clean, ' ', text)
    # Clean up whitespace
    text = ' '.join(text.split())
    return text

def classify_attack(title: str, description: str) -> dict:
    """
    Hybrid Intelligence Engine:
    - Heuristics: Instant metadata extraction (Attack Type, Country, Bank Name).
    - Report AI: Professional summarization (Executive Brief).
    """
    text = f"{title} {description or ''}".lower()
    
    # 1. Attack Type Classification
    attack_patterns = {
        "Ransomware": ["ransomware", "encrypt", "lockbit", "blackcat", "extortion", "ransom"],
        "Phishing": ["phishing", "credential", "spoof", "email scam", "smishing"],
        "DDoS": ["ddos", "denial of service", "botnet", "flood", "outage"],
        "Data Breach": ["leak", "exposed", "breach", "dumped", "database leaked", "unauthorized access"],
        "Supply Chain": ["supply chain", "vendor", "third party", "software update", "upstream"],
        "Malware": ["malware", "virus", "trojan", "spyware", "backdoor", "stealer"]
    }
    
    attack_type = "Unknown"
    for type_name, keywords in attack_patterns.items():
        if any(kw in text for kw in keywords):
            attack_type = type_name
            break

    # 2. Country Detection
    india_keywords = ["india", "indian", "mumbai", "delhi", "bengaluru", "chennai", "rbi", "upi", "cert-in", "nciipc"]
    country = "India" if any(kw in text for kw in india_keywords) else "Global"

    # 3. Financial Intelligence
    financial_keywords = ["bank", "payment", "fintech", "stock market", "insurance", "atm", "transaction", "lending", "credit card"]
    is_financial = 1 if any(kw in text for kw in financial_keywords) else 0
    
    financial_sectors = {
        "Banking": ["bank", "rbi", "sbi", "hdfc", "icici", "axis", "kotak", "atm"],
        "Fintech": ["payment", "wallet", "upi", "paytm", "phonepe", "stripe", "razorpay"],
        "Stock Market": ["stock", "market", "sebi", "nse", "bse", "trading", "broker"],
        "Insurance": ["insurance", "policy", "claim", "lic"]
    }
    
    financial_sector = "None"
    if is_financial:
        for sector, keywords in financial_sectors.items():
            if any(kw in text for kw in keywords):
                financial_sector = sector
                break
    
    # 4. Target Entity (Banking Name) Extraction
    target_entity = "Unknown Institution"
    banks = [
        "RBI", "SBI", "PNB", "Bank of Baroda", "Canara Bank", "Union Bank", "Indian Bank",
        "Bank of India", "Central Bank of India", "Indian Overseas Bank",
        "UCO Bank", "Bank of Maharashtra", "Punjab & Sind Bank",
        "HDFC", "ICICI", "Axis Bank", "Kotak Mahindra", "IndusInd Bank",
        "Yes Bank", "IDFC FIRST Bank", "Bandhan Bank",
        "AU Small Finance Bank", "Ujjivan Small Finance Bank",
        "Equitas Small Finance Bank", "ESAF Small Finance Bank",
        "Jana Small Finance Bank", "Suryoday Small Finance Bank",
        "Utkarsh Small Finance Bank", "North East Small Finance Bank",
        "Paytm Payments Bank", "Airtel Payments Bank",
        "India Post Payments Bank", "Fino Payments Bank",
        "Paytm", "PhonePe", "MobiKwik", "Razorpay", "BharatPe",
        "Google Pay", "Amazon Pay", "CRED", "Pine Labs",
        "Bajaj Finance", "Tata Capital", "Aditya Birla Finance",
        "Mahindra Finance", "Shriram Finance", "Muthoot Finance",
        "LIC Housing Finance", "HDB Financial Services",
        "L&T Finance", "Cholamandalam Finance",
        "HDFC Ltd", "PNB Housing Finance", "Aavas Financiers",
        "Indiabulls Housing Finance",
        "Citibank", "HSBC", "Standard Chartered", "JPMorgan",
        "Goldman Sachs", "Deutsche Bank", "Barclays", "BNP Paribas"
    ]
    for bank in banks:
        if bank.lower() in text:
            target_entity = bank
            break
            
    # 5. Severity Scoring
    severity = "Low"
    critical_keywords = ["critical", "zero-day", "exploit", "rce", "remote code execution", "active exploitation"]
    high_keywords = ["high", "ransomware", "major breach", "government", "military", "critical infrastructure"]
    medium_keywords = ["medium", "warning", "vulnerability", "risk", "leak"]
    
    if any(kw in text for kw in critical_keywords):
        severity = "Critical"
    elif any(kw in text for kw in high_keywords):
        severity = "High"
    elif any(kw in text for kw in medium_keywords):
        severity = "Medium"

    # 6. Threat Level
    threat_level = "Information"
    if severity in ["Critical", "High"]:
        threat_level = "Immediate"
    elif severity == "Medium":
        threat_level = "Warning"

    # 7. Impact Summary Generation
    impact_summary = "Reviewing technical impact of the detected activity."
    if is_financial:
        impact_summary = f"Potential financial risk identified targeting {target_entity or 'regional assets'}."
    elif attack_type == "Ransomware":
        impact_summary = "Critical availability risk due to unauthorized data encryption."
    elif attack_type == "Data Breach":
        impact_summary = "Confidentiality risk involving exposed sensitive data."

    # 8. Description Preparation (Standard Heuristic)
    clean_desc = (description or "").strip()
    if clean_desc:
        sentences = re.split(r'(?<=[.!?]) +', clean_desc)
        heuristic_summary = " ".join(sentences[:2])
    else:
        heuristic_summary = title

    # 9. Report AI Enhancement (Professional Brief)
    ai_summary = ""
    try:
        # Clean input before sending to AI
        safe_desc = clean_html(description or "")
        
        prompt = f"""
        Analyze this cyber incident:
        Title: {title}
        Raw Text: {safe_desc}
        
        Write a professional, 2-sentence "Executive Intelligence Brief" for a CISO. 
        Focus on facts, technical exposure, and immediate relevance.
        
        Return ONLY the 2 sentences. No intro. No markdown.
        """
        response = requests.post(OLLAMA_API_URL, json={
            'model': 'gemma:2b',
            'prompt': prompt,
            'stream': False
        }, timeout=300)
        
        if response.status_code == 200:
            ai_summary = clean_html(response.json().get('response', '').strip())
    except requests.exceptions.Timeout:
        ai_summary = "AI Summarization timed out. Falling back to heuristic brief."
    except Exception:
        ai_summary = "AI Summarization unavailable. Falling back to heuristic brief."

    return {
        "description": heuristic_summary,
        "ai_summary": ai_summary,
        "attack_type": attack_type,
        "country": country,
        "is_financial": is_financial,
        "financial_sector": financial_sector,
        "target_entity": target_entity,
        "severity": severity,
        "threat_level": threat_level,
        "impact_summary": impact_summary
    }

def analyze_deep_impact(title: str, description: str, raw_data: dict = None, crawled_content: str = "") -> dict:
    """
    Forensic Deep-Dive Analysis:
    Uses Report AI to generate a professional breach timeline and CSO report.
    """
    import json
    raw_data_str = json.dumps(raw_data, indent=2) if raw_data else "No raw JSON data available."
    
    # Clean content to reduce token count and noise
    crawled_content = clean_html(crawled_content)
    
    prompt = f"""
    You are a Senior Cyber Security Officer (CSO) analyzing a security incident.
    Incident: {title}
    
    RAW DATA (JSON) & CONTEXT:
    {raw_data_str}
    {clean_html(description)}

    TASK:
    Provide a forensic deep-dive in JSON format with exactly these 14 keys:
    1. "incident_title": A formal, concise title for the incident.
    2. "root_cause": The primary vulnerability or failure that caused this.
    3. "business_impact": How this affects business continuity and operations.
    4. "operational_impact": Technical disruption to systems and services.
    5. "financial_impact": Estimated financial losses or costs.
    6. "reputational_impact": Potential damage to brand trust.
    7. "data_involved": Types of data exposed or compromised.
    8. "data_classification": The classification level of the data (e.g., PII, Financial).
    9. "attack_type": The category of attack (e.g., Ransomware, Phishing).
    10. "breach_method": The specific vector or technique used.
    11. "breach_process": A 3-step technical timeline of how the breach likely occurred.
    12. "affected_customers": An estimation of who and what volume of customers/entities are impacted.
    13. "technical_analysis": A paragraph explaining the vulnerability exploited.
    14. "official_report": An authoritative professional Cyber Security Report for stakeholders.

    Return ONLY the JSON. No markdown. No intro.
    """
    
    try:
        response = requests.post(OLLAMA_API_URL, json={
            'model': 'gemma:2b',
            'prompt': prompt,
            'stream': False,
            'format': 'json'
        }, timeout=600) # Increased timeout to 600s (10 min) because deep analysis takes a long time
        
        if response.status_code == 200:
            raw_response = response.json().get('response', '{}').strip()
            # Handle potential markdown wrapping from Gemma
            if raw_response.startswith('```json'):
                raw_response = raw_response[7:]
            if raw_response.startswith('```'):
                raw_response = raw_response[3:]
            if raw_response.endswith('```'):
                raw_response = raw_response[:-3]
            
            data = json.loads(raw_response.strip())
            
            def _stringify(val):
                if isinstance(val, (dict, list)):
                    import json
                    return json.dumps(val, indent=2)
                return str(val) if val is not None else "N/A"
                
            return {
                "incident_title": _stringify(data.get("incident_title", "Unknown Title")),
                "root_cause": _stringify(data.get("root_cause", "Analysis pending.")),
                "business_impact": _stringify(data.get("business_impact", "Impact assessing.")),
                "operational_impact": _stringify(data.get("operational_impact", "Impact assessing.")),
                "financial_impact": _stringify(data.get("financial_impact", "Unknown.")),
                "reputational_impact": _stringify(data.get("reputational_impact", "Unknown.")),
                "data_involved": _stringify(data.get("data_involved", "Unknown data.")),
                "data_classification": _stringify(data.get("data_classification", "Unclassified.")),
                "attack_type": _stringify(data.get("attack_type", "Unknown.")),
                "breach_method": _stringify(data.get("breach_method", "Unknown.")),
                "breach_process": _stringify(data.get("breach_process", "Analysis pending forensic recovery.")),
                "affected_customers": _stringify(data.get("affected_customers", "Quantification in progress.")),
                "technical_analysis": _stringify(data.get("technical_analysis", "Reviewing technical vectors.")),
                "official_report": _stringify(data.get("official_report", "Official report being drafted by the SOC team.")),
                "_debug_prompt": prompt
            }
    except requests.exceptions.Timeout:
        print(f"Analysis Timeout: Ollama took longer than 600 seconds for Deep-Dive")
        return {
            "incident_title": title,
            "root_cause": "N/A",
            "business_impact": "N/A",
            "operational_impact": "N/A",
            "financial_impact": "N/A",
            "reputational_impact": "N/A",
            "data_involved": "N/A",
            "data_classification": "N/A",
            "attack_type": "N/A",
            "breach_method": "N/A",
            "breach_process": "Analysis timed out. Please retry or check Ollama performance.",
            "affected_customers": "N/A",
            "technical_analysis": "N/A",
            "official_report": "Forensic analysis timed out after 10 minutes. This usually happens when the local model is under heavy load or the input context is too large.",
            "_debug_prompt": prompt
        }
    except Exception as e:
        print(f"Analysis Error: {e}")
    
    return {
        "incident_title": title,
        "root_cause": "N/A",
        "business_impact": "N/A",
        "operational_impact": "N/A",
        "financial_impact": "N/A",
        "reputational_impact": "N/A",
        "data_involved": "N/A",
        "data_classification": "N/A",
        "attack_type": "N/A",
        "breach_method": "N/A",
        "breach_process": "Analysis timed out. Please retry or check Ollama performance.",
        "affected_customers": "Impacted entities unknown.",
        "technical_analysis": "Technical analysis unavailable.",
        "official_report": "Forensic analysis timed out after 10 minutes. This usually happens when the local model is under heavy load or the input context is too large."
    }

def check_heuristic_match(title: str, description: str, affected_products: list, tech_stack: list) -> str:
    """
    Deterministic Header Match Engine:
    Checks for exact string matches between inventory keywords and threat headers.
    """
    title_lower = title.lower()
    desc_lower = (description or "").lower()
    
    # Handle both string and dict formats for tech_stack
    tech_names = []
    for t in tech_stack:
        if isinstance(t, dict) and 'name' in t:
            tech_names.append(t['name'])
        elif isinstance(t, str):
            tech_names.append(t)
            
    tech_stack_lower = [t.lower() for t in tech_names]
    products_lower = [p.lower() for p in (affected_products or [])]
    
    for tech in tech_stack_lower:
        # 1. Exact Match in Title/Header
        if tech in title_lower:
            return tech
        # 2. Exact Match in Affected Products (for CVEs)
        for product in products_lower:
            if tech in product:
                return tech
        # 3. Description check (optional, but keep it strict for 'Header' part as per user request)
        # We only check title/products for "Heuristic Header Match"
                
    return None

def analyze_dynamic_impact(title: str, description: str, profile: dict, engine: str = 'all') -> dict:
    """
    Dynamic Intelligence Engine v3.0:
    Calculates threat proximity for a specific company profile.
    """
    company_name = profile.get("company_name", "My Company")
    tech_stack = profile.get("tech_stack", [])
    industry = profile.get("industry", "Technology")
    
    tech_stack_formatted = []
    for t in tech_stack:
        if isinstance(t, dict):
            name = t.get('name', '')
            version = t.get('version')
            tech_stack_formatted.append(f"{name} (v{version})" if version else name)
        else:
            tech_stack_formatted.append(str(t))
            
    tech_stack_str = ", ".join(tech_stack_formatted)

    # 1. HURISTIC PART: Header Match
    if engine in ['all', 'heuristic']:
        h_match = check_heuristic_match(title, description, [], tech_stack)
        if h_match:
            return {
                "status": "Yes",
                "score": 100,
                "reason": f"Heuristic Match: Exact technical asset '{h_match}' detected in incident header.",
                "method": "Heuristic"
            }
        
        if engine == 'heuristic':
            return {
                "status": "No",
                "score": 0,
                "reason": "Deterministic scan found no exact matches in the asset inventory.",
                "method": "Heuristic"
            }

    # 2. AI PART: Gemma Map
    # Heuristic optimization: If description has direct matches, we boost the prompt
    matched_tech = [t for t in tech_stack_formatted if t.lower() in (description or "").lower()]
    
    prompt = f"""
    You are a Senior Cyber Threat Intelligence Analyst for '{company_name}'.
    Your company operates in the '{industry}' industry.
    Your technology stack includes: {tech_stack_str}.
    
    TASK:
    Analyze the following incident and determine its threat proximity to your organization.
    
    Incident Title: {title}
    Incident Details: {description}
    
    Direct Tech Matches Found: {", ".join(matched_tech) if matched_tech else "None detected in text"}

    CRITICAL CONTEXTUAL DIRECTIVE:
    If your industry is 'Finance' or your company is a financial institution, you must aggressively flag threats known to target the financial sector (e.g., Banking Trojans, specific Ransomware strains, Swift network vulnerabilities, data exfiltration), even if your exact tech stack is not explicitly mentioned.
    If you identify a threat impacting the financial institution, you MUST include the exact phrase "[FINANCIAL INSTITUTION IMPACT]" at the beginning of your reason.

    CRITICAL: You must return a JSON object with exactly these three keys:
    1. "status": Must be "Yes" or "No" (Is it a credible threat to your specific stack or industry?)
    2. "score": A number from 0 to 100 representing proximity (100 = direct hit on your stack/industry, 0 = no relevance).
    3. "reason": A 1-2 sentence explanation of the risk vector.
    
    Return ONLY the JSON. No markdown.
    """
    
    try:
        ollama_url = f"{os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')}/api/generate"
        response = requests.post(ollama_url, json={
            'model': 'gemma:2b',
            'prompt': prompt,
            'stream': False,
            'format': 'json'
        }, timeout=300)
        
        if response.status_code == 200:
            raw_response = response.json().get('response', '{}').strip()
            # Clean possible markdown
            if raw_response.startswith('```json'): raw_response = raw_response[7:]
            if raw_response.startswith('```'): raw_response = raw_response[3:]
            if raw_response.endswith('```'): raw_response = raw_response[:-3]
            
            data = json.loads(raw_response.strip())
            return {
                "status": data.get("status", "No"),
                "score": int(data.get("score", 0)),
                "reason": data.get("reason", "Analysis complete."),
                "method": "AI Map"
            }
    except Exception as e:
        print(f"Dynamic Analysis Error: {e}")
        
    return {
        "status": "No",
        "score": 0,
        "reason": "Analysis failed or timed out.",
        "method": "AI Map"
    }

def analyze_cve_impact(cve_id: str, description: str, affected_products: list, profile: dict, engine: str = 'all') -> dict:
    """
    Analyzes a CVE record for proximity to the company stack using Dual-Engine logic.
    """
    tech_stack = profile.get("tech_stack", [])
    
    # 1. HURISTIC PART: Header Match
    if engine in ['all', 'heuristic']:
        h_match = check_heuristic_match(f"CVE Vulnerability: {cve_id}", description, affected_products, tech_stack)
        if h_match:
            return {
                "status": "Yes",
                "score": 100,
                "reason": f"Heuristic Match: Exact technical asset '{h_match}' detected in NVD headers.",
                "method": "Heuristic"
            }
            
        if engine == 'heuristic':
            return {
                "status": "No",
                "score": 0,
                "reason": "Deterministic scan found no exact matches in the asset inventory.",
                "method": "Heuristic"
            }
        
    # 2. AI PART: Gemma Map
    # Passes all headers and context for deep scoring
    return analyze_dynamic_impact(f"CVE Vulnerability: {cve_id}", f"Affected: {affected_products}. {description}", profile, engine='ai')

def analyze_mitre_ttp(title: str, description: str) -> list:
    """
    Report AI: MITRE ATT&CK Mapping Engine.
    Maps an incident to specific MITRE tactics and techniques.
    """
    prompt = f"""
    You are a Cyber Threat Intelligence (CTI) analyst specialized in the MITRE ATT&CK framework.
    Analyze the following incident and extract 1-3 most relevant MITRE techniques.
    
    Incident: {title}
    Details: {description}
    
    CRITICAL: You must return a valid JSON array of objects.
    Each object MUST have exactly these 5 keys:
    1. "tactic": The MITRE Tactic (e.g., Initial Access, Execution, Persistence, Command and Control)
    2. "technique_id": The Technique ID (e.g., T1566, T1059, T1190)
    3. "technique_name": The official Technique Name
    4. "confidence": A number from 0 to 100
    5. "analysis_justification": 1-sentence reasoning.

    Example Output Format:
    [
      {{"tactic": "Initial Access", "technique_id": "T1566", "technique_name": "Phishing", "confidence": 90, "analysis_justification": "Incident involves credential harvesting via deceptive emails."}}
    ]

    Return ONLY the JSON array. Do not include any explanation or markdown.
    """
    
    try:
        response = requests.post(OLLAMA_API_URL, json={
            'model': 'gemma:2b',
            'prompt': prompt,
            'stream': False,
            'format': 'json'
        }, timeout=600) # Increased to 600s (10 min)
        
        if response.status_code == 200:
            raw_response = response.json().get('response', '[]').strip()
            # Handle markdown
            if raw_response.startswith('```json'):
                raw_response = raw_response[7:]
            if raw_response.startswith('```'):
                raw_response = raw_response[3:]
            if raw_response.endswith('```'):
                raw_response = raw_response[:-3]
                
            data = json.loads(raw_response.strip())
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return [data]
    except Exception as e:
        print(f"MITRE Analysis Error: {e}")
        
    return []

def analyze_full_incident(title: str, description: str, raw_data: dict, crawled_content: str = "") -> str:
    """
    Report AI: Generates a 500+ word detailed forensic analysis of the incident.
    """
    prompt = f"""
    You are a Senior Cyber Forensic Analyst. Analyze the following cyber incident in extreme detail.
    
    Incident Title: {title}
    
    CONTEXT DATA:
    {json.dumps(raw_data, indent=1)}
    {crawled_content}
    
    TASK:
    Write a comprehensive forensic analysis report (minimum 500 words). 
    The report MUST cover:
    1. EXECUTIVE SUMMARY: High-level overview of the incident.
    2. TECHNICAL ANALYSIS: Deep dive into the vulnerability, attack vector, and indicators of compromise (IOCs).
    3. TACTICS, TECHNIQUES & PROCEDURES (TTPs): Mapping to MITRE ATT&CK and likely threat actor behavior.
    4. DATA & ASSET IMPACT: Detailed assessment of affected systems and data classifications.
    5. STRATEGIC REMEDIATION: Immediate, short-term, and long-term security recommendations.
    
    Write in a professional, authoritative tone suitable for a CISO/CTO briefing.
    Base your detailed analysis primarily on the CONTEXT DATA.
    
    Return ONLY the text of the report.
    """
    
    try:
        # Clean inputs
        crawled_content = clean_html(crawled_content)
        
        response = requests.post(OLLAMA_API_URL, json={
            'model': 'gemma:2b',
            'prompt': prompt,
            'stream': False
        }, timeout=900) # Increased to 900s (15 min) for 500-word report
        
        if response.status_code == 200:
            return response.json().get('response', '').strip()
    except Exception as e:
        print(f"Full Analysis Error: {e}")
        
    return "Forensic analysis timed out after 10 minutes. This usually happens when the local model is under heavy load or the input context is too large."
def analyze_cve(description: str) -> dict:
    """
    Uses Gemma to extract structured security intelligence from a CVE description.
    """
    prompt = f"""
    You are a cybersecurity AI parser.
    Extract structured information from this CVE description.
    
    Return ONLY valid JSON. No markdown. No intro.
    
    Format:
    {{
      "company_name": "Extracted Vendor Name",
      "product_name": "Extracted Product Name",
      "vulnerability_type": "e.g., RCE, SQLi, XSS",
      "summary": "1-sentence technical summary",
      "tags": ["Tag1", "Tag2"]
    }}
    
    CVE Description:
    {description}
    """
    
    try:
        # Check Ollama
        try:
            requests.get(f'{OLLAMA_BASE_URL}/api/tags', timeout=5)
        except:
            return None

        response = requests.post(OLLAMA_API_URL, json={
            'model': 'gemma:2b',
            'prompt': prompt,
            'stream': False,
            'format': 'json'
        }, timeout=300)
        
        if response.status_code == 200:
            data_str = response.json().get('response', '').strip()
            data = json.loads(data_str)
            return data
    except Exception as e:
        print(f"CVE AI Extraction Error: {e}")
    return None
