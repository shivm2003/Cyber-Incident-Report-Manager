For CVE :-(For Now) Previous saved left and it will applicable for new data . 
I want to update the the Vulnerability DB (CVE) when the Data automatically Fetched for the NVD API in every 3 hour and also update it and saved to the datebase , after saving the data Impact Radar should be automatically run when any CVE data found company impact Detected then it should be passed with the JIRA Ticket SYstem and Also attachemnts with the CVE Extractor with the JIRA.

I all the details should be passed to the JIRA Ticket and also attachments with the CVE Extractor with the JIRA.
and saved to the previous pushed to JIRA data, all the data should be shows what i pushed and time to push at all .
Every time check with the CVE previous report published (Duplicany check should be happen)


For Incident Command  :-(For Now) Previous saved left and it will applicable for new data .
For the Intelligence Command feed crawl the data every 3 hour and also update it and saved to the datebase , after saving the data Impact Radar should be automatically run when any incident are impact during the scan , then that should be passed to AI Analysis Impact System for Report , if there is any CVE found then it must be extracted and passed to the CVE Extractor report and incident report should be passed and details should be automatically fill push to JIRA with Attachment and also saved to the DB what Report pushed .

Every time check with the CVE previous report and duplicany check for incident published (Duplicany check should be happen)








# Automated Jira Publishing & Crawling Scheduler Implementation Plan

This plan specifically addresses your requirements for both **CVE Data Automation** and **Incident Command Automation** with a 3-hour polling cycle, robust duplication checking, and complete Jira integration with PDF attachments.

---

## Proposed Changes

### 1. Database Schema Updates
To track everything pushed to Jira and ensure we display historical data correctly, we will add a new tracking table.

#### [MODIFY] [models.py](file:///c:/Users/shivam/Desktop/VAPT/Cyber-Incident-Report-Manager/backend/models.py)
Add the `JiraPushHistory` model to keep track of automatically pushed reports. This handles the "all the data should be shows what i pushed and time to push at all" requirement.
```python
class JiraPushHistory(Base):
    __tablename__ = "jira_push_history"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String)  # 'cve' or 'incident'
    entity_id = Column(String)    # CVE-ID or Incident Database ID
    summary = Column(String)
    ticket_key = Column(String, nullable=True)
    status = Column(String)       # 'success' or 'failed'
    error_message = Column(String, nullable=True)
    pushed_at = Column(DateTime, default=datetime.datetime.utcnow)
```

#### [MODIFY] [schemas.py](file:///c:/Users/shivam/Desktop/VAPT/Cyber-Incident-Report-Manager/backend/schemas.py)
Add the `JiraPushHistoryResponse` Pydantic schema for the frontend.

#### [MODIFY] [migrate.py](file:///c:/Users/shivam/Desktop/VAPT/Cyber-Incident-Report-Manager/backend/migrate.py)
Add the `jira_push_history` schema to the auto-migration tool.

---

### 2. For CVE (Vulnerability DB)
- **3-Hour Scheduled Fetch**: The background scheduler will call the NVD API (`fetch_nvd_cves`) every 3 hours.
- **Duplication Check**: The existing duplication check (`models.CVE.cve_id == cve_id`) ensures previously saved data is ignored and only new data applies. Additionally, we will verify the Jira ticket hasn't already been pushed via the `jira_push_history` table.
- **Impact Radar Trigger**: For any *newly* inserted CVE, the system will instantly run `analyze_cve_impact`.
- **Jira Automation**: If company impact is detected (score >= 70):
  - A PDF will be generated via a new `generate_single_cve_pdf()` function.
  - A Jira ticket will be created automatically.
  - The CVE Extractor PDF will be attached to the Jira ticket.
  - The action will be recorded in the `JiraPushHistory` DB table.

---

### 3. For Incident Command
- **3-Hour Intelligence Feed Crawl**: The scheduler will also run `fetch_rss_feeds` every 3 hours.
- **Duplication Check**: The existing check (URL matching) ensures only new incidents are processed.
- **Impact Radar Trigger**: The system will automatically run `analyze_dynamic_impact` on new incidents.
- **Deep-Dive Analysis & CVE Extraction**: If the incident has company impact:
  - It triggers the AI Analysis Impact System (`analyze_deep_impact`) to build an Incident Impact Report.
  - The system scans the incident description and crawled article for CVE IDs using regex (`CVE-\d{4}-\d{4,7}`).
  - Extracted CVEs are validated against the DB (or pulled from NVD API if missing) and passed to the CVE Extractor Report builder.
- **Jira Automation**:
  - A Jira ticket is created for the Incident.
  - **Attachments**: The Incident Impact Report PDF *AND* any extracted CVE Extractor PDFs are uploaded.
  - The action is recorded in the `JiraPushHistory` DB table.

---

### 4. Scheduler Core & REST Endpoints
#### [MODIFY] [main.py](file:///c:/Users/shivam/Desktop/VAPT/Cyber-Incident-Report-Manager/backend/main.py)
1. **FastAPI Background Loop**: An `asyncio.sleep(3 * 3600)` loop that triggers on FastAPI startup event.
2. **API Routes**:
   - `GET /api/jira/push-history`: Fetch the ticket publishing history logs to show in the UI.
   - `POST /api/automation/run`: Manually trigger the crawler, analysis, and Jira push automation instantly (useful for testing without waiting 3 hours).
   - `GET /api/automation/status`: Show scheduler status.

---

### 5. Frontend UI Updates
#### [MODIFY] [JiraPublisher.jsx](file:///c:/Users/shivam/Desktop/VAPT/Cyber-Incident-Report-Manager/frontend/src/pages/JiraPublisher.jsx)
1. Add an "Automation Control Panel" to manually trigger the 3-hour scan cycle for immediate testing.
2. Fetch and render the Jira push history table at the bottom of the page showing exact timestamps, items pushed, and their success status.

---

## Verification Plan

### Automated/API Verification
- Verify the new schema table is created by running `python migrate.py`.
- Call `POST /api/automation/run` manually to trigger feed fetch, impact radar scan, CVE extraction, PDF generation, and JIRA ticket creation.
- Check the console logs for duplication checks passing correctly.
- Fetch `GET /api/jira/push-history` to ensure records persist correctly.

### Manual Verification
- Go to the **Jira Publisher** tab in the browser.
- Verify the "Push History" component loads with historical records.
- Click the "Sync & Analyze Now" manual button and verify a JIRA ticket appears in your Atlassian board with the appropriate PDF attachments for both Incidents and CVEs.
