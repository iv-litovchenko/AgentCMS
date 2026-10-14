#!/usr/bin/env python3
"""stdin: JSON { text } → stdout: WAV bytes"""
import json
import sys


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

    try:
        import io
        import torch
        import torchaudio
        from chatterbox.tts import ChatterboxTTS
    except ImportError as exc:
        print(
            json.dumps(
                {
                    "error": f"Chatterbox: pip install -r voice-test/requirements.txt ({exc})"
                }
            ),
            file=sys.stderr,
        )
        sys.exit(2)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        model = ChatterboxTTS.from_pretrained(device=device)
        wav = model.generate(text)
        if isinstance(wav, torch.Tensor):
            tensor = wav.detach().cpu()
            if tensor.dim() == 1:
                tensor = tensor.unsqueeze(0)
        else:
            import numpy as np

            arr = np.asarray(wav, dtype="float32")
            tensor = torch.from_numpy(arr)
            if tensor.dim() == 1:
                tensor = tensor.unsqueeze(0)

        buf = io.BytesIO()
        torchaudio.save(buf, tensor, model.sr, format="wav")
        sys.stdout.buffer.write(buf.getvalue())
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": f"Chatterbox: {exc}"}), file=sys.stderr)
        sys.exit(3)


if __name__ == "__main__":
    main()
