# Changelog

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
