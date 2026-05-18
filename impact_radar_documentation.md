# Impact Radar System: End-to-End Documentation

The **Impact Radar** is the core proactive threat intelligence component of the Cyber Incident Report Manager. It utilizes a hybrid approach (Deterministic Heuristics + AI/Gemma Mapping) to analyze global threats and pinpoint exactly which ones pose a direct risk to your organization's specific technical footprint and industry.

This document outlines the entire lifecycle of a threat as it flows through the Impact Radar system.

---

## 1. Tech Stack Inventory Configuration

The foundation of the Impact Radar is your **Company Profile**. For the radar to effectively filter out noise, it needs to know what technologies your organization relies on.

*   **Access:** Navigate to the **Technology Inventory** tab in the dashboard.
*   **Company Name & Industry:** Sets the broad context. The `Industry` field is particularly critical (e.g., setting this to "Finance" triggers aggressive, industry-specific AI threat flagging).
*   **Tech Stack:** You can define a comprehensive list of assets, including:
    *   Operating Systems (e.g., Windows, Linux)
    *   Frameworks & Languages (e.g., React, Java, Python)
    *   Infrastructure (e.g., AWS, Azure, Vercel)
    *   *Note: Version numbers can also be specified for highly targeted CVE matching.*

> [!TIP]
> **Pro Tip:** Keep your tech stack updated. The more precise your inventory, the higher the confidence of the AI Map engine when scoring threats.

---

## 2. Threat Scanning Engines (Dual-Engine Logic)

When a new Cyber Incident or CVE is collected by the system, it is automatically passed through the Impact Radar's dual-engine analysis pipeline.

### A. Heuristic Engine (Deterministic Match)
The first layer is a lightning-fast deterministic scan.
*   **Logic:** It performs an exact string match between your `Tech Stack` inventory and the headers/titles of the incoming threat or the "Affected Products" list of a CVE.
*   **Result:** If a match is found, the threat is instantly flagged with a `score` of 100, a `status` of "Yes", and the `detection_method` is recorded as **Heuristic**.

### B. AI Map Engine (Gemma 2B)
If the Heuristic engine doesn't find an obvious header match, the system falls back to the deep AI analysis using the local Gemma model.
*   **Logic:** The AI acts as a Senior Cyber Threat Analyst. It reads the full incident description and cross-references it against your Company Name, Industry, and full Tech Stack context.
*   **Financial Aggressiveness:** If your industry is set to "Finance", the AI is explicitly instructed to aggressively flag Banking Trojans, Ransomware, and Data Exfiltration campaigns, even if your exact tech stack isn't explicitly named in the breach report.
*   **Result:** The AI returns a JSON payload containing:
    *   `status`: "Yes" or "No"
    *   `score`: 0-100 proximity rating.
    *   `reason`: A 1-2 sentence contextual explanation of the risk vector.
    *   `method`: Recorded as **AI Map**.

---

## 3. Global Search and Pagination (Backend Optimization)

As the database of incidents and CVEs grows, finding specific threats requires robust searching. The system implements a highly optimized **Backend Pagination and Search** architecture.

*   **How it Works:** When you use the search bar in the *Threat Command Feed* or *Vulnerability DB*, the request is sent directly to the SQLite backend.
*   **Search Scope:** The backend performs an `ILIKE` (case-insensitive) search across both the `title` and `description` of the records. 
*   **Data Delivery:** Instead of sending thousands of records to your browser (which would cause lag), the database calculates the total matching records and sends back exactly the 50 items (or your chosen limit) needed for the current page.
*   **Interactive Jumping:** You can seamlessly jump between result pages using the numbered pagination UI (e.g., `1 | 2 | 3 | 4`) without losing your search context.

---

## 4. Manual Review Queue

While the AI is powerful, human verification is the final step in the intelligence lifecycle. Threats that are flagged by the engines but require human sign-off are routed to the **Manual Review** queue.

*   **Access:** Navigate to the **Manual Review** tab.
*   **Pending Items:** You will see a combined list of both Cyber Incidents and CVEs that have a `review_status` of **Pending**.
*   **Triage Actions:**
    *   **Approve (True Positive):** Confirms the AI/Heuristic engine was correct. The threat is fully integrated into your verified Impact Reports.
    *   **Dismiss (False Positive):** Rejects the flag. This helps clean up your dashboard and provides a feedback loop for future tuning.
*   **Context:** While reviewing, you can click on any incident to open the **Raw Intelligence Modal** and read the full AI-generated executive briefs, MITRE ATT&CK mappings, and forensic deep-dives before making your decision.

> [!IMPORTANT]
> **Workflow Summary:**
> Update Tech Stack ➔ System Collects Intel ➔ Dual-Engine Scan (Heuristic/AI) ➔ Search & Filter ➔ Manual Review (Approve/Dismiss) ➔ Final Impact Report.
