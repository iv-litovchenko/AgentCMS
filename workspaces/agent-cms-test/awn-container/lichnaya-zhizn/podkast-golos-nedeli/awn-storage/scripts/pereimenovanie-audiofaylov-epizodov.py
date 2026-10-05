#!/usr/bin/env python3
"""Переименовывает экспортированные аудиофайлы эпизодов в единый формат:
ep{номер}_{slug}.mp3 — удобно для загрузки на хостинг подкаста.
"""
import os
import re
import sys

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")

def rename_episode_file(folder: str, episode_number: int, title: str) -> str:
    slug = slugify(title)
    new_name = f"ep{episode_number:02d}_{slug}.mp3"
    for fname in os.listdir(folder):
        if fname.lower().endswith((".mp3", ".wav")) and "raw" not in fname.lower():
            old_path = os.path.join(folder, fname)
            new_path = os.path.join(folder, new_name)
            os.rename(old_path, new_path)
            return new_path
    raise FileNotFoundError("Не найден готовый аудиофайл в папке экспорта")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Использование: rename_episode.py <папка> <номер> <название>")
        sys.exit(1)
    folder, number, title = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    result = rename_episode_file(folder, number, title)
    print(f"Готово: {result}")