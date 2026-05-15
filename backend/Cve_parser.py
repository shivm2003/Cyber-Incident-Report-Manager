#!/usr/bin/env python3
"""
CVE Parser - Extract and analyze CVE vulnerability data from JSON format
Parses CVE records following the CVE Record Format 5.2 specification
"""

import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class CVEMetadata:
    """CVE metadata information"""
    cve_id: str
    state: str
    date_published: str
    date_updated: str
    assigner_short_name: str


@dataclass
class CVEVersion:
    """Affected version information"""
    version: str
    less_than: str
    status: str


@dataclass
class CVEAffected:
    """Affected product information"""
    vendor: str
    product: str
    platforms: List[str]
    versions: List[CVEVersion]


@dataclass
class CVSSScore:
    """CVSS vulnerability scoring"""
    version: str
    base_score: float
    base_severity: str
    vector_string: str


class CVEParser:
    """Parse and extract CVE vulnerability data"""
    
    def __init__(self, json_data: str):
        """
        Initialize parser with JSON CVE data
        
        Args:
            json_data: Raw JSON string containing CVE record
        """
        self.data = json.loads(json_data)
        self.metadata = self._extract_metadata()
    
    def _extract_metadata(self) -> CVEMetadata:
        """Extract CVE metadata"""
        cve_meta = self.data.get('cveMetadata', {})
        return CVEMetadata(
            cve_id=cve_meta.get('cveId', 'N/A'),
            state=cve_meta.get('state', 'UNKNOWN'),
            date_published=cve_meta.get('datePublished', 'N/A'),
            date_updated=cve_meta.get('dateUpdated', 'N/A'),
            assigner_short_name=cve_meta.get('assignerShortName', 'Unknown')
        )
    
    def get_title(self) -> str:
        """Get vulnerability title"""
        cna = self.data.get('containers', {}).get('cna', {})
        return cna.get('title', 'No Title Available')
    
    def get_description(self) -> str:
        """Get vulnerability description"""
        cna = self.data.get('containers', {}).get('cna', {})
        descriptions = cna.get('descriptions', [])
        if descriptions:
            return descriptions[0].get('value', 'No description available')
        return 'No description available'
    
    def get_cwe(self) -> List[Dict[str, str]]:
        """Get CWE (Common Weakness Enumeration) information"""
        cna = self.data.get('containers', {}).get('cna', {})
        problem_types = cna.get('problemTypes', [])
        cwe_list = []
        
        for problem in problem_types:
            descriptions = problem.get('descriptions', [])
            for desc in descriptions:
                cwe_list.append({
                    'id': desc.get('cweId', 'N/A'),
                    'description': desc.get('description', 'N/A'),
                    'type': desc.get('type', 'CWE')
                })
        
        return cwe_list
    
    def get_cvss_score(self) -> Optional[CVSSScore]:
        """Get CVSS vulnerability score"""
        cna = self.data.get('containers', {}).get('cna', {})
        metrics = cna.get('metrics', [])
        
        for metric in metrics:
            if metric.get('format') == 'CVSS':
                cvss_data = metric.get('cvssV3_1', {})
                if cvss_data:
                    return CVSSScore(
                        version=cvss_data.get('version', '3.1'),
                        base_score=cvss_data.get('baseScore', 0.0),
                        base_severity=cvss_data.get('baseSeverity', 'UNKNOWN'),
                        vector_string=cvss_data.get('vectorString', 'N/A')
                    )
        
        return None
    
    def get_affected_products(self) -> List[CVEAffected]:
        """Get list of affected products and versions"""
        cna = self.data.get('containers', {}).get('cna', {})
        affected_list = cna.get('affected', [])
        
        result = []
        for affected in affected_list:
            versions = []
            for version in affected.get('versions', []):
                versions.append(CVEVersion(
                    version=version.get('version', 'N/A'),
                    less_than=version.get('lessThan', 'N/A'),
                    status=version.get('status', 'unknown')
                ))
            
            result.append(CVEAffected(
                vendor=affected.get('vendor', 'Unknown'),
                product=affected.get('product', 'Unknown'),
                platforms=affected.get('platforms', []),
                versions=versions
            ))
        
        return result
    
    def get_references(self) -> List[Dict[str, Any]]:
        """Get vulnerability references and advisories"""
        cna = self.data.get('containers', {}).get('cna', {})
        references = cna.get('references', [])
        
        result = []
        for ref in references:
            result.append({
                'name': ref.get('name', 'N/A'),
                'url': ref.get('url', 'N/A'),
                'tags': ref.get('tags', [])
            })
        
        return result
    
    def get_cisa_adp(self) -> Optional[Dict[str, Any]]:
        """Get CISA ADP (Autom. Digitized in Practice) information"""
        adp_list = self.data.get('adp', [])
        
        if adp_list:
            adp = adp_list[0]
            metrics = adp.get('metrics', [])
            if metrics:
                other = metrics[0].get('other', {})
                if other:
                    content = other.get('content', {})
                    return {
                        'timestamp': content.get('timestamp', 'N/A'),
                        'exploitation': content.get('options', [{}])[0].get('Exploitation', 'N/A'),
                        'automatable': content.get('options', [{}, {}])[1].get('Automatable', 'N/A'),
                        'technical_impact': content.get('options', [{}, {}, {}])[2].get('Technical Impact', 'N/A')
                    }
        
        return None
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate complete CVE analysis report"""
        cvss = self.get_cvss_score()
        
        report = {
            'metadata': {
                'cve_id': self.metadata.cve_id,
                'state': self.metadata.state,
                'date_published': self.metadata.date_published,
                'date_updated': self.metadata.date_updated,
                'assigner': self.metadata.assigner_short_name
            },
            'vulnerability': {
                'title': self.get_title(),
                'description': self.get_description(),
                'cwes': self.get_cwe()
            },
            'scoring': {
                'cvss_score': cvss.base_score if cvss else None,
                'cvss_severity': cvss.base_severity if cvss else None,
                'cvss_version': cvss.version if cvss else None,
                'cvss_vector': cvss.vector_string if cvss else None
            },
            'affected': {
                'products': self.get_affected_products(),
                'product_count': len(self.get_affected_products())
            },
            'assessment': {
                'cisa_adp': self.get_cisa_adp()
            },
            'references': self.get_references()
        }
        
        return report
    
    def print_summary(self) -> None:
        """Print a human-readable summary"""
        print(f"\n{'='*70}")
        print(f"CVE VULNERABILITY REPORT")
        print(f"{'='*70}\n")
        
        print(f"CVE ID:        {self.metadata.cve_id}")
        print(f"State:         {self.metadata.state}")
        print(f"Published:     {self.metadata.date_published}")
        print(f"Updated:       {self.metadata.date_updated}\n")
        
        print(f"Title:         {self.get_title()}\n")
        print(f"Description:   {self.get_description()}\n")
        
        cwes = self.get_cwe()
        print(f"CWE Information:")
        for cwe in cwes:
            print(f"  • {cwe['id']}: {cwe['description']}\n")
        
        cvss = self.get_cvss_score()
        if cvss:
            print(f"CVSS Scoring (v{cvss.version}):")
            print(f"  Base Score:   {cvss.base_score}")
            print(f"  Severity:     {cvss.base_severity}")
            print(f"  Vector:       {cvss.vector_string}\n")
        
        affected = self.get_affected_products()
        print(f"Affected Products: ({len(affected)} total)")
        
        # Group by vendor
        by_vendor = {}
        for prod in affected:
            if prod.vendor not in by_vendor:
                by_vendor[prod.vendor] = []
            by_vendor[prod.vendor].append(prod)
        
        for vendor, products in by_vendor.items():
            print(f"\n  {vendor}:")
            for prod in products:
                print(f"    • {prod.product}")
                print(f"      Platforms: {', '.join(prod.platforms)}")
                for ver in prod.versions:
                    print(f"      Versions: {ver.version} to {ver.less_than} ({ver.status})")
        
        cisa = self.get_cisa_adp()
        if cisa:
            print(f"\nCISA Assessment:")
            print(f"  Exploitation:    {cisa['exploitation']}")
            print(f"  Automatable:     {cisa['automatable']}")
            print(f"  Technical Impact: {cisa['technical_impact']}\n")
        
        refs = self.get_references()
        if refs:
            print(f"References:")
            for ref in refs:
                print(f"  • {ref['name']}")
                print(f"    URL: {ref['url']}")
                print(f"    Tags: {', '.join(ref['tags']) if ref['tags'] else 'None'}\n")
        
        print(f"{'='*70}\n")


def main():
    """Example usage of CVE parser"""
    
    # Sample CVE JSON (from the document provided)
    sample_json = '''{
    "dataType":"CVE_RECORD",
    "dataVersion":"5.2",
    "cveMetadata":{
        "cveId":"CVE-2026-21530",
        "assignerOrgId":"f38d906d-7342-40ea-92c1-6c4a2c6478c8",
        "state":"PUBLISHED",
        "assignerShortName":"microsoft",
        "dateReserved":"2025-12-30T18:10:54.847Z",
        "datePublished":"2026-05-12T16:58:16.403Z",
        "dateUpdated":"2026-05-15T17:13:47.311Z"
    },
    "containers":{
        "cna":{
            "title":"Windows Rich Text Edit Elevation of Privilege Vulnerability",
            "datePublic":"2026-05-12T14:00:00.000Z",
            "descriptions":[{"value":"Double free in Windows Rich Text Edit allows an authorized attacker to elevate privileges locally.","lang":"en-US"}],
            "problemTypes":[{"descriptions":[{"description":"CWE-415: Double Free","lang":"en-US","type":"CWE","cweId":"CWE-415"}]}],
            "affected":[{"vendor":"Microsoft","product":"Windows 10 Version 1607","platforms":["32-bit Systems","x64-based Systems"],"versions":[{"version":"10.0.14393.0","lessThan":"10.0.14393.9140","versionType":"custom","status":"affected"}]},{"vendor":"Microsoft","product":"Windows Server 2025","platforms":["x64-based Systems"],"versions":[{"version":"10.0.26100.0","lessThan":"10.0.26100.32860","versionType":"custom","status":"affected"}]}],
            "references":[{"name":"Windows Rich Text Edit Elevation of Privilege Vulnerability","tags":["vendor-advisory","patch"],"url":"https://msrc.microsoft.com/update-guide/vulnerability/CVE-2026-21530"}],
            "metrics":[{"format":"CVSS","scenarios":[{"lang":"en-US","value":"GENERAL"}],"cvssV3_1":{"version":"3.1","baseSeverity":"MEDIUM","baseScore":6.7,"vectorString":"CVSS:3.1/AV:L/AC:H/PR:L/UI:R/S:U/C:H/I:H/A:H/E:U/RL:O/RC:C"}}]
        }
    },
    "adp":[{"metrics":[{"other":{"type":"ssvc","content":{"timestamp":"2026-05-13T03:56:30.478729Z","id":"CVE-2026-21530","options":[{"Exploitation":"none"},{"Automatable":"no"},{"Technical Impact":"total"}],"role":"CISA Coordinator","version":"2.0.3"}}}],"title":"CISA ADP Vulnrichment","providerMetadata":{"orgId":"134c704f-9b21-4f2e-91b3-4a467353bcc0","shortName":"CISA-ADP","dateUpdated":"2026-05-13T10:18:09.561Z"}}]
    }'''
    
    # Create parser and generate report
    parser = CVEParser(sample_json)
    
    # Print human-readable summary
    parser.print_summary()
    
    # Generate structured report
    report = parser.generate_report()
    
    # Save report as JSON
    with open('/mnt/user-data/outputs/cve_report.json', 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print("✓ Report saved to: cve_report.json")
    
    # Print affected products count
    print(f"✓ Total affected products: {report['affected']['product_count']}")
    print(f"✓ CVSS Score: {report['scoring']['cvss_score']} ({report['scoring']['cvss_severity']})")


if __name__ == '__main__':
    main()