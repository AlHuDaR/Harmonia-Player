## 2.0.0-preview.5 — automatic streaming and Android TV review

- Add an eligible multi-representation AVC/AAC DASH ladder for automatic YouTube playback, retaining HLS/fixed fallback and manual quality/download selection. Automatic video is capped at 1080p; source availability determines whether adaptation is possible.
- Add combined phone/Android TV launch, optional-touch manifest features, a television banner, directional focus feedback and a larger TV video pane.
- Package Android versionCode 11 with the existing application identity/signing configuration; universal builds include both ARM32 and ARM64 for Mi Box userspaces.
- Record fixture/build evidence separately from blocked live YouTube and unavailable physical-device acceptance. See docs/TV_STREAMING_PREVIEW5.md and docs/ANDROID_TV_AR.md.

## Unreleased — media repair review

- Recognize Snapchat Spotlight and canonical Facebook video/Reel IDs; attempt only explicit public video metadata and verify compatible media before offering actions. Browser/save fallback remains available; live provider success is unverified.
- Introduce provider adapter contracts and typed discovery failures while retaining YouTube/NewPipe, Instagram, Vimeo, Reddit and direct source paths.
- Separate granted Android audio/video file shares from text links; add bounded private-storage imports and multiple-share intake.
- Add native transfer size/time limits, byte/speed reporting, playback speed and bilingual explanations for unavailable format actions.
- Record baseline, PR merge status, dependency findings, regression matrix and remaining device/security gates. Update Windows PowerShell/Android Studio instructions.

# Changelog

## 2.0.0-preview.4 — download/library reliability

- Normalize public Instagram post share URLs and deduplicate saved-link tracking variants, preserving existing track, history and playlist identities. Direct signed-media queries remain intact.
- Preserve active native download jobs on repeated taps, ignore stale native polls during retry preparation, and delete the latest stored file when callers hold an older track.
- Add bilingual download search and All/Active/Offline/Needs attention filters. Play all follows the visible offline results.
- VersionCode 10; no dependency, native-code, package-identity or signing changes. Android release builds remain in CI.

## 2.0.0-preview.3 — public Instagram embed videos

- Replace the unconditional Instagram exclusion with bounded public-embed metadata discovery and actual MP4 response/container verification. Match the requested shortcode; reject private markers, missing media, photos/carousels and unsupported link shapes without assuming every failure means a private account.
- Enable Play Video/Download Video only after successful discovery. Isolated audio remains unavailable; no credentials, private GraphQL calls, script execution, authentication workaround or new extraction runtime.
- Add parser/security/capability regressions and optional live Android share/play/download/restart/offline testing. The supplied public Reel's H.264/AAC file was downloaded and fully decoded; hosted Android outcomes are recorded in PR checks.
- Increase versionCode to 9; retain package and production signing configuration.

## 2.0.0-preview.1 — sharing foundation

- Audit baseline v1.5.0 and define separate, gated PRs for the full 2.0 roadmap.
- Extend the existing Android intent module with FIFO pending delivery and browser dispatch.
- Classify shared YouTube videos, HTTPS media candidates and social/web pages; present supported actions without automatic playback.
- Add saved web links independently of playable library items, with additive legacy storage migration and Arabic labels.
- Reject credentials, IP literals, internal/local hosts and nonstandard ports in shared/direct inputs.
- Preserve package ID and existing signing configuration; increase Android versionCode from 6 to 7. This preview is not a completed 2.0 release.

Social extraction, durable downloads, advanced player/library/studio, new icon/branding and optional features remain scheduled follow-ups. Existing launcher/splash assets are unchanged.

## 2.0.0-preview.2 — discovered capabilities and native transfers

- Inspect PR #27 and separate recognized URLs from discovered playable/downloadable formats.
- Add bounded public Vimeo/Reddit discovery adapters, encrypted-media rejection, public HTTPS/DNS/redirect validation, and explicit unavailable explanations for platforms without a validated authorized interface.
- Retain NewPipe and select only actually returned audio/video formats; never synthesize audio from a video-only fallback.
- Add persistent WorkManager transfers, notifications, cancellation, retry policy, integrity/decoder checks, process-restart reconciliation and cleanup. Preserve existing library data and package/signing identity.
- Align six Expo SDK-57 patches, remove unused direct query-string, and add native PowerShell builds plus Android/JVM/emulator and Windows CI.
- Increase versionCode to 8. Social-source and device verification limits are documented; no universal extraction or production-readiness claim.

## 2.0.0-preview.6 — Cast and bilingual search

- Add official Android Google Cast sender controls and guarded public MP4/HLS handoff, including the native fullscreen control row. Actual receiver/device acceptance is pending.
- Add shared clearable first-strong RTL/LTR search, debouncing, obsolete-request protection and actionable search states.
- Retain speed and bounded long-video bookmarks; preserve position on manual playback retry and ignore obsolete mode changes.
- Align Router to the existing Expo 57 SDK, eliminating duplicate native modules; preserve application identity, signing, minimum SDK, TV launcher and universal ABI support.
- See [verification, limits, security advisories and manual acceptance](docs/CAST_SEARCH_UPGRADE.md).
