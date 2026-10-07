# Release 1.5.0 redesign validation (7 October 2026)

Validated on the `android-distribution` branch used by PR #24, with Node 24,
Expo SDK 57 and React Native 0.86.3. No dependencies were changed for the redesign.

- Expo Doctor: 21/21 checks passed.
- TypeScript: passed.
- Unit/integration tests: 47 passed, including migration of old preferences while
  retaining imported/downloaded files, playlists, favorites, history and language.
- Browser tests: 7 passed with Chromium 153 supplied through the existing
  `PLAYWRIGHT_CHROMIUM_PATH` override. The default browser CDN download was
  unavailable locally; a temporary browser outside the repo was used. No app
  dependency or CI browser configuration was changed.
- Browser coverage: MP3/MP4 playback, pause/seek, collapse without stopping,
  mini-player/navigation separation, Previous/Next in saved downloads,
  favorites/playlists, Arabic persistence, four tabs, drawer dismissal, theme
  persistence/system changes, narrow-screen developer credit and a real 3x3 grid.
- Web export, Android prebuild and native Android Hermes bundle export: passed.
- Generated Gradle config checked: `com.alhudar.harmonia`, version `1.5.0`,
  versionCode `6`, environment-only production signing retained.
- Diff review: private storage paths, library key, native extractor/download
  implementation and existing three-artifact build/signature checks preserved.

Local `npm run build:android-release` could not assemble APK/AAB artifacts because
this environment has no Android SDK. The existing PR workflow builds and verifies
ARM64 APK, universal APK and AAB; its current run, rather than this local report,
is authoritative for artifact availability. No production signing key or password
was supplied or generated. CI defaults remain test-signed.

No physical Android or live YouTube test is claimed. See
[release 1.5 device/signing checklist](release-1.5.md) for PiP, background controls,
YouTube links, offline media and a same-key upgrade test before distribution.

# On-device YouTube validation (1.2.0)

Implementation: [PR #2](https://github.com/AlHuDaR/Harmonia-Player/pull/2), based on PR #1's Android player.

- TypeScript and **26 unit/integration tests** pass locally. Tests cover native search forwarding, link validation, cancellation, media source/header handling, distinct format IDs, separate-file download/mux transitions, failure cleanup and existing offline library behavior.
- Web export passes. Native prebuild passes repeatedly without duplicating the package registration, Gradle dependency or repository entries.
- The initial integration revision passed all three GitHub browser tests using actual audio/video fixtures, plus TypeScript, tests and web export.
- See the PR checks and its linked Android APK workflow for the current revision's native compilation and artifact result. The workflow verifies the signature, ARM64-only packaging, bundled JavaScript, YouTube bridge and NewPipe classes before uploading.

No physical S24 Ultra or end-to-end live YouTube result is claimed. The browser tests exercise direct media playback, not the Android extractor. Generated separate-stream DASH playback, audio synchronization, codec compatibility and MediaMuxer outputs need the device tests in README. A successful APK compilation does not prove extraction still works against YouTube or that every video is accessible.

The current app uses NewPipe Extractor v0.26.5 on-device. The API key/resolver requirements and APK hash below describe the **earlier 1.1 baseline only** and do not apply to 1.2.0.

# Android 1.1 baseline (5 October 2026)

Validated in the cloud environment on 5 October 2026 with Node 24.19.0, Java 17, Expo SDK 52 and React Native 0.76.9.

- Clean `npm ci`, TypeScript checks and all 17 unit/integration tests passed.
- Three browser tests passed using real generated MP3/MP4 fixtures: playback time advances, pause/seek work, favorites/playlists persist, and setup/input errors are visible.
- Web export and Android Hermes bytecode export passed.
- Android prebuild and ARM64 release APK assembly passed.
- The 29.8 MiB local APK verifies with APK Signature Scheme v2. It contains only `arm64-v8a` native libraries, Hermes, and bundled JavaScript.
- Package `com.alhudar.harmonia`, version 1.1.0 (code 2), minimum API 24 and target API 35 were verified from the packaged manifest.
- PiP support, the non-exported mediaPlayback foreground service, and removal of microphone/broad storage permissions were verified in the packaged manifest.

Local APK: `artifacts/Harmonia-Player-arm64.apk` (development signature for testing). Its SHA-256 is `984b2a845dc01129ea974b59074b10a6e11a8fd5041b09fe080d81ab96f13825`. CI generates and signs a separate test artifact; do not assume its hash is identical.

The APK workflow runs on PR updates/main pushes/manual dispatch, checks the signature and exact ABI set, and uploads the artifact only after success. See [PR #1](https://github.com/AlHuDaR/Harmonia-Player/pull/1) for the current CI outcome.

Cloud-specific build issues were resolved by allowing the React Native artifact redirect host and placing Java proxy/trust settings in the Gradle user configuration. `JAVA_TOOL_OPTIONS` writes startup diagnostics to stderr, which Android's Prefab checker misinterprets as a compatibility failure; do not use it for these proxy settings. The project fixes a missing splash resource and filters packaged ABIs using the same architecture property as native compilation. CI explicitly excludes Google's removed `tools` SDK package.

A physical Samsung Galaxy S24 Ultra was unavailable. Screen-off playback, Bluetooth/lock-screen controls, PiP transitions, local file providers and offline downloads need the device checks in README. A live YouTube resolver request returned 502 because the cloud proxy denies YouTube access; search requires the user's client API key, and production resolution depends on the configured resolver and YouTube availability. No end-to-end YouTube success or physical-device result is claimed.
