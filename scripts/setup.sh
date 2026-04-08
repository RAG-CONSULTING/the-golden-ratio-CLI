#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "[golden-ratio-cli] Installing dependencies..."
npm install --production=false

echo "[golden-ratio-cli] Building..."
npm run build

echo "[golden-ratio-cli] Ready."
