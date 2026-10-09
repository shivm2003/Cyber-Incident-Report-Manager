from __future__ import annotations
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any
from .config import DATABASE_PATH


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def connect():
    con = sqlite3.connect(DATABASE_PATH, timeout=30)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_db() -> None:
    with connect() as con:
        con.execute("PRAGMA journal_mode=WAL")
        con.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_name TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                metadata_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                UNIQUE(source_name, chunk_index)
            )
        """)
        con.execute("CREATE INDEX IF NOT EXISTS idx_chunks_source ON knowledge_chunks(source_name)")
        con.execute("""
            CREATE TABLE IF NOT EXISTS generated_reports (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                command TEXT NOT NULL,
                markdown TEXT NOT NULL,
                sources_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


def insert_chunks(source_name: str, chunks: list[dict[str, Any]]) -> int:
    with connect() as con:
        # Re-ingesting the same file replaces its previous chunks to avoid stale duplicates.
        con.execute("DELETE FROM knowledge_chunks WHERE source_name = ?", (source_name,))
        stamp = now_iso()
        con.executemany(
            """INSERT INTO knowledge_chunks
               (source_name, chunk_index, content, embedding_json, metadata_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            [(
                source_name,
                int(item["chunk_index"]),
                item["content"],
                json.dumps(item["embedding"]),
                json.dumps(item.get("metadata", {}), ensure_ascii=False),
                stamp,
            ) for item in chunks],
        )
    return len(chunks)


def get_all_chunks() -> list[dict[str, Any]]:
    with connect() as con:
        rows = con.execute("SELECT * FROM knowledge_chunks ORDER BY id").fetchall()
    return [{
        "id": row["id"],
        "source_name": row["source_name"],
        "chunk_index": row["chunk_index"],
        "content": row["content"],
        "embedding": json.loads(row["embedding_json"]),
        "metadata": json.loads(row["metadata_json"]),
        "created_at": row["created_at"],
    } for row in rows]


def knowledge_summary() -> dict[str, Any]:
    with connect() as con:
        total = con.execute("SELECT COUNT(*) AS n FROM knowledge_chunks").fetchone()["n"]
        rows = con.execute("""
            SELECT source_name, COUNT(*) AS chunks, MAX(created_at) AS indexed_at
            FROM knowledge_chunks GROUP BY source_name ORDER BY source_name
        """).fetchall()
    return {"chunk_count": total, "sources": [dict(row) for row in rows]}


def remove_source(source_name: str) -> int:
    with connect() as con:
        cur = con.execute("DELETE FROM knowledge_chunks WHERE source_name = ?", (source_name,))
        return cur.rowcount


def clear_knowledge() -> int:
    with connect() as con:
        cur = con.execute("DELETE FROM knowledge_chunks")
        return cur.rowcount


def save_report(report_id: str, title: str, command: str, markdown: str, sources: list[dict[str, Any]]) -> None:
    with connect() as con:
        con.execute("""INSERT OR REPLACE INTO generated_reports
            (id, title, command, markdown, sources_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)""",
            (report_id, title, command, markdown, json.dumps(sources, ensure_ascii=False), now_iso()))


def get_report(report_id: str) -> dict[str, Any] | None:
    with connect() as con:
        row = con.execute("SELECT * FROM generated_reports WHERE id = ?", (report_id,)).fetchone()
    if not row:
        return None
    return {
        "id": row["id"], "title": row["title"], "command": row["command"],
        "markdown": row["markdown"], "sources": json.loads(row["sources_json"]),
        "created_at": row["created_at"],
    }


def list_reports(limit: int = 20) -> list[dict[str, Any]]:
    with connect() as con:
        rows = con.execute("SELECT id, title, command, created_at FROM generated_reports ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]
