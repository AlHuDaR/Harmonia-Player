# Media resolution reliability review — 2026-11-16

Baseline: latest fetched `main`, `2d43bcc`. This is a focused reliability increment, **not completion of universal website support**. No platform is newly certified by this work.

## Root causes and changes

- Latest `main` already routes extensionless unknown-host HTTPS endpoints through native MIME/container probing. Added regression coverage confirms that real returned formats enable actions and HTML is rejected; no change to that working policy was needed.

- `SafeHttp.text` discarded the response's final URL. HLS validation subsequently resolved relative variant/audio paths against the original manifest URL. Retain both body and final URL, use the final manifest directory for children, and expose the final master URL to playback. Applies to direct HLS, Vimeo and Reddit playlist validation.
- Direct file probing verified the redirected response but returned the original URL as the stream. Return the verified final media URL while retaining the original page for rediscovery/retries and preserving signed query parameters.
- Vimeo verified the same HLS children multiple times: once in the shared validator, again for the first variant, and again for separately listed audio. Validate each distinct child once in the shared validator, including encryption checks and the existing 12-child limit.
- Each redirect previously received its own discovery timeout, and redirect loops consumed the full hop allowance. Share the 45-second discovery-request budget across hops, stop cycles before another request, and follow only 301/302/303/307/308. Preserve HTTPS, DNS, public-address and credential checks at each hop. Download bodies retain their existing transfer timeout policy; this is not a global timeout for an entire multi-request extraction.
- Facebook/Snapchat extraction reads only public Open Graph video metadata and verifies progressive MP4 responses. Absence of that metadata does not establish whether a video is private, deleted or inaccessible. The diagnostic now identifies the extractor limitation without asserting an access restriction.

The reported Facebook share URL returned HTTP 200 after one redirect but no `og:video` metadata in the retrieved response. It also contained none of the checked `browser_native` / `playable_url` fields. This does **not** prove the video is unavailable or reproduce SaveFrom's behavior. No authenticated request, third-party downloader, DRM bypass or speculative private endpoint was added. The reported Reel remains unresolved.

An initial suspicion about HLS line escaping was disproved by comparing baseline and changed Java behavior; no line-splitting fix or Cast implementation change is included.

## Architecture audit and retained behavior

The existing pipeline already has offline classification/normalization (`linkProviders`), adapter policy (`mediaDiscovery`), native public HTTPS redirect validation (`SafeHttp`), provider extraction (`MediaDiscovery`, `InstagramEmbed`, `PublicSocialEmbed`, NewPipe), format validation and native WorkManager transfers. Keep these boundaries rather than adding a second extraction service.

YouTube retains NewPipe, separate-stream playback/muxing, background playback and its distinct Cast resolver. Instagram retains its shortcode-bound public embed parser. Facebook and Snapchat retain progressive Open Graph discovery. Vimeo supports accessible progressive MP4 and clear HLS; Reddit supports native public JSON/HLS and explicitly avoids advertising silent fallback video as complete audio/video. Direct file inspection checks response/container signatures. Website recognition alone never enables media actions.

TikTok and X remain intentionally unavailable through current adapter policy. Generic embedded pages and direct DASH manifests do not have general extraction support; existing YouTube DASH handling is separate. Encrypted HLS, nested HLS masters, arbitrary external Reddit embeds, private/unlisted Vimeo hashes and access-controlled sources remain unsupported. Direct HLS is playback-only; separate audio is offered only when the existing adapter actually exposes it.

User retries already rediscover formats from `sourcePage`/YouTube identity. WorkManager's bounded transient retries restart partial files; they do not refresh an expired signed URL automatically. Pause/cancellation, background OS restrictions, PiP, Android TV, actual Cast receivers and imported/downloaded Android media still need device validation. No new verification claim is made for those flows.

## Before/after regression matrix

“Before” failures here are source-audit findings, not invented live playback failures. “After” passes below are deterministic native fixture tests, not website certification.

| Scenario | Before | After | Evidence |
| --- | --- | --- | --- |
| Extensionless public file endpoint | Passed (existing policy) | Passed | JS discovery gating and native MIME/container response fixtures |
| Redirected HLS master with relative video/audio | Failed (source audit: original URL used) | Passed | `redirectedMasterVerifiesEachRelativeChildExactlyOnce` verifies final directory and request list |
| Direct media redirected to signed CDN URL | Failed (source audit: original URI returned) | Passed | `probeUsesFinalMediaUrlAndRetainsOriginalPageForRetries` |
| Redirect cycle | Failed (source audit: repeated requests) | Passed | Cycle test asserts one request and explicit loop error |
| HTTP 304 without Location | Failed (source audit: treated as redirect) | Passed | 304 response returned intact |
| HTTPS downgrade redirect | Passed (existing policy) | Passed | Unsafe destination rejected before request |
| Clear HLS LF/CRLF, Cast variant/segment parsing | Passed (baseline control checked) | Passed | Playlist fixtures; Cast implementation unchanged |
| Encrypted HLS / too many variants | Passed (existing policy) | Passed | Rejection fixtures |
| Reported Facebook Reel extraction | Blocked | Blocked | Native live networking unavailable; external response lacks supported metadata |

## Live compatibility matrix

Candidates and exact URLs are in `tests/fixtures/media-compatibility/samples.json`. Run `python3 scripts/test-media-compatibility.py > work/http-compatibility.json`. This bounded three-worker HTTP probe uses HTTPS, five redirects, 25 seconds and 2 MiB per response. It also downloads and probes/decodes the two small direct-file samples when FFmpeg tools are installed. It does **not** run Harmonia or infer support from HTTP 200.

The committed raw evidence is `docs/evidence/media-http-2026-11-16.json`. A supplemental check fetched the Instagram sample’s public `/embed/` response, parsed it with the unchanged `InstagramEmbed.parse`, downloaded its exposed media through curl, and verified H.264 video plus AAC audio and three seconds of software decoding. Results: `docs/evidence/instagram-public-media-2026-11-16.json`. This proves that one existing public embed/media sample worked through external transport, not that the platform or Android playback is fully verified. HTTP results are external curl checks through the execution environment's proxy. Native Java requests cannot reach the internet directly; enabling the proxy encounters the existing public-address policy because the proxy itself has a private address. Production network protections were retained.

| Platform / URL type | External redirects/HTTP | Native discovery before → after | Android playback | Audio | Android download | Reason / external evidence |
| --- | --- | --- | --- | --- | --- | --- |
| YouTube watch, short URL, Shorts | Blocked | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | Proxy CONNECT denied (403) |
| Facebook reported shared Reel | Passed, 1 hop / 200 | Blocked → Blocked | Not Tested | Not Tested | Not Tested | Native networking blocked; external HTML lacks OG video |
| Instagram Reel | Passed / 200 | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | Existing native parser read fetched public `/embed/` metadata; external media download, H.264/AAC inspection and software decode Passed. Full native discovery remains Not Tested |
| TikTok video candidate | Passed / 200 | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | Current adapter policy unavailable |
| Snapchat Spotlight landing page | Passed / 200 | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | No verified individual Spotlight sample supplied; landing page is not a video test |
| X/Twitter post candidate | Passed, 1 hop / 200 | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | Current adapter policy unavailable |
| Reddit post / redd.it short link | Passed, 0 / 1 hop, 200 | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | Post page reachability does not verify JSON/native media |
| Vimeo public candidate | Passed / 200 | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | Player config/media not exercised live |
| Direct MP4 / MP3 | Passed / 200 | Not Tested → Not Tested | Not Tested | Passed (external ffprobe only) | Not Tested | External downloads and three-second software decoding Passed for both |
| Direct HLS | Passed / 200 | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | Manifest reachability only; adaptive downloads unsupported |
| Direct DASH | Passed / 200 | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | No generic DASH discovery adapter |
| Generic embedded media page | Passed / 200 | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | No generic HTML extraction adapter |
| Missing direct file | Passed / 404 | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | Expected unavailable response observed externally |
| Malformed URL | Blocked (curl rejected) | Not Tested → Not Tested | Not Tested | Not Tested | Not Tested | Offline classification rejection covered separately by existing automated tests |

## Validation

- `npm ci` using workspace-local npm cache: Passed.
- `npm run typecheck`: Passed.
- `npm test`: Passed, 194 tests in 19 files. After adding the reported Facebook URL regression, the full suite passed again with the new link and extensionless-endpoint regressions: 197 tests in 19 files.
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:web`: Passed, 21 tests, including Arabic/English and local audio playback.
- Standalone Java 17 + OkHttp 3.14.9 / JSON / JUnit: Passed, 31 tests across `MediaDiscoveryTest`, `PublicSocialEmbedTest`, `InstagramEmbedTest`, `SafeHttpTest`, `PlaylistRegressionTest`, `RedirectRegressionTest`. These dependencies are test tools, not added Android runtime dependencies. The repository's normal native Gradle unit-test job also picks up the new tests.
- Android prebuild: Passed. ARM64 APK build: **Blocked**, no APK produced. Initial attempts encountered direct-network and read-only Android preferences errors. Using the environment proxy and workspace-local Android preferences allowed Gradle plugin compilation and installation of NDK 27.1.12297006. The final attempt then stopped showing progress during project configuration; it was terminated after approximately 11 minutes overall (several minutes without visible progress). The remaining stall’s cause is unconfirmed. Full Android compilation, release packaging and Gradle native tests are not claimed as passed. CI/device verification remains required.

Remaining release work: successful Android build/Gradle native tests and actual device/provider verification, especially the reported Facebook Reel. This change improves shared reliability but does not satisfy the full requested all-platform release goal.
