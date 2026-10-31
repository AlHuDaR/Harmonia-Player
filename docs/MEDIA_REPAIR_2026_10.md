# Harmonia 2.0 media repair — review and acceptance record

Historical preview.4 evidence below. The [preview.5 TV/adaptive-streaming record](TV_STREAMING_PREVIEW5.md) covers the next increment. For the current preview.8 features and owner-confirmed Mi Box Cast outcome, see the [README](../README.md) and [downloaded-file Cast record](DOWNLOADED_CAST_PREVIEW8.md).

## Scope and baseline

Based on verified `origin/main` **28f227930e35d0f43d022507a713c231ccf12e5a**, fetched 2026-10-28. Feature branch: `feat/harmonia-v2-media-repair`. Existing local `work` branch was clean and retained; no resets or overwrites of user work.

GitHub PR API confirms #27 (`9391698`), #28 (`7714d6d`), #29 (`60addc4`) and #31 (`28f2279`) are merged. #30 is closed **without merging**. Their order by PR number is not their merge order. #31 includes Expo/Router patch requirements and transitive security updates; these remain intact.

Baseline: 117 Vitest tests passed before edits; repeated against the exact base in a detached temporary worktree after `npm ci`: 117 passed. Initial preinstalled dependencies did not match the latest lockfile's Expo patches, so final checks use a clean lockfile install. Baseline TypeScript passed.

This is an incremental repair for review, **not completion of the entire ten-phase roadmap or certification for release**. No paid services, credentials, extraction servers, cookies, DRM workarounds or new runtime dependencies were added.

## Confirmed defects and resulting behavior

- Snapchat was absent from classification and hit the generic “No supported public media interface…” refusal. Spotlight URLs now preserve the opaque Spotlight ID and remove tracking. Snapchat is explicitly classified, including unsupported paths that still offer browser/save actions.
- Facebook was unconditionally blocked in JS. Public video/Reel/watch URLs now reach bounded, cookie-free public Open Graph discovery. Video IDs survive canonicalization; known outbound `l.php`/Instagram wrappers are validated before unwrapping. Native Facebook share redirects and Instagram `/share/reel/` redirects must resolve to supported paths on the same platform.
- Public metadata is treated as a candidate, not proof of playable or downloadable media. Only a successful media probe returning one progressive MP4 video enables social video actions. Iframes, login pages, missing metadata, nonvideo streams and inaccessible CDN URLs produce an explanation and browser fallback. Inactive script/comment/template markup is ignored, and explicit secure video metadata takes priority. No isolated audio is invented. Real Facebook/Snapchat availability is **unverified**; these platforms often expose no usable public stream.
- Intent intake supported only text SEND/remote VIEW. Audio/video SEND and multiple/mixed SEND_MULTIPLE now retain a separate bounded URI list. Only `content://` grants actually received through an intent can be imported; MIME and Android media-container inspection gate app-private UUID-named files. Import requires an explicit action, copies at most 512 MB per file, checks free space and elapsed time, deletes failed partials, and adds successful files to the existing library. Android 13 uses typed parcelable APIs; older Android versions retain the compatible legacy overloads. A tested bounded grant registry preserves separately repeated shares and evicts old entries rather than permanently rejecting new shares. No broad storage permission was added.
- Separate audio and playback-only formats previously left disabled controls without a format-specific explanation. The preview now explains these missing capabilities in English/Arabic. Link-specific saved/busy UI state resets when the link changes.
- Transfer limits were absent. Native downloads now enforce 2 GB and 30 minutes **per stream transfer**, retain existing finite WorkManager retry behavior, and expose bytes/average transfer speed. Existing completion length/container checks, cancellation, duplicate reservation, notification controls and fresh source discovery remain.
- Playback speed was absent; expanded playback now cycles 0.75/1/1.25/1.5/2×. Existing queue, repeat/shuffle, background/PiP and YouTube NewPipe code paths remain.
- Public URL checks now align on local-domain rejection and native raw-control/length checks. Existing DNS validation, per-hop HTTPS redirect checks and no-cookie HTTP client remain.

## Architecture and security findings

A typed provider-adapter registry exposes matching, normalization, discovery, playback/download capability selection and fallback actions. YouTube, Facebook, Instagram, Snapchat, direct media, Vimeo and Reddit reuse their existing native/source-resolution boundaries. Signed discovered CDN URLs remain outside persisted library tracks; playback/download re-discover source pages. Native HTTP failures expose access-denied, missing/expired, rate-limit and network classifications; unavailable/unsupported/cancelled errors have typed JS representations.

`npm audit` after the clean install: **11 affected dependency entries: 3 high, 3 moderate, 5 low**. This is not 11 independent exploitable vulnerabilities. Remaining roots include Zod through Expo CLI, deepmerge through Expo config and decode-uri-component through Router/query-string. The audit suggests incompatible Expo downgrade/Router major upgrades; no forced SDK migration or incompatible Zod override was applied. PR #31 does not eliminate all advisories. Tooling exposure and runtime Router input handling need an upstream-compatible remediation and separate regression review.

## Suspected risks and incomplete acceptance

These are not reported as reproduced bugs:

- The specific reported Snapchat/Facebook page was not supplied. The refusal paths were reproduced in code/tests; no claim of reproduction against that exact live post or successful live extraction is made. Open Graph metadata availability and actual codec/device compatibility remain source-dependent.
- The existing NewPipe `ExtractorDownloader` also uses its own OkHttp client without the public-DNS/per-hop checks in `SafeHttp`; it is preserved here and needs a separately validated network policy.
- Media3's subsequent playback requests are not routed through `SafeHttp`. Downstream manifests/segments, DNS rebinding and provider-request hardening remain a security gate; existing clear-HLS checks are not a complete Media3 request policy.
- Native file-grant import requires cold/warm lifecycle and real ContentProvider tests. Pending shares survive React startup/navigation in the same process; unimported grants/inbox are not durable across process death. Successful imports are durable. A provider blocked inside `openInputStream`/`read` may exceed the elapsed-time check until the call returns.
- Pause/range resume is not implemented. Existing stopped transfers restart cleanly; do not advertise byte resume. Average speed resets per mux input stream. No public Downloads-folder export or transcoding was added.
- No attached emulator/device was found (`adb devices` empty). Cold/warm sharing, provider apps, notifications denied, foreground-service restrictions, restart/offline playback, audio focus/Bluetooth/lock-screen behavior, PiP and OEM battery management require manual Android acceptance.
- Windows-native build execution, production signing, AAB acceptance, complete license/platform-terms review and physical ARM64 acceptance remain unverified. No production artifact or signing identity was changed.
- No redesign or data migration was performed. Existing dashboard, URL input, library, saved links, favorites, playlists, settings, themes, Arabic/English and RTL are reused. Existing duplication across TS classification/native dispatch and fallback download implementations remains; removing it would enlarge regression scope.

## Regression matrix

Automated tests use mocked fixtures; “covered” means the named boundary, not live-provider/device success.

| Case                    | Automated evidence                                                             | Acceptance still required                                      |
| ----------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| YouTube                 | Existing discovery, source and format mock tests                               | Live NewPipe playback/download and provider restrictions       |
| Instagram               | Embed parser fixtures, shortcode/private/unavailable cases; JS choices         | Real share redirects and Android playback                      |
| Facebook                | Canonical IDs/wrappers, mocked discovered choices, OG parser fixtures          | Real public video/Reel/watch/share, access refusal             |
| Snapchat Spotlight      | Opaque-ID canonicalization, lookalikes, mocked choices, public metadata parser | Real public Spotlight and source-specific unavailable pages    |
| Direct MP4/audio        | Existing probe/source tests and browser fixture playback/pause/seek            | Android codec support and offline copy                         |
| Unsupported links       | Existing policy/browser/save tests                                             | Device browser chooser                                         |
| Private/login-required  | Instagram private fixtures; social missing OG/HTTP access failures             | Real provider restrictions without credentials                 |
| Expired links           | Native HTTP refusal/retry policy; fresh source resolution retained             | Actual expiring CDN link/retry                                 |
| Offline/unstable        | Existing finite retry/length tests and structured network errors               | Airplane mode, reconnect, process kill                         |
| Closed/repeated sharing | Inbox FIFO/token tests, separate content URI envelope                          | ACTION_SEND/MULTIPLE cold/warm delivery and granted file reads |
| Cancellation/recovery   | Existing store/native transfer-state tests                                     | Worker cancellation/interruption/restart/notification race     |
| English/Arabic          | Existing browser language/theme/filter/save coverage; new strings              | Native import/error UI and RTL on device                       |
| Playback speed          | Browser fixture asserts HTML playbackRate changes                              | Android speed/seek/audio focus behavior                        |

Final executed check results and blockers are recorded below before PR submission.

## Executed checks

- `npm ci`: passed against the merged #31 lockfile; Expo 57.0.31 / Router 57.0.29 installed. No dependency manifests or lockfile were changed.
- `npm run typecheck`: passed. `npm run lint`: passed (the configured lint command is TypeScript, not a separate ESLint ruleset).
- `npm test`: **123 passed in 11 files**, compared with 117 at the base.
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:web`: **13 passed**, including real local-fixture MP3/MP4 playback, speed, pause/seek, queue navigation, persisted library state, English/Arabic and themes. This is Chromium testing, not Android testing.
- `npm run build:web -- --max-workers 2`: passed.
- Android prebuild: passed; generated Snapchat VIEW and SEND/SEND_MULTIPLE MIME filters inspected.
- Full Android Gradle `:app:assembleRelease :app:testReleaseUnitTest -PreactNativeArchitectures=arm64-v8a`: **passed** against frozen implementation source `ecff1ff`; **30 native JVM tests passed in 7 classes, zero failures/errors/skips**. This includes actual Android bridge compilation and production Android dependencies. The earlier `SystemClock` import ambiguity was corrected before this successful build. The separate SDK-free parser/policy harness also passed 30 tests; neither JVM harness executes Android device APIs.
- ARM64 release APK: **45,116,235 bytes**, v2 signature verified with one test signer, package `com.alhudar.harmonia`, unchanged preview `2.0.0-preview.4` / versionCode **10**, minSdk **24**, targetSdk **36**. ARM64-only native libraries, embedded JS, NewPipe, `PublicSocialEmbed`, `IntentModule` and the latest `SharedUriGrants` confirmed in the APK. Merged permissions contain no broad storage permissions. SHA-256: `9dfedde0a17f3b9d3f21ddaee11b792748b774b1536cc792f6269c2b0e3966f5`. Local test artifact: `artifacts/Harmonia-Player-arm64.apk` (ignored, not committed or published). This review keeps the existing version; assign a new release version/code before distribution. Universal APK and AAB were not built locally.
- Expo Doctor: **21/21 passed** using the environment proxy and trusted CA (`NODE_USE_ENV_PROXY=1`). The first invocation without Node proxy support failed two external API checks; the proxied retry completed all checks.
- `npm audit`: command exits nonzero for the 11 affected entries described above; **not a passing security audit**.
- `adb devices`: no attached device/emulator. Native lifecycle/file-grant/live-provider integration tests could not run. No live Facebook/Snapchat URL was tested, and no fabricated successful provider result is asserted.

## Regression assessment

No failures were observed in the existing JS/browser fixture suites. The existing library storage key/schema, package identity, signing configuration, NewPipe implementation and native dependency versions were preserved. New risks are the source-dependent public metadata parser, additional native file-grant path, added transfer limits and native progress polling. Device/Windows acceptance and the outstanding dependency/downstream-network gates prevent treating this draft as production-ready or the comprehensive roadmap as complete.
