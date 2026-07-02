"""Minimal STT helpers for Agent Shell sidecar."""

from __future__ import annotations

import io
import struct
import threading
import wave
from dataclasses import dataclass
from typing import Any

import speech_recognition as sr


RATE = 16000
CHUNK = 1024
CHANNELS = 1
MIN_PCM_BYTES = int(RATE * 0.35 * 2)  # ~350 ms


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


def transcribe_pcm(pcm: bytes, language: str = "ru-RU") -> TranscribeResult:
    duration_sec = len(pcm) / (RATE * 2) if pcm else 0.0
    peak_rms = rms(pcm) if pcm else 0.0
    if not pcm or len(pcm) < MIN_PCM_BYTES:
        return TranscribeResult(
            error=f"Слишком коротко ({duration_sec:.2f}s) — держите 🎤 дольше",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
        )
    if peak_rms < 80:
        return TranscribeResult(
            error=f"Тихо (rms={peak_rms:.0f}) — громче или ближе к микрофону",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
        )
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
            )
        return TranscribeResult(text=text, duration_sec=duration_sec, peak_rms=peak_rms)
    except sr.UnknownValueError:
        return TranscribeResult(
            error="Речь не разобрана — говорите чётче или проверьте интернет/VPN",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
        )
    except sr.RequestError as exc:
        return TranscribeResult(
            error=f"Google STT недоступен: {exc}",
            duration_sec=duration_sec,
            peak_rms=peak_rms,
        )


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
        """Backward-compatible no-op; capture runs in background thread."""
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
