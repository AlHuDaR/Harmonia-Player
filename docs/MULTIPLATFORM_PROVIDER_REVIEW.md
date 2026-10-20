# Multi-platform provider investigation — 2026-10-20

Baseline: PR #27 / `9401790`, `feat/harmonia-v2-universal-media`. PR #27's CI stopped at Expo Doctor: six SDK-57 patch mismatches. Its URL registry assigns actions without fetching formats. Social sources have no extractor. This increment separates recognition, adapter policy, discovery results and actions; a matching hostname alone never enables media actions.

## Options evaluated

| Option | Evidence | Decision |
| --- | --- | --- |
| NewPipe Extractor v0.26.5 | Existing GPL-3.0 integration; upstream latest release inspected dated 2026-08-15. Includes YouTube, not a generic Instagram/Facebook/TikTok/X/Vimeo extractor. | Retain existing YouTube bridge and actual format flags. Do not replace it. |
| yt-dlp 2026.08.19 | Upstream release and installed evaluation CLI; broad extractor catalogue. Individual extractors still encounter login, regional, rate-limit and source changes. An extractor's presence is not verification. | Valuable future option; not a native Android runtime by itself. No promise of universal support. |
| youtubedl-android 0.18.1 | GPL-3.0 wrapper, last repository push inspected 2025-11-16. Maven Central AAR inspected: 59,213,110 bytes across four ABIs; ARM64 includes a 14,305,904-byte zipped Python runtime plus launcher/QuickJS; bundled Python 3.12 and yt-dlp **2025.11.12**, older than current evaluated CLI. FFmpeg optional. Runtime archive includes OpenSSL, readline, gdbm, sqlite, ncurses, libffi, xz and other binaries; their license notices were not found inside the archive. | Not included. Requires exact binary/source/license inventory, reproducible updated runtime, security/16KB-page/device evaluation and APK/startup/storage budget. Wrapper GPL alone does not establish redistribution compliance for every bundled native dependency. Do not download/update executable code at runtime as a shortcut. |
| Vimeo public player config | Bounded config request for numeric public video IDs; progressive files and clear HLS are returned when accessible. No owner OAuth download API or private hashes. | Implement adapter. Reject encrypted playlists. Do not parse DRM DASH or use auth/embedding workarounds. |
| Reddit public post JSON | Native reddit_video fields can expose fallback/HLS. Live test returned **HTTP 403**. Fallback video often has no audio. | Implement bounded parser and precise access errors. Do not claim verified Reddit playback/downloads. No guessing audio URLs or bypassing rate/access controls. |
| Instagram/Facebook platform interfaces | Official account/application authorization is needed for supported Graph media access; oEmbed/embed availability does not equal a downloadable binary. No configured authorized integration. | Explicit unavailable reason; Save/Browser work. No login/password collection or unofficial credential proxy. |
| TikTok official embed/display | Embed HTML is not a supported downloadable media file. Authorized display APIs do not establish an anonymous universal download interface. | Unavailable reason; no fake streams/buttons. |
| X official API / embeds | Authorized API integration and access tier required; oEmbed HTML is not a binary media API. | Unavailable reason; no credentials or syndication-token workarounds. |
| Direct HTTPS | Actual bounded response/status/container sniffing, including application/octet-stream with recognized signatures. | Discover real file formats; download validation checks exact known byte length, media tracks/samples and DRM before commit. |

References inspected: https://github.com/TeamNewPipe/NewPipeExtractor,
https://github.com/yt-dlp/yt-dlp,
https://github.com/yausername/youtubedl-android (README/source and Maven AAR),
https://developer.vimeo.com/, https://www.reddit.com/dev/api/,
https://developers.facebook.com/docs/instagram-platform/,
https://developers.tiktok.com/doc/embed-videos/,
https://docs.x.com/x-api.

## Provider capability matrix

“Implemented” describes code paths, **not** a live-provider support guarantee. Fixture tests never establish platform availability.

| Provider | Discovery implementation | Video / isolated audio / file downloads | Verification status |
| --- | --- | --- | --- |
| YouTube | Existing NewPipe details/formats/resolve retained | Actual returned formats only; separate MP4/AAC downloads use native mux | Existing mocked regressions and native bridge packaging; live/device extraction must be rechecked. |
| Instagram | No approved public binary adapter | All media actions disabled; Save/Browser | Not supported for extraction in this increment. |
| Facebook | No authorized binary adapter | All media actions disabled; Save/Browser | Not supported for extraction in this increment. |
| TikTok | No supported binary adapter | All media actions disabled; Save/Browser | Not supported for extraction in this increment. |
| X/Twitter | No authorized API adapter | All media actions disabled; Save/Browser | Not supported for extraction in this increment. |
| Reddit | Public JSON, native-video only | Clear HLS video; silent GIF fallback only, explicitly labelled. No fabricated isolated audio. | Live test `6rrwyj` returned 403. Parser tested; **not reported as verified playback/download support**. |
| Vimeo | Public numeric-ID config | Returned progressive video files downloadable; unencrypted HLS video/audio playback only. No AES/DRM processing or HLS offline exporter. | Test `76979871` exposed metadata but **FairPlay-style SAMPLE-AES / skd encrypted** media, correctly rejected. Seven other upstream test IDs were unavailable/denied/no formats. **No verified Vimeo playback/download support claim**. |
| Direct HTTPS | Bounded range response with container signature check | Actual audio/video file; isolated audio only when audio format returned. Adaptive manifests playback-only and encrypted playlists rejected. | Repository fixture downloaded over HTTPS, exact 150,611-byte length, SHA and H.264/AAC decoding verified using ffprobe/ffmpeg. Android device validation is tracked separately. |

Live tests did not bypass authentication, DRM, region or account restrictions. No signed source URLs, cookies or third-party media were added to Git. The metadata-only Vimeo response is expressly not playback evidence. The social-extraction acceptance criterion remains unmet for services without a verified authorized adapter; this PR must not be marketed as universal extraction.

## Architecture and storage

- `linkProviders` recognizes URLs only; classification actions are Save/Browser. `mediaDiscovery` selects an adapter and derives four media actions from actual discovered format kind/download flags. The sheet stays visible while loading/failing and offers refresh, Save and Browser.
- `MediaDiscovery` performs bounded public HTTPS discovery; `SafeHttp` checks resolved DNS addresses and every redirect. It rejects credentials, private/internal destinations and cleartext. HLS encryption is rejected; Media3's downstream playback networking is still platform controlled and needs an additional transport integration before claiming complete playback SSRF enforcement.
- Online external library tracks contain canonical source page and format ID, not discovered signed URLs. Playback/download re-resolves. Existing `harmonia-library-v1`, playlists/history/settings and existing local paths are retained. Native job IDs are additive; hydration does not incorrectly fail active native jobs.
- WorkManager persists constrained network jobs across process restart. App-private job records store source descriptors only while pending; terminal records drop descriptors. Foreground dataSync notifications, exponential retries (maximum five attempts, transient I/O/429/5xx only), cancellation, disk budget, exact response length when known, decoder-track/sample checks, DRM rejection and final rename prevent false completion. Transfers restart cleanly on retry; **HTTP Range resume is not claimed**. Expired/403 signed URLs require user retry to re-resolve.
- Partial components and failed/cancelled output files are cleaned. Separate MP4/AAC uses the existing MediaMux, without transcoding. App backup remains disabled. No public-storage permission or new extraction cloud service is added.
- Android force-stop intentionally suspends OS work until the user reopens the app. System quotas, notification denial, foreground restrictions and long-running time limits still require device testing. No promise of indefinite background execution.

## Dependency/security decisions

The six Expo packages were updated to Doctor-recommended SDK-57 patches, preserving RN 0.86.3 and existing NewPipe. Unused direct `query-string` was removed (no source imports). npm still reports advisories in Expo/Metro transitive chains; several suggest incompatible SDK/RN downgrades or have no published compatible patch. No forced major downgrade/override was applied. See the validation report for exact outcomes. Legal/platform review is not equivalent to Google Play publication approval.
