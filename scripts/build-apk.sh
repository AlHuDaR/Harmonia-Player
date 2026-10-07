#!/usr/bin/env bash
set -euo pipefail

# Backward-compatible ARM64-only build entry point.
exec bash "$(dirname "$0")/build-android-release.sh" arm64
