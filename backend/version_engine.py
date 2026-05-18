"""
Version-Aware Threat Matching Engine
=====================================
Extracts version ranges, wildcards, and operators from threat text,
then compares them against inventory versions using semantic version parsing.

This replaces the AI-based impact analysis with a deterministic,
instant version correlation engine.
"""

import re
import json
from typing import List, Dict, Optional, Tuple
from packaging import version as pkg_version


# ============================================================================
# VERSION EXTRACTION
# ============================================================================

class VersionExtractor:
    """Extract version information from threat descriptions."""

    # Regex patterns ordered by specificity (most specific first)
    PATTERNS = {
        'range': r'(\d+(?:\.\d+)*)\s*(?:-|to|through)\s*(\d+(?:\.\d+)*)',
        'operator': r'(>=|<=|>|<)\s*(\d+(?:\.\d+)*)',
        'wildcard': r'(\d+(?:\.\d+)*)[\.]?[xX\*]+',
        'before': r'(?:before|prior\s+to|earlier\s+than)\s+(\d+(?:\.\d+)*)',
        'after': r'(?:after|later\s+than|starting\s+from)\s+(\d+(?:\.\d+)*)',
        'specific': r'(?:version|v\.?|ver\.?\s|release)\s+(\d+(?:\.\d+)+)',
    }

    @staticmethod
    def extract_for_product(product_name: str, text: str) -> Optional[List[dict]]:
        """
        Extract version specifications mentioned alongside a specific product.
        
        Example: "Java versions 8-21 affected" → [{"type": "range", "start": "8", "end": "21"}]
        """
        # Build pattern: find product name followed by version info
        escaped = re.escape(product_name)
        pattern = rf"{escaped}\s+(?:version|versions|v\.?|ver\.?)?\s*([\d\.\-x\*,;\s>=<tohrugbefa]+)"
        match = re.search(pattern, text, re.IGNORECASE)

        if not match:
            return None

        version_str = match.group(1).strip()
        return VersionExtractor._parse_version_string(version_str)

    @staticmethod
    def extract_all_versions(text: str) -> List[dict]:
        """Extract all version specifications from raw text."""
        return VersionExtractor._parse_version_string(text)

    @staticmethod
    def _parse_version_string(text: str) -> List[dict]:
        """Parse a version string into structured specifications."""
        specs = []

        # Range: "8-21", "1.0 to 2.5", "8 through 21"
        for match in re.finditer(VersionExtractor.PATTERNS['range'], text):
            specs.append({
                "type": "range",
                "start": match.group(1),
                "end": match.group(2),
                "raw": match.group(0)
            })

        # "before 2.5.33" → "<2.5.33"
        for match in re.finditer(VersionExtractor.PATTERNS['before'], text, re.IGNORECASE):
            specs.append({
                "type": "operator",
                "operator": "<",
                "version": match.group(1),
                "raw": match.group(0)
            })

        # "after 4.0" → ">4.0"
        for match in re.finditer(VersionExtractor.PATTERNS['after'], text, re.IGNORECASE):
            specs.append({
                "type": "operator",
                "operator": ">",
                "version": match.group(1),
                "raw": match.group(0)
            })

        # Operator: ">=11", "<20"
        for match in re.finditer(VersionExtractor.PATTERNS['operator'], text):
            specs.append({
                "type": "operator",
                "operator": match.group(1),
                "version": match.group(2),
                "raw": match.group(0)
            })

        # Wildcard: "18.x", "2.*"
        for match in re.finditer(VersionExtractor.PATTERNS['wildcard'], text):
            specs.append({
                "type": "wildcard",
                "prefix": match.group(1),
                "raw": match.group(0)
            })

        # Specific: "version 11.0.15"
        if not specs:
            for match in re.finditer(VersionExtractor.PATTERNS['specific'], text, re.IGNORECASE):
                specs.append({
                    "type": "specific",
                    "version": match.group(1),
                    "raw": match.group(0)
                })

        return specs


# ============================================================================
# VERSION COMPARISON
# ============================================================================

class VersionComparator:
    """Compare inventory versions against threat version specifications."""

    @staticmethod
    def normalize(ver_str: str) -> str:
        """Normalize a version string for comparison."""
        ver_str = str(ver_str).strip().lower()
        ver_str = re.sub(r'^v\.?', '', ver_str)
        return ver_str

    @staticmethod
    def is_affected(inventory_version: str, threat_spec: dict) -> bool:
        """
        Check if a single inventory version falls within a threat specification.
        
        Examples:
          is_affected("11.0.15", {"type": "range", "start": "8", "end": "21"}) → True
          is_affected("18.0.2",  {"type": "wildcard", "prefix": "18"})          → True
          is_affected("22.0",    {"type": "operator", "operator": ">=", "version": "23"}) → False
        """
        try:
            inv = pkg_version.parse(VersionComparator.normalize(inventory_version))
        except Exception:
            # If version parsing fails entirely, fall back to string matching
            return str(inventory_version).lower() in str(threat_spec.get("raw", "")).lower()

        spec_type = threat_spec.get("type")

        if spec_type == "range":
            try:
                start = pkg_version.parse(threat_spec["start"])
                end = pkg_version.parse(threat_spec["end"])
                return start <= inv <= end
            except Exception:
                return False

        elif spec_type == "wildcard":
            prefix = threat_spec.get("prefix", "")
            return str(inv).startswith(prefix)

        elif spec_type == "operator":
            try:
                op = threat_spec["operator"]
                threat_ver = pkg_version.parse(threat_spec["version"])
                if op == ">=":
                    return inv >= threat_ver
                elif op == "<=":
                    return inv <= threat_ver
                elif op == ">":
                    return inv > threat_ver
                elif op == "<":
                    return inv < threat_ver
            except Exception:
                return False

        elif spec_type == "specific":
            try:
                return inv == pkg_version.parse(threat_spec["version"])
            except Exception:
                return str(inventory_version) == str(threat_spec.get("version", ""))

        return False

    @staticmethod
    def find_overlaps(inventory_versions: List[str], threat_specs: List[dict]) -> List[str]:
        """Find which inventory versions are affected by ANY threat specification."""
        overlapping = []
        for inv_ver in inventory_versions:
            for spec in threat_specs:
                if VersionComparator.is_affected(inv_ver, spec):
                    overlapping.append(inv_ver)
                    break  # Don't double-count
        return overlapping


# ============================================================================
# PRODUCT NAME NORMALIZATION
# ============================================================================

# Common aliases for product names in threat feeds
PRODUCT_ALIASES = {
    "microsoft exchange": ["exchange", "ms exchange", "exchange server"],
    "apache http server": ["apache httpd", "httpd", "apache web server"],
    "openssl": ["open ssl", "open-ssl"],
    "node.js": ["nodejs", "node js", "node"],
    "postgresql": ["postgres", "pgsql"],
    "mysql": ["my sql"],
    "mongodb": ["mongo db", "mongo"],
    "microsoft windows": ["windows", "ms windows", "win"],
    "microsoft office": ["ms office", "office 365", "o365"],
    "google chrome": ["chrome", "chromium"],
    "mozilla firefox": ["firefox"],
    "apache tomcat": ["tomcat"],
    "apache struts": ["struts"],
    "apache log4j": ["log4j", "log4shell"],
    "vmware": ["vm ware"],
    "kubernetes": ["k8s"],
    "docker": ["docker engine"],
    "redis": ["redis server"],
    "nginx": ["nginx server"],
    "react": ["reactjs", "react.js"],
    "angular": ["angularjs", "angular.js"],
    "vue": ["vuejs", "vue.js"],
    "java": ["java se", "java jdk", "openjdk", "jdk"],
    "python": ["python3", "cpython"],
    ".net": ["dotnet", "dot net", ".net framework", ".net core"],
}


def normalize_product_name(name: str) -> str:
    """Normalize a product name to its canonical form."""
    name_lower = name.lower().strip()
    for canonical, aliases in PRODUCT_ALIASES.items():
        if name_lower == canonical or name_lower in aliases:
            return canonical
    return name_lower


def product_mentioned_in_text(product_name: str, text: str) -> bool:
    """Check if a product (or any of its aliases) is mentioned in text."""
    text_lower = text.lower()
    name_lower = product_name.lower().strip()

    # Direct match
    if name_lower in text_lower:
        return True

    # Check aliases
    canonical = normalize_product_name(name_lower)
    if canonical in text_lower:
        return True

    # Check if any alias matches
    aliases = PRODUCT_ALIASES.get(canonical, [])
    for alias in aliases:
        if alias in text_lower:
            return True

    return False


# ============================================================================
# MAIN ENGINE: VERSION-AWARE HEURISTIC SCAN
# ============================================================================

def scan_threat_version_aware(
    title: str,
    description: str,
    affected_products: list,
    tech_stack: list,
    industry: str = "Technology"
) -> dict:
    """
    Version-Aware Heuristic Threat Scanner.
    
    Replaces the old exact-string heuristic AND the Gemma AI engine
    with a single, fast, deterministic engine.
    
    Args:
        title: Threat/CVE title
        description: Full description text
        affected_products: List of affected product strings (from NVD for CVEs)
        tech_stack: Company's tech stack (list of strings or dicts with name/version)
        industry: Company's industry
    
    Returns:
        {
            "status": "Yes" | "No",
            "score": 0-100,
            "reason": "Detailed explanation with version overlap info",
            "method": "Heuristic (Version-Aware)",
            "matches": [
                {
                    "product": "Java",
                    "inventory_version": "11.0.15",
                    "threat_versions": "8-21",
                    "match_type": "range_overlap",
                    "confidence": 95
                }
            ]
        }
    """
    combined_text = f"{title} {description or ''} {' '.join(affected_products or [])}"

    # Parse tech stack into structured format
    inventory = _parse_tech_stack(tech_stack)
    
    matches = []

    for product_name, product_info in inventory.items():
        inv_versions = product_info.get("versions", [])

        # Step 1: Check if product is mentioned in threat text
        if not product_mentioned_in_text(product_name, combined_text):
            # Also check in affected_products list
            found_in_products = False
            for ap in (affected_products or []):
                if product_mentioned_in_text(product_name, ap):
                    found_in_products = True
                    break
            if not found_in_products:
                continue

        # Step 2: If no versions in inventory, flag as product-level match
        if not inv_versions:
            matches.append({
                "product": product_name,
                "inventory_version": "unversioned",
                "threat_versions": "any",
                "match_type": "product_mention_only",
                "confidence": 60
            })
            continue

        # Step 3: Extract version specs from threat text for this product
        threat_specs = VersionExtractor.extract_for_product(product_name, combined_text)

        if not threat_specs:
            # Product mentioned but no version info → try extracting from full text
            threat_specs = VersionExtractor.extract_all_versions(combined_text)

        if not threat_specs:
            # Product mentioned, no versions extractable → conservative: flag it
            for inv_v in inv_versions:
                matches.append({
                    "product": product_name,
                    "inventory_version": inv_v,
                    "threat_versions": "unknown (product mentioned)",
                    "match_type": "product_mention_only",
                    "confidence": 50
                })
            continue

        # Step 4: Check version overlap
        for inv_v in inv_versions:
            for spec in threat_specs:
                if VersionComparator.is_affected(inv_v, spec):
                    match_type = _determine_match_type(spec)
                    matches.append({
                        "product": product_name,
                        "inventory_version": inv_v,
                        "threat_versions": spec.get("raw", str(spec)),
                        "match_type": match_type,
                        "confidence": 95 if match_type != "product_mention_only" else 50
                    })
                    break  # One match per inventory version is enough

    # Step 5: Industry boost (Finance sector aggressiveness)
    industry_boost = _check_industry_relevance(combined_text, industry)

    # Step 6: Calculate final score and build result
    if matches:
        max_confidence = max(m["confidence"] for m in matches)
        score = min(100, max_confidence + (10 if industry_boost else 0))

        reason_parts = []
        for m in matches:
            reason_parts.append(
                f"'{m['product']}' v{m['inventory_version']} affected by threat range {m['threat_versions']} ({m['match_type']})"
            )
        reason = "Version-Aware Match: " + "; ".join(reason_parts)
        if industry_boost:
            reason += f" [INDUSTRY RELEVANCE: {industry} sector targeted]"

        return {
            "status": "Yes",
            "score": score,
            "reason": reason,
            "method": "Heuristic (Version-Aware)",
            "matches": matches
        }
    elif industry_boost:
        return {
            "status": "Yes",
            "score": 65,
            "reason": f"Industry relevance detected: Threat targets {industry} sector organizations.",
            "method": "Heuristic (Industry-Match)",
            "matches": []
        }
    else:
        return {
            "status": "No",
            "score": 0,
            "reason": "No product or version overlap detected in asset inventory.",
            "method": "Heuristic (Version-Aware)",
            "matches": []
        }


# ============================================================================
# HELPERS
# ============================================================================

def _parse_tech_stack(tech_stack: list) -> Dict[str, dict]:
    """
    Parse tech stack into a normalized dict.
    
    Handles both formats:
      - ["Java", "React"]               → {"java": {"versions": []}, ...}
      - [{"name": "Java", "version": "11.0.15"}, ...]  → {"java": {"versions": ["11.0.15"]}, ...}
    """
    inventory = {}
    for item in (tech_stack or []):
        if isinstance(item, dict):
            name = normalize_product_name(item.get("name", ""))
            ver = item.get("version", "")
            if name:
                if name not in inventory:
                    inventory[name] = {"versions": []}
                if ver:
                    inventory[name]["versions"].append(str(ver))
        elif isinstance(item, str):
            name = normalize_product_name(item)
            if name and name not in inventory:
                inventory[name] = {"versions": []}
    return inventory


def _determine_match_type(spec: dict) -> str:
    """Determine match type from a version specification."""
    t = spec.get("type", "")
    if t == "range":
        return "range_overlap"
    elif t == "wildcard":
        return "wildcard_overlap"
    elif t == "operator":
        return "operator_overlap"
    elif t == "specific":
        return "exact_match"
    return "product_mention_only"


# Financial / industry-specific keywords
INDUSTRY_KEYWORDS = {
    "Finance": [
        "banking", "bank", "financial", "fintech", "swift", "payment",
        "credit card", "atm", "transaction", "lending", "stock market",
        "investment", "insurance", "cryptocurrency", "crypto", "wallet",
        "forex", "trading", "brokerage", "mortgage", "loan"
    ],
    "Healthcare": [
        "hospital", "healthcare", "medical", "patient", "hipaa", "ehr",
        "pharmaceutical", "clinical", "health record"
    ],
    "Government": [
        "government", "federal", "military", "defense", "intelligence",
        "classified", "national security"
    ],
}


def _check_industry_relevance(text: str, industry: str) -> bool:
    """Check if threat text has industry-specific relevance."""
    text_lower = text.lower()
    keywords = INDUSTRY_KEYWORDS.get(industry, [])
    return any(kw in text_lower for kw in keywords)
