#!/usr/bin/env bash
set -e

STORAGE_TARGET="/app/src/Utilities/Storage"
STORAGE_SEED="/app/storage-seed"

mkdir -p "$STORAGE_TARGET"

if [ -d "$STORAGE_SEED" ]; then
  rsync -a --ignore-existing "$STORAGE_SEED"/ "$STORAGE_TARGET"/
fi

exec "$@"