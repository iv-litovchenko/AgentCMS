#!/usr/bin/env python3
"""stdin: JSON { text, voice?, speed? } → stdout: WAV bytes (kokoro-ru / ONNX)"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RU_DIR = Path(os.environ.get("KOKORO_RU_DIR", ROOT / "models" / "kokoro-ru"))

NORMALIZE = {
    'u"': "u",
    "ɭ": "l",
    "ɵ": "o",
    "ʑ": "ʒ",
    "ʐ": "ʒ",
    "ʧʲ": "ʧ",
}


def configure_espeak():
    try:
        import espeakng_loader

        os.environ["PHONEMIZER_ESPEAK_LIBRARY"] = espeakng_loader.get_library_path()
        if hasattr(espeakng_loader, "get_data_path"):
            os.environ.setdefault("PHONEMIZER_ESPEAK_PATH", espeakng_loader.get_data_path())
    except ImportError:
        pass


def g2p_misaki_fallback(text: str, ru_root: Path, config_path: Path):
    import json as json_mod
    from phonemizer.backend.espeak.wrapper import EspeakWrapper
    from misaki import espeak as misaki_espeak

    espeak_data = ru_root / "espeak-data"
    EspeakWrapper.set_data_path(str(espeak_data))
    backend = misaki_espeak.EspeakG2P(language="ru")
    ipa = backend(text)
    if isinstance(ipa, tuple):
        ipa = ipa[0]
    ipa = str(ipa).replace(" ", "")
    for old, new in NORMALIZE.items():
        ipa = ipa.replace(old, new)
    cfg = json_mod.loads(config_path.read_text(encoding="utf-8"))
    vocab = set(cfg["vocab"])
    oov = {c for c in ipa if c not in vocab}
    return ipa, oov


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

    voice = str(payload.get("voice") or "sveta").strip().lower()
    if voice not in {"sveta", "masha", "dima"}:
        print(json.dumps({"error": f"unknown ru voice: {voice}"}), file=sys.stderr)
        sys.exit(1)

    speed = float(payload.get("speed") or 1.0)
    ru_root = Path(os.environ.get("KOKORO_RU_DIR", RU_DIR))

    try:
        import io
        import json as json_mod
        import numpy as np
        import onnxruntime as ort
        import soundfile as sf
    except ImportError as exc:
        print(json.dumps({"error": f"Kokoro RU deps: pip install onnxruntime soundfile ({exc})"}), file=sys.stderr)
        sys.exit(2)

    if not ru_root.is_dir():
        print(json.dumps({"error": "Kokoro RU: npm run voice:test:kokoro-ru"}), file=sys.stderr)
        sys.exit(4)

    configure_espeak()

    onnx_name = "model_dima.onnx" if voice == "dima" else "model.onnx"
    onnx_path = ru_root / "onnx" / onnx_name
    if not onnx_path.is_file():
        onnx_path = ru_root / "onnx" / "model_quantized.onnx"
    voice_bin = ru_root / "voices" / f"{voice}.bin"
    config_path = ru_root / "kokoro-config.json"
    espeak_data = ru_root / "espeak-data"

    for path in (onnx_path, voice_bin, config_path):
        if not path.is_file():
            print(json.dumps({"error": f"нет файла {path.name} — npm run voice:test:kokoro-ru"}), file=sys.stderr)
            sys.exit(4)

    try:
        ipa = None
        oov = set()
        sys.path.insert(0, str(ru_root))
        try:
            from ru_g2p import RuG2P

            g2p = RuG2P(espeak_data=espeak_data, vocab_path=config_path)
            ipa, oov = g2p(text)
        except Exception:
            ipa, oov = g2p_misaki_fallback(text, ru_root, config_path)

        if oov:
            print(json.dumps({"error": f"Kokoro RU OOV symbols: {''.join(sorted(oov))}"}), file=sys.stderr)
            sys.exit(5)

        cfg = json_mod.loads(config_path.read_text(encoding="utf-8"))
        vocab = cfg["vocab"]
        ids = [vocab[c] for c in ipa if c in vocab]
        if not ids:
            print(json.dumps({"error": "Kokoro RU: пустая фонемная строка"}), file=sys.stderr)
            sys.exit(5)

        style = np.fromfile(voice_bin, dtype=np.float32).reshape(510, 256)
        idx = max(0, min(len(ipa) - 1, style.shape[0] - 1))
        style_row = style[idx][None, :].astype(np.float32)

        sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        audio = sess.run(
            None,
            {
                "input_ids": np.array([[0, *ids, 0]], dtype=np.int64),
                "style": style_row,
                "speed": np.array([speed], dtype=np.float32),
            },
        )[0]
        samples = np.asarray(audio).squeeze()
        buf = io.BytesIO()
        sf.write(buf, samples, 24000, format="WAV")
        sys.stdout.buffer.write(buf.getvalue())
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": f"Kokoro RU: {exc}"}), file=sys.stderr)
        sys.exit(3)


if __name__ == "__main__":
    main()
