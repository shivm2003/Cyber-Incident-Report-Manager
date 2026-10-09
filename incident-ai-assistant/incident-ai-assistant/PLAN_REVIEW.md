# AI Incident Intelligence — plan and review

## Goal
Add a command-driven Gemma assistant for incident/crawler data. Chat and generated reports must use the application's indexed records and reference files, with evidence citations and explicit data gaps.

## Reviewed architecture
1. React section (`frontend/AIIncidentAssistant.jsx` + CSS) provides RAG Chat, Report Studio, reference-file upload, index status, report preview, report history, and DOCX/PDF/Markdown download links.
2. FastAPI service exposes `/api/chat`, `/api/reports/generate`, knowledge ingest routes, and report download routes.
3. Local SQLite keeps text chunks, local embedding vectors, and report drafts.
4. Ollama `/api/embed` produces vectors using a dedicated embedding model. Ollama `/api/chat` runs the configured Gemma model.
5. Retrieval picks relevant chunks and passes labelled source evidence to the model. The service also adds a source-reference appendix to each generated report.

## Review findings / choices
- **Evidence first:** no answer/report is generated if the local index is empty or retrieval finds no sufficiently relevant chunks.
- **Model correctness:** Gemma is a chat model; use an embedding model such as `embeddinggemma` for retrieval rather than asking Gemma itself to perform vector similarity.
- **Crawler integration:** upload CSV/JSON/JSONL/HTML/text/PDF/DOCX exports now, or post crawler data directly to `/api/knowledge/ingest-records` / `/api/knowledge/ingest-text`. Direct connection to an existing crawler database must be mapped to its actual schema; that schema was not provided with this request.
- **Local-first:** Ollama is assumed to run on the same machine. SQLite index and exports remain in the backend's local `data` folder by default.
- **Safety and accuracy:** source file content is treated as untrusted data; factual claims should cite `[S1]` references; unsupported details must be labelled as unavailable. Human review is still required before distribution.
- **Export layout:** reports use separate paragraphs/flowables for robust multi-page PDF and DOCX creation.

## Implementation acceptance checks
- Backend source files compile.
- Parsers support crawler-style JSON, JSONL, CSV, TXT, Markdown, log, HTML, PDF text, and DOCX text.
- Re-indexing a source replaces its old chunks instead of silently duplicating the source.
- Chat and report endpoints both run retrieval before asking the LLM.
- Reports are downloadable as Markdown, DOCX, and PDF.
- The browser UI displays retrieval evidence and data-index health.

## Integration note
No application source code was attached in this conversation. This package is a self-contained, drop-in starter; it is not represented as a patch to the user's currently running application. Mount the React component in the existing router and configure CORS to the app's actual origin.
