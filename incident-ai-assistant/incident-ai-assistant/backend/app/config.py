from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "gemma4:e4b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "embeddinggemma")
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "incident_ai.sqlite3"))).expanduser()
REPORTS_DIR = Path(os.getenv("REPORTS_DIR", str(DATA_DIR / "reports"))).expanduser()
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))
RAG_TOP_K = max(1, min(12, int(os.getenv("RAG_TOP_K", "6"))))
RAG_MIN_SCORE = float(os.getenv("RAG_MIN_SCORE", "0.15"))
CORS_ORIGINS = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",") if x.strip()]

DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
