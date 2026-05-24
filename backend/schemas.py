from pydantic import BaseModel
from datetime import datetime

class IncidentBase(BaseModel):
    title: str
    description: str | None = None
    ai_summary: str | None = None
    source: str | None = None
    country: str | None = None
    attack_type: str | None = None
    is_financial: int | None = 0
    financial_sector: str | None = None
    severity: str | None = "Low"
    threat_level: str | None = "Info"
    impact_summary: str | None = None
    target_entity: str | None = None
    happened_at: datetime | None = None
    link: str | None = None
    company_impact_status: str | None = None
    company_impact_reason: str | None = None
    company_impact_score: int | None = 0
    review_status: str | None = "Pending"
    impact_flag: int | None = 0
    detection_method: str | None = None
    scan_iteration: int | None = 0
    raw_data: dict | list | None = None
    full_analysis: str | None = None
    crawled_content: str | None = None
    extracted_versions: dict | list | None = None
    heuristic_match_details: dict | list | None = None
    version_relevance: int | None = 0

class IncidentCreate(IncidentBase):
    pass

class Incident(IncidentBase):
    id: int
    date_collected: datetime

    class Config:
        from_attributes = True

class ImpactReportBase(BaseModel):
    incident_id: int
    breach_process: str
    affected_customers: str
    technical_analysis: str
    official_report: str
    incident_title: str | None = None
    root_cause: str | None = None
    business_impact: str | None = None
    operational_impact: str | None = None
    financial_impact: str | None = None
    reputational_impact: str | None = None
    data_involved: str | None = None
    data_classification: str | None = None
    attack_type: str | None = None
    breach_method: str | None = None
    _debug_prompt: str | None = None
    _debug_response: str | None = None
    published: int = 0

class ImpactReport(ImpactReportBase):
    id: int
    created_at: datetime
    incident: Incident | None = None
    debug_prompt: str | None = None
    debug_response: str | None = None

    class Config:
        from_attributes = True
        populate_by_name = True

class CVEBase(BaseModel):
    cve_id: str
    description: str | None = None
    cvss_score: str | None = None
    severity: str | None = None
    affected_products: list | None = None
    references: list | None = None
    published_date: datetime | None = None
    last_modified_date: datetime | None = None

class CVECreate(CVEBase):
    pass

class CVEResponse(CVEBase):
    id: int | None = None
    date_collected: datetime | None = None
    is_local: bool = True
    
    # AI Enrichment & Impact Radar v3.0
    company_name: str | None = None
    product_name: str | None = None
    ai_summary: str | None = None
    ai_tags: list | None = None
    ai_processed: int = 0
    company_impact_score: int | None = 0
    company_impact_reason: str | None = None
    review_status: str | None = "Pending"
    impact_flag: int | None = 0
    detection_method: str | None = None
    scan_iteration: int | None = 0
    extracted_versions: dict | list | None = None
    heuristic_match_details: dict | list | None = None
    version_relevance: int | None = 0

    class Config:
        from_attributes = True

class CompanyResponse(BaseModel):
    id: int
    name: str
    total_cves: int
    critical_cves: int
    high_cves: int
    latest_cve: str | None = None
    vulnerability_types: list | None = None
    last_updated: datetime
    
    class Config:
        from_attributes = True
class NVDSearchParams(BaseModel):
    cveId: str | None = None
    cveIds: list[str] | None = None
    cpeName: str | None = None
    cweId: str | None = None
    vulnStatuses: str | None = None
    cveTag: str | None = None
    cvssV2Metrics: str | None = None
    cvssV2Severity: str | None = None
    cvssV3Metrics: str | None = None
    cvssV3Severity: str | None = None
    cvssV4Metrics: str | None = None
    cvssV4Severity: str | None = None
    keywordSearch: str | None = None
    keywordExactMatch: bool = False
    hasCertAlerts: bool = False
    hasCertNotes: bool = False
    hasKev: bool = False
    hasOval: bool = False
    isVulnerable: bool = False
    noRejected: bool = False
    pubStartDate: str | None = None
    pubEndDate: str | None = None
    lastModStartDate: str | None = None
    lastModEndDate: str | None = None
    kevStartDate: str | None = None
    kevEndDate: str | None = None
    resultsPerPage: int = 20
    startIndex: int = 0
    sourceIdentifier: str | None = None
    virtualMatchString: str | None = None
    versionStart: str | None = None
    versionStartType: str | None = None
    versionEnd: str | None = None
    versionEndType: str | None = None

class ReportBuilderPreviewRequest(BaseModel):
    from_date: str
    to_date: str
    data_sources: list[str] # ['crawl', 'cve']
    impact_only: bool = False

class CombinedReportCreate(BaseModel):
    report_title: str
    from_date: datetime
    to_date: datetime
    incident_ids: list[int]
    cve_ids: list[int]

class CombinedReportResponse(BaseModel):
    id: int
    report_title: str
    from_date: datetime
    to_date: datetime
    incident_ids: list[int]
    cve_ids: list[int]
    created_at: datetime

    class Config:
        from_attributes = True

class TechItem(BaseModel):
    name: str
    version: str | None = None

class CompanyProfileBase(BaseModel):
    company_name: str
    tech_stack: list[TechItem | str | dict]
    industry: str

class CompanyProfile(CompanyProfileBase):
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True

class ReviewStatusUpdate(BaseModel):
    id: int
    type: str # 'incident' or 'cve'
    status: str # 'Pending', 'Reviewed', 'Dismissed'

# --- MITRE API EXTRATOR SCHEMAS ---

class MitreCWE(BaseModel):
    id: str
    description: str | None = None

class MitreCVSS(BaseModel):
    score: float | None = None
    severity: str | None = None
    version: str | None = None
    vector: str | None = None

class MitreAffectedVersion(BaseModel):
    version: str | None = None
    status: str | None = None
    lessThan: str | None = None

class MitreAffectedProduct(BaseModel):
    vendor: str | None = None
    product: str | None = None
    platforms: list[str] | None = None
    default_status: str | None = None
    versions: list[MitreAffectedVersion] | None = None

class MitreCVEReport(BaseModel):
    cve_id: str
    state: str | None = None
    cna: str | None = None
    published_date: str | None = None
    updated_date: str | None = None
    title: str | None = None
    description: str | None = None
    cwes: list[MitreCWE] | None = []
    cvss: MitreCVSS | None = None
    affected_products: list[MitreAffectedProduct] | None = []
    references: list[str] | None = []

class JiraPublishRequest(BaseModel):
    project_key: str = "CI"
    issue_type: str = "Task"
    summary: str
    description: str
    assignee_id: str = "6422be0257f0c028e2f71e9a"
    impact: str = "Customer Impacted"
    severity: str = "Critical"
    remarks: str

class JiraPushHistoryResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: str
    summary: str
class ImpactReport(ImpactReportBase):
    id: int
    created_at: datetime
    incident: Incident | None = None
    debug_prompt: str | None = None
    debug_response: str | None = None

    class Config:
        from_attributes = True
        populate_by_name = True

class CVEBase(BaseModel):
    cve_id: str
    description: str | None = None
    cvss_score: str | None = None
    severity: str | None = None
    affected_products: list | None = None
    references: list | None = None
    published_date: datetime | None = None
    last_modified_date: datetime | None = None

class CVECreate(CVEBase):
    pass

class CVEResponse(CVEBase):
    id: int | None = None
    date_collected: datetime | None = None
    is_local: bool = True
    
    # AI Enrichment & Impact Radar v3.0
    company_name: str | None = None
    product_name: str | None = None
    ai_summary: str | None = None
    ai_tags: list | None = None
    ai_processed: int = 0
    company_impact_score: int | None = 0
    company_impact_reason: str | None = None
    review_status: str | None = "Pending"
    impact_flag: int | None = 0
    detection_method: str | None = None
    scan_iteration: int | None = 0
    extracted_versions: dict | list | None = None
    heuristic_match_details: dict | list | None = None
    version_relevance: int | None = 0

    class Config:
        from_attributes = True

class CompanyResponse(BaseModel):
    id: int
    name: str
    total_cves: int
    critical_cves: int
    high_cves: int
    latest_cve: str | None = None
    vulnerability_types: list | None = None
    last_updated: datetime
    
    class Config:
        from_attributes = True
class NVDSearchParams(BaseModel):
    cveId: str | None = None
    cveIds: list[str] | None = None
    cpeName: str | None = None
    cweId: str | None = None
    vulnStatuses: str | None = None
    cveTag: str | None = None
    cvssV2Metrics: str | None = None
    cvssV2Severity: str | None = None
    cvssV3Metrics: str | None = None
    cvssV3Severity: str | None = None
    cvssV4Metrics: str | None = None
    cvssV4Severity: str | None = None
    keywordSearch: str | None = None
    keywordExactMatch: bool = False
    hasCertAlerts: bool = False
    hasCertNotes: bool = False
    hasKev: bool = False
    hasOval: bool = False
    isVulnerable: bool = False
    noRejected: bool = False
    pubStartDate: str | None = None
    pubEndDate: str | None = None
    lastModStartDate: str | None = None
    lastModEndDate: str | None = None
    kevStartDate: str | None = None
    kevEndDate: str | None = None
    resultsPerPage: int = 20
    startIndex: int = 0
    sourceIdentifier: str | None = None
    virtualMatchString: str | None = None
    versionStart: str | None = None
    versionStartType: str | None = None
    versionEnd: str | None = None
    versionEndType: str | None = None

class ReportBuilderPreviewRequest(BaseModel):
    from_date: str
    to_date: str
    data_sources: list[str] # ['crawl', 'cve']
    impact_only: bool = False

class CombinedReportCreate(BaseModel):
    report_title: str
    from_date: datetime
    to_date: datetime
    incident_ids: list[int]
    cve_ids: list[int]

class CombinedReportResponse(BaseModel):
    id: int
    report_title: str
    from_date: datetime
    to_date: datetime
    incident_ids: list[int]
    cve_ids: list[int]
    created_at: datetime

    class Config:
        from_attributes = True

class TechItem(BaseModel):
    name: str
    version: str | None = None

class CompanyProfileBase(BaseModel):
    company_name: str
    tech_stack: list[TechItem | str | dict]
    industry: str

class CompanyProfile(CompanyProfileBase):
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True

class ReviewStatusUpdate(BaseModel):
    id: int
    type: str # 'incident' or 'cve'
    status: str # 'Pending', 'Reviewed', 'Dismissed'

# --- MITRE API EXTRATOR SCHEMAS ---

class MitreCWE(BaseModel):
    id: str
    description: str | None = None

class MitreCVSS(BaseModel):
    score: float | None = None
    severity: str | None = None
    version: str | None = None
    vector: str | None = None

class MitreAffectedVersion(BaseModel):
    version: str | None = None
    status: str | None = None
    lessThan: str | None = None

class MitreAffectedProduct(BaseModel):
    vendor: str | None = None
    product: str | None = None
    platforms: list[str] | None = None
    default_status: str | None = None
    versions: list[MitreAffectedVersion] | None = None

class MitreCVEReport(BaseModel):
    cve_id: str
    state: str | None = None
    cna: str | None = None
    published_date: str | None = None
    updated_date: str | None = None
    title: str | None = None
    description: str | None = None
    cwes: list[MitreCWE] | None = []
    cvss: MitreCVSS | None = None
    affected_products: list[MitreAffectedProduct] | None = []
    references: list[str] | None = []

class JiraPublishRequest(BaseModel):
    project_key: str = "CI"
    issue_type: str = "Task"
    summary: str
    description: str
    assignee_id: str = "6422be0257f0c028e2f71e9a"
    impact: str = "Customer Impacted"
    severity: str = "Critical"
    remarks: str

class JiraPushHistoryResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: str
    summary: str
    ticket_key: str | None = None
    status: str
    error_message: str | None = None
    pushed_at: datetime

    class Config:
        from_attributes = True

class AutomationAuditLogResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: str
    entity_title: str | None = None
    scan_status: str
    match_status: str
    impact_score: int
    details: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class AutomationRunRequest(BaseModel):
    run_nvd: bool = True
    nvd_timeframe: str = "month"
    run_incident: bool = True
    incident_timeframe: str = "week"
