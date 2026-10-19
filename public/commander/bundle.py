#!/usr/bin/env python3
"""Склеивает jarvis/ (index.html + css/ + js/) в один самодостаточный HTML.

    python3 bundle.py                 # → dist/jarvis.html
    python3 bundle.py out.html        # → свой путь

Что меняется в однофайловой версии:
  • стили и скрипты вставляются внутрь страницы;
  • иконка встраивается как data:-URL;
  • манифест и service worker отключаются (window.JV_BUNDLE = true) —
    установка как приложение работает только в версии из папки на сервере.
"""
import base64, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist' / 'jarvis.html'

html = (ROOT / 'index.html').read_text(encoding='utf-8')

def css(m):
    return '<style>\n' + (ROOT / m.group(1)).read_text(encoding='utf-8') + '</style>'

def js(m):
    code = (ROOT / m.group(1)).read_text(encoding='utf-8')
    if re.search(r'</script', code, re.I):
        raise SystemExit(f'{m.group(1)}: внутри есть "</script" — сломает вставку')
    return f'<script>/* {m.group(1)} */\n' + code + '</script>'

icon = 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'icon.svg').read_bytes()).decode()

html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', css, html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', js, html)
html = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)
html = html.replace('href="icon.svg"', f'href="{icon}"')
html = html.replace('<title>', '<script>window.JV_BUNDLE = true</script>\n<title>', 1)

left = re.findall(r'(?:src|href)="(?:css|js)/[^"]+"', html)
if left:
    raise SystemExit('не встроено: ' + ', '.join(left))
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding='utf-8')
print(f'✓ {OUT}  ·  {len(html) / 1024:.0f} КБ')
