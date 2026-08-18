#!/usr/bin/env python3
"""Agent Shell voice sidecar — STT (микрофон) + TTS (ответы агента)."""

from __future__ import annotations

import base64
import json
import os
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from stt import MicRecorder, rms, transcribe_pcm
from ptt import PttGate


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


BASE_URL = env("AGENT_CMS_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
AGENT_ID = env("AGENT_CMS_AGENT", "")
POLL_SEC = float(env("SHELL_SIDECAR_POLL_SEC", "0.35"))
SAY_VOICE = env("SHELL_SAY_VOICE", "Milena")
STT_LANGUAGE = env("SHELL_STT_LANGUAGE", "ru-RU")
ALWAYS_THRESHOLD = float(env("SHELL_ALWAYS_RMS", "450"))
LIVE_MODES = frozenset({"live", "wake_name", "always"})


def normalize_voice_mode(mode: str) -> str:
    raw = str(mode or "hold").strip()
    legacy = {
        "browser": "hold",
        "sidecar": "hold",
        "always": "live",
        "fn_button": "fn_button",
        "disabled": "disabled",
    }
    return legacy.get(raw, raw)


class Sidecar:
    def __init__(self) -> None:
        self._stop = threading.Event()
        self._speak_proc: subprocess.Popen[Any] | None = None
        self._last_message_id = ""
        self._stop_tts_at = 0
        self._last_ptt_held = False
        self._last_meeting_recording = False
        self._recorder = MicRecorder()
        self._always_recording = False
        self._always_silence = 0
        self._ptt_gate: PttGate | None = None

    def _url(self, path: str, params: dict[str, str] | None = None) -> str:
        query: dict[str, str] = {}
        if AGENT_ID:
            query["agent"] = AGENT_ID
        if params:
            query.update({k: v for k, v in params.items() if v})
        suffix = f"?{urllib.parse.urlencode(query)}" if query else ""
        return f"{BASE_URL}{path}{suffix}"

    def _request_json(self, path: str, method: str = "GET", body: dict[str, Any] | None = None) -> dict[str, Any]:
        data = None
        headers = {"Accept": "application/json"}
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json; charset=utf-8"
        req = urllib.request.Request(self._url(path), data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload) if payload else {}

    def _patch_state(self, patch: dict[str, Any]) -> None:
        self._request_json("/api/shell/state", method="POST", body={"state": patch})

    def _send_message(self, text: str) -> None:
        self._request_json(
            "/api/shell/message",
            method="POST",
            body={"body": text, "author": "sidecar", "voice": True},
        )

    def _stop_user_tts(self) -> None:
        self.stop_playback()
        try:
            self._request_json("/api/shell/stop-tts", method="POST", body={})
        except Exception:  # noqa: BLE001
            pass

    def _upload_voice_record(self, pcm: bytes, kind: str = "meeting") -> None:
        if not pcm:
            return
        try:
            saved = self._request_json(
                "/api/shell/voice-record",
                method="POST",
                body={
                    "kind": kind,
                    "dataBase64": base64.b64encode(pcm).decode("ascii"),
                    "ext": "pcm",
                },
            )
            path = (saved.get("saved") or {}).get("path")
            if path:
                print(f"💾 {path}")
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️ voice-record: {exc}")

    def stop_playback(self) -> None:
        proc = self._speak_proc
        self._speak_proc = None
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=1.0)
            except subprocess.TimeoutExpired:
                proc.kill()

    def speak(self, text: str) -> None:
        payload = (text or "").strip()
        if not payload:
            return
        self.stop_playback()
        self._patch_state({"phase": "speaking", "phrase": payload[:240]})
        cmd = ["say", "-v", SAY_VOICE, payload] if SAY_VOICE else ["say", payload]
        self._speak_proc = subprocess.Popen(cmd)
        self._speak_proc.wait()
        self._speak_proc = None
        self._patch_state({"phase": "waiting", "phrase": payload[:240]})

    def _should_send_transcript(self, text: str, settings: dict[str, Any]) -> bool:
        mode = normalize_voice_mode(settings.get("voiceInputMode"))
        wake = str(settings.get("voiceWakeName") or "").strip()
        if mode == "wake_name" and wake and wake.lower() not in text.lower():
            print(f"⏭ wake skip (нет «{wake}»)")
            self._patch_state({"phase": "waiting", "phrase": f"Жду «{wake}»…"})
            return False
        return True

    def _process_pcm(self, pcm: bytes, *, settings: dict[str, Any] | None = None, save_record: bool = False, record_kind: str = "meeting") -> None:
        if save_record and pcm:
            self._upload_voice_record(pcm, record_kind)
        result = transcribe_pcm(pcm, language=STT_LANGUAGE)
        if result.error:
            self._patch_state({"phase": "waiting", "phrase": result.error, "metrics": f"{result.duration_sec:.2f}s rms={result.peak_rms:.0f}"})
            print(f"⚠️ {result.error}")
            return
        text = (result.text or "").strip()
        if not text:
            self._patch_state({"phase": "waiting", "phrase": "Пустая расшифровка"})
            return
        if settings and not self._should_send_transcript(text, settings):
            return
        print(f"📝 {text}")
        self._patch_state({"phase": "thinking", "phrase": text[:240], "metrics": f"{result.duration_sec:.2f}s"})
        self._send_message(text)

    def _handle_ptt(self, held: bool, *, settings: dict[str, Any] | None = None, save_record: bool = False) -> None:
        if held and not self._recorder.active:
            self._stop_user_tts()
            self._recorder.start()
            self._patch_state({"phase": "listening", "phrase": "Говорите…", "pttHeld": True})
            print("🔴 Слушаю (PTT)")
            return
        if not held and self._recorder.active:
            self._patch_state({"pttHeld": False})
            pcm = self._recorder.stop()
            print("✅ Обработка PTT…")
            self._process_pcm(pcm, settings=settings or {}, save_record=save_record)

    def _handle_meeting(self, recording: bool, settings: dict[str, Any]) -> None:
        if recording and not self._recorder.active:
            self._stop_user_tts()
            self._recorder.start()
            self._patch_state({"phase": "listening", "phrase": "Запись встречи…", "meetingRecording": True})
            print("🎙 Meeting ON")
            return
        if not recording and self._recorder.active:
            pcm = self._recorder.stop()
            self._patch_state({"meetingRecording": False, "phase": "thinking", "phrase": "Обрабатываю встречу…"})
            print("⏹ Meeting OFF")
            if pcm:
                self._process_pcm(pcm, settings=settings, save_record=True, record_kind="meeting")

    def _ensure_ptt_gate(self) -> None:
        if self._ptt_gate is None:
            self._ptt_gate = PttGate()
            self._ptt_gate.start()

    def _stop_ptt_gate(self) -> None:
        if self._ptt_gate is not None:
            self._ptt_gate.stop()
            self._ptt_gate = None

    def _pump_ptt(self) -> None:
        if self._recorder.active:
            self._recorder.pump()

    def _handle_live_phrase(self, settings: dict[str, Any]) -> None:
        if self._recorder.active:
            self._recorder.pump()
            return
        if self._always_recording:
            return
        try:
            self._recorder.start()
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️ Микрофон: {exc}")
            return

        self._always_silence = 0
        speech_started = False
        mode = normalize_voice_mode(settings.get("voiceInputMode"))
        print(f"👂 Live listen ({mode})…")

        while not self._stop.is_set():
            self._recorder.pump()
            chunk = self._recorder._frames[-1] if self._recorder._frames else b""
            if not chunk:
                time.sleep(0.02)
                continue
            level = rms(chunk)
            if level > ALWAYS_THRESHOLD:
                if not speech_started:
                    self._stop_user_tts()
                speech_started = True
                self._always_silence = 0
                self._patch_state({"phase": "listening", "phrase": f"vol={level:.0f}"})
            elif speech_started:
                self._always_silence += 1
                if self._always_silence > 18:
                    break
            time.sleep(0.02)

        pcm = self._recorder.stop()
        if speech_started and pcm:
            self._process_pcm(pcm, settings=settings)
        else:
            self._patch_state({"phase": "waiting", "phrase": "Ожидаю речь…"})

    def _live_loop(self) -> None:
        while not self._stop.is_set():
            try:
                status = self._request_json("/api/shell/status")
                settings = status.get("settings") or {}
                mode = normalize_voice_mode(settings.get("voiceInputMode"))
                if mode not in LIVE_MODES:
                    time.sleep(0.5)
                    continue
                if self._speak_proc and self._speak_proc.poll() is None:
                    time.sleep(0.3)
                    continue
                self._handle_live_phrase(settings)
            except Exception as exc:  # noqa: BLE001
                print(f"⚠️ live: {exc}")
                time.sleep(1.0)

    def _reset_recorder(self) -> None:
        self._stop_ptt_gate()
        if self._recorder.active:
            pcm = self._recorder.stop()
            if pcm and self._last_ptt_held:
                self._process_pcm(pcm)
        self._last_ptt_held = False
        self._last_meeting_recording = False

    def tick(self) -> None:
        status = self._request_json("/api/shell/status")
        settings = status.get("settings") or {}
        state = status.get("state") or {}
        voice_mode = normalize_voice_mode(settings.get("voiceInputMode"))
        global_listen = bool(settings.get("voiceGlobalListen"))

        self._patch_state({"sidecarSeenAt": int(time.time() * 1000)})

        stop_at = int(state.get("stopTtsAt") or 0)
        if stop_at and stop_at != self._stop_tts_at:
            self._stop_tts_at = stop_at
            self.stop_playback()

        held = bool(state.get("pttHeld"))
        meeting_rec = bool(state.get("meetingRecording"))

        if voice_mode == "meeting":
            if meeting_rec != self._last_meeting_recording:
                self._handle_meeting(meeting_rec, settings)
                self._last_meeting_recording = meeting_rec
            self._pump_ptt()
        elif voice_mode == "hold" and global_listen:
            if held != self._last_ptt_held:
                self._handle_ptt(held, settings=settings)
                self._last_ptt_held = held
            self._pump_ptt()
        elif voice_mode == "fn_button" and global_listen:
            self._ensure_ptt_gate()
            fn_held = self._ptt_gate.is_held() if self._ptt_gate else False
            if fn_held != self._last_ptt_held:
                self._handle_ptt(fn_held, settings=settings)
                self._last_ptt_held = fn_held
            self._pump_ptt()
            if fn_held != bool(state.get("pttHeld")):
                self._patch_state({"pttHeld": fn_held})
        elif voice_mode in LIVE_MODES:
            self._stop_ptt_gate()
        elif voice_mode in ("hold", "fn_button") and not global_listen:
            self._stop_ptt_gate()
        else:
            self._reset_recorder()

        engine = str(settings.get("ttsEngine") or "browser")
        target = str(settings.get("messageTarget") or "cms")
        uses_cms_reply = target in ("cms", "qwenpaw-log")
        if settings.get("ttsEnabled", True) and engine in ("sidecar", "say") and uses_cms_reply:
            latest = status.get("latestAgentMessage") or {}
            msg_id = str(latest.get("id") or "")
            body = str(latest.get("body") or "").strip()
            if msg_id and body and msg_id != self._last_message_id:
                self._last_message_id = msg_id
                print(f"🔊 {body}")
                self.speak(body)

    def run(self) -> None:
        print("=" * 50)
        print("Agent Shell · voice sidecar")
        print(f"CMS: {BASE_URL}")
        print(f"Agent: {AGENT_ID or '(default)'}")
        print("STT: Google Speech (SpeechRecognition)")
        print("TTS: macOS say")
        print("Режимы: live · wake_name · meeting · hold+global · fn_button+global")
        print("Ctrl+C — выход")
        print("=" * 50)

        threading.Thread(target=self._live_loop, daemon=True).start()

        while not self._stop.is_set():
            try:
                self.tick()
            except urllib.error.URLError as exc:
                print(f"⚠️ CMS недоступен: {exc}")
            except Exception as exc:  # noqa: BLE001
                print(f"⚠️ {exc}")
            time.sleep(POLL_SEC)

    def shutdown(self) -> None:
        self._stop.set()
        self._stop_ptt_gate()
        if self._recorder.active:
            self._recorder.stop()
        self.stop_playback()


def main() -> None:
    sidecar = Sidecar()
    try:
        sidecar.run()
    except KeyboardInterrupt:
        print("\n👋 Выход")
    finally:
        sidecar.shutdown()


if __name__ == "__main__":
    main()
