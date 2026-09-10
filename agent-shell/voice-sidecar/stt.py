"""STT helpers for Agent Shell sidecar."""

from __future__ import annotations

import io
import json
import os
import struct
import tempfile
import threading
import urllib.error
import urllib.request
import wave
from dataclasses import dataclass
from typing import Any

import speech_recognition as sr


RATE = 16000
CHUNK = 1024
CHANNELS = 1
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"

_whisper_models: dict[str, Any] = {}
_whisper_lock = threading.Lock()


def _pcm_to_wav(pcm: bytes, rate: int = RATE) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(pcm)
    return buf.getvalue()


@dataclass
class TranscribeResult:
    text: str = ""
    error: str = ""
    duration_sec: float = 0.0
    peak_rms: float = 0.0
    engine: str = ""


def normalize_stt_engine(value: str | None) -> str:
    raw = str(value or "auto").strip().lower()
    if raw in ("auto", "sidecar", "google"):
        return "google"
    if raw in ("browser", "whisper", "elevenlabs"):
        return raw
    return "google"


def _lang_is_auto(language: str) -> bool:
    return str(language or "").strip().lower() in ("auto", "")


def _lang_code(language: str) -> str | None:
    if _lang_is_auto(language):
        return None
    return (language or "ru-RU").split("-")[0].lower()


def _google_language(language: str) -> str:
    if _lang_is_auto(language):
        return "ru-RU"
    return language or "ru-RU"


def _empty_pcm_result(pcm: bytes) -> TranscribeResult:
    duration_sec = len(pcm) / (RATE * 2) if pcm else 0.0
    peak_rms = rms(pcm) if pcm else 0.0
    return TranscribeResult(
        error="Нет аудио — проверьте микрофон",
        duration_sec=duration_sec,
        peak_rms=peak_rms,
    )


def _read_elevenlabs_api_key(settings: dict[str, Any] | None) -> str:
    settings = settings or {}
    for key in ("sttElevenlabsApiKey", "ttsElevenlabsApiKey"):
        value = str(settings.get(key) or "").strip()
        if value:
            return value
    return str(os.environ.get("ELEVENLABS_API_KEY") or "").strip()


def transcribe_google(pcm: bytes, language: str = "ru-RU") -> TranscribeResult:
    duration_sec = len(pcm) / (RATE * 2) if pcm else 0.0
    peak_rms = rms(pcm) if pcm else 0.0
    if not pcm:
        return _empty_pcm_result(pcm)
    wav_bytes = _pcm_to_wav(pcm)
    recognizer = sr.Recognizer()
    with sr.AudioFile(io.BytesIO(wav_bytes)) as source:
        audio = recognizer.record(source)
    try:
        text = (recognizer.recognize_google(audio, language=language) or "").strip()
        if not text:
            return TranscribeResult(
                error="Google STT вернул пустой текст",
                duration_sec=duration_sec,
                peak_rms=peak_rms,
                engine="google",
            )
        return TranscribeResult(text=text, duration_sec=duration_sec, peak_rms=peak_rms, engine="google")
    except sr.UnknownValueError:
        return TranscribeResult(
            error="Речь не разобрана — говорите чётче или проверьте интернет/VPN",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
            engine="google",
        )
    except sr.RequestError as exc:
        return TranscribeResult(
            error=f"Google STT недоступен: {exc}",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
            engine="google",
        )


def transcribe_whisper(pcm: bytes, language: str = "ru-RU", settings: dict[str, Any] | None = None) -> TranscribeResult:
    duration_sec = len(pcm) / (RATE * 2) if pcm else 0.0
    peak_rms = rms(pcm) if pcm else 0.0
    if not pcm:
        return _empty_pcm_result(pcm)
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return TranscribeResult(
            error="Whisper: установите faster-whisper в voice-sidecar (pip install faster-whisper)",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
            engine="whisper",
        )

    settings = settings or {}
    model_name = str(settings.get("sttWhisperModel") or "base").strip() or "base"
    lang = _lang_code(language)
    auto_lang = lang is None

    with _whisper_lock:
        if model_name not in _whisper_models:
            print(f"⏳ Whisper: загрузка модели «{model_name}»…")
            _whisper_models[model_name] = WhisperModel(model_name, device="cpu", compute_type="int8")
        model = _whisper_models[model_name]

    wav_bytes = _pcm_to_wav(pcm)
    tmp_path = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(wav_bytes)
            tmp_path = tmp.name
        if auto_lang:
            segments, info = model.transcribe(tmp_path, vad_filter=True)
            detected = getattr(info, "language", None) or ""
            if detected:
                print(f"🌐 Whisper auto: язык ≈ {detected}")
        else:
            segments, info = model.transcribe(tmp_path, language=lang, vad_filter=True)
        text = " ".join((segment.text or "").strip() for segment in segments).strip()
        if not text:
            return TranscribeResult(
                error="Whisper не распознал речь",
                duration_sec=duration_sec,
                peak_rms=peak_rms,
                engine="whisper",
            )
        print(f"🧠 Whisper ({model_name}): {text[:120]}")
        return TranscribeResult(text=text, duration_sec=duration_sec, peak_rms=peak_rms, engine="whisper")
    except Exception as exc:  # noqa: BLE001
        return TranscribeResult(
            error=f"Whisper: {exc}",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
            engine="whisper",
        )
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def _multipart_encode(fields: dict[str, str], files: dict[str, tuple[str, bytes, str]]) -> tuple[bytes, str]:
    boundary = "----ShellSttBoundary7MA4YWxkTrZu0gW"
    body = io.BytesIO()
    for name, value in fields.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body.write(f"{value}\r\n".encode())
    for name, (filename, content, content_type) in files.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode())
        body.write(f"Content-Type: {content_type}\r\n\r\n".encode())
        body.write(content)
        body.write(b"\r\n")
    body.write(f"--{boundary}--\r\n".encode())
    return body.getvalue(), boundary


def transcribe_elevenlabs(pcm: bytes, language: str = "ru-RU", settings: dict[str, Any] | None = None) -> TranscribeResult:
    duration_sec = len(pcm) / (RATE * 2) if pcm else 0.0
    peak_rms = rms(pcm) if pcm else 0.0
    if not pcm:
        return _empty_pcm_result(pcm)

    settings = settings or {}
    api_key = _read_elevenlabs_api_key(settings)
    if not api_key:
        return TranscribeResult(
            error="ElevenLabs Scribe: укажите API key в STT или TTS настройках",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
            engine="elevenlabs",
        )

    model_id = str(settings.get("sttElevenlabsModel") or "scribe_v2").strip() or "scribe_v2"
    lang = _lang_code(language)
    fields = {"model_id": model_id}
    if lang:
        fields["language_code"] = lang
    elif _lang_is_auto(language):
        print("🌐 ElevenLabs Scribe: автоопределение языка")

    body, boundary = _multipart_encode(fields, {"file": ("audio.wav", _pcm_to_wav(pcm), "audio/wav")})
    request = urllib.request.Request(
        ELEVENLABS_STT_URL,
        data=body,
        method="POST",
        headers={
            "xi-api-key": api_key,
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            payload = json.loads(response.read().decode("utf-8"))
        text = str(payload.get("text") or "").strip()
        if not text:
            return TranscribeResult(
                error="ElevenLabs Scribe вернул пустой текст",
                duration_sec=duration_sec,
                peak_rms=peak_rms,
                engine="elevenlabs",
            )
        print(f"☁️ Scribe ({model_id}): {text[:120]}")
        return TranscribeResult(text=text, duration_sec=duration_sec, peak_rms=peak_rms, engine="elevenlabs")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:240]
        return TranscribeResult(
            error=f"ElevenLabs Scribe HTTP {exc.code}: {detail}",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
            engine="elevenlabs",
        )
    except Exception as exc:  # noqa: BLE001
        return TranscribeResult(
            error=f"ElevenLabs Scribe: {exc}",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
            engine="elevenlabs",
        )


def transcribe_pcm(
    pcm: bytes,
    *,
    language: str = "ru-RU",
    engine: str = "google",
    settings: dict[str, Any] | None = None,
) -> TranscribeResult:
    picked = normalize_stt_engine(engine)
    if picked == "whisper":
        return transcribe_whisper(pcm, language, settings)
    if picked == "elevenlabs":
        return transcribe_elevenlabs(pcm, language, settings)
    return transcribe_google(pcm, _google_language(language))


class MicRecorder:
    """Continuous PCM capture in a background thread while recording."""

    def __init__(self, rate: int = RATE, chunk: int = CHUNK) -> None:
        self.rate = rate
        self.chunk = chunk
        self._frames: list[bytes] = []
        self._stream: Any = None
        self._pa: Any = None
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()

    @property
    def active(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self) -> None:
        if self.active:
            return
        import pyaudio

        self._frames = []
        self._stop_event.clear()
        self._pa = pyaudio.PyAudio()
        self._stream = self._pa.open(
            format=pyaudio.paInt16,
            channels=CHANNELS,
            rate=self.rate,
            input=True,
            frames_per_buffer=self.chunk,
        )
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()

    def _read_loop(self) -> None:
        while not self._stop_event.is_set() and self._stream is not None:
            try:
                data = self._stream.read(self.chunk, exception_on_overflow=False)
                with self._lock:
                    self._frames.append(data)
            except Exception:
                break

    def pump(self) -> None:
        return

    def stop(self) -> bytes:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=1.5)
            self._thread = None
        if self._stream is not None:
            try:
                self._stream.stop_stream()
                self._stream.close()
            except Exception:
                pass
            self._stream = None
        if self._pa is not None:
            try:
                self._pa.terminate()
            except Exception:
                pass
            self._pa = None
        with self._lock:
            return b"".join(self._frames)


def rms(pcm_chunk: bytes) -> float:
    if not pcm_chunk:
        return 0.0
    count = len(pcm_chunk) // 2
    if count <= 0:
        return 0.0
    samples = struct.unpack(f"<{count}h", pcm_chunk[: count * 2])
    return (sum(s * s for s in samples) / count) ** 0.5
