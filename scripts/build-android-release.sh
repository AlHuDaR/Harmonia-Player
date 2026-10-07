#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

mode="${1:-all}"
case "$mode" in
  all|arm64|universal|aab) ;;
  *)
    echo "Usage: $0 [all|arm64|universal|aab]" >&2
    exit 2
    ;;
esac

: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-}}"
if [[ -z "$ANDROID_HOME" ]]; then
  echo 'Set ANDROID_HOME to an installed Android SDK (platform 36, build-tools 36.0.0, NDK 27.1.12297006).' >&2
  exit 1
fi

export ANDROID_HOME
export EXPO_NO_TELEMETRY=1
export CI=1

ARM64_ABIS="arm64-v8a"
ALL_ABIS="armeabi-v7a,arm64-v8a,x86,x86_64"

prebuild_args=(--platform android --no-install)
if [[ -n "${EXPO_PREBUILD_TEMPLATE:-}" ]]; then
  prebuild_args+=(--template "$EXPO_PREBUILD_TEMPLATE")
fi

npx expo prebuild "${prebuild_args[@]}"
mkdir -p artifacts

gradle() {
  (
    cd android
    ./gradlew "$@" --max-workers=2 --no-daemon
  )
}

build_arm64() {
  gradle :app:assembleRelease "-PreactNativeArchitectures=$ARM64_ABIS"
  cp android/app/build/outputs/apk/release/app-release.apk artifacts/Harmonia-Player-arm64.apk
  printf 'ARM64 APK: %s/artifacts/Harmonia-Player-arm64.apk\n' "$PWD"
}

build_universal() {
  gradle :app:assembleRelease "-PreactNativeArchitectures=$ALL_ABIS"
  cp android/app/build/outputs/apk/release/app-release.apk artifacts/Harmonia-Player-universal.apk
  printf 'Universal APK: %s/artifacts/Harmonia-Player-universal.apk\n' "$PWD"
}

build_aab() {
  gradle :app:bundleRelease "-PreactNativeArchitectures=$ALL_ABIS"
  cp android/app/build/outputs/bundle/release/app-release.aab artifacts/Harmonia-Player.aab
  printf 'Android App Bundle: %s/artifacts/Harmonia-Player.aab\n' "$PWD"
}

case "$mode" in
  arm64) build_arm64 ;;
  universal) build_universal ;;
  aab) build_aab ;;
  all)
    build_arm64
    build_universal
    build_aab
    ;;
esac

if [[ "${HARMONIA_PRODUCTION:-0}" == "1" ]]; then
  echo "Production signing was requested through HARMONIA_PRODUCTION=1."
else
  echo "WARNING: These release artifacts use the generated development signing configuration."
  echo "They are suitable for testing, but the AAB is not ready for Google Play production upload."
  echo "Set HARMONIA_PRODUCTION=1 and the HARMONIA_* signing variables to create production-signed artifacts."
fi
