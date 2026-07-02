"""Фон в духе dashboard_nebula: фиолетовые пятна + сетка (без тяжёлого blur — стабильнее на macOS Tk)."""

from __future__ import annotations

from typing import Optional

try:
    from PIL import Image, ImageDraw, ImageTk

    _HAS_PIL = True
except ImportError:
    _HAS_PIL = False


def nebula_background_available() -> bool:
    return _HAS_PIL


def render_nebula_photo(width: int, height: int) -> Optional[object]:
    """ImageTk.PhotoImage; None если нет Pillow или ошибка отрисовки."""
    if not _HAS_PIL:
        return None
    try:
        w = max(min(int(width), 1600), 4)
        h = max(min(int(height), 2000), 4)

        base = Image.new("RGBA", (w, h), (12, 6, 28, 255))
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(glow)

        # Несколько слоёв с пониженной непрозрачностью вместо GaussianBlur
        d.ellipse(
            (int(-w * 0.18), int(-h * 0.22), int(w * 0.82), int(h * 0.58)),
            fill=(179, 0, 255, 48),
        )
        d.ellipse(
            (int(w * 0.38), int(-h * 0.12), int(w * 1.22), int(h * 0.48)),
            fill=(168, 85, 247, 40),
        )
        d.ellipse(
            (int(-w * 0.28), int(h * 0.52), int(w * 0.48), int(h * 1.18)),
            fill=(26, 8, 46, 160),
        )
        d.ellipse(
            (int(w * 0.52), int(h * 0.62), int(w * 1.08), int(h * 1.22)),
            fill=(124, 58, 237, 38),
        )
        d.ellipse(
            (int(w * 0.05), int(h * 0.28), int(w * 0.55), int(h * 0.72)),
            fill=(192, 132, 252, 22),
        )

        out = Image.alpha_composite(base, glow)

        mesh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        md = ImageDraw.Draw(mesh)
        step = max(48, min(w, h) // 9)
        for i in range(-w, w + step, step):
            md.line([(i, 0), (i + int(h * 0.9), h)], fill=(192, 132, 252, 18), width=1)
        for j in range(-h, h + step, step):
            md.line([(0, j), (w, j + int(w * 0.35))], fill=(147, 51, 234, 14), width=1)
        out = Image.alpha_composite(out, mesh)

        rgb = out.convert("RGB")
        return ImageTk.PhotoImage(rgb)
    except Exception:
        return None
