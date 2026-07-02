"""Модальное окно «О программе»."""

from __future__ import annotations

import tkinter as tk
from tkinter import scrolledtext

from app import theme


def show_about_program(parent: tk.Misc) -> None:
    root = parent.winfo_toplevel()
    win = tk.Toplevel(root)
    win.title("О программе")
    win.configure(bg=theme.PANEL)
    win.transient(root)
    win.grab_set()

    body = (
        "• Концепция\n\n"
        "Aya Bar — панель рядом с голосовым ассистентом: статус, быстрые настройки "
        "(режим микрофона, ответ голосом, стоп озвучки). Работает в паре с процессом "
        "Aya Voice на этом Mac.\n\n"
        "• Все устройства + синхронизация (Mac, AirPods, iPhone…)\n\n"
        "На этом компьютере можно выбрать системный микрофон и вывод звука "
        "(в т.ч. AirPods). iPhone и другие устройства в одной экосистеме Apple "
        "удобны для прослушивания и диктовки через системные настройки звука. "
        "Сквозная синхронизация сценариев «как одно приложение на всех устройствах» "
        "заложена как направление развития; сейчас бар и голос привязаны к машине, "
        "где они запущены.\n\n"
        "• Дашборд (универсальный)\n\n"
        "Общий HTML-обзор лежит в проекте: core/integration/dashboard_nebula.html — "
        "открой файл в браузере (двойной клик или перетаскивание на окно браузера).\n\n"
        "• TODO / вопросы к реализации\n\n"
        "1. Визуально различать в баре «мой» текст и «твой текст — ответ» "
        "(оформление, подсветка, отдельные блоки).\n\n"
        "2. Звук при смене настроек в духе Apple (короткий системный клик при переключении "
        "тумблеров/списков, как в системных настройках macOS)."
    )

    wrap = tk.Frame(win, bg=theme.PANEL, padx=14, pady=12)
    wrap.pack(fill="both", expand=True)

    tk.Label(
        wrap,
        text="Aya Bar",
        bg=theme.PANEL,
        fg=theme.TEXT,
        font=("Helvetica", 13, "bold"),
        anchor="w",
    ).pack(fill="x", pady=(0, 8))

    text = scrolledtext.ScrolledText(
        wrap,
        wrap=tk.WORD,
        width=52,
        height=24,
        font=("Helvetica", 11),
        bg=theme.BG,
        fg=theme.TEXT,
        insertbackground=theme.TEXT,
        relief="flat",
        highlightthickness=1,
        highlightbackground=theme.MUTED,
        padx=10,
        pady=10,
    )
    text.pack(fill="both", expand=True)
    text.insert("1.0", body)
    text.configure(state="disabled")

    btn_row = tk.Frame(wrap, bg=theme.PANEL)
    btn_row.pack(fill="x", pady=(12, 0))
    tk.Button(
        btn_row,
        text="Закрыть",
        command=win.destroy,
        bg=theme.ACCENT,
        fg=theme.TEXT,
        activebackground="#ff7ab8",
        activeforeground=theme.TEXT,
        font=("Helvetica", 10, "bold"),
        relief="flat",
        bd=0,
        padx=18,
        pady=6,
        cursor="hand2",
    ).pack(side="right")

    win.update_idletasks()
    w = max(win.winfo_reqwidth(), 440)
    h = min(win.winfo_reqheight(), 520)
    win.minsize(380, 360)
    x = root.winfo_rootx() + (root.winfo_width() - w) // 2
    y = root.winfo_rooty() + (root.winfo_height() - h) // 2
    win.geometry(f"{w}x{h}+{max(0, x)}+{max(0, y)}")
