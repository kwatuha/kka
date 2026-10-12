#!/usr/bin/env bash
# Publish Kakamega Field APK to the Kakamega HMIS stack.
#
# Usage:
#   ./deploy/release-kakamega-field-app.sh --version 1.0.4
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export REMOTE_DIR="${REMOTE_DIR:-intellinex-kakamega}"
export API_CONTAINER="${API_CONTAINER:-kakamega_api}"
export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.kakamega-shared-mysql.yml}"
export LOCAL_ENV_FILE="${LOCAL_ENV_FILE:-./deploy/.env.kakamega}"

exec "$ROOT/deploy/release-field-app.sh" "$@"
