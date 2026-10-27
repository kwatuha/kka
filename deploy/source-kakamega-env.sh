#!/usr/bin/env bash
# Parse KEY=value lines from Kakamega .env without executing shell syntax in values.
# Usage: source "$(dirname "$0")/source-kakamega-env.sh" && load_kakamega_env /path/to/.env

load_kakamega_env() {
  local file="${1:-.env}"
  if [[ ! -f "$file" ]]; then
    echo "ERROR: env file not found: $file" >&2
    return 1
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(printf '%s' "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "$line" ]] && continue
    [[ "$line" != *=* ]] && continue
    local key="${line%%=*}"
    local val="${line#*=}"
    key="$(printf '%s' "$key" | sed 's/[[:space:]]*$//')"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    export "${key}=${val}"
  done < "$file"
}
