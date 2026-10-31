# YouTube Cast candidate transfer — preview.7

Preview **2.0.0-preview.7 / Android versionCode 13** implements a separate YouTube Cast-source resolver. Tapping Harmonia's Cast icon can now open the SDK receiver picker for an online YouTube track, including one playing through phone-local Auto/DASH. This is a candidate-based implementation; successful YouTube playback on physical Mi Box/Chromecast hardware remains unverified.

## Source contract

The phone's existing playback, extraction, quality and download paths stay in place. After connection, `HarmoniaYouTube.resolveCast` performs a fresh extraction using the existing pinned NewPipeExtractor **0.26.5**. That extractor already requests VisionOS streaming data and can expose a distinct HLS manifest; no global extractor-client flags or provider APIs were added. See its [HLS selection](https://github.com/TeamNewPipe/NewPipeExtractor/blob/v0.26.5/extractor/src/main/java/org/schabi/newpipe/extractor/services/youtube/extractors/YoutubeStreamExtractor.java#L640).

Candidate selection is deliberately narrow:

- Finite video: provider-exposed progressive MP4 with combined AVC/AAC (itag 18/22), otherwise a self-contained AVC/AAC HLS variant at up to 1080p/30fps and AVC level 4.2. External HLS audio groups are not silently dropped.
- Finite audio: provider-exposed AAC/M4A, preferring the original audio track. Cast chooses a compatible source independently of the phone's selected quality; exact quality or alternate-language preservation on the receiver is not guaranteed.
- HTTPS Google video CDN URLs only, with validated identity, MIME/path and expiry. Native preflight uses no cookies, authorization or phone-playback headers. It verifies MP4/M4A file signatures, or bounded clear HLS manifests plus a segment prefix and receiver-origin CORS. Redirects, encryption keys, local/private sources and fMP4 HLS maps are rejected. DNS checks use the existing public-address policy.
- A maximum of two progressive candidates and two compatible HLS variants are tried within a 50-second native request budget. A single Cast worker and one queued request bound concurrency; cancellation invalidates the matching request. Already running I/O may take its bounded timeout to finish. JavaScript has a 60-second final timeout and ignores late results.
- Successful preflight mints an in-memory, single-use native grant bound to the URL, MIME type, stable video/audio identity and short expiry. The JavaScript validator independently checks the candidate; Android LOAD still requires the native grant. Merely adding a signed URL or a JS eligibility flag cannot bypass the native source check. Grants/URLs are not persisted or logged.

This does not add universal YouTube support, live/DVR, separate-stream casting, local-file hosting, DRM/authentication support, a proxy, screen mirroring, or an official-YouTube-app handoff. Other extracted social providers retain their existing source restrictions. A provider can withhold a compatible format, require headers, bind access to a network, or expire a URL. Phone preflight cannot establish receiver access or decoder behavior; receiver results remain authoritative.

## Transfer and recovery

The phone keeps playing while the Cast source prepares, with a bilingual progress message and Cancel action. Once a candidate is ready, the handoff captures the current position and play/pause intent, then pauses locally before LOAD. A failed preparation does not touch local playback.

`MediaInfo.contentId` is a stable `harmonia:youtube:<videoId>:<kind>` identity; `contentUrl` is the freshly granted stream URL. This lets the sender adopt/control a matching resumed session without persisting an expiring URL or sending a duplicate LOAD. Previous STOP completion gates replacement playback/adoption. Changing source, cancellation or disconnection invalidates a pending preparation.

LOAD is bounded to 30 seconds; commands/STOP to 10 seconds. A receiver that continues buffering or never reports ready media for 30 seconds gets a fresh native SDK state snapshot before recovery. A snapshot reporting healthy playback after phone backgrounding, or normal end-of-video status, cancels the timeout. Automatic recovery is attempted once per failure, with a confirmed STOP before local recovery; uncertain STOP keeps local audio paused and offers explicit controls. Watchdog recovery returns to the last known position paused. An initial rejected LOAD restores the position/intent captured at transfer after STOP succeeds.

Pending LOAD ownership survives its acknowledgement/error until receiver status establishes the new item or STOP completes. This covers a late LOAD while status still describes the previous item. A non-pending, replaced/unowned receiver item is not stopped. The status text distinguishes connected, preparing, loading and receiver playback.

This continues to use Google's Default Media Receiver and official Android Cast SDK; no custom receiver ID/registration is required. Package ID, signing strategy, API 24 minimum, TV paths and all four universal ABIs are retained. No runtime dependency or permission was added.

## Acceptance on the supplied Mi Box

The supplied phone image shows a Mi Box route in Android's media-output panel; the TV image is a loading screen labeled AM Player. Those images do not establish which receiver app accepted a Harmonia media LOAD or prove successful playback.

1. Install the preview.7/code 13 testing APK. Start with the phone and Mi Box on the same reachable Wi-Fi. End any existing output/casting session, then use **Harmonia's in-player Cast icon** to select Mi Box.
2. Play a finite YouTube video in Auto mode. Confirm preparation can be cancelled while phone playback continues. Retry, select the receiver, and verify both picture and audio on the TV with exactly one audio output. The Cast source may use a different quality from phone Auto mode.
3. Check pause/play, seek, progress and volume; repeat from native fullscreen and in Arabic. Test audio-only separately. Check app background/foreground, disconnect/reconnect, source changes during preparation/LOAD, and returning locally.
4. Test an unavailable/incompatible source and a receiver stuck loading. Confirm clear bounded errors and local recovery; an uncertain STOP must keep the phone paused until explicitly disconnected. If a granted stream fails on the receiver while the phone plays, test network/VPN routing differences and URL expiry rather than assuming discovery success proves source access.
5. Regression-test public MP4/HLS, phone/TV playback, downloads, share intake, library and bilingual search. Do not interpret compilation or unit/browser tests as physical Cast verification.

## Automated verification

Local validation passed TypeScript, **171 unit tests**, **19 browser tests**, **42 native JVM tests in 10 classes**, and **21/21 Expo Doctor checks**. The universal release APK assembled and its v2 signature, all four ABIs, code 13 and updated native/JS code were verified. This incremental local assembly reused unchanged linked C++ libraries and excluded their 16 previously completed CMake build tasks after disposable object cleanup; hosted CI performs the normal build independently. APK provenance and subsequent hosted results are recorded in the draft pull request.

Focused tests cover granted-source admission/rejection, expiry/identity binding, single-use native grants, HLS codecs/audio/protection, cancellation and late completions, current position/play intent, resumed ownership, pending LOAD stop policy, buffering timeouts, healthy native receiver state after backgrounding and bounded recovery. Browser tests exercise fixtures and the unavailable-Cast environment, not the Android Cast SDK or live YouTube. Physical receiver playback and live provider acceptance remain pending.

Windows/Android Studio builds continue to use the [existing PowerShell instructions](WINDOWS_BUILD.md). Remaining dependency/security advisories are unchanged by this feature.
