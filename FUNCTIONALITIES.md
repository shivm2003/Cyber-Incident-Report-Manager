The Company Radar (Impact Radar) operates as an autonomous correlation engine that determines the "proximity" of a global threat to your specific organization. It works based on three primary pillars of logic:

1. Technology Inventory Correlation (The "Exact Match" Layer)
Whenever a new CVE or Incident arrives, the system scans the Affected Products and Technical Descriptions. It performs a real-time cross-reference against the Tech Stack you saved in your Inventory.

Example: If you have Microsoft Azure in your inventory and a new vulnerability is discovered in Azure, the Radar identifies an "Exact Match" and moves the threat into the Critical Proximity Zone (closest to the center).
2. Semantic Industry Analysis (The "Context" Layer)
The Radar uses Shivam AI (Gemma:2b) to analyze the "Target Entity" and "Industry" of global breaches.

Example: If you are in the Finance industry and a major bank in India is hit by a ransomware attack, the AI identifies the shared industry risk and increases the threat's proximity score, even if no specific software match is found.
3. Dynamic Proximity Scoring (0 - 100)
Every threat is assigned a Company Impact Score based on its severity and relevance:

Inner Circle (Score 80-100): Direct matches to your tech stack or high-severity attacks on your direct industry peers.
Middle Circle (Score 50-79): General threats to your technology ecosystem (e.g., a vulnerability in a library you use, but not in your main product).
Outer Circle (Score <50): Global noise or threats with low relevance to your specific region or stack.
Visual Pipeline Flow:
Crawl: New Intel arrives from RSS/NVD.
Extract: AI extracts the vendor, product, and industry from the raw data.
Correlate: The system compares these against your Tech Stack.
Visualize: The threat is plotted on the Radar. Items with a score >= 70 are automatically sent to your Manual Review Queue for analyst validation.
In summary: The Radar translates global noise into a prioritized visual map tailored specifically to your organization's digital footprint.