# Multi-platform increment validation

This records preview 2 validation. Preview 3 adds the [public Instagram embed fix](INSTAGRAM_PUBLIC_EMBED.md); its executed results and artifacts are recorded separately in the draft PR.

Scope: feature branch `feat/harmonia-multiplatform-discovery`, based on PR #27 (`9401790`). Preview `2.0.0-preview.2`, package `com.alhudar.harmonia`, Android versionCode **8**. No merge, store upload or production key change is authorized/performed by this increment.

## Results and evidence boundaries

| Check | Observed outcome |
| --- | --- |
| PR #27 inspection | CI failed at Expo Doctor; later tests/build were skipped. Existing social classifier had no discovery implementation. |
| Expo Doctor after compatible patches | **21/21 passed**. Expo and five Expo modules aligned with SDK-57 recommendations; RN/NewPipe preserved. |
| Type checking | Earlier checks passed; the first hosted clean-install run caught TS18048 in the last polling change. An explicit previous-record guard fixes it; clean-install type checking is rerun before the updated CI run. |
| Vitest | **107 tests passed**, 10 files. Provider policy, discovered formats/kinds, unsafe/invalid results, cancellation, native-job reconciliation/generation races, unchanged-record suppression and existing library/download/NewPipe/server regressions. Native job tests in Vitest use a mocked bridge, not an Android scheduler. |
| Chromium browser suite | **11 passed**. Real fixture MP3/MP4 playback/seek, queues, history/playlists/favorites, themes, Arabic/RTL and disabled unsupported-source actions. Initial runs caught stale Expo config caching and a media-start timeout during native CPU contention; Metro cache was refreshed and a full rerun passed. |
| Web export | Passed. |
| Android JVM tests | Public-network policy, encrypted playlist rejection, Vimeo/Reddit parsing, transfer retry/length/terminal transitions and native intent inbox tests are included. Final executed count is recorded with the APK below; these are JVM tests, not device instrumentation. |
| Public source evidence | Repository-owned HTTPS fixture: 150,611 bytes; SHA-256 `00d1efff3300a54d9c5b3af415778435ab844dcf16b9d5614752d866204a75df`; H.264/AAC identified by ffprobe and decoding passed. This is source/decoder evidence, not by itself proof of the Android UI path. |
| Social live probes | Vimeo `76979871`: metadata accessible, encrypted media rejected; seven other upstream IDs unavailable/denied/no formats. Reddit `6rrwyj`: HTTP 403. No playback/download support claim for these samples or unsupported Instagram/Facebook/TikTok/X. |
| npm audit | Still 25 affected entries (14 high, 11 moderate) in transitive chains after compatible Expo patches and removal of unused direct query-string. No forced breaking SDK/RN downgrade applied. This is **not** a clean security result or production approval. |
| Git diff checks | Passed. |
| Windows execution | Native PowerShell release script and hosted Windows build job added. This Linux host does not execute Windows binaries. Only an observed hosted result establishes Windows build verification. |
| Local Android emulator/device | No emulator or physical device attached. No claim of local device testing. |

Hosted runs `39474413932` and `39478140284` passed Linux release validation (ARM64/universal/AAB and native tests) and the full native Windows PowerShell build. Their emulator jobs confirmed cold/warm/repeated SEND and download completion, then failed the offline playback-clock assertion. The second run's retained labels show the elapsed clock at `0:15`, equal to the completed fixture's duration: UIAutomator missed the asserted 1–14-second window. These failed assertions are not counted as passed smoke tests. Explicit localized elapsed/duration accessibility labels and an elapsed-only assertion now distinguish completed playback from a duration-only false positive; updated hosted results remain in PR checks and the final delivery.

The first hosted run passed Doctor and failed type checking before Android builds. Its skipped emulator job is not a passed test. The strict-null guard was fixed before the replacement run. The hosted Windows build also runs type checking and must pass independently.

## Build/artifact record

Local APK record below predates the final TypeScript null-guard fix; the fix does not change the discovered capabilities. Use the updated hosted artifact/PR checks for the final revision. No claim of a hosted result is made here.

Final local Android build: **BUILD SUCCESSFUL in 2m 16s**, 444 tasks (25 executed, 419 up-to-date). Native source/class timestamps were checked; no stale native classes remained. **12 JVM tests passed**, four test classes, zero failures/errors. An earlier build failed for a missing ListenableFuture class; explicit compatible Guava resolved it. No test was marked passed from that failed run.

- Local test-signed APK: `/workspace/Harmonia-Player/artifacts/Harmonia-Player-arm64.apk`.
- Size: **45,083,447 bytes**; SHA-256: `b12ff55a46c53dfafe8bf59a0de0e1989758c8517e0e8db36479a8bc6f6981b5`.
- `apksigner verify --verbose`: passed (v2 scheme, one signer).
- `aapt`: `com.alhudar.harmonia`, versionCode **8**, `2.0.0-preview.2`, minSdk 24, targetSdk 36.
- ZIP/dex checks passed: ARM64 only; nonempty embedded JavaScript; new action/bridge/acknowledgement strings, worker/inbox classes, capture hook and existing NewPipe present.
- Development/test signing only; production keys/plugin unchanged. Do not replace a differently signed production app or publish this preview.
- No local AAB/universal APK produced in this increment; hosted CI is configured to produce those and a separate Windows ARM64 artifact. Local signature/build checks do not establish emulator or Windows results.

## CI and device acceptance

The workflow now contains:

1. Doctor, typecheck, Vitest, browser tests, web export, native JVM tests and existing ARM64/universal/AAB builds and verification.
2. Android 35 x86_64 emulator: query actual ACTION_SEND registration; cold/warm/repeated external system SEND, VIEW, visible action sheet; direct file discovery and WorkManager download; app restart and offline playback with airplane mode and advancing playback time. The generated fixture is owned by this repository. The emulator test starts no Metro.
3. A Windows runner parses and executes the native PowerShell build and uploads a separately test-signed ARM64 artifact.

Adding these jobs is not evidence that they passed. Observed CI outcomes are reported in the PR checks/final delivery. The system-intent test sends intents from adb shell; it is **not** UI automation of installed Instagram/TikTok/Facebook applications. Real source-app Share menus, OEM behavior and provider playback remain physical-device gates.

Native capture occurs in MainActivity before React initialization/onNewIntent, using the existing intent module, a bounded plain-Java inbox and token acknowledgements. This removes dependency on React initialization timing and avoids replaying acknowledged deliveries. The inbox is bounded to 32 and is not a durable process-death share inbox. WorkManager download records are durable separately.

## Remaining restrictions and validation work

- The multi-platform extraction acceptance criterion remains **incomplete** for providers without a verified authorized adapter. See the [provider-by-provider matrix](MULTIPLATFORM_PROVIDER_REVIEW.md). This is not a universal social downloader.
- Test WorkManager cancellation at several transfer stages, network loss/restore, quota/foreground timeouts, low disk, process kill before/after rename, expired URLs, notifications denied and multiple jobs on physical Android 24/33/35/36 devices. JVM retry/state tests do not replace those lifecycle tests.
- Transfers restart from zero after interruption; Range/ETag resume is not implemented. A validated final file left between rename and WorkManager completion can be restored. Encrypted media, audio transcoding and adaptive offline export are not provided. Public Downloads/Gallery export remains separate work.
- A stopped worker retains a retrying source descriptor when Android pauses/schedules work; user cancellation reconciles against WorkManager CANCELLED and clears descriptors. Complete/failed/cancelled terminal jobs cannot be revived by a late progress/stop update. JS polling runs only for active native jobs and on foreground; unchanged records do not rewrite AsyncStorage.
- Media3's own downstream playback networking is not replaced here; DNS/redirect protections apply to discovery and native file transfers. Complete player-network enforcement remains open.
- Existing NewPipe functionality is retained and covered by regressions/native packaging; actual YouTube service behavior, Bluetooth, PiP and background audio need revalidation on devices. No account sync, social login or DRM mechanism was added.
- Remaining npm advisories, full transitive license inventory, platform conditions/privacy and production-signature/device upgrade checks block a production recommendation.

## Changed source areas

- Provider layer: `utils/linkProviders.ts`, `utils/providerBridge.ts`, `utils/mediaDiscovery.ts`, `utils/youtube.ts`, `components/SharedLinkCard.tsx`.
- Native: `SafeHttp`, `MediaDiscovery`, `MediaModule`, `MediaDownloadWorker`, `DownloadRecords`, `TransferPolicy`, `IntentInbox`, `IntentModule`, `YouTubePackage`; Expo native/manifest plugins and config.
- State/download integration: `types/media.ts`, `utils/downloads.ts`, `store/playerStore.ts`, root/download screens, incoming-link acknowledgements and Arabic strings.
- Build/tests: lockfile/Expo patches, Windows `.ps1`, Linux build memory settings, JVM tests, TS integration tests, browser config/assertions, external-intent/offline smoke script and GitHub Actions.
- Instructions/licenses: README, changelog, Windows guide, provider research/matrix and third-party notices.
