# Cyber Incident Intelligence Automation Pipeline

This document outlines the architecture, features, and workflows of the automated Threat Intelligence and Jira pipeline implemented in this project. 

The system is designed to run completely hands-off, continuously synchronizing with the National Vulnerability Database (NVD API), analyzing new vulnerabilities deterministically against the company's tech stack, and automatically escalating critical threats directly to the engineering team's Jira board.

## 1. Core Architecture

The automation is driven by a non-blocking asynchronous Python background scheduler (`automation_scheduler.py`) running alongside the FastAPI application.

### The Automation Cycle
When triggered, the system executes the following strict order of operations:

1. **NVD API Synchronization**: Queries the National Vulnerability Database for new CVEs. Vendor and product names are automatically extracted from CPE strings during ingestion.
2. **Deterministic Version Scanner**: Runs each new CVE through the version-aware Impact Radar to identify exact product/version overlaps and generate a `company_impact_score`.
3. **Product Grouping**: All high-impact CVEs (score `>= 60`) are grouped by their matched product (e.g., all Java CVEs into one group, all Apache CVEs into another).
4. **Duplicate Check**: Each CVE is checked against the push history to prevent re-pushing already-ticketed vulnerabilities.
5. **Batch Jira Push**: For each product group, the system creates **one consolidated Jira ticket** containing all related CVEs. Individual PDF forensic reports are generated per CVE and attached to the batch ticket.

### Batch Ticketing Example
Instead of creating 5 separate tickets for 5 Java CVEs, the system creates:
- **1 ticket**: `[Vulnerability Batch] Java — 5 CVEs Detected (Critical: 2, High: 3)`
- **5 PDF attachments**: One detailed MITRE-compliant PDF report per CVE

*Duplicate checks are enforced at the database level to ensure tickets are never pushed twice.*

## 2. Dynamic UI Control Panel

The React frontend (`JiraPublisher.jsx`) serves as the command center for this automation pipeline.

### Real-Time Status Tracking
The UI provides live visibility into what the backend scheduler is actively doing. The "Task Status" actively updates with detailed steps such as:
- `Fetching NVD API...`
- `Scanning X CVEs (Impact Radar)...`
- `Grouping CVEs by product and pushing to Jira...`
- `Idle`

### Ticket Publishing History
The history table displays all pushed tickets with distinct entity types:
- **CVE** (red badge): Individual CVE records
- **CVE BATCH** (purple badge): Grouped product-level tickets showing the product name and CVE count

### Dual-Speed Polling System
To ensure a seamless user experience, the UI intelligently polls the backend:
- **Passive Polling (30 seconds)**: While viewing the page, the UI quietly checks for updates every 30 seconds. If the background scheduler pushes a ticket autonomously, it seamlessly appears in the History Table without requiring a page refresh.
- **Active Polling (1.5 seconds)**: When you manually trigger a sync, the UI instantly shifts to rapid 1.5-second polling to deliver the live "Task Status" text updates smoothly.

## 3. Configuration & Overrides

### Background Interval Configuration
By default, the background scheduler runs every 3 hours using the lightweight `"today"` timeframe to save API resources. 
- You can dynamically change this interval (1h, 3h, 6h, 12h, 24h) directly from the dropdown menu in the UI. 
- The scheduler intelligently waits for its full cycle upon server boot to prevent immediate API spam.

### Manual Sync Override
You can trigger the entire pipeline instantly using the **"Sync & Analyze Now"** button. 
- The UI provides dropdowns allowing you to selectively choose how far back to scan NVD data (Today, Last 7 Days, Last 30 Days).
- *Note: Any manual data fetching triggered from other parts of the application (e.g., the "Fetch Live Data" button on the Dashboard) is also hooked into the automation pipeline, ensuring that any newly discovered data is always evaluated for Jira escalation.*

## 4. Audit Trail & History

All automated actions are permanently recorded in the database using the `JiraPushHistory` model. 
- The **Ticket Publishing History** table in the UI displays an immutable log of every ticket creation attempt, including the exact Date/Time (in Indian Standard Time), Entity (CVE or CVE Batch), Ticket Key, and whether the push was a `Success` or `Failed` (along with error messages for easy debugging).
