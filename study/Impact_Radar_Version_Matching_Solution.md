# Impact Radar System: Version-Aware Threat Matching Solution

## Executive Summary

The current Impact Radar system struggles with version-specific threat matching because:
1. **Inventory stores versions** (Java 11.0.15, React 18.0.2)
2. **Threats contain version info as unstructured text** ("affects Java 8-21", "React 18.x")
3. **No version extraction/comparison layer exists** between Heuristic and AI engines

This document outlines a **3-Tier Enhanced Matching System** that bridges this gap.

---

## Issue Deep Dive

### Current Data Flow (Problematic)
```
Threat Input: "Critical: Java Remote Code Execution affecting versions 8-21.0.15"
                ↓
Heuristic Engine: Looks for exact match of "Java 11.0.15" in title
                ↓
FAIL: No exact string match found
                ↓
AI Engine: Reads full description, generates threat analysis
                ↓
PROBLEM: AI doesn't systematically extract "8-21.0.15" range 
         or compare against inventory "11.0.15"
```

### Root Cause
- Threats provide **version ranges** ("8-21", "18.x", "1.2.3+")
- Inventory contains **specific versions** ("11.0.15", "18.0.2")
- **No semantic version comparison** exists to bridge this gap
- Version extraction is **ad-hoc**, buried in text parsing

---

## Solution: 3-Tier Version-Aware Matching System

### Tier 1: Enhanced Heuristic Engine with Version Extraction

**Purpose:** Before exact string matching, extract all version identifiers from threat data.

#### Implementation

```python
import re
from packaging import version
from typing import List, Tuple

class VersionExtractor:
    """Extracts version information from threat descriptions."""
    
    @staticmethod
    def extract_version_ranges(text: str) -> List[dict]:
        """
        Extracts version ranges and affected versions from text.
        
        Returns: [
            {"product": "Java", "versions": ["8", "11", "12-21"], "type": "range"},
            {"product": "React", "versions": ["18.x"], "type": "wildcard"},
            {"product": "Windows", "versions": ["10", "11"], "type": "specific"}
        ]
        """
        patterns = [
            # Version ranges: "8-21", "1.0-2.5"
            r'(?:version|versions|v\.?|ver\.?)?\s*(\d+(?:\.\d+)*)\s*-\s*(\d+(?:\.\d+)*)',
            # Wildcard versions: "18.x", "2.*"
            r'(\d+(?:\.\d+)*)[\.x\*](?:\d+[\.x\*])*',
            # Specific versions: "11.0.15", "2.5.3"
            r'(?:version|v\.?|ver\.?)?\s*(\d+(?:\.\d+){1,3})',
            # Version operators: ">= 1.0", "< 2.0"
            r'(>=|<=|>|<)\s*(\d+(?:\.\d+)*)',
        ]
        
        extracted = []
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                extracted.append({
                    "raw_match": match.group(),
                    "span": match.span(),
                    "groups": match.groups()
                })
        
        return extracted

    @staticmethod
    def normalize_version(ver_str: str) -> str:
        """Normalizes version strings for comparison."""
        # Remove 'v' prefix, convert wildcards
        ver_str = ver_str.strip().lower()
        ver_str = re.sub(r'^v\.?', '', ver_str)
        return ver_str


class EnhancedHeuristicEngine:
    """Enhanced heuristic matching with version awareness."""
    
    def __init__(self, tech_stack_inventory: dict):
        """
        Args:
            tech_stack_inventory: {
                "Java": ["8.0.0", "11.0.15", "17.0.2"],
                "React": ["17.0.2", "18.0.2"],
                "Windows": ["Server 2019", "Server 2022"]
            }
        """
        self.inventory = tech_stack_inventory
        self.extractor = VersionExtractor()
    
    def match_threat(self, threat_data: dict) -> dict:
        """
        Enhanced heuristic matching with version extraction.
        
        Args:
            threat_data: {
                "title": "...",
                "description": "...",
                "affected_products": "..."
            }
        
        Returns: {
            "status": "Yes" | "No",
            "score": 0-100,
            "detection_method": "Heuristic (Version-Aware)",
            "matched_products": [
                {
                    "product": "Java",
                    "inventory_versions": ["11.0.15"],
                    "threat_versions": ["8-21"],
                    "version_overlap": True,
                    "match_type": "range_overlap"
                }
            ],
            "reason": ""
        }
        """
        
        combined_text = f"{threat_data.get('title', '')} {threat_data.get('description', '')} {threat_data.get('affected_products', '')}"
        
        matches = []
        
        # Check each product in inventory
        for product_name, inventory_versions in self.inventory.items():
            # Check for product name mention in threat
            if self._product_mentioned(product_name, combined_text):
                # Extract version info from threat
                threat_versions = self.extractor.extract_version_ranges(combined_text)
                
                # Check version overlap
                version_overlap = self._check_version_overlap(
                    product_name,
                    inventory_versions,
                    threat_versions,
                    combined_text
                )
                
                if version_overlap:
                    matches.append({
                        "product": product_name,
                        "inventory_versions": inventory_versions,
                        "threat_versions": version_overlap["threat_versions"],
                        "version_overlap": True,
                        "match_type": version_overlap["match_type"],
                        "confidence": version_overlap["confidence"]
                    })
        
        if matches:
            return {
                "status": "Yes",
                "score": 100,
                "detection_method": "Heuristic (Version-Aware)",
                "matched_products": matches,
                "reason": f"Exact product and version overlap detected for: {', '.join([m['product'] for m in matches])}"
            }
        else:
            return {
                "status": "No",
                "score": 0,
                "detection_method": "Heuristic (Version-Aware)",
                "matched_products": [],
                "reason": "No product/version overlap in inventory"
            }
    
    def _product_mentioned(self, product: str, text: str) -> bool:
        """Check if product name is mentioned in text."""
        # Simple case-insensitive substring match
        # Can be enhanced with fuzzy matching
        return product.lower() in text.lower()
    
    def _check_version_overlap(self, product: str, inventory_versions: List[str], 
                              threat_versions: List[dict], text: str) -> dict or None:
        """
        Check if threat versions overlap with inventory versions.
        
        Returns: {
            "threat_versions": ["8-21", "19.x"],
            "match_type": "range_overlap" | "wildcard_overlap" | "exact_match",
            "confidence": 0-100
        }
        """
        
        # Extract version numbers from threat text specific to this product
        product_pattern = rf"{re.escape(product)}\s+(?:version|v\.?|ver\.?)?\s*([\d\.\-x\*,;\s]+)"
        product_threat_match = re.search(product_pattern, text, re.IGNORECASE)
        
        if not product_threat_match:
            return None
        
        threat_version_str = product_threat_match.group(1)
        
        # Parse version ranges/wildcards
        threat_ranges = self._parse_version_expression(threat_version_str)
        inventory_parsed = [self._parse_single_version(v) for v in inventory_versions]
        
        # Check overlap
        for threat_range in threat_ranges:
            for inv_ver in inventory_parsed:
                if self._versions_overlap(threat_range, inv_ver):
                    return {
                        "threat_versions": [threat_version_str],
                        "match_type": self._determine_match_type(threat_range),
                        "confidence": 95  # High confidence for explicit version match
                    }
        
        return None
    
    def _parse_version_expression(self, expr: str) -> List[dict]:
        """Parse version expressions like '8-21', '18.x', '>=11.0'."""
        expressions = []
        
        # Handle ranges: "8-21"
        range_match = re.match(r'(\d+(?:\.\d+)*)\s*-\s*(\d+(?:\.\d+)*)', expr)
        if range_match:
            expressions.append({
                "type": "range",
                "start": range_match.group(1),
                "end": range_match.group(2)
            })
        
        # Handle wildcards: "18.x", "2.*"
        wildcard_match = re.match(r'(\d+(?:\.\d+)*)[\.x\*]', expr)
        if wildcard_match:
            expressions.append({
                "type": "wildcard",
                "prefix": wildcard_match.group(1)
            })
        
        # Handle operators: ">=11", "<20"
        op_match = re.match(r'(>=|<=|>|<)\s*(\d+(?:\.\d+)*)', expr)
        if op_match:
            expressions.append({
                "type": "operator",
                "operator": op_match.group(1),
                "version": op_match.group(2)
            })
        
        # Default: treat as specific version
        if not expressions:
            expressions.append({
                "type": "specific",
                "version": expr.strip()
            })
        
        return expressions
    
    def _parse_single_version(self, ver_str: str) -> dict:
        """Parse a single version string."""
        return {
            "type": "specific",
            "version": ver_str
        }
    
    def _versions_overlap(self, threat_spec: dict, inv_spec: dict) -> bool:
        """Check if threat version specification overlaps with inventory version."""
        
        try:
            if threat_spec["type"] == "range":
                start = version.parse(threat_spec["start"])
                end = version.parse(threat_spec["end"])
                inv = version.parse(inv_spec["version"])
                return start <= inv <= end
            
            elif threat_spec["type"] == "wildcard":
                threat_prefix = threat_spec["prefix"]
                inv_ver = inv_spec["version"]
                return inv_ver.startswith(threat_prefix)
            
            elif threat_spec["type"] == "operator":
                op = threat_spec["operator"]
                threat_ver = version.parse(threat_spec["version"])
                inv = version.parse(inv_spec["version"])
                
                if op == ">=":
                    return inv >= threat_ver
                elif op == "<=":
                    return inv <= threat_ver
                elif op == ">":
                    return inv > threat_ver
                elif op == "<":
                    return inv < threat_ver
            
            elif threat_spec["type"] == "specific":
                return inv_spec["version"] == threat_spec["version"]
        
        except Exception:
            # If version parsing fails, fall back to string comparison
            return str(threat_spec).lower() in str(inv_spec).lower()
        
        return False
    
    def _determine_match_type(self, threat_range: dict) -> str:
        """Determine the type of version match."""
        if threat_range["type"] == "range":
            return "range_overlap"
        elif threat_range["type"] == "wildcard":
            return "wildcard_overlap"
        else:
            return "exact_match"
```

---

### Tier 2: Enhanced AI Engine with Structured Version Extraction

**Purpose:** When Heuristic fails, the AI engine explicitly extracts and compares versions.

#### AI Prompt Enhancement

```python
# Enhanced Gemma AI Prompt with version-awareness

AI_SYSTEM_PROMPT = """
You are a Senior Cyber Threat Analyst specializing in impact assessment.

CRITICAL INSTRUCTION: Extract and analyze version information.

When analyzing the threat, you MUST:

1. **Extract Affected Versions**: Identify ALL version ranges, specific versions, 
   or version constraints mentioned in the threat description.
   Format: "Affected Versions: [Java 8-21, React 18.x, Windows 10/11]"

2. **Match Against Inventory**: 
   Inventory Tech Stack:
   {inventory_json}
   
   For EACH technology in inventory:
   - Check if versions are mentioned in the threat
   - Determine if inventory versions fall within affected range
   - Calculate overlap percentage (0-100%)

3. **Version Overlap Decision**: 
   - Exact Match (e.g., inventory has "11.0.15", threat affects "11.0.15"): HIGH RISK
   - Range Overlap (e.g., inventory has "11.0.15", threat affects "8-21"): HIGH RISK
   - Wildcard Overlap (e.g., inventory has "18.0.2", threat affects "18.x"): HIGH RISK
   - Partial Match (e.g., inventory has "11.0.15", threat affects "20+"): LOW RISK
   - No Match: NO RISK

4. **Financial Industry Aggressiveness** (if applicable):
   If Company Industry is set to "Finance":
   - Aggressively flag threats affecting ANY version of Java, .NET, SQL Server
   - Aggressively flag Banking Trojans, Ransomware, Data Exfiltration even if 
     versions don't explicitly match (justify with industry vulnerability reasoning)

5. **JSON Response** (MUST be valid JSON):
{
    "status": "Yes" | "No",
    "score": 0-100,
    "reason": "1-2 sentence explanation",
    "method": "AI Map (Version-Aware)",
    "version_analysis": {
        "extracted_threat_versions": {
            "Java": ["8-21"],
            "React": ["18.x"]
        },
        "inventory_versions": {
            "Java": ["11.0.15"],
            "React": ["18.0.2"]
        },
        "overlap_details": {
            "Java": {
                "overlaps": true,
                "type": "range_overlap",
                "risk_percentage": 95
            },
            "React": {
                "overlaps": true,
                "type": "wildcard_overlap",
                "risk_percentage": 100
            }
        }
    },
    "confidence": 0-100
}

CRITICAL: Return ONLY valid JSON, no markdown or extra text.
"""

def invoke_gemma_with_version_analysis(threat_data: dict, 
                                      inventory: dict, 
                                      company_industry: str) -> dict:
    """
    Call Gemma with enhanced version-aware prompt.
    """
    inventory_json = json.dumps(inventory, indent=2)
    
    prompt = f"""{AI_SYSTEM_PROMPT}

THREAT DATA:
Title: {threat_data['title']}
Description: {threat_data['description']}
Affected Products: {threat_data.get('affected_products', 'Not specified')}
Company: {threat_data.get('company_name', 'Unknown')}
Industry: {company_industry}

Analyze this threat and respond with ONLY the JSON object.
"""
    
    # Call Gemma API (pseudo-code)
    response = gemma_client.generate(
        prompt=prompt,
        max_tokens=1000,
        temperature=0.2  # Lower temperature for more deterministic output
    )
    
    # Parse JSON response
    try:
        result = json.loads(response.text)
        return result
    except json.JSONDecodeError:
        # Fallback parsing
        return parse_gemma_fallback(response.text)
```

---

### Tier 3: Version-Aware Search & Filtering in Search/Pagination

**Purpose:** When searching threats, filter results by version relevance.

#### Enhanced Backend Search Query

```python
class VersionAwareSearchEngine:
    """Search with version matching awareness."""
    
    def search_threats_with_versions(self, 
                                    search_query: str, 
                                    inventory: dict,
                                    page: int = 1,
                                    limit: int = 50) -> dict:
        """
        Search threats and rank by version relevance.
        
        Returns: {
            "results": [
                {
                    "id": "...",
                    "title": "...",
                    "version_relevance": 95,
                    "matched_products": ["Java", "React"],
                    "rank": 1
                }
            ],
            "total_matches": 342,
            "version_filtered_count": 48,
            "page": 1,
            "pages": 7
        }
        """
        
        # Step 1: Full-text search (ILIKE on title + description)
        full_matches = self.db.query("""
            SELECT id, title, description, affected_products 
            FROM threats 
            WHERE title ILIKE %s OR description ILIKE %s
            LIMIT 10000
        """, (f"%{search_query}%", f"%{search_query}%"))
        
        # Step 2: Score each result by version relevance
        scored_results = []
        version_extractor = VersionExtractor()
        
        for threat in full_matches:
            threat_text = f"{threat['title']} {threat['description']} {threat['affected_products']}"
            
            # Calculate version relevance score
            relevance_score = self._calculate_version_relevance(
                threat_text, 
                inventory
            )
            
            scored_results.append({
                "threat": threat,
                "version_relevance": relevance_score,
                "matched_products": self._extract_matched_products(threat_text, inventory)
            })
        
        # Step 3: Sort by version relevance (highest first)
        scored_results.sort(key=lambda x: x['version_relevance'], reverse=True)
        
        # Step 4: Paginate
        total = len(scored_results)
        version_filtered = sum(1 for r in scored_results if r['version_relevance'] > 0)
        
        start = (page - 1) * limit
        end = start + limit
        page_results = scored_results[start:end]
        
        return {
            "results": [
                {
                    "id": r['threat']['id'],
                    "title": r['threat']['title'],
                    "version_relevance": r['version_relevance'],
                    "matched_products": r['matched_products'],
                    "rank": start + i + 1
                }
                for i, r in enumerate(page_results)
            ],
            "total_matches": total,
            "version_filtered_count": version_filtered,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    def _calculate_version_relevance(self, threat_text: str, inventory: dict) -> float:
        """Calculate how relevant this threat is based on version overlap."""
        relevance = 0
        
        for product, versions in inventory.items():
            if self._product_in_text(product, threat_text):
                # Product mentioned: baseline score
                relevance += 30
                
                # Check version overlap: bonus
                if self._version_overlap_in_text(product, versions, threat_text):
                    relevance += 70
        
        return min(relevance, 100)  # Cap at 100
    
    def _product_in_text(self, product: str, text: str) -> bool:
        return product.lower() in text.lower()
    
    def _version_overlap_in_text(self, product: str, inventory_versions: List[str], text: str) -> bool:
        """Check if any inventory version overlaps with mentioned versions."""
        # Use the same logic as EnhancedHeuristicEngine
        # Extract threat versions for this product
        product_pattern = rf"{re.escape(product)}\s+(?:version|v\.?)?\s*([\d\.\-x\*,;]+)"
        match = re.search(product_pattern, text, re.IGNORECASE)
        
        if match:
            threat_version_str = match.group(1)
            # Implement version overlap check
            return True  # Simplified for example
        
        return False
    
    def _extract_matched_products(self, text: str, inventory: dict) -> List[str]:
        """Extract which products from inventory are mentioned."""
        matched = []
        for product in inventory.keys():
            if product.lower() in text.lower():
                matched.append(product)
        return matched
```

---

## Integration Points in Existing System

### Modified Workflow

```
1. Threat Collection
   ↓
2. ENHANCED Heuristic Engine (Version-Aware)
   ├─ Extract version info from threat
   ├─ Match against inventory with version comparison
   ├─ If match found → Return Score: 100, Status: "Yes"
   └─ If no match → Continue to Step 3
   ↓
3. ENHANCED AI Engine (Gemma with Version Extraction)
   ├─ Invoke Gemma with version-aware prompt
   ├─ AI extracts threat versions explicitly
   ├─ AI compares against inventory versions
   ├─ AI returns JSON with version_analysis field
   └─ Return Score: 0-100
   ↓
4. Search & Pagination (Version-Ranked)
   ├─ User searches for threat
   ├─ Backend ranks results by version relevance
   ├─ Results show matched products and versions
   └─ User sees most relevant threats first
   ↓
5. Manual Review (With Version Context)
   ├─ Reviewer sees version overlap details
   ├─ Approve/Dismiss with version context
   └─ Feedback helps tune version matching
```

---

## Configuration Changes Needed

### 1. Update Tech Stack Inventory Schema

```python
# OLD
inventory = {
    "Java": ["8.0.0", "11.0.15", "17.0.2"],
    "React": ["17.0.2", "18.0.2"]
}

# NEW (Enhanced with metadata)
inventory = {
    "Java": {
        "versions": ["8.0.0", "11.0.15", "17.0.2"],
        "type": "language",
        "critical": True  # Flag critical tech
    },
    "React": {
        "versions": ["17.0.2", "18.0.2"],
        "type": "framework",
        "critical": False
    }
}
```

### 2. Update Threat Data Model

```python
# Threat schema should include explicit version fields
threat_schema = {
    "id": "...",
    "title": "...",
    "description": "...",
    "affected_products": "...",
    # NEW FIELDS
    "extracted_versions": {
        "Java": ["8-21"],
        "React": ["18.x"]
    },
    "heuristic_result": {...},
    "ai_result": {...},
    "version_analysis": {...}  # Detailed version overlap
}
```

---

## Testing & Validation

### Test Cases

#### Test Case 1: Range Overlap
```
Inventory: Java 11.0.15
Threat: "Affects Java versions 8-21"
Expected: Match (Score: 100, Type: range_overlap)
```

#### Test Case 2: Wildcard Overlap
```
Inventory: React 18.0.2
Threat: "React 18.x vulnerable"
Expected: Match (Score: 100, Type: wildcard_overlap)
```

#### Test Case 3: No Overlap
```
Inventory: Java 11.0.15
Threat: "Affects Java 22+"
Expected: No Match (Score: 0)
```

#### Test Case 4: Partial Text (AI-Only)
```
Inventory: Java 11.0.15, Finance Industry
Threat: "Banking Trojan targeting enterprise systems"
         (No explicit Java version mentioned)
Expected: AI Flags if Industry=Finance (Score: 80+)
```

---

## Performance Considerations

### Optimization Strategies

1. **Version Extraction Caching**: Cache extracted versions from threats to avoid re-parsing
2. **Inventory Normalization**: Pre-normalize inventory versions to semantic versioning
3. **Lazy AI Invocation**: Only call Gemma if Heuristic returns no match (already your design)
4. **Batch Version Comparison**: Pre-compute version compatibility matrices for common products

### Complexity

- Heuristic Engine: O(n*m) where n=inventory products, m=threat text length
- AI Engine: O(1) per threat (single API call)
- Search: O(n log n) with version scoring

---

## Implementation Roadmap

### Phase 1 (Week 1-2): Heuristic Enhancement
- [ ] Implement VersionExtractor class
- [ ] Add version range/wildcard parsing
- [ ] Integrate into existing Heuristic engine
- [ ] Unit tests for version comparison

### Phase 2 (Week 2-3): AI Prompt Enhancement
- [ ] Update Gemma system prompt
- [ ] Add version_analysis field to AI response
- [ ] Test with real CVE data
- [ ] Fine-tune version extraction accuracy

### Phase 3 (Week 3-4): Search Enhancement
- [ ] Implement VersionAwareSearchEngine
- [ ] Rank results by version relevance
- [ ] Update UI to show version match details
- [ ] Performance testing

### Phase 4 (Ongoing): Tuning & Feedback
- [ ] Collect user feedback from Manual Review
- [ ] Iterate on version matching logic
- [ ] Build version compatibility database
- [ ] Monitor false positive/negative rates

---

## Summary

**The Gap**: Your system has versions in inventory but not in threat detection.

**The Solution**: 
1. Extract versions from threat data (both Heuristic & AI)
2. Implement semantic version comparison
3. Rank threats by version relevance

**The Outcome**: When you update inventory to include "Java 11.0.15", threats mentioning "Java 8-21" will automatically match because the system understands version ranges, not just exact strings.

