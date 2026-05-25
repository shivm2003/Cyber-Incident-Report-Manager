# Cyber Incident Intelligence Automation Pipeline

This document outlines the architecture, features, and workflows of the automated Threat Intelligence and Jira pipeline implemented in this project. 

The system is designed to run completely hands-off, continuously scanning the web for new vulnerabilities and incidents, analyzing them against the company's tech stack using AI, and automatically escalating critical threats directly to the engineering team's Jira board.

## 1. Core Architecture

The automation is driven by a non-blocking asynchronous Python background scheduler (`automation_scheduler.py`) running alongside the FastAPI application.

### The Automation Cycle
When triggered, the system executes the following strict order of operations:
1. **NVD API Synchronization**: Queries the National Vulnerability Database for new CVEs.
2. **CVE Impact Radar**: Runs the new CVEs through the generate a `company_impact_score`.
3. **CVE Jira Push**: If the CVE's impact score is `>= 70`, the system automatically generates a professional PDF forensic report (`reporting.py`) and pushes a structured ticket to Jira Cloud with the PDF attached.
4. **RSS Incident Synchronization**: Crawls leading cybersecurity news feeds for new threat incidents.
5. **Incident Impact Radar**: Analyzes new incidents using AI to extract MITRE TTPs and calculate a company impact score.
6. **Incident Jira Push**: Similar to CVEs, high-impact incidents (`>= 70`) generate PDFs and are automatically escalated to Jira.

*Duplicate checks are enforced at the database level to ensure tickets are never pushed twice.*

## 2. Dynamic UI Control Panel

The React frontend (`JiraPublisher.jsx`) serves as the command center for this automation pipeline.

### Real-Time Status Tracking
The UI provides live visibility into what the backend scheduler is actively doing. The "Task Status" actively updates with detailed steps such as:
- `Fetching NVD API...`
- `Processing X new CVEs...`
- `Crawling Incident Data...`
- `Analyzing impact for Y new incidents...`
- `Idle`

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
- The UI provides checkboxes and dropdowns allowing you to selectively choose which engines to run (NVD API or Incident Feeds) and how far back to scan (Today, Last 7 Days, Last 30 Days).
- *Note: Any manual data fetching triggered from other parts of the application (e.g., the "Fetch Live Data" button on the Dashboard) is also hooked into the automation pipeline, ensuring that any newly discovered data is always evaluated for Jira escalation.*

## 4. Audit Trail & History

All automated actions are permanently recorded in the database using the `JiraPushHistory` model. 
- The **Ticket Publishing History** table in the UI displays an immutable log of every ticket creation attempt, including the exact Date/Time, Entity (CVE/Incident), Ticket Key, and whether the push was a `Success` or `Failed` (along with error messages for easy debugging).
