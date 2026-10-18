#!/bin/sh
# Двойной клик — запускает Джарвиса: локальный сервер + браузер.
# Закрыть: закройте это окно Терминала (или Ctrl+C).
cd "$(dirname "$0")" || exit 1

is_jarvis() { curl -fsS --max-time 1 "http://localhost:$1/manifest.webmanifest" 2>/dev/null | grep -q 'J.A.R.V.I.S.'; }
busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

PORT=8799
while [ $PORT -le 8820 ]; do
  if is_jarvis $PORT; then            # уже запущен — просто открываем
    echo "Джарвис уже запущен → http://localhost:$PORT/"
    open "http://localhost:$PORT/"; exit 0
  fi
  busy $PORT || break                 # свободный порт — берём его
  PORT=$((PORT + 1))                  # занят чем-то другим — следующий
done

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo "J.A.R.V.I.S. запущен"
echo "  на этом компьютере:   http://localhost:$PORT/"
[ -n "$IP" ] && echo "  для телефона (пульт): http://$IP:$PORT/"
echo "Закройте это окно, чтобы остановить."
(sleep 1; open "http://localhost:$PORT/") &
exec python3 -m http.server "$PORT" --bind 0.0.0.0
