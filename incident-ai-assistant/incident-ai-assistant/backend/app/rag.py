from __future__ import annotations
import math
from typing import Any
from . import db
from .config import RAG_MIN_SCORE, RAG_TOP_K
from .ollama_client import embed_texts


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or len(a) != len(b):
        return -1.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return -1.0
    return dot / (norm_a * norm_b)


def index_source(source_name: str, chunks: list[str], metadata: dict[str, Any] | None = None) -> int:
    vectors = embed_texts(chunks)
    items = [
        {"chunk_index": i, "content": content, "embedding": vectors[i], "metadata": metadata or {}}
        for i, content in enumerate(chunks)
    ]
    return db.insert_chunks(source_name, items)


def retrieve(query: str, top_k: int | None = None, min_score: float | None = None) -> list[dict[str, Any]]:
    all_chunks = db.get_all_chunks()
    if not all_chunks:
        return []
    query_vector = embed_texts([query])[0]
    ranked = []
    for chunk in all_chunks:
        score = cosine_similarity(query_vector, chunk["embedding"])
        ranked.append({**chunk, "score": score})
    ranked.sort(key=lambda row: row["score"], reverse=True)
    k = top_k or RAG_TOP_K
    threshold = RAG_MIN_SCORE if min_score is None else min_score
    return [row for row in ranked[:k] if row["score"] >= threshold]


def public_source(chunk: dict[str, Any], source_id: str) -> dict[str, Any]:
    return {
        "source_id": source_id,
        "filename": chunk["source_name"],
        "chunk": chunk["chunk_index"] + 1,
        "score": round(float(chunk["score"]), 3),
        "excerpt": chunk["content"][:320].replace("\n", " "),
    }
