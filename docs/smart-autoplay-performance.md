# Smart auto-play validation

Baseline: main `a525d9c` (2026-11-16). No dependency or buffer-threshold changes.

Explicit Android Open URL submissions, incoming web shares, and opened saved links
start discovery and attempt playback once. Known direct file submissions retain
their existing fast path without adding a content probe request. Native Auto selects bounded adaptive MP4
(up to 1080p); otherwise prefer MP4 at 720p or below, then adaptive HLS, with an
audio-only fallback when no video exists. Native discovery remains the authority
on compatible formats. All choices remain available through Quality / audio and
Download format in the player. Unsupported sources retain manual browser/save.

Closing, editing the input, changing tracks, pausing or superseding the request
invalidates pending auto-play. Cast must report disconnected before auto-play can
replace the track; the existing player Cast handoff also checks before local play.
An uncertain Cast state leaves manual controls available. Only the first URL of
an incoming batch auto-plays; a newer explicit share supersedes a pending one.
Remaining queued links require manual play. Refreshing
formats does not re-arm auto-play. Playback failure never triggers an automatic
retry or download. Nothing arms auto-play from persisted library state. Native
intents relaunched from Android task history are ignored; the existing
savedInstanceState guard also prevents capture on ordinary activity recreation.

Non-YouTube discovery results are validated by the existing security checks and
retained in memory for at most 15 seconds (8 pages), shortened by recognizable
signed expiry parameters. Playback consumes the result; every explicit retry
re-discovers, including retries after an earlier fresh resolution. Downloads always
resolve afresh. Tracks contain original page and format identity, not extracted
signed URLs. NewPipe info is coalesced per ID for 15 seconds (4 entries), then
consumed by resolution. Network work for different IDs holds no global cache lock.
Provider cancellation ends the JS wait immediately and discards late results;
the existing native HTTP requests still complete under their own timeouts.

## Reproduction and measured results

```
npm ci
npm test
npm run typecheck
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:web
HARMONIA_BENCHMARK=1 npx vitest run tests/resolutionLatency.test.ts
```

The opt-in benchmark alternates 30 before/after samples. A simulated native bridge
waits 20 ms before returning the same valid HTTPS MP4. Before mirrors main's
unconditional discovery followed by another discovery in resolveSource. After
runs discovery followed by the real updated resolveSource. The assertion checks
90 native calls total: 60 before and 30 after. It excludes human Play-button delay.
This measures orchestration overhead, **not live-provider or Android performance**.

| Synthetic stage | Before median / P95 | After median / P95 |
| --- | --- | --- |
| Submission to discovery | 20.26 / 21.59 ms | 20.28 / 21.43 ms |
| Submission to resolved playback source | 40.55 / 41.98 ms | 20.31 / 21.44 ms |
| Android player ready | Unmeasured | Unmeasured |
| First rendered video frame | Unmeasured | Unmeasured |

Percentiles use nearest rank; medians average the middle two samples. Results vary
with host scheduling. The reliable improvement is one fewer provider discovery
per successful handoff. YouTube sequential details/formats/resolve also share a
single extraction while fresh; no live extraction latency claim is made.

`HarmoniaPlaybackTiming` console events include a process-local sample number,
stage and monotonic elapsed milliseconds, with no URLs or media metadata.
Timing starts at Open URL submission, native share acceptance or a saved-link
button press; ready is the player's
readyToPlay callback, and first-frame is VideoView.onFirstFrameRender (video only).
Timing survives the store's playable-track copy without adding persisted fields.
These events do not claim that readiness means an actual frame has rendered.

For a device A/B run, use the same release configuration, Android hardware,
network and public test URLs for both commits. Add only the timing hooks to the
baseline, submit links serially, and press baseline Play immediately, recording
that human delay separately. Capture 30 successful samples per provider and
report failures separately. Separate cold app/extractor launches from warm
submissions, wait over 15 seconds between cold resolutions, and use fresh
submissions rather than restored library state. Compute each stage's median and
nearest-rank P95 from the URL-free log events. Also exercise pause/close while
discovery is pending, rapidly replace links, retry an expired stream, manually
switch quality, and repeat with Cast connected. Do not mix audio-only samples
into first-frame measurements.

## Validation status

- All 214 tests passed with `HARMONIA_BENCHMARK=1 npm test`, including the
  opt-in 30-pair latency benchmark (213 normal tests plus the benchmark).
- TypeScript passed.
- All 21 existing Chromium browser tests passed, including direct video/audio,
  pause/seek, storage, Arabic/English layouts and unavailable-Cast behavior.
- ARM64 release APK generated successfully; Android release lint passed.
- All 72 native JVM tests passed across 14 suites, with no failures or skips.
- APK: `android/app/build/outputs/apk/release/app-release.apk`, 44,872,248 bytes.
  SHA-256: `14edc75ea85cb8028498f65b474fc1fe959be1b6773f528d87ff905183e21718`.
  Uses the repository's existing development signing configuration.
- Native validation command after prebuild: `./gradlew :app:assembleRelease
  :app:testReleaseUnitTest -PreactNativeArchitectures=arm64-v8a --max-workers=2
  --no-daemon`. This managed host also required writable Gradle/Android/Expo
  settings directories and `EXPO_NO_TELEMETRY=1`; no project configuration or
  dependency changes were needed to accommodate that environment.
- Device playback/startup, live providers, background audio, PiP, physical Cast,
  Android TV and native cache behavior remain unverified on this host. Existing
  policies and transport implementations are retained; browser/unit success
  does not establish device compatibility.
