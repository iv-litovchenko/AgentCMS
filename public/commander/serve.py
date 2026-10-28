#!/usr/bin/env python3
"""Static server + auto-generated cores.json from *.html in this folder."""
from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))

ORDER = [
    "composer-2.5.html",
    "grok-4.7.html",
    "claude-sonnet-5.5.html",
    "claude-opus-5.5.html",
    "claude-fable-5.1.html",
    "gemini-4-argon.html",
    "gpt-5.6-sol.html",
    "muse-spark.html",
    "glm-5p3-flash.html",
    "kimi-k3.html",
    "scene3d-demo.html",
]

META: dict[str, tuple[str, str]] = {
    "composer-2.5.html": ("composer", "Composer 2.5"),
    "grok-4.7.html": ("grok", "Grok 4.7"),
    "claude-sonnet-5.5.html": ("sonnet", "Claude Sonnet 5.5"),
    "claude-opus-5.5.html": ("opus", "Claude Opus 5.5"),
    "claude-fable-5.1.html": ("fable", "Claude Fable 5.1"),
    "gemini-4-argon.html": ("gemini", "Gemini 4 Argon"),
    "gpt-5.6-sol.html": ("gpt", "GPT 5.6 Sol"),
    "muse-spark.html": ("muse", "Muse Spark"),
    "glm-5p3-flash.html": ("glm", "GLM 5p3 Flash"),
    "kimi-k3.html": ("kimi", "Kimi K3 Max"),
    "scene3d-demo.html": ("scene3d", "Scene3D demo"),
}


def _label_from_file(name: str) -> str:
    base = name.removesuffix(".html")
    return base.replace("-", " ").replace(".", " ").title()


def _id_from_file(name: str) -> str:
    return name.removesuffix(".html").replace(".", "-")


def build_cores() -> list[dict[str, str]]:
    on_disk = {
        f
        for f in os.listdir(ROOT)
        if f.endswith(".html") and f != "index.html"
    }
    ordered: list[str] = [f for f in ORDER if f in on_disk]
    for f in sorted(on_disk):
        if f not in ordered:
            ordered.append(f)
    cores: list[dict[str, str]] = []
    for file in ordered:
        cid, label = META.get(file, (_id_from_file(file), _label_from_file(file)))
        cores.append({"id": cid, "file": file, "label": label})
    return cores


def write_cores_json() -> None:
    path = os.path.join(ROOT, "cores.json")
    data = build_cores()
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0].rstrip("/") == "/cores.json":
            body = json.dumps(build_cores(), ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def main() -> None:
    write_cores_json()
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"MyJarvis → http://127.0.0.1:{port}/")
    print(f"Ядер в списке: {len(build_cores())}")
    print("Остановка: Ctrl+C")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()


if __name__ == "__main__":
    main()
