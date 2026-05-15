import requests
from typing import Dict, Any, Optional
import schemas

def fetch_mitre_cve(cve_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches the raw JSON from the MITRE CVE API for the given CVE-ID.
    """
    url = f"https://cveawg.mitre.org/api/cve/{cve_id}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.json()
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching MITRE API for {cve_id}: {e}")
        return None

def parse_mitre_cve_to_report(raw_json: Dict[str, Any]) -> schemas.MitreCVEReport:
    """
    Parses the raw MITRE JSON into the structured schemas.MitreCVEReport.
    """
    metadata = raw_json.get("cveMetadata", {})
    containers = raw_json.get("containers", {})
    cna = containers.get("cna", {})
    
    # 1. Basic Metadata
    cve_id = metadata.get("cveId", "")
    state = metadata.get("state", "UNKNOWN")
    assigner = metadata.get("assignerShortName", "")
    pub_date = metadata.get("datePublished", "")
    if pub_date:
        pub_date = pub_date.split("T")[0]
    upd_date = metadata.get("dateUpdated", "")
    if upd_date:
        upd_date = upd_date.split("T")[0]

    # 2. Title & Description
    title = cna.get("title", "No Title Provided")
    
    description = ""
    descriptions_list = cna.get("descriptions", [])
    if descriptions_list:
        for desc in descriptions_list:
            if desc.get("lang") == "en":
                description = desc.get("value", "")
                break
        if not description:
            description = descriptions_list[0].get("value", "")

    # 3. CWEs
    cwes = []
    problem_types = cna.get("problemTypes", [])
    for pt in problem_types:
        for d in pt.get("descriptions", []):
            if d.get("lang") == "en":
                cwe_id = d.get("cweId") or d.get("description", "Unknown CWE")
                # Sometimes it just puts the text in description instead of cweId
                cwes.append(schemas.MitreCWE(
                    id=str(cwe_id),
                    description=d.get("description", "")
                ))

    # Fallback to check ADP for CWEs if CNA has none
    if not cwes:
        adp_list = containers.get("adp", [])
        for adp in adp_list:
            for pt in adp.get("problemTypes", []):
                for d in pt.get("descriptions", []):
                    if d.get("lang") == "en":
                        cwe_id = d.get("cweId") or d.get("description", "Unknown CWE")
                        cwes.append(schemas.MitreCWE(
                            id=str(cwe_id),
                            description=d.get("description", "")
                        ))

    # 4. CVSS
    cvss_obj = None
    # First try CNA
    metrics = cna.get("metrics", [])
    for m in metrics:
        cvss = m.get("cvssV3_1") or m.get("cvssV3_0") or m.get("cvssV4_0")
        if cvss:
            cvss_obj = schemas.MitreCVSS(
                score=cvss.get("baseScore"),
                severity=cvss.get("baseSeverity", ""),
                version=cvss.get("version", ""),
                vector=cvss.get("vectorString", "")
            )
            break
            
    # Fallback to ADP if not in CNA
    if not cvss_obj:
        adp_list = containers.get("adp", [])
        for adp in adp_list:
            for m in adp.get("metrics", []):
                cvss = m.get("cvssV3_1") or m.get("cvssV3_0") or m.get("cvssV4_0")
                if cvss:
                    cvss_obj = schemas.MitreCVSS(
                        score=cvss.get("baseScore"),
                        severity=cvss.get("baseSeverity", ""),
                        version=cvss.get("version", ""),
                        vector=cvss.get("vectorString", "")
                    )
                    break
            if cvss_obj:
                break

    # 5. Affected Products
    affected_products = []
    affected_list = cna.get("affected", [])
    for aff in affected_list:
        versions = []
        for v in aff.get("versions", []):
            versions.append(schemas.MitreAffectedVersion(
                version=v.get("version", ""),
                status=v.get("status", ""),
                lessThan=v.get("lessThan", "")
            ))
            
        affected_products.append(schemas.MitreAffectedProduct(
            vendor=aff.get("vendor", ""),
            product=aff.get("product", ""),
            platforms=aff.get("platforms", []),
            default_status=aff.get("defaultStatus", "unknown"),
            versions=versions
        ))

    # 6. References
    references = []
    ref_list = cna.get("references", [])
    for r in ref_list:
        url = r.get("url")
        name = r.get("name")
        tags = r.get("tags", [])
        if url:
            ref_str = url
            if name:
                ref_str += f" ({name})"
            if tags:
                ref_str += f" [{', '.join(tags)}]"
            references.append(ref_str)

    return schemas.MitreCVEReport(
        cve_id=cve_id,
        state=state,
        cna=assigner,
        published_date=pub_date,
        updated_date=upd_date,
        title=title,
        description=description,
        cwes=cwes,
        cvss=cvss_obj,
        affected_products=affected_products,
        references=references
    )
