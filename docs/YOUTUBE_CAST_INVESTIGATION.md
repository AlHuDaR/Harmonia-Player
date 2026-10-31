# Direct YouTube casting investigation

**Historical scope:** this records the feedback-only change in PR #36. The candidate-resolver experiment below is implemented in [preview.7](YOUTUBE_CAST_PREVIEW7.md); physical receiver playback remains unverified. Use that document for the current runtime contract.

The phone screenshot reports a sender-side source restriction. It does not show a discovery, Wi-Fi or receiver playback failure. The current `castMedia` policy rejects every `youtubeId`, so changing quality or selecting another YouTube video cannot enable casting in this build. This follow-up shortens the warning in English and Arabic and identifies the YouTube limitation in portrait and native fullscreen. It does **not** add YouTube casting.

## What the current source resolver provides

`native/youtube/YouTubeModule.java` resolves media through NewPipeExtractor 0.26.5. Auto quality builds a `file://` DASH manifest containing separate video/audio representations. Fixed video-only qualities can also produce a local manifest. The Cast receiver cannot read the phone's filesystem. Sending a YouTube watch page or substituting its video ID in a Default Media Receiver LOAD does not provide a playable media stream.

The resolver also exposes progressive streams containing video and audio, when supplied by the provider, and an HTTPS HLS URL when available. All current resolved sources carry a User-Agent header; the code has no contract establishing that any extracted URL works independently on a receiver. Availability of a format is not evidence of receiver access, codec support, CORS compatibility or sufficient URL lifetime.

Google's [Default Media Receiver](https://developers.google.com/cast/docs/web_receiver#default_media_web_receiver) loads media URLs. Its [supported media guide](https://developers.google.com/cast/docs/media) includes MP4, HLS and DASH, with codec and CORS constraints. DASH itself is not categorically unsupported by Cast; Harmonia currently restricts it because its generated manifest is local. Google's [Android YouTube integration guide](https://developers.google.com/youtube/android) describes IFrame playback, not a public API for handing a YouTube video ID to Harmonia's Default Media Receiver. No documented YouTube-specific sender integration suitable for this implementation was identified in this investigation. A custom receiver registration alone would not supply a missing media URL.

## Feasible next implementation experiment

The smallest direct experiment is a dedicated Cast resolver, separate from the local playback resolver:

1. Resolve a fresh, provider-available progressive MP4 containing both video and audio; alternatively evaluate a self-contained HTTPS HLS source. Never send the phone-local DASH URI or separate video without its audio.
2. Check the source without forwarding cookies, authorization or sender-specific headers. Bound network timeouts, validate HTTPS origins/redirects, inspect the response type, and reject protected or unavailable media. Preflight on the phone still does not prove receiver access.
3. Admit only those narrowly identified candidates through both the Java and TypeScript policy. Do not enable every extracted/signed URL or remove the existing local/private/authenticated-source guards. A signed query is not inherently incompatible with Cast, but can expire or depend on the network or provider's access conditions.
4. Attempt LOAD through the existing Cast SDK handoff, and treat receiver errors honestly. Preserve pause-before-transfer, confirmed STOP before local recovery, cancellation on source changes, and no uncontrolled retry loop. A successful load response is not sufficient evidence of sustained playback.
5. Test on physical Cast hardware with real YouTube sources: audio and video, seek, expiry, network/VPN differences, cancellation, disconnect/reconnect and failure recovery. Record formats that actually work. Lack of an eligible source must remain an explicit unsupported result.

This experiment is technically plausible for some provider-exposed streams; universal or reliable YouTube support has not been established. It is not implemented or presented as working in this follow-up. A registered custom receiver or a phone-hosted manifest/media bridge would be a separate, larger design involving receiver access, CORS, network/lifecycle handling and device validation. Screen mirroring and launching the official YouTube app are not substitutes for the requested in-app feature.

## Verification and limits

A temporary JVM probe outside the repository used the pinned NewPipeExtractor and the current resolver's locale against a public test video (`aqz-KE-bpKQ`). Two requests to `youtubei.googleapis.com` returned HTTP 200; extraction then failed while establishing a proxy tunnel before formats were returned. This cloud-network failure establishes neither that the phone's extraction fails nor that a receiver can play the source. No signed URLs, response bodies or credentials were logged or committed. No physical Cast receiver is attached to this environment.

The runtime change is feedback only. Both source policies and the local/receiver ownership logic remain unchanged. Validate the new message on a phone in English and Arabic, portrait and fullscreen; local playback should remain usable. Direct YouTube casting remains unimplemented and unverified.

For this follow-up, TypeScript validation and all 154 unit tests passed. The five focused browser search/Cast-unavailable tests passed, including continued local playback, seek and speed changes after an unavailable Cast attempt. These browser checks do not execute the Android SDK or validate the new native-phone message. Formatting checks passed for the changed Cast utility, hook and this document. APK/build results are recorded in the follow-up pull request.
