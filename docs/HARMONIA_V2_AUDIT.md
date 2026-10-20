# Harmonia 2.0 audit

Audited 2026-10-20 against `main` / `ecf20e0767e3264ac58c0b49a10c0ec8159198f4` before implementation. This is a source audit, not a claim of physical-device validation. Baseline: 1.5.0, package com.alhudar.harmonia, versionCode 6, Expo 57, RN 0.86.3.

## Existing capabilities

Expo Router shell retains one expo-video player across navigation. Native NewPipe 0.26.5 bridge provides search, metadata, continuation, audio/video formats, indexed DASH manifests and MP4/AAC muxing. Two worker threads, bounded continuation cache and HTTP timeouts are present. JS cancellation ignores late results; it does not cancel native HTTP calls. Player supports queue, previous/next, shuffle/repeat, native fullscreen/PiP, audio mode, quality switching with transient position restoration and media notifications. Availability of external YouTube content remains service-dependent.

AsyncStorage `harmonia-library-v1` stores tracks, playlists, favorites, history, downloads, queue and preferences, without active autoplay or signed extractor streams. Imports use the document picker and private persistent copies. Downloads validate status, nonempty output and obvious page/manifest content types before atomic final rename. Themes and Arabic/English strings, RTL shell and accessibility labels already exist. Android storage/microphone permissions are blocked. Production signing is opt-in and requires all existing key variables; no key migration is needed.

## Confirmed findings

| Priority | Evidence | Finding / consequence |
| --- | --- | --- |
| High | utils/downloads.ts, store/playerStore.ts, app/_layout.tsx | In-memory active set, no durable transfer descriptor; restart marks transfers failed and deletes every `.part`. No pause/resume/cancel, scheduled retry, concurrency bound, Wi-Fi policy, storage budget or export. Expo resumable API name alone does not provide these behaviors. |
| High | types/media.ts directTrack | HTTPS and credentials checked, but private/internal hostnames/IPs accepted; arbitrary pages treated as video. No DNS or redirect validation in player/download path. |
| Medium | utils/incomingLinks.ts, components/IncomingLinks.tsx | Only YouTube videos recognized; invalid/unsupported inputs share one error; valid shares immediately autoplay. |
| Medium | native/youtube/IntentModule.java | One pending slot can overwrite earlier intents before JS drains; UUID dedup exists only in mounted JS, native pending event may be delivered twice. Cold/warm handling exists but lacks executed native lifecycle tests. |
| Medium | components/Player.tsx | No explicit speed/sleep/subtitle controls, saved local positions, brightness/volume gestures or audio effects. Native fullscreen controls may expose platform-dependent features; do not count those as implemented custom features. |
| Medium | app/(tabs)/library.tsx | Favorites/playlists/imports exist; no saved web-link category, file reconciliation, storage dashboard, backup/import schema or file sorting. |
| Medium | utils/downloads.ts importMedia | MIME supplied by document provider determines audio/video; file contents not decoded/verified during import. No import-space budget. |
| Medium | native/youtube/YouTubeModule.java | Fixed workers use an unbounded executor task queue; rapid search/resolve submissions can accumulate. Abort does not remove native work. |
| Medium | THIRD_PARTY_NOTICES.md | NewPipe GPL notice exists but transitive dependency license inventory is incomplete. Full compatibility review remains a release gate. |
| Low | utils/i18n.ts, localized UI | Bilingual infrastructure exists; dynamic native exception strings and user-generated text are not fully localized. Large fonts and TalkBack need device review. |

## Security and legal assessment

Extractor IDs are restricted to 11 characters and canonical YouTube URLs. Legacy Express resolver validates IDs, uses execFile without a shell, bounds processes/time/output and disables CORS by default; it is not used by Android. Native mux paths are canonicalized and constrained to app files. Signed URLs/cookies are omitted from native error messages. No social passwords, DRM or private-account workarounds found. Dependency versions were not changed during audit. npm/Gradle transitive licenses, upstream platform terms, privacy policy and Google Play publication eligibility are **not verified** by source inspection. No publication recommendation is made.

Direct-stream DNS rebinding, redirect destinations, content sniffing, media decoder robustness, notification permission UX, OEM background limits, audio focus/Bluetooth and extraction reliability are unverified risks needing integration/device tests. A URL classifier can reject literal/internal hosts but cannot establish DNS/redirect safety; network enforcement must be added at the native transport boundary before claiming SSRF protection.

## Tests and delivery baseline

Vitest covers link parsing, media input, mocked download status/mux/cleanup, library rehydration, themes, queues and legacy resolver. Playwright uses fixture media and checks browser playback/navigation. Existing GitHub Actions runs Doctor, typecheck, Vitest, Playwright, web export and release APK/AAB checks. None constitutes Android intent, WorkManager, hardware codec, PiP or Bluetooth validation. Test execution outcomes for this branch belong in HARMONIA_V2_IMPLEMENTATION.md.

## Ordered PR plan and acceptance gates

1. **This PR: audit + sharing foundation.** Extend existing receiver, pure secure classifier/provider registry, action sheet, saved links compatible with existing storage, truthful unsupported-source handling. Regression tests, prebuild/build and device lifecycle checklist. Keep release identified as a 2.0 prerelease.
2. **Durable downloads** depends on 1. Native WorkManager/foreground transfer design, persistent versioned jobs separate from library, bounded concurrency, cancel/pause, range/ETag/If-Range validation (206 and Content-Range), fresh signed URL resolution, no destructive partial cleanup, exponential retries only for transient errors, Wi-Fi/space checks, MediaStore export and progress notifications. Gate with real local HTTP test server for 200/206/416/redirect/truncation/expiry, process kill/reboot and Android 26–36 foreground restrictions. Do not layer a JS timer queue over current transfers and claim background reliability.
3. **Player** depends on stable downloads. Speed/sleep/local position migrations first, then subtitle import/timing/appearance, gestures, previews, PiP/media-session actions and supported audio effects. Device decoder/audio focus/Bluetooth checks required.
4. **Library** depends on job/file identity. Versioned backup validation, collection/filter/sort/index, duplicate hashes, missing-file reconciliation, explicit safe cleanup and playlist interchange. Upgrade fixtures must preserve all v1 data and offline paths.
5. **Studio** local authorized files only. Evaluate Android MediaExtractor/MediaMuxer lossless sync-frame trimming and extraction before transcoding. Codec capability matrix for MP3/M4A; never label remuxing as conversion. Defer FFmpeg until GPL build obligations, maintenance, memory and APK-size evaluation is recorded.
6. **Brand/UI** original editable play/note SVG, 1024 PNG, adaptive safe-area foreground/background/monochrome, splash and accent tokens. Reference image was not attached in this request; no claim of visual matching is possible yet. Validate launcher masks, monochrome notification silhouette, contrast, 48dp controls, Arabic RTL, TalkBack and large fonts on each principal screen.
7. **Optional/release** Cast requires SDK/license/network/discovery and media-URL authorization evaluation; TV requires remote focus and manifest/UI testing; LAN and Wi-Fi transfer require explicit user-controlled network trust, authentication and lifecycle design; widgets require native session integration. Defer until core gates pass. Production key identity stays unchanged; versionCode must exceed installed production build, not merely this baseline. Publish only after legal/license/privacy and physical-device gates.

This split deliberately avoids declaring the entire 2.0 roadmap complete in one unvalidated change.

## Executed dependency checks (after audit, same lockfile dependency versions)

`npm audit --json` reports 25 affected dependency entries (14 high, 11 moderate; no critical). High chains include node-forge signature validation and braces pattern DoS, propagated through Expo/Metro tooling. Affected-package count is not a count of independently exploitable application flaws. Expo Doctor with Node proxy support reports 20/21 checks passed; the remaining check identifies six SDK-57 patch mismatches (expo, expo-asset, expo-constants, expo-linking, expo-router, expo-splash-screen). Automatic audit fixes propose SDK/RN downgrades for several chains and must not be applied blindly. Dependency remediation, transitive license inventory and runtime-exposure assessment remain release gates. No dependency version was changed in this PR.
