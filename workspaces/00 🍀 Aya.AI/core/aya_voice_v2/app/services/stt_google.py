"""Google SpeechRecognition adapter."""

from concurrent.futures import ThreadPoolExecutor, TimeoutError
from pathlib import Path
import speech_recognition as sr


class GoogleSttService:
    def __init__(self, language: str = "ru-RU", timeout_sec: float = 8.0) -> None:
        self.language = language
        self.timeout_sec = timeout_sec
        self.recognizer = sr.Recognizer()

    def transcribe(self, wav_path: Path) -> str:
        try:
            with sr.AudioFile(str(wav_path)) as source:
                audio = self.recognizer.record(source)

            def _do_recognize() -> str:
                return self.recognizer.recognize_google(audio, language=self.language).strip()

            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_do_recognize)
                return future.result(timeout=self.timeout_sec)
        except TimeoutError:
            return ""
        except Exception:
            return ""
