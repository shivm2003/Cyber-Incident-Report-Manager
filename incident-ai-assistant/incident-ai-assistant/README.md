# AI Incident Intelligence — Gemma + RAG

A local-first starter module for a command-driven incident assistant. The UI provides a new **RAG Chat** section and **Report Studio**. The FastAPI service indexes crawled incident exports and reference documents, retrieves relevant chunks for each request, queries Gemma through Ollama, and exports reports to `.docx`, `.pdf`, and `.md`.

> This is a standalone integration starter because the current app's source files and incident database schema were not attached. It includes both the section and the backend API; connect it to the existing app after matching its route and crawler schema.

## Architecture

```text
Existing incident crawler / exported references
    ├── Upload CSV / JSON / JSONL / TXT / MD / LOG / HTML / PDF / DOCX
    └── Or POST crawler records directly to the ingestion API
                  ↓
          Local text extraction + chunking
                  ↓
        Ollama embedding model (embeddinggemma)
                  ↓
        SQLite knowledge index (local vectors)
                  ↓
User command → semantic retrieval → evidence-labelled context
                  ↓
             Gemma via Ollama
              ↙           ↘
       RAG chat answers    Evidence-based report
                            ├── Markdown
                            ├── Word DOCX
                            └── PDF
```

## 1. Prerequisites (Windows / PowerShell)

1. Install and start Ollama. Keep the local Ollama API bound to localhost unless your deployment has a secured design.
2. Ensure your configured Gemma tag exists. The default in `.env.example` is `gemma4:e4b`, matching the requested setup; change `OLLAMA_CHAT_MODEL` to the exact tag installed on your machine if needed.
3. Pull a separate embedding model:

```powershell
ollama pull embeddinggemma
```

4. Confirm Ollama can see the models:

```powershell
ollama list
```

The Ollama API routes used here are `/api/embed` for retrieval embeddings and `/api/chat` for Gemma responses. The embedding model setting must remain the same while indexing and searching the same SQLite database.

## 2. Start the backend

Open PowerShell in this `backend` folder:

```powershell
Set-Location "C:\path\to\incident-ai-assistant\backend"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` if your local model tags or frontend port differ. Then run:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload
```

Open `http://127.0.0.1:8010/docs` for the API, or `http://127.0.0.1:8010/api/health` for the local model/index status.

## 3. Use the React section

Copy `frontend/AIIncidentAssistant.jsx` and `frontend/AIIncidentAssistant.css` into your React app. Add a route, for example with React Router:

```jsx
import AIIncidentAssistant from "./components/AIIncidentAssistant";

// In your existing route table:
<Route
  path="/incident-intelligence"
  element={<AIIncidentAssistant apiBase="http://127.0.0.1:8010" />}
/>
```

Add a dashboard/menu link named **Incident Intelligence** pointing to `/incident-intelligence`. If your frontend origin isn't `http://localhost:3000` or `http://localhost:5173`, update `CORS_ORIGINS` in `.env` and restart the backend.

If your project uses a different router, import and render the component where the new section should appear; no changes to an existing App file are assumed by this starter.

## 4. Index your crawled data

### Upload from the UI

Use **Add source files** and select crawler exports or reference files. Supported formats:

- `.json`, `.jsonl`, `.csv`
- `.txt`, `.md`, `.log`
- `.html`, `.htm`
- `.pdf` (text-based PDFs; scanned PDFs need OCR first)
- `.docx`

The default upload limit is 25 MB per file. The service extracts text, chunks it, gets embeddings locally, and stores vectors plus source names in `backend/data/incident_ai.sqlite3`. Uploading a file with the same name replaces that source's previous index.

### Push structured incident records from the existing crawler

This is the most direct integration point if your crawler runs as code. After a crawl completes, POST the incident records as JSON to the backend.

```powershell
$body = @{
  source_name = "crawler-incidents-2026-10-09.json"
  metadata = @{ crawler = "your-existing-crawler"; run_id = "crawl-001" }
  records = @(
    @{
      incident_id = "INC-001"
      title = "Example finding from crawler"
      severity = "Medium"
      status = "Open"
      asset = "staging-app"
      description = "Use the actual crawler finding text here."
      evidence = "Use captured evidence and source identifiers here."
    }
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://127.0.0.1:8010/api/knowledge/ingest-records" `
  -Method Post -ContentType "application/json" -Body $body
```

You can also post raw text to `/api/knowledge/ingest-text` with `source_name`, `content`, and optional `metadata`. For a real integration, call one of these after a successful crawl and use a unique source name per snapshot. To map this to the existing crawl database automatically, adapt the crawler/database query to send the real records; its schema was not available here.

## 5. Example commands

Chat:

- `Summarize the incidents by severity and status.`
- `Which incidents mention authentication or authorization? Cite source records.`
- `List the highest-risk incidents and identify missing evidence.`

Report Studio:

- `Generate a weekly incident report grouped by severity and status. Include affected assets, evidence, recommendations, and data gaps.`
- `Create a management summary for open High and Critical incidents using only the crawler records.`
- `Prepare a technical incident report for INC-001 with observations, impact if documented, and next steps.`

Chat/report generation requires indexed data. If retrieval does not find relevant evidence, the backend asks the operator to refine the query or index the appropriate records instead of generating an ungrounded report.

## 6. API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Ollama/model/index health |
| POST | `/api/knowledge/ingest` | Upload and index reference files |
| POST | `/api/knowledge/ingest-records` | Push structured crawler records |
| POST | `/api/knowledge/ingest-text` | Push text from crawler pipeline |
| GET | `/api/knowledge/summary` | List indexed sources and chunk counts |
| DELETE | `/api/knowledge/sources/{source_name}` | Remove a source |
| DELETE | `/api/knowledge?confirm=true` | Clear local knowledge index |
| POST | `/api/chat` | Retrieve evidence and answer a question |
| POST | `/api/reports/generate` | Generate and save a report with references |
| GET | `/api/reports` | List recent reports |
| GET | `/api/reports/{id}` | View a saved report |
| GET | `/api/reports/{id}/download?format=pdf` | Download PDF, DOCX, or Markdown |

## 7. Data and privacy notes

- Default backend host is `127.0.0.1`; the web UI calls a loopback API. Avoid binding to `0.0.0.0` or forwarding port 11434 unless you have a reviewed network/security configuration.
- SQLite index, generated reports and intermediate exports reside under `backend/data` by default.
- This starter does not add user authentication/authorization; it is intended for local development. Add authentication and role controls before exposing it to a network or shared users.
- The model may still make mistakes. The service prompts it to cite `[S#]` evidence, and the backend appends a source index to reports, but a reviewer should verify citations, severity and recommendations against the original records.
- Embedding model changes require rebuilding the index. A retrieval threshold is configurable via `RAG_MIN_SCORE`; tune it with representative incidents rather than treating it as a universal confidence score.

## 8. Troubleshooting

- **Ollama unreachable:** run `ollama serve` if it isn't already running, then visit `http://127.0.0.1:11434/api/tags`.
- **Chat model missing:** run `ollama list` and set `OLLAMA_CHAT_MODEL` in `.env` to the exact installed tag. If appropriate, pull that exact tag.
- **Embedding model missing:** run `ollama pull embeddinggemma` and restart the backend.
- **CORS error:** add your exact frontend origin to `CORS_ORIGINS`, separated by commas, and restart.
- **No relevant records:** upload the crawler export or post a fresh snapshot to `/api/knowledge/ingest-records`.
- **PDF extracts no text:** OCR the scanned PDF first; the current parser does not run OCR.

See `PLAN_REVIEW.md` for the plan and the implementation review decisions.
