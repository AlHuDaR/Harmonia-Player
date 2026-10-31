# Casting downloaded files — preview.8

Preview **2.0.0-preview.8 / Android versionCode 14** adds an app-owned local-media Cast source. The owner reported preview.7 streaming Cast working on Mi Box; downloaded tracks were still rejected. This change addresses the downloaded-file path instead of changing its warning or resolving another YouTube URL.

## How it works

When a track has an app-owned `localUri`, Harmonia selects the downloaded-file resolver before the YouTube resolver, even if the track still has YouTube metadata. The existing on-phone playback path stays in place.

After the user selects a receiver, the native module inspects the saved file and starts a session-scoped HTTP server bound to the phone's Wi-Fi/Ethernet address. The receiver gets an actual LAN media URL. It never receives a phone-only `file://` path. The file payload goes directly from the phone to the receiver; no cloud upload, YouTube app, YouTube lookup, extracted URL, or provider URL refresh is involved.

The server supports GET, HEAD, single HTTP byte ranges (including open-ended and suffix ranges), 206/416 responses, and CORS/private-network preflight. This lets the receiver discover file length and seek within the saved media. The URL stays valid throughout the active Cast session, including pause/replay; it has no provider expiry timer.

The media is served by a non-exported Android foreground service with an ongoing Stop casting notification. A reservation starts while the user opens the picker so connection/setup can continue when the app backgrounds. During file preparation/serving, the service holds CPU/Wi-Fi locks and closes them with the source. Serving survives ordinary app backgrounding and screen-off. The service separately observes the Cast session so cleanup does not depend on a visible React screen.

The phone and receiver must remain reachable on the same LAN. Network loss/address changes end the local source; reconnecting creates a new endpoint. Phone shutdown/force-stop, guest-network isolation, VPN routing rules and receiver codec limitations cannot be removed by an app-side URL change. The downloaded-file mechanism is independent of YouTube changes, not a guarantee against loss of the phone/network or unsupported media codecs.

## File and access boundaries

- Only the selected existing media file in this app's files/cache/external-files roots is eligible. Canonical-path checks reject traversal/symlink escapes. MediaExtractor checks requested tracks and rejects DRM/encrypted samples; file signatures determine the container/MIME rather than trusting a filename.
- Supported containers are MP4/M4A, MP3, AAC/ADTS, WebM, Ogg audio, WAV and FLAC. Receiver codec support is still required. This does not add transcoding, DRM support or arbitrary filesystem/content-provider hosting. A video file is served as its complete video/audio representation.
- There is no directory browsing. Each endpoint has a random 64-hex-character path (two UUIDs), accepts the selected receiver's address only, and validates Host/path/methods/headers. Request/header limits, a bounded worker pool, read/stalled-write timeouts and close-on-stop bound resource use. The LAN media transport is HTTP, with CORS/private-network headers; the app's general outbound URL/cleartext policy is not relaxed.
- Android LOAD requires a one-use local grant bound to the active server URL, MIME and playback identity. A forged JavaScript flag or arbitrary private HTTP URL is not enough. Local file paths and bearer URLs are not persisted or logged.
- Stop/disconnect, source replacement, notification Stop casting, network loss and file unavailability close the server and revoke its URL. A stale native STOP acknowledgement cannot tear down a newer transfer. Uncertain STOP retains the existing local source and keeps phone audio paused rather than starting a second output.
- Matching resumed local content is adopted only if its server is still alive. A receiver left with a stale URL after process loss is not silently adopted; the UI asks for Cast reconnection/disconnection.

The existing Google Cast SDK and Default Media Receiver remain in use. No custom receiver registration, new runtime dependency, storage permission, external service or server hosting account is required. Added normal Android permissions are for foreground media playback and wake locking. Application ID, signing strategy, minSdk 24, four universal ABIs, TV navigation, library, downloads and streaming Cast are retained.

## Verification

The JVM suite exercises real loopback HTTP requests: complete reads, HEAD, byte-exact seeks/ranges, invalid/multiple ranges, CORS/private-network preflight, token/path protection, mutation/deletion behavior, endpoint revocation and canonical file boundaries. JavaScript tests verify that downloaded YouTube tracks use the local bridge without calling YouTube, reject invalid grants/endpoints, cancel/timeout cleanly, and avoid adopting a dead local server.

A framework-only Android instrumentation runner (test APK only) uses generated MP3, AAC/M4A and H.264/MP4 fixtures. It prepares the actual service on the emulator's LAN interface, checks one-use grants and HTTP/range/CORS behavior, puts the app in the background and turns the display off, verifies further reads and foreground-service status, then checks cleanup/revocation. It does not require a Cast receiver or expose a test entry point in the production app. Hosted emulator CI runs this after existing share/offline smoke checks.

Local validation passed TypeScript, **177 unit tests**, **50 Gradle JVM tests in 11 classes**, **19 browser checks** and **21/21 Expo Doctor checks**. The universal release and separate Android test APK assembled. The main APK's v2 signature, code 14, all four ABIs and new local Cast native/JS code were verified; instrumentation classes are excluded from it. This incremental assembly reuses unchanged linked C++ libraries with the same 16 previously completed CMake tasks excluded after disposable object cleanup. Hosted CI performs the normal build independently.

Exact APK provenance and hosted results are recorded in the draft PR. The emulator tests verify the serving/background mechanism, not physical Mi Box decoder/playback behavior. Physical acceptance of downloaded-file Cast remains pending until the owner tests the APK.

## Mi Box acceptance

1. Install preview.8/code 14 on the phone. Keep phone and Mi Box on the same reachable Wi-Fi and end the previous Cast session.
2. Open a completed download in Harmonia and use **Harmonia's Cast icon → Mi Box**. Verify receiver sound/video and exactly one audio output. Repeat for the downloaded song that failed in preview.7.
3. Test pause/play, seek forward/back and near the end, replay/repeat, and a different download. Verify source switching revokes the previous URL.
4. Lock the phone/leave the app while the receiver plays; verify continued playback and the ongoing notification. Use Stop casting and confirm cleanup, then reconnect.
5. Test disconnect/reconnect and a Wi-Fi interruption. Confirm bounded errors and paused local recovery when receiver status is uncertain. Verify English/Arabic, portrait/fullscreen and the previously working streaming Cast path.

Use the existing [Windows/Android Studio instructions](WINDOWS_BUILD.md) for local builds. Full Android Lint had seven pre-existing Expo-generated manifest/splash errors in preview.7; this feature does not suppress those findings or claim they are fixed.
