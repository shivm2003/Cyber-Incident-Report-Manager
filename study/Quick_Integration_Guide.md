# Impact Radar: Version-Aware Integration Guide

## Quick Start: Integration in 3 Steps

---

## STEP 1: Update Your Threat Data Model

### Current Schema (Problematic)
```python
threat_data = {
    "id": "CVE-2024-50379",
    "title": "Java RCE Vulnerability",
    "description": "Affects Java versions 8-21...",
    "affected_products": "Java 8-21",
    # Problem: No structured version extraction
}
```

### New Schema (Enhanced)
```python
threat_data = {
    # Existing fields
    "id": "CVE-2024-50379",
    "title": "Java RCE Vulnerability",
    "description": "Affects Java versions 8-21...",
    "affected_products": "Java 8-21",
    
    # NEW: Extracted version data
    "extracted_versions": {
        "Java": ["8-21"],  # Automatically extracted
        "React": [],
        "Windows": []
    },
    
    # NEW: Result fields
    "heuristic_result": {
        "status": "Yes",
        "score": 100,
        "detection_method": "Heuristic (Version-Aware)",
        "matches": [...]  # See below
    },
    
    "ai_result": {
        "status": "Yes",
        "score": 95,
        "detection_method": "AI Map (Version-Aware)",
        "version_analysis": {...}  # See below
    }
}
```

### SQL Schema Update

**Add these columns to your threats table:**

```sql
-- 1. Add extracted versions column
ALTER TABLE threats ADD COLUMN extracted_versions TEXT;
-- This stores JSON: {"Java": ["8-21"], "React": ["18.x"]}

-- 2. Add detailed match results
ALTER TABLE threats ADD COLUMN heuristic_match_details TEXT;
-- Stores detailed match information with version overlap data

ALTER TABLE threats ADD COLUMN version_relevance FLOAT DEFAULT 0;
-- Stores 0-100 relevance score for sorting

-- 3. Create index for faster searching
CREATE INDEX idx_version_relevance ON threats(version_relevance DESC);

-- 4. Update existing records
UPDATE threats 
SET version_relevance = 0 
WHERE heuristic_result = '{"status": "No"}';

UPDATE threats 
SET version_relevance = 100 
WHERE heuristic_result LIKE '%"status": "Yes"%';
```

---

## STEP 2: Modify Your Heuristic Engine

### Location: `threat_scanner.py` or `heuristic_engine.py`

### Current Code (Replace This)
```python
# OLD HEURISTIC ENGINE
def scan_threat_heuristic(threat_data, inventory):
    """Current problematic implementation."""
    
    threat_text = threat_data['title'] + ' ' + threat_data['description']
    
    for product in inventory:
        if product.lower() in threat_text.lower():
            # Found product match - but ignores versions!
            return {
                "status": "Yes",
                "score": 100,
                "detection_method": "Heuristic"
            }
    
    return {
        "status": "No",
        "score": 0,
        "detection_method": "Heuristic"
    }
```

### New Code (Use This Instead)
```python
# NEW: Version-Aware Heuristic Engine
from typing import Dict, List
import json
from packaging import version as pkg_version
import re

def scan_threat_heuristic_v2(threat_data: Dict, inventory: Dict[str, List[str]]) -> Dict:
    """
    Enhanced heuristic scan with version awareness.
    
    Args:
        threat_data: {"title": "...", "description": "...", "affected_products": "..."}
        inventory: {"Java": ["11.0.15", "17.0.2"], "React": ["18.0.2"], ...}
    
    Returns:
        {
            "status": "Yes/No",
            "score": 0-100,
            "detection_method": "Heuristic (Version-Aware)",
            "matches": [{
                "product": "Java",
                "inventory_versions": ["11.0.15"],
                "threat_versions": ["8-21"],
                "overlap": True,
                "overlap_percentage": 100
            }]
        }
    """
    
    # Combine all text
    combined_text = f"{threat_data.get('title', '')} {threat_data.get('description', '')} {threat_data.get('affected_products', '')}"
    
    matches = []
    
    # Check each product in inventory
    for product_name, inventory_versions in inventory.items():
        
        # Is this product mentioned in the threat?
        if product_name.lower() not in combined_text.lower():
            continue
        
        # Extract version info for this product from threat
        threat_versions = extract_product_versions(product_name, combined_text)
        
        if not threat_versions:
            # Product mentioned but no version info
            # Conservative: flag as affected
            matches.append({
                "product": product_name,
                "inventory_versions": inventory_versions,
                "threat_versions": ["unknown"],
                "overlap": True,
                "overlap_percentage": 100,
                "match_type": "product_mention_only"
            })
            continue
        
        # Check for version overlap
        overlap_versions = find_overlapping_versions(inventory_versions, threat_versions)
        
        if overlap_versions:
            overlap_pct = (len(overlap_versions) / len(inventory_versions)) * 100
            
            matches.append({
                "product": product_name,
                "inventory_versions": inventory_versions,
                "threat_versions": threat_versions,
                "overlapping_versions": overlap_versions,
                "overlap": True,
                "overlap_percentage": overlap_pct,
                "match_type": determine_match_type(threat_versions)
            })
    
    # Return result
    if matches:
        return {
            "status": "Yes",
            "score": 100,
            "detection_method": "Heuristic (Version-Aware)",
            "matches": matches,
            "reason": f"Version-aware match for: {', '.join([m['product'] for m in matches])}"
        }
    
    return {
        "status": "No",
        "score": 0,
        "detection_method": "Heuristic (Version-Aware)",
        "matches": [],
        "reason": "No product/version overlap"
    }


# Helper functions

def extract_product_versions(product_name: str, text: str) -> List[str]:
    """Extract version numbers mentioned for a specific product."""
    
    # Pattern to find "ProductName 8-21" or "ProductName versions 18.x"
    pattern = rf"{re.escape(product_name)}\s+(?:version|v\.?|ver\.?)?\s*([\d\.\-x\*,;>=<\s]+)"
    match = re.search(pattern, text, re.IGNORECASE)
    
    if not match:
        return []
    
    version_str = match.group(1).strip()
    
    # Parse different version formats
    versions = []
    
    # Range: "8-21"
    if re.search(r'\d+\s*-\s*\d+', version_str):
        versions.append(version_str)
    
    # Wildcard: "18.x", "2.*"
    elif re.search(r'\d+(?:\.\d+)*[\.x\*]', version_str):
        versions.append(version_str)
    
    # Operator: ">=11", "<20"
    elif re.search(r'(>=|<=|>|<)\s*\d+', version_str):
        versions.append(version_str)
    
    # Specific: "11.0.15"
    elif re.search(r'\d+(?:\.\d+)+', version_str):
        versions.extend(re.findall(r'\d+(?:\.\d+)+', version_str))
    
    return versions


def find_overlapping_versions(inventory_versions: List[str], threat_versions: List[str]) -> List[str]:
    """Find which inventory versions are affected by threat versions."""
    
    overlapping = []
    
    for inv_ver in inventory_versions:
        for threat_ver in threat_versions:
            if versions_overlap(inv_ver, threat_ver):
                overlapping.append(inv_ver)
                break
    
    return overlapping


def versions_overlap(inventory_version: str, threat_version: str) -> bool:
    """Check if an inventory version is affected by a threat version."""
    
    try:
        inv = pkg_version.parse(str(inventory_version).lower())
    except:
        # If parsing fails, assume affected (conservative)
        return True
    
    threat_version = threat_version.lower().strip()
    
    # Handle range: "8-21"
    range_match = re.match(r'(\d+(?:\.\d+)*)\s*-\s*(\d+(?:\.\d+)*)', threat_version)
    if range_match:
        try:
            start = pkg_version.parse(range_match.group(1))
            end = pkg_version.parse(range_match.group(2))
            return start <= inv <= end
        except:
            return True
    
    # Handle wildcard: "18.x", "2.*"
    wildcard_match = re.match(r'(\d+(?:\.\d+)*)[\.x\*]', threat_version)
    if wildcard_match:
        prefix = wildcard_match.group(1)
        return str(inv).startswith(prefix)
    
    # Handle operator: ">=11", "<20"
    op_match = re.match(r'(>=|<=|>|<)\s*(\d+(?:\.\d+)*)', threat_version)
    if op_match:
        try:
            op = op_match.group(1)
            threat_ver = pkg_version.parse(op_match.group(2))
            
            if op == ">=":
                return inv >= threat_ver
            elif op == "<=":
                return inv <= threat_ver
            elif op == ">":
                return inv > threat_ver
            elif op == "<":
                return inv < threat_ver
        except:
            return True
    
    # Handle specific: "11.0.15"
    try:
        threat_parsed = pkg_version.parse(threat_version)
        return inv == threat_parsed
    except:
        return True


def determine_match_type(threat_versions: List[str]) -> str:
    """Determine the type of version match."""
    
    for threat_ver in threat_versions:
        if re.match(r'\d+\s*-\s*\d+', threat_ver):
            return "range_overlap"
        elif re.search(r'\d+[\.x\*]', threat_ver):
            return "wildcard_overlap"
        elif re.search(r'(>=|<=|>|<)', threat_ver):
            return "operator_overlap"
    
    return "exact_match"
```

### Integration: Update Your Threat Processing Pipeline

**Old Pipeline:**
```python
# threats_processor.py (current)

threat_data = fetch_threat()
heuristic_result = scan_threat_heuristic(threat_data, inventory)

if heuristic_result["status"] == "No":
    ai_result = invoke_gemma(threat_data, inventory)
    
store_in_database(threat_data, heuristic_result, ai_result)
```

**New Pipeline:**
```python
# threats_processor.py (updated)

threat_data = fetch_threat()

# STEP 1: Run enhanced heuristic
heuristic_result = scan_threat_heuristic_v2(threat_data, inventory)

# STEP 2: Extract and store version data
threat_data["extracted_versions"] = {
    product: match["threat_versions"]
    for product, match in 
    [(m["product"], m) for m in heuristic_result.get("matches", [])]
}

# STEP 3: Only run AI if heuristic doesn't match
if heuristic_result["status"] == "No":
    ai_result = invoke_gemma_v2(threat_data, inventory, company_industry)
else:
    ai_result = None  # Skip AI if heuristic already matched

# STEP 4: Store with version data
threat_data["heuristic_result"] = heuristic_result
threat_data["ai_result"] = ai_result

# STEP 5: Calculate version relevance for searching
version_relevance = calculate_version_relevance(threat_data, inventory)
threat_data["version_relevance"] = version_relevance

store_in_database(threat_data)
```

---

## STEP 3: Update Your Database Queries

### Old Search Query (Doesn't Rank by Version)
```sql
-- Current search in Threat Command Feed
SELECT * FROM threats 
WHERE title ILIKE %Java% OR description ILIKE %Java%
LIMIT 50;
```

### New Search Query (Version-Ranked)
```sql
-- Enhanced search with version ranking
SELECT 
    id,
    title,
    description,
    severity,
    version_relevance,
    heuristic_result,
    ROW_NUMBER() OVER (ORDER BY version_relevance DESC) as rank
FROM threats 
WHERE (title ILIKE %Java% OR description ILIKE %Java%)
      AND version_relevance > 0  -- Only show version-relevant results
ORDER BY version_relevance DESC, severity DESC
LIMIT 50;
```

### Pagination Update
```python
# Backend API endpoint (Flask/FastAPI example)

@app.get("/api/threats/search")
def search_threats(
    query: str,
    page: int = 1,
    limit: int = 50
):
    """Search threats with version ranking."""
    
    # Execute search
    cursor.execute("""
        WITH ranked_threats AS (
            SELECT 
                id, title, description, severity, 
                version_relevance,
                ROW_NUMBER() OVER (
                    ORDER BY version_relevance DESC
                ) as rank,
                COUNT(*) OVER () as total_count
            FROM threats
            WHERE (title ILIKE %s OR description ILIKE %s)
                  AND version_relevance > 0
        )
        SELECT * FROM ranked_threats
        WHERE rank BETWEEN %s AND %s
    """, (
        f"%{query}%",
        f"%{query}%",
        (page - 1) * limit + 1,
        page * limit
    ))
    
    results = cursor.fetchall()
    
    # Return with pagination info
    return {
        "results": results,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": results[0]['total_count'] if results else 0,
            "total_pages": (results[0]['total_count'] + limit - 1) // limit if results else 0
        }
    }
```

---

## STEP 4: Update Gemma AI Prompt (Optional but Recommended)

### Current Gemma Prompt
```python
GEMMA_PROMPT = """
You are a Senior Cyber Threat Analyst.
Analyze this threat and determine if it affects our organization.
Threat: {threat_description}
Company Industry: {company_industry}
Tech Stack: {inventory}

Respond with JSON: {"status": "Yes/No", "score": 0-100, "reason": "..."}
"""
```

### Enhanced Gemma Prompt (Version-Aware)
```python
GEMMA_PROMPT_V2 = """
You are a Senior Cyber Threat Analyst specializing in version-aware threat assessment.

CRITICAL: You must extract and compare version information.

THREAT DATA:
Title: {threat_title}
Description: {threat_description}
Affected Products: {threat_affected_products}

COMPANY INFORMATION:
Name: {company_name}
Industry: {company_industry}
Tech Stack (with versions):
{inventory_json}

YOUR TASK:
1. Extract EXACT version numbers/ranges mentioned in the threat
   Example: "Java 8-21", "React 18.x", "Windows 10/11"

2. For EACH technology in our tech stack:
   - Check if threat mentions it
   - Extract affected version ranges
   - Determine if OUR versions overlap

3. Version Overlap Rules:
   - Exact: inventory="11.0.15", threat="11.0.15" → MATCH (100% risk)
   - Range: inventory="11.0.15", threat="8-21" → MATCH (95% risk)
   - Wildcard: inventory="18.0.2", threat="18.x" → MATCH (95% risk)
   - Operator: inventory="11.0.15", threat=">=11" → MATCH (95% risk)
   - No Match: inventory="22.0", threat="8-21" → NO MATCH (0% risk)

4. Financial Industry Special Rule:
   If company_industry == "Finance":
   - Aggressively flag Banking Trojans/Ransomware/Data Exfiltration
   - Even if exact versions don't match, flag with reasoning
   - Example: "We use Java, and this Banking Trojan targets enterprises"

RESPOND WITH ONLY THIS JSON (no markdown, no extra text):
{{
    "status": "Yes",
    "score": 85,
    "reason": "Short explanation",
    "method": "AI Map (Version-Aware)",
    "version_analysis": {{
        "extracted_threat_versions": {{
            "Java": ["8-21"],
            "React": []
        }},
        "our_versions": {{
            "Java": ["11.0.15", "17.0.2"],
            "React": ["18.0.2"]
        }},
        "matches": {{
            "Java": {{
                "overlaps": true,
                "threat_version": "8-21",
                "our_versions": ["11.0.15", "17.0.2"],
                "risk_percentage": 95
            }},
            "React": {{
                "overlaps": false,
                "reason": "Threat does not mention React"
            }}
        }}
    }}
}}
"""

def invoke_gemma_v2(threat_data, inventory, company_industry):
    """Call Gemma with enhanced version-aware prompt."""
    
    inventory_json = json.dumps(inventory, indent=2)
    
    prompt = GEMMA_PROMPT_V2.format(
        threat_title=threat_data.get('title', ''),
        threat_description=threat_data.get('description', ''),
        threat_affected_products=threat_data.get('affected_products', ''),
        company_name=threat_data.get('company_name', 'Unknown'),
        company_industry=company_industry,
        inventory_json=inventory_json
    )
    
    # Call Gemma API
    response = gemma_client.generate(
        prompt=prompt,
        max_tokens=1000,
        temperature=0.2
    )
    
    # Parse JSON response
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        # Fallback
        return {
            "status": "Unknown",
            "score": 50,
            "reason": "Failed to parse AI response"
        }
```

---

## STEP 5: Test Your Changes

### Test Case 1: Range Match
```python
threat = {
    "title": "Critical Java RCE",
    "description": "Affects Java 8-21",
    "affected_products": "Java"
}
inventory = {"Java": ["11.0.15"]}

result = scan_threat_heuristic_v2(threat, inventory)
assert result["status"] == "Yes"
assert result["matches"][0]["overlap_percentage"] == 100
```

### Test Case 2: Wildcard Match
```python
threat = {
    "title": "React XSS",
    "description": "React 18.x versions vulnerable",
    "affected_products": "React"
}
inventory = {"React": ["18.0.2"]}

result = scan_threat_heuristic_v2(threat, inventory)
assert result["status"] == "Yes"
assert result["matches"][0]["match_type"] == "wildcard_overlap"
```

### Test Case 3: No Match
```python
threat = {
    "title": "Java RCE",
    "description": "Affects Java 22+",
    "affected_products": "Java"
}
inventory = {"Java": ["11.0.15"]}

result = scan_threat_heuristic_v2(threat, inventory)
assert result["status"] == "No"
```

---

## SUMMARY: What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **Version Matching** | Exact string only ("Java") | Range/wildcard/operator ("8-21", "18.x", ">=11") |
| **Heuristic Scope** | Product name only | Product + version overlap |
| **Search Results** | Alphabetical order | Ranked by version relevance |
| **Data Extraction** | Manual/missing | Automatic from threat text |
| **AI Prompt** | Generic threat analysis | Version-aware with explicit extraction |
| **Confidence** | Single score | Per-product version analysis |

---

## Quick Checklist

- [ ] Update database schema with new columns
- [ ] Implement `scan_threat_heuristic_v2()` function
- [ ] Add helper functions (extract_product_versions, versions_overlap, etc.)
- [ ] Update threat processing pipeline
- [ ] Modify search queries to include version_relevance
- [ ] (Optional) Update Gemma prompt
- [ ] Run test cases
- [ ] Deploy and monitor results
- [ ] Collect feedback from Manual Review for tuning
