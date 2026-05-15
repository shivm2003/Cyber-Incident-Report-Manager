import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import reporting
from unittest.mock import MagicMock

# Mock report object
report = MagicMock()
report.id = 999
report.incident_id = 123
report.incident_title = "Test Breach Analysis"
report.official_report = "This is a test executive summary."
report.business_impact = "High business impact."
report.operational_impact = "Medium operational impact."
report.financial_impact = "Low financial impact."
report.reputational_impact = "Critical reputational impact."
report.root_cause = "Phishing attack."
report.data_involved = "Customer PII"
report.data_classification = "Highly Confidential"
report.affected_customers = "10,000+"
report.technical_analysis = "Technical deep dive details..."
report.breach_process = "Step 1: Access, Step 2: Exfiltration."
report.attack_type = "Phishing"
report.breach_method = "Credential Harvesting"

# Mock incident object
incident = MagicMock()
incident.source = "CERT-In"
incident.severity = "High"
incident.target_entity = "Test Bank"
incident.happened_at = MagicMock()
incident.happened_at.strftime.return_value = "2026-05-08"
report.incident = incident

# Mock mitre mappings
m1 = MagicMock()
m1.tactic = "Initial Access"
m1.technique_id = "T1566"
m1.technique_name = "Phishing"
m1.analysis_justification = "Lure sent via email."
mitre_mappings = [m1]

print("Testing PDF generation...")
pdf_path = reporting.generate_single_impact_pdf(report, mitre_mappings)
print(f"PDF generated at: {pdf_path}")

print("Testing DOCX generation...")
docx_path = reporting.generate_single_impact_docx(report, mitre_mappings)
print(f"DOCX generated at: {docx_path}")

# Cleanup
# os.remove(pdf_path)
# os.remove(docx_path)
