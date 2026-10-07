#!/usr/bin/env bash
# Выбор Python для node-gyp (better-sqlite3). Подключать: source … && ensure_node_gyp_python

ensure_node_gyp_python() {
  local brew_prefixes=("/opt/homebrew" "/usr/local")
  local candidates=()

  _add_candidate() {
    local py="$1"
    [[ -n "$py" && -x "$py" ]] && candidates+=("$py")
  }

  _collect_candidates() {
    candidates=()
    command -v python3.12 >/dev/null 2>&1 && _add_candidate "$(command -v python3.12)"
    command -v python3.11 >/dev/null 2>&1 && _add_candidate "$(command -v python3.11)"
    local prefix=""
    for prefix in "${brew_prefixes[@]}"; do
      _add_candidate "$prefix/opt/python@3.12/bin/python3.12"
      _add_candidate "$prefix/opt/python@3.11/bin/python3.11"
    done
  }

  _python_ok_for_gyp() {
    local py="$1"
    "$py" -c "import distutils" 2>/dev/null && return 0
    return 1
  }

  _try_set_python() {
    local py="$1"
    if _python_ok_for_gyp "$py"; then
      export npm_config_python="$py"
      export PYTHON="$py"
      echo "→ node-gyp: $($py -V 2>&1) ($py)"
      return 0
    fi
    return 1
  }

  _collect_candidates
  local py=""
  for py in "${candidates[@]}"; do
    _try_set_python "$py" && return 0
  done

  if command -v brew >/dev/null 2>&1; then
    echo ""
    echo "→ Python 3.14+ не подходит для node-gyp (нет distutils)."
    echo "  Устанавливаю python@3.12 через Homebrew…"
    brew install python@3.12 || true
    _collect_candidates
    for py in "${candidates[@]}"; do
      if ! _python_ok_for_gyp "$py"; then
        "$py" -m pip install setuptools --break-system-packages -q 2>/dev/null \
          || "$py" -m pip install setuptools -q 2>/dev/null \
          || true
      fi
      _try_set_python "$py" && return 0
    done
  fi

  echo ""
  echo "Ошибка: не удалось подобрать Python для сборки better-sqlite3."
  echo "  brew install python@3.12"
  echo "  export npm_config_python=\"\$(brew --prefix python@3.12)/bin/python3.12\""
  echo "  npm install"
  return 1
}
