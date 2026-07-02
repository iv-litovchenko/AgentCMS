"""Voice Activity Detection wrapper (WebRTC VAD)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class VadResult:
    speech_ratio: float
    frame_count: int


class VadService:
    def __init__(self, sample_rate: int = 16000, frame_ms: int = 30, mode: int = 2) -> None:
        import webrtcvad

        self.sample_rate = sample_rate
        self.frame_ms = frame_ms
        self.vad = webrtcvad.Vad(mode)
        self.frame_bytes = int((sample_rate * frame_ms / 1000) * 2)  # int16 mono
        self._buffer = b""

    def analyze(self, chunk: bytes) -> VadResult:
        """Analyze chunk and return speech-frame ratio."""
        self._buffer += chunk
        speech_frames = 0
        total_frames = 0

        while len(self._buffer) >= self.frame_bytes:
            frame = self._buffer[: self.frame_bytes]
            self._buffer = self._buffer[self.frame_bytes :]
            total_frames += 1
            if self.vad.is_speech(frame, self.sample_rate):
                speech_frames += 1

        if total_frames == 0:
            return VadResult(speech_ratio=0.0, frame_count=0)
        return VadResult(speech_ratio=speech_frames / total_frames, frame_count=total_frames)
