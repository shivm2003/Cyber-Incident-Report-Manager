# ============================================================================
# IMPACT RADAR: VERSION-AWARE THREAT MATCHING - IMPLEMENTATION CODE
# ============================================================================
# This file contains ready-to-use code snippets for each component

import re
import json
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
from packaging import version as pkg_version
import sqlite3

# ============================================================================
# PART 1: VERSION EXTRACTION & PARSING
# ============================================================================

class VersionType(Enum):
    """Types of version specifications."""
    SPECIFIC = "specific"      # 11.0.15
    RANGE = "range"            # 8-21
    WILDCARD = "wildcard"      # 18.x, 2.*
    OPERATOR = "operator"      # >=11, <20, >8
    LIST = "list"              # 18.0, 18.1, 18.2


@dataclass
class VersionSpec:
    """Represents a parsed version specification."""
    type: VersionType
    value: str
    start: Optional[str] = None  # For ranges
    end: Optional[str] = None
    operator: Optional[str] = None  # For operators: >=, <=, >, <
    items: Optional[List[str]] = None  # For lists


class VersionExtractor:
    """Extract version information from threat text."""
    
    # Regex patterns for different version formats
    PATTERNS = {
        'range': r'(\d+(?:\.\d+)*)\s*(?:-|to)\s*(\d+(?:\.\d+)*)',
        'wildcard': r'(\d+(?:\.\d+)*)[\.x\*]+(?:\d+[\.x\*]+)*',
        'operator': r'(>=|<=|>|<)\s*(\d+(?:\.\d+)*)',
        'specific': r'(?:version|v\.?|ver\.?\s|release|r\.?)\s+(\d+(?:\.\d+)+)',
        'list': r'(\d+(?:\.\d+)*)\s*(?:,|and|or)\s+(\d+(?:\.\d+)*)',
    }
    
    @staticmethod
    def extract_all_versions(text: str) -> List[VersionSpec]:
        """Extract all version specifications from text."""
        versions = []
        text_lower = text.lower()
        
        # Try range pattern first (most specific)
        for match in re.finditer(VersionExtractor.PATTERNS['range'], text):
            versions.append(VersionSpec(
                type=VersionType.RANGE,
                value=match.group(0),
                start=match.group(1),
                end=match.group(2)
            ))
        
        # Try operator pattern
        for match in re.finditer(VersionExtractor.PATTERNS['operator'], text):
            versions.append(VersionSpec(
                type=VersionType.OPERATOR,
                value=match.group(0),
                operator=match.group(1),
                start=match.group(2)
            ))
        
        # Try wildcard pattern
        for match in re.finditer(VersionExtractor.PATTERNS['wildcard'], text):
            versions.append(VersionSpec(
                type=VersionType.WILDCARD,
                value=match.group(0),
                start=match.group(1)
            ))
        
        # Try specific pattern
        for match in re.finditer(VersionExtractor.PATTERNS['specific'], text):
            versions.append(VersionSpec(
                type=VersionType.SPECIFIC,
                value=match.group(0),
                start=match.group(1)
            ))
        
        return versions
    
    @staticmethod
    def extract_for_product(product_name: str, text: str) -> Optional[List[VersionSpec]]:
        """
        Extract versions specific to a product.
        Example: "Java 8-21" → returns [VersionSpec(RANGE, "8-21", ...)]
        """
        # Build pattern to find product name + versions
        pattern = rf"{re.escape(product_name)}\s+(?:version|v\.?|ver\.?)?\s*([\d\.\-x\*,;>=<\s]+)"
        match = re.search(pattern, text, re.IGNORECASE)
        
        if not match:
            return None
        
        version_str = match.group(1)
        return VersionExtractor.extract_all_versions(version_str)


# ============================================================================
# PART 2: VERSION COMPARISON ENGINE
# ============================================================================

class VersionComparator:
    """Compare versions and detect overlaps."""
    
    @staticmethod
    def normalize_version(ver_str: str) -> str:
        """Normalize version string for comparison."""
        ver_str = str(ver_str).strip().lower()
        ver_str = re.sub(r'^v\.?', '', ver_str)  # Remove 'v' prefix
        return ver_str
    
    @staticmethod
    def version_in_range(inventory_version: str, threat_spec: VersionSpec) -> bool:
        """
        Check if an inventory version falls within threat specification.
        
        Examples:
        - inventory="11.0.15", threat_spec=RANGE(8-21) → True
        - inventory="18.0.2", threat_spec=WILDCARD(18.x) → True
        - inventory="22.0", threat_spec=OPERATOR(>=,21) → True
        """
        try:
            inv_ver = pkg_version.parse(VersionComparator.normalize_version(inventory_version))
        except Exception:
            # If parsing fails, fall back to string comparison
            return str(inventory_version).lower() in str(threat_spec.value).lower()
        
        if threat_spec.type == VersionType.RANGE:
            try:
                start = pkg_version.parse(threat_spec.start)
                end = pkg_version.parse(threat_spec.end)
                return start <= inv_ver <= end
            except Exception:
                return False
        
        elif threat_spec.type == VersionType.WILDCARD:
            # Match prefix (18.0.2 matches 18.x)
            threat_prefix = threat_spec.start.rstrip('.x*')
            return str(inv_ver).startswith(threat_prefix)
        
        elif threat_spec.type == VersionType.OPERATOR:
            try:
                threat_ver = pkg_version.parse(threat_spec.start)
                if threat_spec.operator == ">=":
                    return inv_ver >= threat_ver
                elif threat_spec.operator == "<=":
                    return inv_ver <= threat_ver
                elif threat_spec.operator == ">":
                    return inv_ver > threat_ver
                elif threat_spec.operator == "<":
                    return inv_ver < threat_ver
            except Exception:
                return False
        
        elif threat_spec.type == VersionType.SPECIFIC:
            return str(inv_ver) == str(threat_spec.start)
        
        return False
    
    @staticmethod
    def find_overlaps(inventory_versions: List[str], threat_specs: List[VersionSpec]) -> List[str]:
        """
        Find which inventory versions overlap with threat specifications.
        
        Returns: List of overlapping inventory versions
        """
        overlapping = []
        
        for inv_ver in inventory_versions:
            for threat_spec in threat_specs:
                if VersionComparator.version_in_range(inv_ver, threat_spec):
                    overlapping.append(inv_ver)
                    break  # Only add once
        
        return overlapping
    
    @staticmethod
    def calculate_overlap_percentage(
        inventory_versions: List[str],
        threat_specs: List[VersionSpec]
    ) -> float:
        """Calculate what percentage of inventory versions are affected."""
        if not inventory_versions:
            return 0
        
        overlapping = VersionComparator.find_overlaps(inventory_versions, threat_specs)
        return (len(overlapping) / len(inventory_versions)) * 100


# ============================================================================
# PART 3: ENHANCED HEURISTIC ENGINE
# ============================================================================

class EnhancedHeuristicEngine:
    """Enhanced heuristic matching with version awareness."""
    
    def __init__(self, tech_stack_inventory: Dict[str, List[str]]):
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
        self.comparator = VersionComparator()
    
    def scan_threat(self, threat_data: Dict) -> Dict:
        """
        Scan threat for inventory matches with version awareness.
        
        Args:
            threat_data: {
                "title": "...",
                "description": "...",
                "affected_products": "...",
                "cve_id": "CVE-2024-...",
                "severity": "Critical"
            }
        
        Returns: {
            "status": "Yes" | "No",
            "score": 0-100,
            "detection_method": "Heuristic (Version-Aware)",
            "matches": [
                {
                    "product": "Java",
                    "inventory_versions": ["11.0.15", "17.0.2"],
                    "threat_versions": ["8-21"],
                    "overlapping_versions": ["11.0.15", "17.0.2"],
                    "overlap_percentage": 100,
                    "match_type": "range_overlap"
                }
            ],
            "reason": "Version-aware match detected for Java"
        }
        """
        
        # Combine all text fields
        combined_text = " ".join([
            threat_data.get('title', ''),
            threat_data.get('description', ''),
            threat_data.get('affected_products', ''),
            threat_data.get('cve_id', '')
        ])
        
        matches = []
        
        # Check each product in inventory
        for product_name, inventory_versions in self.inventory.items():
            
            # Step 1: Check if product is mentioned
            if not self._is_product_mentioned(product_name, combined_text):
                continue
            
            # Step 2: Extract versions specific to this product
            threat_versions = self.extractor.extract_for_product(product_name, combined_text)
            
            if not threat_versions:
                # Product mentioned but no versions found
                # Still flag with lower confidence
                matches.append({
                    "product": product_name,
                    "inventory_versions": inventory_versions,
                    "threat_versions": [],
                    "overlapping_versions": inventory_versions,  # Conservative: assume all affected
                    "overlap_percentage": 100,
                    "match_type": "product_mention_only",
                    "confidence": 50
                })
                continue
            
            # Step 3: Find overlapping versions
            overlapping = self.comparator.find_overlaps(inventory_versions, threat_versions)
            
            if overlapping:
                overlap_pct = (len(overlapping) / len(inventory_versions)) * 100
                match_type = self._determine_match_type(threat_versions)
                
                matches.append({
                    "product": product_name,
                    "inventory_versions": inventory_versions,
                    "threat_versions": [v.value for v in threat_versions],
                    "overlapping_versions": overlapping,
                    "overlap_percentage": overlap_pct,
                    "match_type": match_type,
                    "confidence": 95
                })
        
        # Return result
        if matches:
            return {
                "status": "Yes",
                "score": 100,
                "detection_method": "Heuristic (Version-Aware)",
                "matches": matches,
                "reason": f"Version-aware match: {', '.join([m['product'] for m in matches])}"
            }
        else:
            return {
                "status": "No",
                "score": 0,
                "detection_method": "Heuristic (Version-Aware)",
                "matches": [],
                "reason": "No product/version overlap detected"
            }
    
    def _is_product_mentioned(self, product_name: str, text: str) -> bool:
        """Check if product is mentioned in text (case-insensitive)."""
        return product_name.lower() in text.lower()
    
    def _determine_match_type(self, version_specs: List[VersionSpec]) -> str:
        """Determine the type of version match."""
        if not version_specs:
            return "product_mention"
        
        types = set(spec.type for spec in version_specs)
        
        if VersionType.RANGE in types:
            return "range_overlap"
        elif VersionType.WILDCARD in types:
            return "wildcard_overlap"
        elif VersionType.OPERATOR in types:
            return "operator_overlap"
        else:
            return "exact_match"


# ============================================================================
# PART 4: DATABASE OPERATIONS (SQLite)
# ============================================================================

class ThreatDatabase:
    """Database operations for threats with version tracking."""
    
    def __init__(self, db_path: str = "threats.db"):
        self.db_path = db_path
        self.init_schema()
    
    def init_schema(self):
        """Initialize database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Threats table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS threats (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            affected_products TEXT,
            cve_id TEXT,
            severity TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            extracted_versions TEXT,
            heuristic_result TEXT,
            ai_result TEXT,
            review_status TEXT DEFAULT 'Pending'
        )
        """)
        
        # Create FTS (Full-Text Search) table for better searching
        cursor.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS threats_fts 
        USING fts5(title, description, affected_products)
        """)
        
        conn.commit()
        conn.close()
    
    def insert_threat(self, threat_data: Dict, heuristic_result: Dict, ai_result: Dict = None):
        """Insert threat with version analysis results."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Extract versions from heuristic result
        extracted_versions = json.dumps({
            m['product']: m['threat_versions'] 
            for m in heuristic_result.get('matches', [])
        })
        
        cursor.execute("""
        INSERT INTO threats 
        (id, title, description, affected_products, cve_id, severity, 
         extracted_versions, heuristic_result, ai_result)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            threat_data.get('id', ''),
            threat_data.get('title', ''),
            threat_data.get('description', ''),
            threat_data.get('affected_products', ''),
            threat_data.get('cve_id', ''),
            threat_data.get('severity', ''),
            extracted_versions,
            json.dumps(heuristic_result),
            json.dumps(ai_result) if ai_result else None
        ))
        
        conn.commit()
        conn.close()
    
    def search_with_version_ranking(self, 
                                   search_query: str, 
                                   inventory: Dict[str, List[str]],
                                   page: int = 1,
                                   limit: int = 50) -> Dict:
        """
        Search threats and rank by version relevance.
        
        Returns: {
            "results": [...],
            "total_matches": 342,
            "version_relevant_count": 48,
            "page": 1,
            "pages": 7
        }
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # FTS search
        cursor.execute("""
        SELECT * FROM threats 
        WHERE id IN (
            SELECT rowid FROM threats_fts 
            WHERE threats_fts MATCH ?
        )
        LIMIT 10000
        """, (search_query,))
        
        threats = cursor.fetchall()
        conn.close()
        
        # Score by version relevance
        scored_threats = []
        for threat in threats:
            relevance_score = self._calculate_relevance(threat, inventory)
            scored_threats.append((threat, relevance_score))
        
        # Sort by relevance
        scored_threats.sort(key=lambda x: x[1], reverse=True)
        
        # Paginate
        total = len(scored_threats)
        version_relevant = sum(1 for _, score in scored_threats if score > 0)
        
        start = (page - 1) * limit
        end = start + limit
        page_results = scored_threats[start:end]
        
        return {
            "results": [
                {
                    "id": threat[0],
                    "title": threat[1],
                    "severity": threat[5],
                    "version_relevance": score,
                    "rank": start + i + 1
                }
                for i, (threat, score) in enumerate(page_results)
            ],
            "total_matches": total,
            "version_relevant_count": version_relevant,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    def _calculate_relevance(self, threat_row: Tuple, inventory: Dict[str, List[str]]) -> float:
        """Calculate version relevance score for a threat."""
        title = threat_row[1]
        description = threat_row[2]
        combined = f"{title} {description}"
        
        relevance = 0
        
        for product, versions in inventory.items():
            if product.lower() in combined.lower():
                relevance += 30  # Product mentioned
                
                # Check for version info
                threat_versions = VersionExtractor.extract_for_product(product, combined)
                if threat_versions:
                    overlapping = VersionComparator.find_overlaps(versions, threat_versions)
                    if overlapping:
                        relevance += 70  # Version match
        
        return min(relevance, 100)


# ============================================================================
# PART 5: USAGE EXAMPLES
# ============================================================================

def example_1_basic_version_extraction():
    """Example 1: Extract versions from threat text."""
    print("=" * 70)
    print("EXAMPLE 1: Version Extraction")
    print("=" * 70)
    
    threat_text = """
    Critical: Java Remote Code Execution
    
    Description: A remote code execution vulnerability has been discovered 
    affecting Java versions 8 through 21. Additionally, React versions 18.x 
    and Windows Server 2019/2022 are affected.
    
    Affected Products: Java 8-21, React 18.0.x, Windows
    """
    
    versions = VersionExtractor.extract_all_versions(threat_text)
    
    print("\nExtracted Versions:")
    for v in versions:
        print(f"  - Type: {v.type.value}, Value: {v.value}")
    
    # Extract versions for specific product
    java_versions = VersionExtractor.extract_for_product("Java", threat_text)
    print(f"\nJava Versions Extracted: {[v.value for v in java_versions] if java_versions else []}")


def example_2_version_comparison():
    """Example 2: Compare inventory vs threat versions."""
    print("\n" + "=" * 70)
    print("EXAMPLE 2: Version Comparison")
    print("=" * 70)
    
    inventory_versions = ["8.0.0", "11.0.15", "17.0.2"]
    threat_text = "Java versions 8-21 affected"
    
    threat_specs = VersionExtractor.extract_for_product("Java", threat_text)
    overlapping = VersionComparator.find_overlaps(inventory_versions, threat_specs)
    overlap_pct = VersionComparator.calculate_overlap_percentage(inventory_versions, threat_specs)
    
    print(f"\nInventory Versions: {inventory_versions}")
    print(f"Threat Versions: {[s.value for s in threat_specs]}")
    print(f"Overlapping Versions: {overlapping}")
    print(f"Overlap Percentage: {overlap_pct}%")


def example_3_heuristic_scan():
    """Example 3: Run enhanced heuristic scan."""
    print("\n" + "=" * 70)
    print("EXAMPLE 3: Enhanced Heuristic Scan")
    print("=" * 70)
    
    # Define inventory
    inventory = {
        "Java": ["8.0.0", "11.0.15", "17.0.2"],
        "React": ["17.0.2", "18.0.2"],
        "Windows": ["Server 2019", "Server 2022"]
    }
    
    # Create engine
    engine = EnhancedHeuristicEngine(inventory)
    
    # Threat data
    threat = {
        "title": "Critical Java RCE - CVE-2024-50379",
        "description": "Remote Code Execution in Java versions 8 through 21",
        "affected_products": "Java 8-21, Apache Log4j",
        "cve_id": "CVE-2024-50379",
        "severity": "Critical"
    }
    
    # Scan
    result = engine.scan_threat(threat)
    
    print("\nScan Result:")
    print(json.dumps(result, indent=2))


def example_4_database_operations():
    """Example 4: Database search with version ranking."""
    print("\n" + "=" * 70)
    print("EXAMPLE 4: Database Search with Version Ranking")
    print("=" * 70)
    
    # Initialize database
    db = ThreatDatabase(":memory:")  # Use in-memory for demo
    
    # Insert sample threat
    threat = {
        "id": "CVE-2024-50379",
        "title": "Java RCE Vulnerability",
        "description": "Remote Code Execution affecting Java 8-21",
        "affected_products": "Java",
        "cve_id": "CVE-2024-50379"
    }
    
    inventory = {
        "Java": ["11.0.15"],
        "React": ["18.0.2"]
    }
    
    engine = EnhancedHeuristicEngine(inventory)
    heuristic_result = engine.scan_threat(threat)
    
    db.insert_threat(threat, heuristic_result)
    
    # Search
    results = db.search_with_version_ranking("Java RCE", inventory, page=1)
    
    print("\nSearch Results:")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    # Run examples
    example_1_basic_version_extraction()
    example_2_version_comparison()
    example_3_heuristic_scan()
    example_4_database_operations()
    
    print("\n" + "=" * 70)
    print("All examples completed successfully!")
    print("=" * 70)
