"""Single-turn LLM reply for voice pipeline (Ollama or OpenAI-compatible API)."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request


DEFAULT_SYSTEM = (
    "Ты Ая — дружелюбный голосовой ассистент. Отвечай по-русски, кратко и по делу, "
    "удобно для прослушивания вслух (1–3 предложения, если не просят подробнее)."
)


class LlmReplyService:
    def __init__(self, backend: str, model: str) -> None:
        self.backend = (backend or "ollama").lower().strip()
        self.model = (model or "").strip()

    def reply(self, user_text: str) -> str:
        system = os.environ.get("VOICE_SYSTEM_PROMPT", DEFAULT_SYSTEM)
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_text.strip()},
        ]
        if self.backend == "openai":
            return self._openai_chat(messages)
        return self._ollama_chat(messages)

    def _ollama_chat(self, messages: list[dict]) -> str:
        try:
            import ollama
        except ImportError as exc:
            raise RuntimeError("Установи ollama: pip install ollama") from exc
        model = self.model or os.environ.get("VOICE_OLLAMA_MODEL", os.environ.get("OLLAMA_MODEL", "llama3"))
        host = os.environ.get("OLLAMA_HOST")
        if host:
            client = ollama.Client(host=host)
            response = client.chat(model=model, messages=messages)
        else:
            response = ollama.chat(model=model, messages=messages)
        content = (response.get("message") or {}).get("content", "")
        return content.strip()

    def _openai_chat(self, messages: list[dict]) -> str:
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("Для openai задай OPENAI_API_KEY в окружении")
        base = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        model = self.model or os.environ.get("VOICE_OPENAI_MODEL", "gpt-4o-mini")
        url = f"{base}/chat/completions"
        body = json.dumps(
            {"model": model, "messages": messages, "temperature": 0.7},
            ensure_ascii=False,
        ).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            raise RuntimeError(f"OpenAI HTTP {exc.code}: {detail}") from exc
        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError("OpenAI: пустой ответ")
        return str(choices[0].get("message", {}).get("content", "")).strip()
