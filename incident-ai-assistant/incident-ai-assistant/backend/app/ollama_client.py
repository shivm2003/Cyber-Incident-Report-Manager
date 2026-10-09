from __future__ import annotations
from typing import Any
import requests
from .config import OLLAMA_BASE_URL, OLLAMA_CHAT_MODEL, OLLAMA_EMBED_MODEL


class OllamaError(RuntimeError):
    pass


def list_models() -> list[str]:
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        response.raise_for_status()
        return [m.get("name", "") for m in response.json().get("models", [])]
    except requests.RequestException as exc:
        raise OllamaError(f"Cannot reach Ollama at {OLLAMA_BASE_URL}: {exc}") from exc


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    # Batch inputs to reduce local HTTP overhead and memory pressure.
    all_embeddings: list[list[float]] = []
    for start in range(0, len(texts), 24):
        batch = texts[start:start + 24]
        try:
            response = requests.post(
                f"{OLLAMA_BASE_URL}/api/embed",
                json={"model": OLLAMA_EMBED_MODEL, "input": batch, "truncate": True},
                timeout=180,
            )
            response.raise_for_status()
            embeddings = response.json().get("embeddings", [])
            if len(embeddings) != len(batch):
                raise OllamaError("Ollama returned a different number of embeddings than requested.")
            all_embeddings.extend(embeddings)
        except requests.RequestException as exc:
            detail = getattr(getattr(exc, "response", None), "text", "")
            raise OllamaError(
                f"Embedding request failed for model '{OLLAMA_EMBED_MODEL}'. "
                f"Ensure the model is installed with `ollama pull {OLLAMA_EMBED_MODEL}`. {detail or exc}"
            ) from exc
    return all_embeddings


def chat(messages: list[dict[str, str]], temperature: float = 0.1) -> str:
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": OLLAMA_CHAT_MODEL,
                "messages": messages,
                "stream": False,
                "options": {"temperature": temperature},
            },
            timeout=300,
        )
        response.raise_for_status()
        return str(response.json().get("message", {}).get("content", "")).strip()
    except requests.RequestException as exc:
        detail = getattr(getattr(exc, "response", None), "text", "")
        raise OllamaError(
            f"Chat request failed for model '{OLLAMA_CHAT_MODEL}'. "
            f"Ensure it is installed with `ollama pull {OLLAMA_CHAT_MODEL}`. {detail or exc}"
        ) from exc
