"""Microphone input utilities and voice activity helpers."""

import os
import struct
from typing import Optional

import pyaudio


PREFERRED_DEVICE_KEYWORDS = ("MacBook", "Built-in", "Микрофон MacBook")


def calculate_volume(data: bytes) -> float:
    sample_count = len(data) // 2
    if sample_count == 0:
        return 0.0
    samples = struct.unpack(f"<{sample_count}h", data)
    square_sum = sum(sample * sample for sample in samples)
    return (square_sum / sample_count) ** 0.5


def choose_input_device(pa: pyaudio.PyAudio) -> tuple[Optional[int], str]:
    env_index = os.environ.get("VOICE_INPUT_DEVICE_INDEX")
    if env_index is not None and env_index.isdigit():
        idx = int(env_index)
        try:
            dev = pa.get_device_info_by_index(idx)
            if dev.get("maxInputChannels", 0) > 0:
                return idx, dev.get("name", f"device-{idx}")
        except Exception:
            pass

    candidates = []
    for i in range(pa.get_device_count()):
        try:
            dev = pa.get_device_info_by_index(i)
            if dev.get("maxInputChannels", 0) > 0:
                candidates.append((i, dev.get("name", "")))
        except Exception:
            continue

    for i, name in candidates:
        if any(keyword.lower() in name.lower() for keyword in PREFERRED_DEVICE_KEYWORDS):
            return i, name

    if candidates:
        return candidates[0]
    return None, "default"


def calibrate_threshold(stream, rate: int, chunk: int, base_threshold: int, seconds: float = 1.2) -> int:
    chunk_count = max(1, int((rate / chunk) * seconds))
    volumes = []
    for _ in range(chunk_count):
        data = stream.read(chunk, exception_on_overflow=False)
        volumes.append(calculate_volume(data))
    if not volumes:
        return base_threshold

    # Use median noise instead of mean so occasional spikes do not inflate
    # the threshold and block speech detection.
    sorted_volumes = sorted(volumes)
    median_noise = sorted_volumes[len(sorted_volumes) // 2]

    # Less sensitive threshold so background noise does not trigger listening.
    dynamic = (median_noise * 1.8) + 60
    return int(max(140, min(900, dynamic)))
