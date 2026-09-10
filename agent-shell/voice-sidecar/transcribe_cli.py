#!/usr/bin/env python3
"""CLI: PCM base64 + settings JSON (stdin) → transcript JSON (stdout)."""

from __future__ import annotations

import base64
import json
import sys

from stt import normalize_stt_engine, transcribe_pcm


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid JSON: {exc}", "text": ""}, ensure_ascii=False))
        return 1

    pcm_b64 = str(payload.get("pcmBase64") or "").strip()
    if not pcm_b64:
        print(json.dumps({"error": "pcmBase64 is required", "text": ""}, ensure_ascii=False))
        return 1

    try:
        pcm = base64.b64decode(pcm_b64)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": f"Invalid pcmBase64: {exc}", "text": ""}, ensure_ascii=False))
        return 1

    settings = payload.get("settings") if isinstance(payload.get("settings"), dict) else {}
    language = str(settings.get("sttLang") or payload.get("language") or "ru-RU").strip() or "ru-RU"
    engine = normalize_stt_engine(str(settings.get("sttEngine") or payload.get("engine") or "google"))

    result = transcribe_pcm(pcm, language=language, engine=engine, settings=settings)
    print(
        json.dumps(
            {
                "text": str(result.text or "").strip(),
                "error": str(result.error or "").strip(),
                "engine": str(result.engine or engine),
                "durationSec": float(result.duration_sec or 0),
                "peakRms": float(result.peak_rms or 0),
            },
            ensure_ascii=False,
        )
    )
    return 0 if not result.error else 2


if __name__ == "__main__":
    raise SystemExit(main())
