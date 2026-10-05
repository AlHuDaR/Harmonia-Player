#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-}}"
if [[ -z "$ANDROID_HOME" ]]; then
  echo 'Set ANDROID_HOME to an installed Android SDK (platform 35, build-tools 35.0.0, NDK 26.1.10909125).' >&2
  exit 1
fi
export ANDROID_HOME
export EXPO_NO_TELEMETRY=1
export CI=1
prebuild_args=(--platform android --no-install)
if [[ -n "${EXPO_PREBUILD_TEMPLATE:-}" ]]; then prebuild_args+=(--template "$EXPO_PREBUILD_TEMPLATE"); fi
npx expo prebuild "${prebuild_args[@]}"
(
  cd android
  ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=2 --no-daemon
)
mkdir -p artifacts
cp android/app/build/outputs/apk/release/app-release.apk artifacts/Harmonia-Player-arm64.apk
printf 'APK: %s/artifacts/Harmonia-Player-arm64.apk\n' "$PWD"
