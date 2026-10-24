#!/bin/sh
set -eu

verbose=
if [ "${1:-}" = "-v" ]; then
  verbose=-v
  shift
fi

if [ $# -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage: $0 [-v] /path/to/xml" >&2
  exit 1
fi

file="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"

cd "$(dirname "$0")"
docker compose run --rm --build --quiet-build --quiet-pull -v "$file:/data/config.xml:ro" app $verbose /data/config.xml
