The existing player only changed UI state and did not load media. This adds an Expo Video playback engine and an ARM64 Android build path for Galaxy S24 Ultra, while keeping the Expo/React Native codebase.

- Align Expo SDK 52 dependencies; set Android package/SDK settings, background media service permissions and PiP; add standalone APK build script and GitHub Actions artifact generation.
- Implement audio/video play, pause, seeking, fullscreen, track metadata/media controls, and background/PiP preferences.
- Add Home/Search/Downloads/Library/Settings, direct HTTPS playback, local document import, progress/error/retry/delete downloads, and persistent favorites/history/playlists.
- Remove the hardcoded YouTube API key and obsolete extractor/conversion path. Optional search uses a user-configured client key; an optional yt-dlp resolver returns fresh combined media URLs.
- Add tests and README build/development/device validation instructions.

Validation: typecheck passed; 16 unit/integration tests passed; 3 browser tests passed (real MP3/MP4 playback, pause/seek, saved library and error states); web export and Android Hermes bytecode export passed. Android prebuild succeeded.

Full APK assembly is blocked in this cloud machine: React Native/Hermes Maven artifacts redirect to repo.reactnative.dev, which the egress proxy denies with HTTP 403. No APK has been produced or installed on a physical S24 Ultra. Native background playback, lock-screen/Bluetooth controls, PiP, imported media and offline downloads require device validation. A live YouTube resolver check returned 502 because the cloud proxy denies YouTube access; end-to-end search also requires the user's API key. See README's checklist before treating this as a release.
