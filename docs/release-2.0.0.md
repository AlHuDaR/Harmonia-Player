# Android 2.0.0 release candidate

Prepared from current main `5925cc8dad0e22e0b298978f4aee71badf446564`.
Baseline: successful [Android build #130](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/43293830757), at that exact commit, and the owner's confirmed S24 Ultra and Mi Box tests. Those physical results are accepted as the baseline, not claimed as reruns of this candidate. Historical documents with pending hardware gates describe older evidence.

## Small dependency fix

The only installed chain was `expo-router@57.0.31 → query-string@7.1.3 → decode-uri-component@0.2.2` (runtime dependency, not just build tooling).

| Published advisory | Affected versions | First fix |
| --- | --- | --- |
| [GHSA-vcc3-ghjq-m6fr / CVE-2026-45822](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), exponential malformed decoding | <=0.4.2 | 0.5.0 |
| [GHSA-qr28-fpjm-wq7f / CVE-2026-118664](https://github.com/advisories/GHSA-qr28-fpjm-wq7f), quadratic replacement of encoded runs | <=0.5.0 | 0.5.1 |

Pin **0.5.1** only under query-string. It fixes both; 0.5.0 is insufficient. No Expo/RN upgrade or unrelated lock refresh is needed. Keep the existing fingerprint/minimatch override.

The patched decoder is ESM. query-string 7 calls its CommonJS import as a function, so a plain override fails at runtime. `scripts/patch-query-string.cjs`, run by npm postinstall, changes that single import to `.default`, checks the exact query-string version/import, and verifies Arabic decoding. It is idempotent and fails installation on unexpected upstream changes. Node 22.13+ (CI: 24) supports the synchronous ESM import; Metro bundles it for Android/Hermes and web. Do not build with install scripts disabled. A future upstream fix should remove both the adapter and override together after testing. Upgrading query-string to an ESM-only major alone would also change the named API expected by Router.

Regression tests exercise Arabic, repeated parameters, plus signs, malformed escapes, URL round trips, and both advisory input shapes through the installed CommonJS consumer with a child-process timeout. A browser regression opens an actual Router URL with Arabic/malformed query parameters and navigates away. Existing Android intent guards and share smoke tests remain enabled.

## Version and identity

Candidate configuration: **2.0.0 / versionCode 15**, package **com.alhudar.harmonia**. Package/lock/Expo version agree. No storage keys, media paths, native playback/download/Library/RTL/Cast code or permissions changed.

15 is the next candidate above 14: inspected repository history, all remote branch/tag tips, available releases and build #130; none showed a higher code. **The owner must confirm 15 is unused in every Play Console track/upload before uploading**; unpublished Console codes cannot be established from GitHub. If consumed, choose the next unused higher code and rebuild. Never reuse a consumed code.

## Signing and update compatibility

`plugins/withReleaseSigning.js` enables production signing only with `HARMONIA_PRODUCTION=1` and all four `HARMONIA_*` signing variables. Missing variables fail Gradle; otherwise release uses Expo's development signing. The shell and PowerShell builders retain this behavior. The PR workflow has no production key binding and its APK/AAB outputs are **test-signed**, even though the Gradle variant is release. Do not publish its AAB as production.

Inspected build #130 ARM64 APK:

- Package/code: `com.alhudar.harmonia` / 14; version `2.0.0-preview.8`; minSdk 24.
- APK SHA-256: `f43d9f2a918a3f68652f48495f8a3fc60063fbb2512f181f88731ec8b16267b4`.
- Signer: Android Debug; certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

**Installed-test-to-production update is unresolved.** No physical device or intended production certificate is available here. If the installed test APK is #130 and the intended signing certificate differs, ordinary `adb install -r` will fail with a signing mismatch; a version bump cannot fix it. Do not generate/reuse a debug key as the public identity or uninstall to conceal this failure. Uninstalling deletes app-private downloads and Library data. Any supported signing lineage must be separately verified on the target Android versions; none is established here.

On the trusted signing/device machine:

1. Pull the installed base APK using the path from `adb shell pm path com.alhudar.harmonia`. Run `apksigner verify --print-certs installed.apk` and the same command on the intended production-signed APK. Certificate fingerprints are public; do not share keystores/passwords.
2. Verify candidate package/code with `aapt dump badging candidate.apk`. Compare signer fingerprints/any validated signing lineage. For Play, compare the **Play app-signing** certificate, not just the AAB **upload** certificate. An upload-key reset does not change installed APK identity.
3. Only with compatible signers, use `adb install -r candidate.apk` (no uninstall/clear-data). Confirm Library, favorites/playlists, saved links, Arabic/theme preferences, completed downloads and imported files survive a restart and play offline.

Keep the permanent key outside the checkout with encrypted backups. Supply passwords via protected environment/secrets or hidden prompts as in [the existing signing guide](release-1.5.md); disable shell tracing and never put passwords on command lines. `*.jks`, `*.keystore` and `.env*` are ignored. No key is created, uploaded or committed by this change.

## Validation and artifacts

Build #130 at the baseline commit passed Doctor **21/21**, TypeScript, **192 unit tests**, **20 browser checks**, web export, Linux ARM64/universal/AAB builds, native unit tests, instrumentation-APK build, signature/ABI/bundle checks, and the Windows ARM64 builder. Its Android emulator job passed cold/warm/repeated SEND, queued-share error/Back recovery, VIEW, direct-file background download, restart/offline playback, and local Cast instrumentation for three formats (grants, ranges, CORS, screen-off/foreground service and cleanup). Live Instagram was explicitly skipped, not verified.

Baseline downloads (GitHub login required; 14-day retention; expires 27 November 2026 in Asia/Muscat):

- [ARM64 APK](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/43293830757/artifacts/13978629028)
- [Universal APK](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/43293830757/artifacts/13978434201)
- [AAB — test-signed](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/43293830757/artifacts/13979208342)

These prove the baseline, not the changed dependency/version candidate. The focused PR records the exact candidate SHA, fresh local/CI results and candidate artifact links. Reuse CI artifacts only for the exact tested commit; the workflow already enforces this for device-only reruns. Browser tests do not prove Android intents, background media or receiver playback. Candidate Android smoke/packaging must be green before merge.

## Public-distribution policy gates

Technical playback/download success, publicly accessible media, a disclaimer, and GPL compliance do **not** establish provider permission or store eligibility.

- **YouTube — unresolved public-release blocker:** [YouTube Terms](https://www.youtube.com/static?template=terms) restrict downloading, automated access and other uses except where authorized by the service, written permission or applicable law. NewPipe/no API key does not establish an exemption. Current extraction, isolated audio, downloads, persistent offline copies and casting those copies need an explicit documented authorization/legal review for the intended distribution and regions. Keep functionality unchanged for this small PR; do not publicly publish until the owner resolves this gate, or separately approves a compliant provider-feature restriction.
- If YouTube API Services are used, [Developer Policies](https://developers.google.com/youtube/terms/developer-policies), including III.E, restrict downloading/caching audiovisual content, separating audio/video and background playback without required approval. Current NewPipe integration is not represented as an approved API client; switching to an API key alone would not authorize these behaviors. Do not imply YouTube Premium offline rights extend to this app.
- [Google Play Intellectual Property policy](https://support.google.com/googleplay/android-developer/answer/9888072): document rights to the app, branding and distributed media; downloading copyrighted works without authorization is a policy risk. Validate store description/screenshots (no universal downloader or provider-approval claims), privacy policy/Data Safety, target audience/content rating, foreground-service declarations and current target-API/native 16 KB requirements against the final signed artifact and Console. No Play approval is claimed.
- Instagram/Meta, Vimeo and Reddit adapters also require provider-terms, automated-access, rate-limit, content-rights and download/offline permission review. Public embed/config/JSON availability is not consent. Facebook/TikTok/X remain Save Link/Open in Browser unless a genuinely supported, authorized adapter is separately reviewed. See the [capability matrix](MULTIPLATFORM_PROVIDER_REVIEW.md). Do not bypass authentication, DRM or access controls.
- Direct/local files: distribute/test with owned, licensed or otherwise permitted fixtures. Offline availability is appropriate only where rights allow it. Cast must respect those same rights; LAN serving is not a rights exemption. Publish matching GPL source/build instructions and third-party notices with binaries.

## Short physical-device checklist for this candidate

Accepted owner baseline remains valid for unchanged behavior; run this small acceptance pass on the exact candidate artifact after signing compatibility is settled:

- **S24 Ultra:** update in place; confirm Library/downloads/preferences survive. Cold/warm SEND and VIEW (YouTube and direct permitted media), malformed share then Back, Arabic RTL/insets. Play/seek, background/lock-screen controls and PiP. Download a permitted file, restart in airplane mode and play it.
- **Mi Box:** use universal APK if installing on TV; check launcher/D-pad focus and Arabic. From the S24, test streaming Cast and a completed local download to Mi Box, pause/seek, screen-off, disconnect/reconnect and one audio output. Retain the confirmed baseline media/receiver setup.

Record APK SHA-256, commit, signer, device/Android version and outcomes. Any regression, incompatible signing, consumed versionCode, failed candidate CI or unresolved provider-policy authorization blocks public release. Merge, release tag and all public publication remain manual owner actions.
