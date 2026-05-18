from sqlalchemy import Column, Integer, String, DateTime, JSON
from database import Base
import datetime

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    ai_summary = Column(String, nullable=True) # Gemma-generated professional brief
    source = Column(String)
    country = Column(String)  # 'India' or 'Global'
    attack_type = Column(String) # 'phishing', 'ransomware', etc.
    is_financial = Column(Integer, default=0) # 1 if financial, 0 otherwise
    financial_sector = Column(String) # 'Banking', 'Fintech', 'Stock Market', etc.
    severity = Column(String, nullable=True) # Critical, High, Medium, Low
    threat_level = Column(String, nullable=True) # Immediate, Warning, Info
    impact_summary = Column(String, nullable=True) # Concise business impact
    target_entity = Column(String, nullable=True) # Name of the bank / institution
    happened_at = Column(DateTime, nullable=True) # Original incident date
    date_collected = Column(DateTime, default=datetime.datetime.utcnow)
    link = Column(String)
    
    company_impact_status = Column(String, nullable=True) # 'Yes', 'No', 'Pending'
    company_impact_reason = Column(String, nullable=True)
    company_impact_score = Column(Integer, default=0) # 0-100 for Radar proximity
    review_status = Column(String, default="Pending") # 'Pending', 'Reviewed', 'Dismissed'
    impact_flag = Column(Integer, default=0) # 1 if high impact, 0 otherwise
    detection_method = Column(String, nullable=True) # Heuristic (Version-Aware), Heuristic (Industry-Match)
    scan_iteration = Column(Integer, default=0) # Track which scan iteration detected this
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    raw_data = Column(JSON, nullable=True) # Full payload from source
    full_analysis = Column(String, nullable=True) # 500+ word AI analysis
    crawled_content = Column(String, nullable=True) # Full scraped article text

class ImpactReport(Base):
    __tablename__ = "impact_reports"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, index=True)
    breach_process = Column(String) # Step-by-step timeline
    affected_customers = Column(String) # Entities/Volume
    technical_analysis = Column(String) # Deep dive
    official_report = Column(String) # CSO Professional Report
    
    # AI Generated Extensions
    incident_title = Column(String, nullable=True)
    root_cause = Column(String, nullable=True)
    business_impact = Column(String, nullable=True)
    operational_impact = Column(String, nullable=True)
    financial_impact = Column(String, nullable=True)
    reputational_impact = Column(String, nullable=True)
    data_involved = Column(String, nullable=True)
    data_classification = Column(String, nullable=True)
    attack_type = Column(String, nullable=True)
    breach_method = Column(String, nullable=True)
    debug_prompt = Column(String, nullable=True)
    
    published = Column(Integer, default=0) # 1 if published, 0 otherwise
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class MitreMapping(Base):
    __tablename__ = "mitre_mappings"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, index=True)
    tactic = Column(String) # e.g., Initial Access
    technique_id = Column(String) # e.g., T1566
    technique_name = Column(String) # e.g., Phishing
    confidence = Column(Integer) # AI Confidence Score (0-100)
    analysis_justification = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CVE(Base):
    __tablename__ = "cves"

    id = Column(Integer, primary_key=True, index=True)
    cve_id = Column(String, unique=True, index=True)
    description = Column(String)
    cvss_score = Column(String, nullable=True) # E.g., 9.8
    severity = Column(String, nullable=True) # Critical, High, Medium, Low
    affected_products = Column(JSON, nullable=True) # List of strings/CPEs
    references = Column(JSON, nullable=True) # List of URLs
    published_date = Column(DateTime, nullable=True)
    last_modified_date = Column(DateTime, nullable=True)
    date_collected = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Impact Radar v3.0 Fields
    company_impact_score = Column(Integer, default=0)
    company_impact_reason = Column(String, nullable=True)
    review_status = Column(String, default="Pending") # 'Pending', 'Reviewed', 'Dismissed'
    impact_flag = Column(Integer, default=0) # 1 if high impact, 0 otherwise
    detection_method = Column(String, nullable=True) # Heuristic (Version-Aware), Heuristic (Industry-Match)
    scan_iteration = Column(Integer, default=0) # Track which scan iteration detected this
    
    # AI Enriched Fields
    company_name = Column(String, index=True, nullable=True)
    product_name = Column(String, nullable=True)
    ai_summary = Column(String, nullable=True)
    ai_tags = Column(JSON, nullable=True)
    ai_processed = Column(Integer, default=0) # 1 if processed, 0 otherwise
    pull_type = Column(String, nullable=True) # 'Standard Intelligence Pull', 'Advanced Intelligence Pull', 'Manual CVE Pull'
    pull_params = Column(JSON, nullable=True) # Store filters used for Advanced Pull
    search_session_id = Column(String, nullable=True, index=True) # To group records from the same pull
    raw_data = Column(JSON, nullable=True) # Full NVD API response
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    total_cves = Column(Integer, default=0)
    critical_cves = Column(Integer, default=0)
    high_cves = Column(Integer, default=0)
    latest_cve = Column(String, nullable=True)
    vulnerability_types = Column(JSON, nullable=True) # List of common types (RCE, XSS, etc.)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CombinedReport(Base):
    __tablename__ = "combined_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_title = Column(String)
    from_date = Column(DateTime)
    to_date = Column(DateTime)
    incident_ids = Column(JSON) # List of IDs
    cve_ids = Column(JSON)      # List of IDs
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CompanyProfile(Base):
    __tablename__ = "company_profiles"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, default="My Company")
    tech_stack = Column(JSON, default=[]) # [{"name": "Java", "version": "11.0.15"}]
    industry = Column(String, default="Finance")
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    iteration = Column(Integer, index=True)
    scan_type = Column(String) # 'full' or 'new'
    incidents_scanned = Column(Integer, default=0)
    cves_scanned = Column(Integer, default=0)
    threats_found = Column(Integer, default=0)
    threats_no_impact = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="running") # 'running', 'completed', 'canceled'
