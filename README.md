# Harmonia Player

Harmonia Player is an audio and video player built with Expo and React Native, focused on Android phones and Android TV. Play local files and supported online media, organize a library, download available formats for offline listening/viewing, and send compatible media to Google Cast receivers.

**Current main: 2.0.0 · Android versionCode 15 · stability release candidate.** Android 7.0+ (API 24); package `com.alhudar.harmonia`. Configuration uses Expo `~57.0.33` and React Native `0.86.3`. Web and iOS retain direct-media paths; Android extraction, WorkManager downloads and Cast require a native Android build and are unavailable in Expo Go.

The owner reports successful Android phone use; the [release record](docs/release-2.0.0.md) also accepts S24 Ultra/Mi Box testing as baseline evidence. That does not certify every provider or the exact candidate. Production signing, update compatibility and public-distribution gates remain open. See [installation](#installation-and-downloads) and [quality and security](#quality-and-security).

## Features

### Playback

- Persistent audio/video player across navigation, mini player, expanded view, fullscreen, timeline scrubbing and source-dependent seeking.
- Android background playback, notification/lock-screen media controls, manual/automatic Picture-in-Picture and media-session integration. Bluetooth/audio-focus behavior needs device acceptance.
- YouTube audio/video format selection and source-dependent Auto adaptation up to 1080p; changing quality preserves position. A single fixed file cannot provide adaptive quality.
- Previous/Next, explicit queue ordering/removal, playlists, shuffle/repeat, playback-speed presets and A–B loops. Eligible long-video checkpoints persist; reopening does not automatically start playback.

### Social media and sharing

Android accepts text links through Share/Open with and granted audio/video files, including multiple-file imports. Library provides manual link entry. Recognition alone enables **Save Link** and **Open in Browser**; playback and download buttons require discovered compatible formats.

| Provider | Playback | Isolated audio | Downloads | Save/share constraints |
| --- | --- | --- | --- | --- |
| YouTube | On-device NewPipe search, metadata and returned video/audio formats | Returned audio formats | Audio in original M4A/WebM; compatible MP4/AAC video mux | Watch/Shorts/live links; live HLS playback only; no account sync |
| Instagram | Public post/Reel embed video when matching metadata and MP4 verification succeed | No extraction | Discovered progressive video only | No Stories, private content, photos/carousels or universal-link guarantee |
| Facebook | Conditional public video/Reel metadata adapter | No extraction | Only verified returned progressive video | Supported IDs/redirects only; browser/save fallback; live success unverified |
| Snapchat | Conditional public Spotlight metadata adapter | No extraction | Only verified returned progressive video | Spotlight URLs only; browser/save fallback; live success unverified |
| Vimeo / Reddit | Bounded public config/JSON adapters | Only actually exposed audio formats | Eligible files only; HLS playback only | No general live-success guarantee; Reddit silent GIF fallback is labelled |
| TikTok / X and other web pages | No extraction adapter | No | No | Recognized links can be saved/opened in browser |
| Direct HTTPS media | Compatible audio/video files and supported clear streams | Actual audio files, not video-to-audio conversion | Eligible files | HTML/login pages are not media; codec/server constraints apply |

No MP3 conversion, DRM/authentication bypass or offline HLS export is included. Provider changes, region, login, rate limits and expiring media URLs can prevent discovery. [Provider evidence and architecture](docs/MULTIPLATFORM_PROVIDER_REVIEW.md) explains these boundaries.

### Downloads and library

- Android WorkManager jobs with persistent records, foreground notifications, progress/byte/speed reporting, cancellation, bounded automatic retries and explicit retry with fresh discovery.
- Process-restart reconciliation, stale-job and missing-file recovery, batch retry of failed items, integrity/media checks and cleanup. Retried transfers **restart**, without HTTP Range byte-resume; force-stop suspends Android work until reopening.
- Search downloads by title/artist/provider; All, Active, Offline and Needs attention filters. Play all follows visible offline results.
- Import local audio/video through the document picker or granted shares into app-private storage. No broad device-library scan or storage permission is required.
- Persistent favorites, named playlists, saved tracks, saved links and the latest 100 history items. Library collections offer title/artist search; downloads offer status filtering. General library sorting, album grouping and playlist reordering remain proposals.
- Completed downloads/imports play offline. Uninstalling deletes app-private files and saved data; no automatic backup is configured.

### Interface and casting

Home, Search, Downloads and Library navigation includes a mini player, clearable search, Arabic/English text, RTL/LTR handling, Light/Dark/System themes and settings for playback/preferences. About, Support and Licenses link to project information and feedback.

The Android Google Cast sender provides receiver selection, connection/preparing/loading/playback status, session controls and bounded recovery. Compatible public MP4/HLS can transfer to Chromecast/Mi Box. Finite YouTube uses freshly validated receiver candidates independently of phone-local DASH; completed app-owned downloads use a session-scoped LAN server with byte-range seeking and foreground service. Keep phone and receiver on the same reachable network. Receiver codecs/access remain authoritative; uncertain STOP keeps local audio paused to avoid duplicate output.

Android TV has launcher/banner and D-pad focus support. Use a universal APK for Mi Box models with 32-bit Android. See [TV guide (Arabic)](docs/ANDROID_TV_AR.md), [YouTube Cast contract](docs/YOUTUBE_CAST_PREVIEW7.md) and [downloaded-file Cast contract](docs/DOWNLOADED_CAST_PREVIEW8.md).

## Feature compatibility matrix

“Implemented” means a code path exists. Automated fixtures do not establish live-provider or physical-device success. Test references are repository coverage, not claims of a fresh run for this documentation change.

| Feature | Supported | Verified | Limitations |
| --- | --- | --- | --- |
| YouTube | Native Android search/play/audio/download | `tests/youtube.test.ts`, native bridge/format tests; recorded Android baseline | Fresh extraction/source availability; no restricted/DRM downloads; live is playback-only |
| Instagram | Conditional public embed MP4 | Native `InstagramEmbedTest`; historical single-Reel decoding evidence | Current live Android run unverified; no isolated audio/private media |
| Facebook | Conditional public video/Reel adapter | Native `PublicSocialEmbedTest` fixtures | Live playback/download unverified; no isolated audio |
| Snapchat | Conditional Spotlight adapter | Native `PublicSocialEmbedTest` fixtures | Live playback/download unverified; not general Snapchat sharing extraction |
| Background audio / PiP | Native Android player/media session | Config/player implementation; accepted owner baseline | Bluetooth, interruptions and OEM restrictions need exact-candidate checks |
| Offline downloads | Android persistent worker + private files | `tests/nativeDownloads.test.ts`, native transfer tests; recorded emulator restart/offline baseline | Restart rather than byte-resume; quotas/storage/force-stop constraints |
| Casting | Android SDK; direct, finite YouTube and local-file sources | `tests/cast.test.ts`, `tests/localCast.test.ts`, native HTTP/instrumentation baseline; owner Mi Box baseline | Not every receiver/source; exact candidate hardware acceptance still needed |
| Library / playback controls | Persistent collections, queue, speed, loops, checkpoints | `tests/library.test.ts`, `tests/playbackControls.test.ts`, `tests/resume.test.ts` | No autoplay after restart; sorting/grouping proposals are not released |

## Installation and downloads

Use [GitHub Releases](https://github.com/AlHuDaR/Harmonia-Player/releases) for published packages when available. Otherwise open [Android Release Artifacts](https://github.com/AlHuDaR/Harmonia-Player/actions/workflows/android-apk.yml), select a successful run **for the desired commit**, and download its artifacts while logged in. Actions artifacts expire after 14 days; their temporary links are not permanent releases. Check the run's version and results before installing.

| Artifact / local output | Purpose |
| --- | --- |
| `Harmonia-Player-arm64` / `artifacts/Harmonia-Player-arm64.apk` | Smaller APK for ARM64 phones |
| `Harmonia-Player-universal` / `artifacts/Harmonia-Player-universal.apk` | APK with ARM32, ARM64, x86 and x86_64; use for TV or x86_64 emulators |
| `Harmonia-Player-aab` / `artifacts/Harmonia-Player.aab` | Google Play upload bundle; cannot be installed with `adb install` |
| `Harmonia-Player-Windows-arm64` | ARM64 APK built by the Windows workflow job |

Copy an APK to a test device and open it, or run `adb install -r artifacts/Harmonia-Player-arm64.apk`. Default local/CI release builds are **test-signed**. Updating in place requires the same package, compatible signer and acceptable versionCode; a higher version alone does not fix a key mismatch. Obtain a matching signed update rather than uninstalling and losing data.

Production signing uses the existing `HARMONIA_PRODUCTION=1`, `HARMONIA_STORE_FILE`, `HARMONIA_STORE_PASSWORD`, `HARMONIA_KEY_ALIAS` and `HARMONIA_KEY_PASSWORD` configuration. Keep keys/passwords outside Git. Do not publish the default AAB. See [signing, install-over-old and release gates](docs/release-2.0.0.md).

## Development

Use Node **22.13+** (CI uses **24**), npm lockfile installation, JDK **17**, Android SDK Platform **36**, Build-Tools **36.0.0**, NDK **27.1.12297006**, CMake **3.22.1** and Platform-Tools. Set `JAVA_HOME` and `ANDROID_HOME`; accept SDK licenses. Compile/target SDK is 36, minimum API 24. Windows users should use the [PowerShell/Android Studio guide](docs/WINDOWS_BUILD.md).

```sh
npm ci
npm run typecheck
npm test
npm run android
```

Keep npm install scripts enabled: postinstall applies the checked query-string decoder compatibility patch. For native development, attach a device/emulator. Expo prebuild generates ignored `android/` sources; maintain native changes through `native/` and `plugins/`. Open the generated `android` directory in Android Studio with Gradle JDK 17.

Web development and fixture checks (POSIX shell):

```sh
npm run dev -- --web --max-workers 2
npm run build:web -- --max-workers 2
npx playwright install chromium
npm run test:web
```

Alternatively set `PLAYWRIGHT_CHROMIUM_PATH` to installed Chromium. Browser tests cover fixture playback/UI and unavailable-native states, not live Cast or native extraction. `npm run lint` and `npm run typecheck` both run TypeScript checking. `npm run server` starts the legacy development resolver; Android uses on-device NewPipe **v0.26.5**, without that server or an API key.

Release commands (POSIX shell; not required for documentation edits):

```sh
npm run build:apk                 # ARM64 APK
npm run build:universal-apk
npm run build:aab
npm run build:android-release     # all three
```

On Windows use `npm run build:apk:windows` or the PowerShell script's `universal`, `aab` and `all` modes. Release APKs embed JavaScript and do not need Metro; development debug APKs do.

## Quality and security

The [workflow](.github/workflows/android-apk.yml) defines Expo Doctor, TypeScript, Vitest, browser tests, web export, Linux Android builds, native unit tests, signature/ABI/bundle checks, emulator share/offline/local-Cast checks and a Windows ARM64 build. Optional live Instagram testing is skipped without a supplied URL.

At documentation review, [main `663c5f7` CI](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/43307066351) was still running; no green result is claimed. The [release record](docs/release-2.0.0.md) records successful baseline build #130 at `5925cc8`, including 192 unit and 20 browser tests. Those are historical results, not tests rerun here.

Use `npm audit` and Expo Doctor to assess the installed dependency graph; do not force incompatible SDK downgrades. The candidate retains SDK 57, scoped minimatch/decoder fixes and decoder regressions. This does not certify zero vulnerabilities. Native media/codec support, Android lifecycle quotas and network access require device testing.

Before distribution, check the exact signed artifact on S24 Ultra and another supported Android version, plus Mi Box/Chromecast: in-place update and data retention, cold/warm shares, Arabic/insets, background/lock-screen/Bluetooth/PiP, offline restart, interrupted downloads, receiver seek/screen-off/disconnect and one audio output. Record commit, APK hash, signer and device/OS. Confirm versionCode 15 is unused in Play Console. Provider authorization, store policy, privacy/Data Safety and production signing remain the [documented release gates](docs/release-2.0.0.md#public-distribution-policy-gates).

## Roadmap

- **Completed in main:** persistent native downloads, public-metadata adapters, bilingual themes/navigation, Android TV foundation, streaming/downloaded-file Cast, missing-file/batch retry recovery, speed/scrubbing/loops/checkpoints, library search/rendering refinements and SDK-57 dependency fixes. See [changelog](CHANGELOG.md).
- **In progress:** 2.0.0 candidate acceptance, production signer/update compatibility and distribution review. No public-release completion is claimed.
- **Future proposals:** validated byte-range download resume, Wi-Fi-only scheduling, richer sorting/grouping and playlist reordering, export, subtitles/track selection and sleep timer. The [historical audit](docs/PROFESSIONAL_AUDIT_2026_11.md) contains rationale, not release promises.

## Support, licensing and contributing

Report reproducible problems through [GitHub Issues](https://github.com/AlHuDaR/Harmonia-Player/issues), including version, device/Android version, steps and sanitized logs. Do not post credentials or expiring signed media URLs.

Contributions should keep changes focused, distinguish fixture tests from live/device evidence, and include relevant validation in the PR. See [current release notes](docs/release-2.0.0.md), [Windows builds](docs/WINDOWS_BUILD.md), [provider review](docs/MULTIPLATFORM_PROVIDER_REVIEW.md) and historical [architecture](docs/HARMONIA_V2_ARCHITECTURE.md).

Licensed **GPL-3.0-or-later**; see [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md). Distribute matching source and build instructions with binaries. Access/download only media you are permitted to use; technical availability does not establish provider permission.
