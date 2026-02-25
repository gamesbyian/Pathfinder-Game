#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  echo "Error: port must be an integer between 1 and 65535." >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "Serving Pathfinder from: $ROOT_DIR"
echo "Open: http://127.0.0.1:$PORT/index.html"
echo "Press Ctrl+C to stop."

python3 -m http.server "$PORT"
