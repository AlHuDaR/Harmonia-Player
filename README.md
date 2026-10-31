# Harmonia Player

An Arabic/English audio and video player for Android, with on-device YouTube search, offline downloads, Google Cast, playlists, background playback and Android TV support. Built with Expo and React Native.

**Current app version: 2.0.0-preview.8 · Android versionCode 14 · Android 7.0+**

[Download the tested APK](#download-and-install) · [Latest changes](CHANGELOG.md) · [Windows / Android Studio](docs/WINDOWS_BUILD.md) · [Arabic Mi Box guide](docs/ANDROID_TV_AR.md)

The owner has confirmed streaming Cast and downloaded-file Cast working on **Mi Box**. Downloaded files cast directly from Harmonia over the local network, without a YouTube lookup or opening the YouTube app. This is owner-reported device confirmation; the automated checks and remaining device coverage are described below.

## Latest updates

- **Downloaded-file Cast — preview.8:** cast completed downloads from Harmonia to a compatible receiver. The phone serves the selected saved file with byte-range seeking and a foreground service that continues through normal backgrounding and screen-off. An ongoing notification includes **Stop casting**.
- **YouTube Cast — preview.7:** prepare a compatible video/audio stream after selecting a receiver, preserve the current position and play/pause intent, and synchronize receiver controls. Availability depends on the formats the source actually provides.
- **Cast controls and bilingual search — preview.6:** the official Android Google Cast SDK, portrait/fullscreen Cast controls, a clear X in search fields, natural Arabic/English text direction, debouncing and stale-result protection. Playback improvements include speed control, eligible long-video bookmarks and safer retry/source changes.
- **Automatic quality and Android TV — preview.5:** source-dependent adaptive H.264/AAC playback up to 1080p, manual quality selection, TV launcher/banner, visible directional focus and a larger TV player layout.
- **Download/library improvements — previews.2–4:** persistent native transfer jobs, progress and transfer speed, cancellation/retry, validation before completion, searchable downloads and status filters, offline Play all, and more reliable duplicate/retry handling.

See the [changelog](CHANGELOG.md) for the full preview history and the [downloaded-file Cast implementation and validation record](docs/DOWNLOADED_CAST_PREVIEW8.md) for the latest fix.

## Download and install

The following are the **tested preview.8 Cast-build artifacts** from [CI run 96](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/41234295330), source revision [`66a9127`](https://github.com/AlHuDaR/Harmonia-Player/commit/66a9127f96691bf0f7cc3f0c1d1196501dc39dc1):

| Download                                                                                                                 | Choose this when                                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [Universal APK ZIP](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/41234295330/artifacts/13055253869)           | You want broad Android compatibility, including ARM32, ARM64, x86 and x86_64.         |
| [ARM64 APK ZIP](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/41234295330/artifacts/13056020470)               | You use a modern ARM64 phone, such as the Galaxy S24 Ultra, and want the smaller APK. |
| [Windows-built ARM64 APK ZIP](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/41234295330/artifacts/13055715727) | You want the equivalent artifact built through the native PowerShell workflow.        |

1. Download and extract the ZIP. GitHub sign-in may be required.
2. Open the `.apk` on your Android device and allow installation from that source when Android asks.
3. Install over the existing app when the signing key matches. The package ID remains `com.alhudar.harmonia`.

These are test-signed preview builds, not a Google Play production release. Updates require the same signing key; uninstalling removes app-private downloads and saved data. GitHub Actions artifacts have a 14-day retention period. If a link expires, check the [Android Release Artifacts workflow](https://github.com/AlHuDaR/Harmonia-Player/actions/workflows/android-apk.yml) or build from source. Later dependency/documentation commits on `main` are separate from the tested build revision linked above.

## Features

### Playback and browsing

- Home browsing, Recent, Search and Library, with a persistent mini player across tab navigation.
- On-device YouTube video search, thumbnails, metadata and paginated results using NewPipe Extractor; no API key, Google login or hosted resolver is required.
- Video and audio-only playback, source-dependent Auto/manual quality selection, fullscreen, Android picture-in-picture, background media controls and playback speed.
- Previous/Next, queue editing, shuffle/repeat and optional related-video auto-enqueue. Quality changes retain the playback position where supported.
- Saved resume points for eligible long videos and position-preserving manual retry. Opening the app does not automatically start playback.
- Open YouTube or direct HTTPS media links from Library, import local audio/video, and share links or granted media files into Harmonia from other Android apps.

### Downloads and library

- Native WorkManager download jobs with notifications, progress, byte/average-speed reporting, cancellation, bounded retries and process-restart reconciliation.
- Search downloads by title, artist or provider; filter **All**, **Active**, **Offline** and **Needs attention**. **Play all** follows the visible completed downloads.
- Offline app-private files, favorites, named playlists, saved tracks, imported media, saved web links and the latest 100 history entries.
- Audio downloads retain their original M4A/WebM container. Compatible separate MP4 video/AAC audio downloads are combined on-device without transcoding.
- Download validation checks media/length/DRM before completion. Failed partial files are cleaned up; retry resolves fresh formats when needed. Transfers restart rather than resume with HTTP Range after interruption.
- Imported files are copied into persistent app-private storage, so reopening them does not depend on temporary document-provider grants. No broad storage or microphone permission is requested.

### Arabic, English and appearance

- Saved Arabic/English language selection, RTL-aware layouts and accessible controls.
- Shared clearable search inputs with first-strong text direction for Arabic, English and mixed text; clearing preserves focus.
- Debounced remote search, obsolete-request protection, loading/empty/error states and retry controls.
- Light, Dark and System appearance, plus **Harmonia**, **Midnight**, **AMOLED Black**, **Ocean** and **Sunset** theme presets.
- Android TV launcher support, optional-touch declarations, visible D-pad focus and a TV-sized player layout. See the [Arabic installation and TV checklist](docs/ANDROID_TV_AR.md).

## Cast from Harmonia

Harmonia uses the official Android Google Cast sender SDK and Google's Default Media Receiver. Cast controls are available in the expanded player and native fullscreen controls. Receiver play/pause, seek, progress and stream volume follow receiver capabilities. Local audio pauses during transfer to avoid duplicate output.

| Source                                                                     | Current Cast behavior                                                                                                                                                                    |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completed app-owned downloads / eligible imported files                    | Serve the selected local file directly from the phone over Wi-Fi/Ethernet. Supports MP4/M4A, MP3, AAC, WebM, Ogg audio, WAV and FLAC containers when the receiver supports their codecs. |
| Finite YouTube video/audio                                                 | Resolve a fresh, validated compatible progressive MP4/AAC or clear HLS candidate, independently of the phone's local Auto/DASH playback. Not every video supplies a usable candidate.    |
| Compatible public direct MP4/HLS                                           | Send eligible public HTTPS media URLs under the direct-source policy. These URLs cannot require credentials, query parameters or custom headers.                                         |
| Phone-local generated DASH, unsupported extracted sources, protected media | Keep local playback available and show an explanation; no DRM, authentication or transcoding workaround is provided.                                                                     |

**For a downloaded song:** open the completed download in Harmonia → tap **Cast** → choose **Mi Box** or another compatible receiver. Keep the phone and receiver reachable on the same local network. The phone must stay powered and the serving app process must remain available; normal backgrounding and screen-off are supported. Stop/disconnect, a network/address change or file removal closes the local source. Switching tracks uses the existing per-track Cast action; it does not automatically cast the entire queue.

Streaming and downloaded-file Cast are **confirmed working by the owner on Mi Box**. Other receiver models, every codec, VPN/isolated-network behavior and the full interruption/reconnect checklist remain device-dependent. Casting from a phone to Mi Box is separate from validating Harmonia installed directly on Android TV.

Read the [downloaded-file source contract](docs/DOWNLOADED_CAST_PREVIEW8.md) and [YouTube Cast source contract](docs/YOUTUBE_CAST_PREVIEW7.md) for supported sources, cancellation, handoff and recovery.

## Shared links and provider support

Recognizing a provider URL does not prove playable media exists. Harmonia enables playback/download actions only after discovering and validating matching formats; otherwise **Save Link** and **Open in Browser** remain available.

| Provider/source                            | Implemented scope                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube                                    | On-device search, fresh metadata/format extraction, playback and supported audio/video downloads through NewPipe Extractor 0.26.5. Live HLS is playback-only.                         |
| Direct HTTPS media                         | Supported audio/video files and compatible streams. A website/login page is not a media source; HLS/DASH offline export is not included.                                              |
| Public Instagram posts/Reels               | Bounded public-embed discovery; video actions require an actually accessible, verified MP4. No isolated-audio extraction, private/authenticated content, Stories or carousel support. |
| Public Vimeo/Reddit                        | Scoped public metadata adapters for returned compatible formats. Live availability is not guaranteed; denied/encrypted/missing media stays unavailable.                               |
| Facebook video/Reel and Snapchat Spotlight | Attempt explicit public video metadata and validate a compatible media response. Live-provider success remains unverified; these are not advertised as universal working downloaders. |
| TikTok, X/Twitter and other web pages      | Save/browser fallback unless a supported direct media source is supplied.                                                                                                             |

Provider changes, access restrictions, unavailable codecs and expired URLs can affect online media. No cookies, login bypass, DRM handling, universal website extraction, MP3 conversion or Google-account synchronization is included. See the historical [provider review](docs/MULTIPLATFORM_PROVIDER_REVIEW.md), [Instagram scope](docs/INSTAGRAM_PUBLIC_EMBED.md) and newer [media-repair findings](docs/MEDIA_REPAIR_2026_10.md) for source-specific evidence.

## Build from source

The Android app uses **Expo SDK 57 / React Native 0.86.3**, **minSdk 24**, **compile/target SDK 36**, build-tools **36.0.0** and NDK **27.1.12297006**. Install Node **22.13+** (CI uses Node 24), Java **17**, the matching Android SDK/NDK and CMake **3.22.1**. Set `JAVA_HOME` and `ANDROID_HOME` to your installations.

```sh
npm ci
npm run typecheck
npm test
npm run build:android-release
```

The complete release build produces:

- `artifacts/Harmonia-Player-arm64.apk`
- `artifacts/Harmonia-Player-universal.apk` — `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`.
- `artifacts/Harmonia-Player.aab` — Android App Bundle; Google Play generates installable device APKs from it.

Individual commands are `npm run build:apk`, `npm run build:universal-apk` and `npm run build:aab`. For Windows without WSL, use the [PowerShell / Android Studio guide](docs/WINDOWS_BUILD.md), including `scripts/build-android-release.ps1`. Direct installation is also available with:

```sh
adb install -r artifacts/Harmonia-Player-universal.apk
```

Android sources are generated by Expo prebuild. Make native changes in `native/` and `plugins/`, not the ignored generated `android/` directory. The Android APK includes the native YouTube and Cast bridges; Expo Go, web and iOS do not provide those Android integrations. The old `server/` is for legacy development and is not used by the Android app.

### Production signing

Default local/CI artifacts use development signing for testing. **Do not upload the default AAB to Google Play production.** Use a protected production upload key through the existing signing plugin:

```sh
export HARMONIA_PRODUCTION=1
export HARMONIA_STORE_FILE=/absolute/path/to/harmonia-upload-key.jks
export HARMONIA_STORE_PASSWORD='...'
export HARMONIA_KEY_ALIAS='...'
export HARMONIA_KEY_PASSWORD='...'
npm run build:aab
```

Never commit keystores or passwords. `*.jks` and `*.keystore` are ignored. Keep package/signing identity consistent for updates and increase Android `versionCode` for each store release. See the [release/signing record](docs/release-1.5.md).

## Development and verification

```sh
npm ci
npm run typecheck
npm test
npm run dev -- --web --max-workers 2
npm run build:web -- --max-workers 2
npx playwright install chromium
npm run test:web
```

For an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium` for the browser test command. The repository's `npm run lint` currently runs TypeScript (`tsc --noEmit`); there is no separate ESLint configuration. For native development, use `npm run android` with an attached device/emulator and a generated native build.

The tested preview.8 runtime passed:

| Check                      | Recorded result                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript and Expo Doctor | Passed; Doctor 21/21.                                                                                                                |
| JavaScript unit tests      | 177 passed.                                                                                                                          |
| Native Gradle JVM tests    | 50 passed in 11 classes, including real HTTP range/cleanup tests.                                                                    |
| Browser regressions        | 19 passed using generated media fixtures.                                                                                            |
| Hosted Linux / Windows     | Release assembly and artifact verification passed, including the native PowerShell build.                                            |
| API 35 Android emulator    | Sharing/offline smoke checks and MP3/M4A/MP4 Cast-file service, grants, seeks, CORS, foreground/screen-off reads and cleanup passed. |
| Physical Mi Box Cast       | Owner reports streaming and downloaded-file casting working. Other device scenarios were not independently exercised here.           |

[CI run 96](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/41234295330) and [merged PR #39](https://github.com/AlHuDaR/Harmonia-Player/pull/39) record the tested runtime provenance. The emulator tests exercise the phone's serving mechanism, not a physical receiver decoder. Full Android lint still has seven previously documented Expo-generated manifest/splash errors; passing release builds do not mean full lint is clean. Historical dependency-audit counts are snapshots; check the current lockfile/security alerts for the current state.

Before distributing another build, recheck real-device audio focus/Bluetooth, PiP, background/notification controls, rotation, offline restart, imports, library persistence, Arabic/English editing and the Cast disconnect/reconnect/source-switch checklist. Direct Android TV installation/D-pad/codec acceptance and live social-provider availability remain separate checks. The latest owner report does not establish every scenario on every device.

## Release history and documentation

| Version                   | Main additions                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| 2.0.0-preview.8 / code 14 | Direct downloaded-file Cast from Harmonia; foreground local source and Android service tests. |
| 2.0.0-preview.7 / code 13 | Fresh compatible YouTube Cast candidates and bounded handoff/recovery.                        |
| 2.0.0-preview.6 / code 12 | Official Google Cast controls, bilingual clearable search, bookmarks and playback recovery.   |
| 2.0.0-preview.5 / code 11 | Source-dependent automatic quality up to 1080p and Android TV launch/focus support.           |
| 2.0.0-preview.4 / code 10 | Download search/filters and library/retry reliability.                                        |
| 2.0.0-preview.3 / code 9  | Verified public Instagram embed-video discovery.                                              |
| 2.0.0-preview.2 / code 8  | Scoped provider adapters and persistent validated native downloads.                           |
| 2.0.0-preview.1 / code 7  | Android share intake, source recognition and saved links.                                     |
| 1.5 / code 6              | Compact navigation, mini player, themes and Settings/About/Support/Licenses.                  |
| 1.4                       | Arabic/English layouts, queue/repeat/shuffle and external YouTube links.                      |
| 1.3                       | Expanded watch view, metadata, related items and playback actions.                            |

- [Changelog](CHANGELOG.md)
- [Downloaded-file Cast — current source/lifecycle and Mi Box checks](docs/DOWNLOADED_CAST_PREVIEW8.md)
- [YouTube Cast — source selection and transfer](docs/YOUTUBE_CAST_PREVIEW7.md)
- [Cast/search upgrade — historical preview.6 implementation and evidence](docs/CAST_SEARCH_UPGRADE.md)
- [Adaptive quality / Android TV — historical preview.5 evidence](docs/TV_STREAMING_PREVIEW5.md)
- [Arabic Android TV / Mi Box installation guide](docs/ANDROID_TV_AR.md)
- [Windows and Android Studio builds](docs/WINDOWS_BUILD.md)
- [Original 2.0 audit and roadmap](docs/HARMONIA_V2_AUDIT.md)

## License

Harmonia's source is **GPL-3.0-or-later** to match the integrated NewPipe extractor. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), including the Google Cast SDK's separate terms and documented redistribution-review item. Distribute matching source/build instructions with APKs and use media you are permitted to access/download.
