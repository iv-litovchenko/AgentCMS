"""Aya Voice v2 runtime."""

from __future__ import annotations

import json
import re
import time
from collections import deque
import os
import sys
from pathlib import Path
from typing import Any

import pyaudio

from app.config import VoiceConfig, load_workspace_dotenv
from app.services.microphone import calculate_volume, calibrate_threshold, choose_input_device
from app.services.focused_input import FocusedInputTyper
from app.services.llm_reply import LlmReplyService
from app.services.status_writer import StatusWriter
from app.services.stt_google import GoogleSttService
from app.services.tts_elevenlabs import ElevenLabsTts
from app.services.tts_gtts import GttsTts
from app.services.reply_archive import ReplyArchiveWriter
from app.services.transcription_writer import TranscriptionWriter
from app.services.mic_drain import MicDrainThread
from app.services.ptt import PttGate
from app.services.vad import VadService
from app.services.voice_input_settings import load_voice_input_mode, voice_input_disabled


STATUS_WAITING = "🟡 Ожидаю"
STATUS_LISTENING = "🔴 Слушаю"
STATUS_THINKING = "🟢 Думаю"
STATUS_SPEAKING = "🔊 Говорю"
INSERT_TRIGGER_RE = re.compile(r"^\s*(вставь|впиши|напиши|печатай)\s*[:,-]?\s*(.+?)\s*$", re.IGNORECASE)

_MODE_LABELS = {
    "fn_button": "Слышу по кнопке Fn",
    "always": "Слышу все и всегда",
    "meeting": "Записываю встречу (разговор)",
    "wake_name": "Отзываюсь по моему имени",
    "disabled": "Отключен",
}


def mode_display_name(mode: str) -> str:
    return _MODE_LABELS.get(mode, mode)


def release_input_stream(mic_state: dict[str, Any]) -> None:
    """Закрыть входной PyAudio stream и снять индикатор микрофона; главный цикл откроет снова при смене режима."""
    stream_obj = mic_state.get("stream")
    if stream_obj is None:
        mic_state["mic_active"] = False
        return
    try:
        stream_obj.stop_stream()
    except Exception:
        pass
    try:
        stream_obj.close()
    except Exception:
        pass
    mic_state["stream"] = None
    mic_state["mic_active"] = False


def load_wake_name_tokens() -> list[str]:
    raw = os.environ.get("VOICE_WAKE_NAMES", "Иван,Ива,Aya,Ая,aya").strip()
    if not raw:
        return []
    return [x.strip().lower() for x in raw.split(",") if x.strip()]


def wake_name_allows(text: str, tokens: list[str]) -> bool:
    if not tokens:
        return True
    low = text.lower()
    return any(t in low for t in tokens)


def load_computer_control_enabled(settings_file) -> bool:
    try:
        payload = json.loads(settings_file.read_text(encoding="utf-8-sig"))
        return bool(payload.get("computer_control_enabled", False))
    except Exception:
        return False


def load_voice_response_settings(settings_file) -> tuple[bool, str]:
    try:
        payload = json.loads(settings_file.read_text(encoding="utf-8-sig"))
        if not isinstance(payload, dict):
            return False, "local"
        enabled = bool(payload.get("voice_response_enabled", False))
        model_key = str(payload.get("voice_response_model", "local"))
        return enabled, model_key
    except Exception:
        return False, "local"


def voice_response_audio_enabled(settings_file: Path) -> bool:
    """Только флаг «Ответ голосом» из бара — без LLM до проверки."""
    on, _ = load_voice_response_settings(settings_file)
    return on


def resolve_llm_backend(model_key: str) -> tuple[str, str]:
    key = (model_key or "local").lower().strip()
    if key == "openai":
        return "openai", os.environ.get("VOICE_OPENAI_MODEL", "gpt-4o-mini")
    return "ollama", os.environ.get("VOICE_OLLAMA_MODEL", os.environ.get("OLLAMA_MODEL", "llama3"))


def synthesize_reply_audio(text: str, mp3_path: Path) -> str:
    """Только синтез MP3 в `mp3_path`. Возвращает метку движка TTS или пустую строку."""
    raw = (text or "").strip()
    if not raw:
        return ""
    backend = (os.environ.get("VOICE_TTS_BACKEND") or "auto").strip().lower()
    eleven = ElevenLabsTts()
    gtts = GttsTts()
    if backend == "elevenlabs":
        if not eleven.is_configured():
            raise RuntimeError("ElevenLabs: задай ELEVENLABS_API_KEY и ELEVENLABS_VOICE_ID")
        eleven.synthesize_to_file(raw, output_path=mp3_path)
        return "elevenlabs"
    if backend == "gtts":
        if not gtts.save_to_file(raw, mp3_path):
            raise RuntimeError("gTTS: пустой текст или ошибка синтеза")
        return "gtts"
    if eleven.is_configured():
        eleven.synthesize_to_file(raw, output_path=mp3_path)
        return "elevenlabs"
    if not gtts.save_to_file(raw, mp3_path):
        raise RuntimeError("gTTS: пустой текст или ошибка синтеза")
    return "gtts"


def run_voice_reply_pipeline(
    cfg: VoiceConfig,
    status_writer: StatusWriter,
    user_text: str,
    reply_writer: ReplyArchiveWriter,
    stream: Any | None = None,
    drainer: MicDrainThread | None = None,
) -> float:
    """Возвращает доп. секунды «тишины» после ответа (анти-эхо / анти-шум)."""
    from app.services.audio_playback import play_mp3_blocking

    # Пока ввод голосом «Отключен» — не вызываем LLM/TTS/afplay, даже если «Ответ голосом» ВКЛ в JSON.
    if voice_input_disabled(cfg.assistant_settings_file):
        return 0.0

    enabled, model_key = load_voice_response_settings(cfg.assistant_settings_file)
    if not enabled:
        return 0.0
    backend, model = resolve_llm_backend(model_key)
    try:
        status_writer.write(STATUS_THINKING, "Готовлю ответ…")
        llm = LlmReplyService(backend, model)
        reply = llm.reply(user_text)
        if voice_input_disabled(cfg.assistant_settings_file):
            print("⏸️ Ввод голосом отключён — ответ не озвучиваю.")
            return 0.0
        if not reply:
            print("⚠️ Модель вернула пустой ответ")
            return 0.0
        print(f"🤖 Ая: {reply}")
        preview = reply if len(reply) <= 240 else reply[:237] + "…"
        if not voice_response_audio_enabled(cfg.assistant_settings_file):
            print("🔇 Озвучка ответа выключена в баре — звука не будет.")
            status_writer.write(STATUS_WAITING, preview)
            return 0.0
        status_writer.write(STATUS_SPEAKING, preview)
        mp3_path, txt_path = reply_writer.allocate_reply_paths()
        if voice_input_disabled(cfg.assistant_settings_file):
            return 0.0
        if not voice_response_audio_enabled(cfg.assistant_settings_file):
            print("🔇 Озвучка отключили во время ответа — TTS пропускаю.")
            status_writer.write(STATUS_WAITING, preview)
            return 0.0
        tts_used = synthesize_reply_audio(reply, mp3_path)
        if not tts_used:
            return 0.0

        if not voice_response_audio_enabled(cfg.assistant_settings_file):
            print("🔇 Озвучка выключена перед воспроизведением — afplay не запускаю.")
            status_writer.write(STATUS_WAITING, preview)
            return 0.0

        # Один читатель stream: фоновый drain выключаем до afplay (там свой цикл read).
        if drainer is not None:
            drainer.stop()

        stop_sig = cfg.stop_tts_signal_file
        # Пока идёт afplay: не анализируем микрофон как речь — только сброс буфера + стоп по файлу.
        if stream is not None:
            completed = play_mp3_blocking(
                mp3_path,
                stop_signal=stop_sig,
                drain_stream=stream,
                cfg=cfg,
                assistant_settings_file=cfg.assistant_settings_file,
            )
        else:
            completed = play_mp3_blocking(
                mp3_path,
                stop_signal=stop_sig,
                assistant_settings_file=cfg.assistant_settings_file,
            )

        post_full = float(os.environ.get("VOICE_POST_TTS_COOLDOWN_SEC", "2.8"))
        post_stop = float(os.environ.get("VOICE_POST_TTS_COOLDOWN_BARGE_SEC", "1.0"))
        extra_cooldown = post_full if completed else post_stop

        llm_line = f"{backend} ({model})"
        ReplyArchiveWriter.write_sidecar(
            txt_path,
            audio_rel_name=mp3_path.name,
            user_text=user_text.strip(),
            reply_text=reply,
            llm_line=llm_line,
            tts_backend=tts_used,
        )
        print(f"💾 Ответ (аудио): {mp3_path.name}")
        print(f"📝 Ответ (мета): {txt_path.name}")
        return extra_cooldown
    except Exception as exc:
        print(f"⚠️ Цикл ответа (LLM/TTS): {exc}")
        return 0.0


def extract_insert_payload(text: str) -> tuple[bool, str]:
    raw = (text or "").strip()
    if not raw:
        return False, ""
    match = INSERT_TRIGGER_RE.match(raw)
    if not match:
        return False, ""
    payload = match.group(2).strip()
    if not payload:
        return False, ""
    return True, payload


def process_recording(
    cfg: VoiceConfig,
    status_writer: StatusWriter,
    writer: TranscriptionWriter,
    reply_writer: ReplyArchiveWriter,
    stt: GoogleSttService,
    typer: FocusedInputTyper,
    frames: list[bytes],
    voice_input_mode: str,
    stream: Any | None = None,
    mic_state: dict[str, Any] | None = None,
    reason: str = "",
) -> float:
    """Секунды дополнительной паузы после цикла (в основном после TTS)."""
    if reason:
        print(f"\n✅ Обработка ({reason})...")
    else:
        print("\n✅ Обработка...")

    if not frames:
        status_writer.write(STATUS_WAITING)
        return 0.0

    duration_sec = (len(frames) * cfg.chunk) / cfg.rate
    if duration_sec < cfg.min_audio_sec:
        print(f"⚠️  Слишком коротко: {duration_sec:.2f}s (пропускаю)")
        status_writer.write(STATUS_WAITING)
        return 0.0

    status_writer.write(STATUS_THINKING)
    wavfile = writer.save_wav(frames)
    print(f"💾 {wavfile.name}")

    # Пока STT / ввод в поле / LLM / синтез MP3 основной цикл не читает mic — иначе буфер копится
    # и сразу после ответа снова стартует «слушание» (дублирование, очередь вопросов).
    drainer = (
        MicDrainThread(
            stream,
            cfg.chunk,
            abort_if=lambda: voice_input_disabled(cfg.assistant_settings_file),
        )
        if stream is not None
        else None
    )
    if drainer is not None:
        drainer.start()
    try:
        text = stt.transcribe(wavfile)
        if voice_input_disabled(cfg.assistant_settings_file):
            print("⏸️ Ввод голосом отключён после распознавания — цикл ответа пропущен.")
            status_writer.write("⏸️ Отключено", "Ввод голосом выключен в баре.")
            return 0.0
        if text:
            print(f"📝 {text}")
            writer.save_txt(wavfile, text)
            if voice_input_mode == "wake_name":
                toks = load_wake_name_tokens()
                if toks and not wake_name_allows(text, toks):
                    print("⏭ Пропуск: нет имени-триггера в фразе (VOICE_WAKE_NAMES)")
                    status_writer.write(STATUS_WAITING, text[:200] if len(text) > 200 else text)
                    return 0.0
            if load_computer_control_enabled(cfg.assistant_settings_file):
                if voice_input_disabled(cfg.assistant_settings_file):
                    status_writer.write("⏸️ Отключено", "Ввод голосом выключен в баре.")
                    return 0.0
                should_insert, payload = extract_insert_payload(text)
                target_text = payload if should_insert else text
                if should_insert:
                    inserted = typer.type_text(target_text)
                    if inserted:
                        target = typer.last_front_app or "unknown"
                        print(f"⌨️ Вставлено в активное поле ({target})")
                    else:
                        reason_ins = typer.last_error or "unknown reason"
                        target = typer.last_front_app or "unknown"
                        print(f"⚠️ Не удалось вставить в активное поле ({target}): {reason_ins}")
                else:
                    inserted = typer.type_text(target_text)
                    if inserted:
                        target = typer.last_front_app or "unknown"
                        print(f"⌨️ Вставлено в активное поле ({target})")
                    else:
                        reason_ins = typer.last_error or "unknown reason"
                        target = typer.last_front_app or "unknown"
                        print(f"⚠️ Не удалось вставить в активное поле ({target}): {reason_ins}")
            if voice_input_disabled(cfg.assistant_settings_file):
                status_writer.write("⏸️ Отключено", "Ввод голосом выключен в баре.")
                return 0.0
            extra = run_voice_reply_pipeline(
                cfg,
                status_writer,
                text,
                reply_writer,
                stream=stream,
                drainer=drainer,
            )
            status_writer.write(STATUS_WAITING, text)
            tail = float(os.environ.get("VOICE_EXTRA_GATE_AFTER_CYCLE_SEC", "0.55"))
            return extra + max(0.0, tail)
        print("⚠️  Не распознано")
        writer.save_txt(wavfile, "[не распознано]")
        status_writer.write(STATUS_WAITING)
        return 0.0
    finally:
        if drainer is not None:
            drainer.stop()
        # Пока идёт STT/LLM/TTS основной цикл не закрывает stream — иначе индикатор микрофона и фоновый drain
        # остаются активными после «Отключено» в баре.
        if mic_state is not None and voice_input_disabled(cfg.assistant_settings_file):
            release_input_stream(mic_state)


def main() -> None:
    load_workspace_dotenv()
    from app.services.audio_playback import register_bar_stop_tts_signal

    register_bar_stop_tts_signal()
    cfg = VoiceConfig()
    voice_input_mode = load_voice_input_mode(cfg.assistant_settings_file)
    if voice_input_mode == "disabled":
        status_writer = StatusWriter(cfg.status_file)
        phrase = "Ввод голосом выключен в настройках бара"
        status_writer.write("⏸️ Отключено", phrase)
        print("=" * 50)
        print("🎤 Aya Voice v2 — режим «Отключен»")
        print("   Микрофон не используется. Другой режим в баре подхватится автоматически (перезапуск процесса).")
        print("   Выход: Ctrl+C")
        print("=" * 50)
        try:
            while load_voice_input_mode(cfg.assistant_settings_file) == "disabled":
                time.sleep(1.0)
                status_writer.write("⏸️ Отключено", phrase)
            m = load_voice_input_mode(cfg.assistant_settings_file)
            print(f"\n↻ Режим в баре → {mode_display_name(m)}. Перезапуск Aya Voice…")
            os.execv(sys.executable, [sys.executable, "-m", "app.main"])
        except KeyboardInterrupt:
            print("\n\n👋 Выход...")
        return

    ptt_gate: PttGate | None = None
    if voice_input_mode == "fn_button":
        ptt_gate = PttGate()
        if not ptt_gate.start():
            print("⚠️ Push-to-talk недоступен — переключаюсь на «Слышу все и всегда».")
            ptt_gate = None
            voice_input_mode = "always"
    writer = TranscriptionWriter(cfg.audio_dir, cfg.text_dir, channels=cfg.channels, rate=cfg.rate)
    writer.ensure_dirs()
    reply_writer = ReplyArchiveWriter(cfg.reply_audio_dir, cfg.reply_text_dir)
    reply_writer.ensure_dirs()
    status_writer = StatusWriter(cfg.status_file)
    stt = GoogleSttService(language=cfg.language)
    typer = FocusedInputTyper()
    vad = None
    vad_available = False

    if cfg.vad_enabled:
        try:
            vad = VadService(sample_rate=cfg.rate, mode=cfg.vad_mode)
            vad_available = True
            print(f"🧠 VAD: ON (mode={cfg.vad_mode})")
        except Exception as exc:
            print(f"⚠️ VAD unavailable, fallback to volume only: {exc}")

    print("=" * 50)
    print("🎤 Aya Voice v2 — запуск")
    print("=" * 50)

    pa = pyaudio.PyAudio()
    mic_state: dict[str, Any] = {"stream": None, "mic_active": False}
    input_device_index, input_device_name = choose_input_device(pa)
    print(f"🎙️ Устройство: {input_device_name}")

    stream_kwargs = dict(
        format=pyaudio.paInt16,
        channels=cfg.channels,
        rate=cfg.rate,
        input=True,
        frames_per_buffer=cfg.chunk,
    )
    if input_device_index is not None:
        stream_kwargs["input_device_index"] = input_device_index

    mic_state["stream"] = pa.open(**stream_kwargs)
    mic_state["mic_active"] = True

    print("✅ Готово! Говори в микрофон...")
    print("   Выход: Ctrl+C\n")
    print("🔧 Калибрую шум...")
    current_threshold = calibrate_threshold(mic_state["stream"], cfg.rate, cfg.chunk, cfg.threshold)
    forced_threshold = os.environ.get("VOICE_FORCE_THRESHOLD")
    if forced_threshold and forced_threshold.isdigit():
        current_threshold = int(forced_threshold)
    print(f"🎚️ Порог: {current_threshold}")
    print(f"🛠️ Режим ввода: {mode_display_name(voice_input_mode)}")
    print(f"⚙️ Настройки бара (режим микрофона): {cfg.assistant_settings_file.resolve()}")

    max_record_sec = cfg.max_record_sec
    speech_timeout_sec = cfg.speech_timeout
    listening_idle_guard_sec = cfg.listening_idle_guard_sec
    start_voice_chunks = cfg.start_voice_chunks
    cooldown_after_record_sec = cfg.cooldown_after_record_sec
    if voice_input_mode == "meeting":
        max_record_sec = max(cfg.max_record_sec, 120)
        speech_timeout_sec = max(cfg.speech_timeout, 4.5)
        listening_idle_guard_sec = max(cfg.listening_idle_guard_sec, 3.0)
        start_voice_chunks = max(cfg.start_voice_chunks, 3)
        cooldown_after_record_sec = max(cfg.cooldown_after_record_sec, 1.6)

    live_mode = voice_input_mode

    def _process(
        frames_arg: list[bytes],
        reason: str = "",
    ) -> float:
        return process_recording(
            cfg,
            status_writer,
            writer,
            reply_writer,
            stt,
            typer,
            frames_arg,
            live_mode,
            stream=mic_state["stream"],
            mic_state=mic_state,
            reason=reason,
        )

    status_writer.write(STATUS_WAITING)

    frames: list[bytes] = []
    recording = False
    silence = 0
    voice_streak = 0
    record_start = 0.0
    last_strong_speech_at = 0.0
    chunk_counter = 0
    start_block_until = 0.0
    pre_roll_chunks = max(1, int((cfg.pre_roll_sec * cfg.rate) / cfg.chunk))
    post_roll_chunks = max(0, int((cfg.post_roll_sec * cfg.rate) / cfg.chunk))
    pre_buffer: deque[bytes] = deque(maxlen=pre_roll_chunks)
    last_disabled_status_ts = 0.0
    settings_path = cfg.assistant_settings_file

    try:
        while True:
            now = time.time()
            # Каждый тик цикла (не только по mtime): на части ФС mtime грубый, replace() иногда совпадает по секунде.
            live_mode = load_voice_input_mode(settings_path)

            # Полное освобождение устройства: close (stop_stream на macOS часто оставляет индикатор «микрофон»).
            if live_mode == "disabled":
                if mic_state.get("stream") is not None:
                    release_input_stream(mic_state)
                if recording:
                    frames = []
                    recording = False
                    silence = 0
                    voice_streak = 0
                if now - last_disabled_status_ts >= 8.0:
                    last_disabled_status_ts = now
                    status_writer.write(
                        "⏸️ Отключено",
                        "Ввод голосом выключен в баре. Микрофон отключён. Другой режим подхватится автоматически.",
                    )
                time.sleep(0.2)
                continue

            if mic_state.get("stream") is None:
                try:
                    mic_state["stream"] = pa.open(**stream_kwargs)
                except Exception as exc:
                    print(f"⚠️ Микрофон недоступен: {exc}")
                    time.sleep(0.5)
                    continue
                mic_state["mic_active"] = True
                print("🎙️ Микрофон снова включён (режим в баре изменён).")

            stream_now = mic_state["stream"]
            if stream_now is None:
                time.sleep(0.1)
                continue
            data = stream_now.read(cfg.chunk, exception_on_overflow=False)
            chunk_counter += 1
            pre_buffer.append(data)

            volume = calculate_volume(data)
            vad_ratio = 0.0
            if vad is not None:
                vad_ratio = vad.analyze(data).speech_ratio

            if recording:
                frames.append(data)

            if recording and time.time() - record_start > max_record_sec:
                extra_tts = _process(frames, reason="время вышло")
                frames = []
                recording = False
                silence = 0
                voice_streak = 0
                start_block_until = time.time() + max(cooldown_after_record_sec, extra_tts)
                continue

            if recording and live_mode == "fn_button" and ptt_gate is not None and not ptt_gate.is_held():
                trim_tail = min(post_roll_chunks, len(frames))
                payload = frames[:-trim_tail] if trim_tail > 0 else frames
                extra_tts = _process(payload, reason="отпустил клавишу (PTT)")
                frames = []
                recording = False
                silence = 0
                voice_streak = 0
                start_block_until = time.time() + max(cooldown_after_record_sec, extra_tts)
                continue

            active_threshold = current_threshold if not recording else max(120, int(current_threshold * cfg.continue_threshold_ratio))

            if not recording and time.time() < start_block_until:
                voice_streak = 0
                continue

            if not recording and live_mode == "fn_button" and ptt_gate is not None and not ptt_gate.is_held():
                voice_streak = 0

            has_speech = vad is not None and (
                vad_ratio >= (cfg.vad_start_ratio if not recording else cfg.vad_continue_ratio)
            )

            # Start and continuation both use VAD + loudness when VAD is available.
            # This prevents "stuck listening" on low-level background noise.
            if vad is not None:
                start_trigger = volume > active_threshold and has_speech
                continue_threshold = max(20, int(current_threshold * cfg.continue_threshold_ratio))
                continue_trigger = has_speech and volume > continue_threshold
            else:
                start_trigger = volume > active_threshold
                continue_trigger = volume > active_threshold

            ptt_ok = live_mode != "fn_button" or ptt_gate is None or ptt_gate.is_held()
            arm = (continue_trigger if recording else start_trigger) and ptt_ok

            if arm:
                if recording and has_speech and volume > active_threshold:
                    last_strong_speech_at = time.time()
                if not recording:
                    voice_streak += 1
                    if voice_streak < start_voice_chunks:
                        continue
                    recording = True
                    record_start = time.time()
                    last_strong_speech_at = record_start
                    # Include a small pre-roll so the start of phrase is not clipped.
                    frames = list(pre_buffer)
                    vad_text = f"{vad_ratio:.3f}" if vad_available else "OFF"
                    status_writer.write(
                        STATUS_LISTENING,
                        f"vol={volume:.0f} thr={current_threshold} vad={vad_text}",
                    )
                    print(f"{STATUS_LISTENING} ... (громкость: {volume:.1f})")
                silence = 0
            else:
                voice_streak = 0
                if recording:
                    silence += 1
                    if silence > (speech_timeout_sec * cfg.rate / cfg.chunk):
                        trim_tail = max(0, silence - post_roll_chunks)
                        payload = frames[:-trim_tail] if trim_tail > 0 else frames
                        extra_tts = _process(payload, reason="тишина")
                        frames = []
                        recording = False
                        silence = 0
                        voice_streak = 0
                        start_block_until = time.time() + max(cooldown_after_record_sec, extra_tts)

            # Hard stop if there is no strong speech for too long while recording.
            # This avoids being stuck in listening state from random VAD spikes.
            if recording and (time.time() - last_strong_speech_at) > listening_idle_guard_sec:
                trim_tail = min(post_roll_chunks, len(frames))
                payload = frames[:-trim_tail] if trim_tail > 0 else frames
                extra_tts = _process(payload, reason="тишина (guard)")
                frames = []
                recording = False
                silence = 0
                voice_streak = 0
                start_block_until = time.time() + max(cooldown_after_record_sec, extra_tts)

            if chunk_counter % cfg.live_status_every_chunks == 0:
                vad_text = f"{vad_ratio:.3f}" if vad_available else "OFF"
                if recording:
                    status_writer.write(
                        STATUS_LISTENING,
                        f"vol={volume:.0f} thr={current_threshold} vad={vad_text}",
                    )
                else:
                    status_writer.write(
                        STATUS_WAITING,
                        f"vol={volume:.0f} thr={current_threshold} vad={vad_text}",
                    )
    except KeyboardInterrupt:
        print("\n\n👋 Выход...")
    except Exception as exc:
        print(f"\n❌ Ошибка рантайма: {exc}")
        status_writer.write(STATUS_WAITING, f"error: {exc}")
    finally:
        from app.services.audio_playback import stop_active_playback

        stop_active_playback()
        if ptt_gate is not None:
            ptt_gate.stop()
        # Avoid stale '🔴 Слушаю' status after unexpected shutdown.
        status_writer.write(STATUS_WAITING)
        release_input_stream(mic_state)
        pa.terminate()


if __name__ == "__main__":
    main()
