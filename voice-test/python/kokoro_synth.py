#!/usr/bin/env python3
"""stdin: JSON { text, voice?, speed?, lang? } → stdout: WAV bytes"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_DIR = ROOT / "models"


def resolve_kokoro_paths():
    model_dir = Path(os.environ.get("KOKORO_MODEL_DIR", DEFAULT_MODEL_DIR))
    voices = Path(os.environ.get("KOKORO_VOICES", model_dir / "voices-v1.0.bin"))
    if os.environ.get("KOKORO_ONNX"):
        return Path(os.environ["KOKORO_ONNX"]), voices
    for name in ("kokoro-v1.0.onnx", "kokoro-v1.0.fp16.onnx", "kokoro-v1.0.int8.onnx"):
        candidate = model_dir / name
        if candidate.is_file():
            return candidate, voices
    return model_dir / "kokoro-v1.0.onnx", voices


def main():
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"invalid json: {exc}"}), file=sys.stderr)
        sys.exit(1)

    text = str(payload.get("text") or "").strip()
    if not text:
        print(json.dumps({"error": "empty text"}), file=sys.stderr)
        sys.exit(1)

    voice = str(payload.get("voice") or "af_bella").strip()
    speed = float(payload.get("speed") or 1.0)
    lang = str(payload.get("lang") or "en-us").strip()
    mode = str(payload.get("kokoroMode") or "").strip().lower()

    if mode == "ru" or lang == "ru" or voice.lower() in {"sveta", "masha", "dima"}:
        import subprocess

        script = Path(__file__).resolve().parent / "kokoro_ru_synth.py"
        proc = subprocess.run(
            [sys.executable, str(script)],
            input=json.dumps({"text": text, "voice": voice.lower(), "speed": speed}).encode("utf-8"),
            capture_output=True,
        )
        if proc.returncode != 0:
            err = proc.stderr.decode("utf-8", errors="replace").strip()
            try:
                err = json.loads(err).get("error", err)
            except json.JSONDecodeError:
                pass
            print(json.dumps({"error": err}), file=sys.stderr)
            sys.exit(proc.returncode or 3)
        sys.stdout.buffer.write(proc.stdout)
        return

    try:
        import io
        import numpy as np
        import soundfile as sf
        from kokoro_onnx import Kokoro
    except ImportError as exc:
        print(
            json.dumps(
                {
                    "error": f"Kokoro: установите зависимости — pip install -r voice-test/requirements.txt ({exc})"
                }
            ),
            file=sys.stderr,
        )
        sys.exit(2)

    onnx_path, voices_path = resolve_kokoro_paths()
    if not onnx_path.is_file() or not voices_path.is_file():
        print(
            json.dumps(
                {
                    "error": (
                        "Kokoro: положите kokoro-v1.0.onnx и voices-v1.0.bin в voice-test/models/ "
                        "или задайте KOKORO_ONNX / KOKORO_VOICES "
                        "(релиз: github.com/thewh1teagle/kokoro-onnx)"
                    )
                }
            ),
            file=sys.stderr,
        )
        sys.exit(4)

    try:
        kokoro = Kokoro(str(onnx_path), str(voices_path))
        samples, sample_rate = kokoro.create(text, voice=voice, speed=speed, lang=lang)
        buf = io.BytesIO()
        sf.write(buf, np.asarray(samples), sample_rate, format="WAV")
        sys.stdout.buffer.write(buf.getvalue())
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": f"Kokoro: {exc}"}), file=sys.stderr)
        sys.exit(3)


if __name__ == "__main__":
    main()
