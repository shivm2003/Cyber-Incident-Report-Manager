import re
import requests
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
OLLAMA_API_URL = f"{OLLAMA_BASE_URL}/api/generate"
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'gemma4:e4b')

# ============================================================================
# CORE UTILITIES
# ============================================================================

def clean_html(text: str) -> str:
    if not text:
        return ""
    clean = re.compile('<.*?>')
    text = re.sub(clean, ' ', text)
    text = ' '.join(text.split())
    return text


def truncate_text(text: str, max_chars: int = 2000) -> str:
    if not text:
        return ""
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\n... [truncated]"


def _shorten_value(value, max_chars: int = 300):
    if isinstance(value, str):
        return truncate_text(clean_html(value), max_chars)
    if isinstance(value, (int, float, bool)):
        return value
    if isinstance(value, dict):
        shortened = {}
        for key, val in list(value.items())[:10]:
            shortened[key] = _shorten_value(val, max_chars=max_chars // 2)
        return shortened
    if isinstance(value, list):
        return [_shorten_value(item, max_chars=max_chars // 2) for item in value[:10]]
    return truncate_text(str(value), max_chars)


def summarize_raw_data(raw_data, max_chars: int = 2500) -> str:
    if not raw_data:
        return "No raw JSON data available."
    try:
        raw_json = json.dumps(raw_data, indent=2)
    except Exception:
        raw_json = str(raw_data)
    if len(raw_json) <= max_chars:
        return raw_json
    if isinstance(raw_data, dict):
        truncated = {}
        for key, value in raw_data.items():
            truncated[key] = _shorten_value(value, max_chars=max_chars // 4)
            if len(json.dumps(truncated, indent=2)) > max_chars:
                truncated[key] = "... [truncated]"
                break
        raw_json = json.dumps(truncated, indent=2)
    elif isinstance(raw_data, list):
        truncated = [_shorten_value(item, max_chars=max_chars // 4) for item in raw_data[:10]]
        raw_json = json.dumps(truncated, indent=2)
    if len(raw_json) > max_chars:
        raw_json = raw_json[:max_chars].rstrip() + "\n... [truncated]"
    return raw_json


# ============================================================================
# ROBUST JSON EXTRACTOR & OLLAMA CLIENT
# ============================================================================

def robust_json_extract(text: str):
    """
    Extract JSON from messy model output.
    Handles markdown fences, trailing commas, and nested structures.
    """
    if not text:
        return None
    text = text.strip()

    # Strip markdown fences
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    text = text.strip()

    # Direct parse attempt
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find outermost JSON object or array by brace counting
    def _find_boundary(char_open, char_close):
        start = text.find(char_open)
        if start == -1:
            return None
        count = 0
        in_string = False
        escape = False
        for i in range(start, len(text)):
            ch = text[i]
            if escape:
                escape = False
                continue
            if ch == '\\':
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if not in_string:
                if ch == char_open:
                    count += 1
                elif ch == char_close:
                    count -= 1
                    if count == 0:
                        return text[start:i+1]
        return None

    for opener, closer in [('{', '}'), ('[', ']')]:
        snippet = _find_boundary(opener, closer)
        if snippet:
            try:
                return json.loads(snippet)
            except json.JSONDecodeError:
                # Try aggressive repair: remove trailing commas before } or ]
                repaired = re.sub(r',(\s*[}\]])', r'\1', snippet)
                try:
                    return json.loads(repaired)
                except json.JSONDecodeError:
                    continue
    return None


def call_ollama(prompt: str, model: str = None, timeout: int = 120,
                format_json: bool = True, max_retries: int = 2) -> str:
    """
    Call Ollama with health checks, retries, and clear error strings.
    Returns response text, or a string starting with 'ERROR:' on failure.
    """
    model = model or OLLAMA_MODEL

    # Health check
    try:
        health = requests.get(f'{OLLAMA_BASE_URL}/api/tags', timeout=5)
        if health.status_code != 200:
            return f'ERROR: Ollama not reachable at {OLLAMA_BASE_URL} (status {health.status_code})'
        available = [m.get('name', '') for m in health.json().get('models', [])]
        if not any(model in a for a in available):
            return f'ERROR: Model {model} not found. Available: {available}'
    except Exception as e:
        return f'ERROR: Cannot connect to Ollama: {e}'

    payload = {
        'model': model,
        'prompt': prompt,
        'stream': False,
    }
    if format_json:
        payload['format'] = 'json'

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            response = requests.post(OLLAMA_API_URL, json=payload, timeout=timeout)
            if response.status_code == 200:
                return response.json().get('response', '').strip()
            last_error = f'HTTP {response.status_code}: {response.text[:200]}'
        except requests.exceptions.Timeout:
            last_error = f'Timeout after {timeout}s'
            timeout += 60  # Increase timeout for next retry
        except Exception as e:
            last_error = str(e)

        if attempt < max_retries:
            time.sleep(1)

    return f'ERROR: {last_error}'


# ============================================================================
# IMPROVED: classify_attack
# ============================================================================

def classify_attack(title: str, description: str) -> dict:
    text = f'{title} {description or ""}'.lower()

    attack_patterns = {
        "Ransomware": ["ransomware", "encrypt", "lockbit", "blackcat", "extortion", "ransom"],
        "Phishing": ["phishing", "credential", "spoof", "email scam", "smishing"],
        "DDoS": ["ddos", "denial of service", "botnet", "flood", "outage"],
        "Data Breach": ["leak", "exposed", "breach", "dumped", "database leaked", "unauthorized access"],
        "Supply Chain": ["supply chain", "vendor", "third party", "software update", "upstream"],
        "Malware": ["malware", "virus", "trojan", "spyware", "backdoor", "stealer"]
    }

    attack_type = 'Unknown'
    for type_name, keywords in attack_patterns.items():
        if any(kw in text for kw in keywords):
            attack_type = type_name
            break

    india_keywords = ['india', 'indian', 'mumbai', 'delhi', 'bengaluru', 'chennai', 'rbi', 'upi', 'cert-in', 'nciipc']
    country = 'India' if any(kw in text for kw in india_keywords) else 'Global'

    financial_keywords = ['bank', 'payment', 'fintech', 'stock market', 'insurance', 'atm', 'transaction', 'lending', 'credit card']
    is_financial = 1 if any(kw in text for kw in financial_keywords) else 0

    financial_sectors = {
        "Banking": ["bank", "rbi", "sbi", "hdfc", "icici", "axis", "kotak", "atm"],
        "Fintech": ["payment", "wallet", "upi", "paytm", "phonepe", "stripe", "razorpay"],
        "Stock Market": ["stock", "market", "sebi", "nse", "bse", "trading", "broker"],
        "Insurance": ["insurance", "policy", "claim", "lic"]
    }
    financial_sector = 'None'
    if is_financial:
        for sector, keywords in financial_sectors.items():
            if any(kw in text for kw in keywords):
                financial_sector = sector
                break

    target_entity = 'Unknown Institution'
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

    severity = 'Low'
    if any(kw in text for kw in ['critical', 'zero-day', 'exploit', 'rce', 'remote code execution', 'active exploitation']):
        severity = 'Critical'
    elif any(kw in text for kw in ['high', 'ransomware', 'major breach', 'government', 'military', 'critical infrastructure']):
        severity = 'High'
    elif any(kw in text for kw in ['medium', 'warning', 'vulnerability', 'risk', 'leak']):
        severity = 'Medium'

    threat_level = 'Information'
    if severity in ['Critical', 'High']:
        threat_level = 'Immediate'
    elif severity == 'Medium':
        threat_level = 'Warning'

    impact_summary = 'Reviewing technical impact of the detected activity.'
    if is_financial:
        impact_summary = f'Potential financial risk identified targeting {target_entity or "regional assets"}.'
    elif attack_type == 'Ransomware':
        impact_summary = 'Critical availability risk due to unauthorized data encryption.'
    elif attack_type == 'Data Breach':
        impact_summary = 'Confidentiality risk involving exposed sensitive data.'

    clean_desc = (description or '').strip()
    if clean_desc:
        sentences = re.split(r'(?<=[.!?]) +', clean_desc)
        heuristic_summary = ' '.join(sentences[:2])
    else:
        heuristic_summary = title

    # AI Enhancement (Professional Brief)
    ai_summary = ''
    safe_desc = clean_html(description or '')
    prompt = (
        f'Analyze this cyber incident:\n'
        f'Title: {title}\n'
        f'Details: {safe_desc}\n\n'
        f'Write a professional, 2-sentence "Executive Intelligence Brief" for a CISO. '
        f'Focus on facts, technical exposure, and immediate relevance. '
        f'Return ONLY the 2 sentences. No intro. No markdown.'
    )
    resp = call_ollama(prompt, timeout=120, format_json=False, max_retries=1)
    if not resp.startswith('ERROR:'):
        ai_summary = clean_html(resp)
    else:
        ai_summary = f'AI brief unavailable ({resp}). Using heuristic summary.'

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

# ============================================================================
# IMPROVED: analyze_deep_impact (template-filling approach)
# ============================================================================

def analyze_deep_impact(title: str, description: str, raw_data: dict = None, crawled_content: str = '') -> dict:
    """
    Forensic Deep-Dive using TEMPLATE FILLING — optimized for small local LLMs.
    If Gemma fails, returns a rich heuristic baseline instead of N/A.
    """
    # 1. Build heuristic baseline so we NEVER return empty N/A
    heuristic = classify_attack(title, description)

    raw_data_str = summarize_raw_data(raw_data, max_chars=1200)
    description_text = truncate_text(clean_html(description or ''), max_chars=600)
    crawled_content = truncate_text(clean_html(crawled_content), max_chars=1200)

    # 2. Pre-filled template (small models handle "editing" better than "creating")
    template = {
        "incident_title": title,
        "root_cause": f'Under investigation. Likely {heuristic["attack_type"]} vector.',
        "business_impact": f'Operational disruption possible. Severity: {heuristic["severity"]}.',
        "operational_impact": f'Systems may be compromised via {heuristic["attack_type"]}.',
        "financial_impact": f'Quantification pending. Sector: {heuristic["financial_sector"]}.',
        "reputational_impact": 'Brand trust impact under assessment.',
        "data_involved": 'Investigating data classifications affected.',
        "data_classification": 'Pending forensic review.',
        "attack_type": heuristic['attack_type'],
        "breach_method": 'Technical analysis in progress.',
        "breach_process": [
            'Initial intrusion vector detected.',
            'Lateral movement under investigation.',
            'Containment measures activated.'
        ],
        "affected_customers": 'Scope assessment ongoing.',
        "technical_analysis": f'Reviewing {heuristic["attack_type"]} indicators and vulnerability exploitation.',
        "official_report": heuristic['impact_summary']
    }
    template_json = json.dumps(template, indent=2)

    prompt = f"""You are a cybersecurity analyst. Fill in the JSON template below using the incident details.
STRICT RULES:
- Output ONLY valid JSON. No markdown. No explanations.
- Keep the exact keys. Only replace the placeholder values.
- Be concise: 1-2 sentences per field. Lists must remain JSON arrays.
- If unsure, keep the original placeholder value.

INCIDENT: {title}

DESCRIPTION:
{description_text}

RAW DATA:
{raw_data_str}

ADDITIONAL CONTEXT:
{crawled_content}

TEMPLATE TO FILL:
{template_json}

OUTPUT:"""

    response_text = call_ollama(prompt, timeout=180, format_json=True, max_retries=2)

    result = dict(template)  # Start with heuristic baseline
    result['_generation_error'] = None
    result['_debug_prompt'] = prompt

    if response_text.startswith('ERROR:'):
        result['_generation_error'] = response_text
        result['official_report'] = (
            f'Heuristic Report (AI unavailable): {heuristic["impact_summary"]} '
            f'| Target: {heuristic["target_entity"]} | Severity: {heuristic["severity"]}.'
        )
    else:
        parsed = robust_json_extract(response_text)
        if parsed and isinstance(parsed, dict):
            # Merge AI output over heuristic baseline (AI overrides)
            for k, v in parsed.items():
                if k in template:
                    result[k] = v
            result['_generation_error'] = None
        else:
            result['_generation_error'] = f'JSON parse failed. Raw: {response_text[:300]}'
            result['official_report'] = (
                f'Heuristic Report (AI parse failed): {heuristic["impact_summary"]} '
                f'| Target: {heuristic["target_entity"]} | Severity: {heuristic["severity"]}.'
            )

    def _stringify(val):
        if isinstance(val, (dict, list)):
            return json.dumps(val, indent=2)
        return str(val) if val is not None else 'N/A'

    return {
        "incident_title": _stringify(result.get('incident_title', title)),
        "root_cause": _stringify(result.get('root_cause', 'Analysis pending.')),
        "business_impact": _stringify(result.get('business_impact', 'Impact assessing.')),
        "operational_impact": _stringify(result.get('operational_impact', 'Impact assessing.')),
        "financial_impact": _stringify(result.get('financial_impact', 'Unknown.')),
        "reputational_impact": _stringify(result.get('reputational_impact', 'Unknown.')),
        "data_involved": _stringify(result.get('data_involved', 'Unknown data.')),
        "data_classification": _stringify(result.get('data_classification', 'Unclassified.')),
        "attack_type": _stringify(result.get('attack_type', 'Unknown.')),
        "breach_method": _stringify(result.get('breach_method', 'Unknown.')),
        "breach_process": _stringify(result.get('breach_process', 'Analysis pending forensic recovery.')),
        "affected_customers": _stringify(result.get('affected_customers', 'Quantification in progress.')),
        "technical_analysis": _stringify(result.get('technical_analysis', 'Reviewing technical vectors.')),
        "official_report": _stringify(result.get('official_report', 'Official report being drafted by the SOC team.')),
        "_debug_prompt": result['_debug_prompt'],
        "_debug_response": response_text,
        "_generation_error": result['_generation_error']
    }


# ============================================================================
# IMPROVED: analyze_mitre_ttp (template array + smaller prompt)
# ============================================================================

def analyze_mitre_ttp(title: str, description: str) -> list:
    prompt = f"""You are a CTI analyst. Map this incident to 1-3 MITRE ATT&CK techniques.
Output ONLY a JSON array. No markdown. No explanations.

Incident: {title}
Details: {clean_html(description or '')[:800]}

Template to fill:
[
  {{"tactic": "...", "technique_id": "...", "technique_name": "...", "confidence": 85, "analysis_justification": "..."}}
]

OUTPUT:"""

    resp = call_ollama(prompt, timeout=120, format_json=True, max_retries=2)
    if resp.startswith('ERROR:'):
        return []

    parsed = robust_json_extract(resp)
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        return [parsed]
    return []


# ============================================================================
# IMPROVED: analyze_full_incident (structured outline for 2B models)
# ============================================================================

def analyze_full_incident(title: str, description: str, raw_data: dict, crawled_content: str = '') -> str:
    raw_data_str = summarize_raw_data(raw_data, max_chars=1200)
    description_text = truncate_text(clean_html(description or ''), max_chars=800)
    crawled_content = truncate_text(clean_html(crawled_content), max_chars=1200)

    prompt = f"""You are a Senior Cyber Forensic Analyst. Write a detailed incident report.
Follow this exact outline. Write 2-4 sentences per section.

INCIDENT: {title}
DESCRIPTION: {description_text}
RAW DATA: {raw_data_str}
CONTEXT: {crawled_content}

OUTLINE:
1. EXECUTIVE SUMMARY: High-level overview.
2. TECHNICAL ANALYSIS: Attack vector and IOCs.
3. TTPs: Likely MITRE techniques and threat actor behavior.
4. DATA & ASSET IMPACT: Affected systems and data types.
5. STRATEGIC REMEDIATION: Immediate and long-term fixes.

Write in professional tone. Return ONLY the report text. No markdown headings if possible, use numbered sections.

REPORT:"""

    resp = call_ollama(prompt, timeout=180, format_json=False, max_retries=2)
    if not resp.startswith('ERROR:'):
        return resp

    # Fallback: return structured heuristic summary
    h = classify_attack(title, description)
    return (
        f'1. EXECUTIVE SUMMARY: Incident "{title}" classified as {h["attack_type"]} '
        f'with {h["severity"]} severity targeting {h["target_entity"]}.\n'
        f'2. TECHNICAL ANALYSIS: {h["impact_summary"]}\n'
        f'3. TTPs: Standard {h["attack_type"]} techniques suspected.\n'
        f'4. DATA & ASSET IMPACT: Financial sector involvement: {h["financial_sector"]}.\n'
        f'5. STRATEGIC REMEDIATION: Isolate affected systems, review logs, patch vulnerabilities.\n\n'
        f'[AI generation failed: {resp}]'
    )


# ============================================================================
# IMPROVED: analyze_cve (simpler prompt + fallback)
# ============================================================================

def analyze_cve(description: str) -> dict:
    prompt = f"""Extract structured info from this CVE. Output ONLY JSON. No markdown.

Format:
{{"company_name": "...", "product_name": "...", "vulnerability_type": "...", "summary": "...", "tags": ["..."]}}

CVE: {clean_html(description)[:1000]}

OUTPUT:"""

    resp = call_ollama(prompt, timeout=600, format_json=True, max_retries=1)
    if resp.startswith('ERROR:'):
        return None

    parsed = robust_json_extract(resp)
    if isinstance(parsed, dict) and 'company_name' in parsed:
        return parsed
    return None


# ============================================================================
# LEGACY / COMPATIBILITY WRAPPERS
# ============================================================================

def check_heuristic_match(title: str, description: str, affected_products: list, tech_stack: list) -> str:
    title_lower = title.lower()
    desc_lower = (description or '').lower()
    tech_names = []
    for t in tech_stack:
        if isinstance(t, dict) and 'name' in t:
            tech_names.append(t['name'])
        elif isinstance(t, str):
            tech_names.append(t)
    tech_stack_lower = [t.lower() for t in tech_names]
    products_lower = [p.lower() for p in (affected_products or [])]

    for tech in tech_stack_lower:
        if tech in title_lower:
            return tech
        for product in products_lower:
            if tech in product:
                return tech
    return None


def analyze_dynamic_impact(title: str, description: str, profile: dict, engine: str = 'all') -> dict:
    from version_engine import scan_threat_version_aware
    tech_stack = profile.get('tech_stack', [])
    industry = profile.get('industry', 'Technology')
    result = scan_threat_version_aware(
        title=title, description=description or '',
        affected_products=[], tech_stack=tech_stack, industry=industry
    )
    
    extracted = {}
    for m in result.get('matches', []):
        prod = m['product']
        t_v = m['threat_versions']
        if prod not in extracted:
            extracted[prod] = []
        if t_v not in extracted[prod]:
            extracted[prod].append(t_v)
            
    return {
        'status': result['status'],
        'score': result['score'],
        'reason': result['reason'],
        'method': result['method'],
        'extracted_versions': extracted,
        'heuristic_match_details': result.get('matches', []),
        'version_relevance': result['score'] if result['status'] == 'Yes' else 0
    }


def analyze_cve_impact(cve_id: str, description: str, affected_products: list, profile: dict, engine: str = 'all') -> dict:
    from version_engine import scan_threat_version_aware
    tech_stack = profile.get('tech_stack', [])
    industry = profile.get('industry', 'Technology')
    result = scan_threat_version_aware(
        title=f'CVE Vulnerability: {cve_id}', description=description or '',
        affected_products=affected_products or [], tech_stack=tech_stack, industry=industry
    )
    
    extracted = {}
    for m in result.get('matches', []):
        prod = m['product']
        t_v = m['threat_versions']
        if prod not in extracted:
            extracted[prod] = []
        if t_v not in extracted[prod]:
            extracted[prod].append(t_v)
            
    return {
        'status': result['status'],
        'score': result['score'],
        'reason': result['reason'],
        'method': result['method'],
        'extracted_versions': extracted,
        'heuristic_match_details': result.get('matches', []),
        'version_relevance': result['score'] if result['status'] == 'Yes' else 0
    }
