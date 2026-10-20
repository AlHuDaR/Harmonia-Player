# Instagram public-embed fix — preview 3

The screenshot from preview 2 shows a real implementation gap: the registry marked every Instagram URL unavailable before making a request. That screen did not establish whether the shared Reel was private, restricted or unplayable. Preview 3 removes that unconditional exclusion.

## Discovery boundary

For canonical HTTPS `/reel/<shortcode>/`, `/p/<shortcode>/` and `/tv/<shortcode>/` links, fetch only the corresponding public `/embed/` page. Discard tracking parameters for that request. Read the JSON string named `contextJSON` without running JavaScript; require `gql_data.shortcode_media`, the exact requested shortcode, `GraphVideo`, `is_video`, no private markers and an actual `video_url`. Probe that URL through the existing public-DNS/redirect-safe HTTP client; expose a format only for a recognized progressive video MP4 response. Signed media URLs are re-resolved and do not enter library tracks.

There are no cookies, passwords, sessions, private GraphQL endpoints, login workarounds, DRM decryption or new runtime dependencies. A public embed returning no media receives a precise unavailable explanation; HTTP/network errors retain their existing distinction. This metadata shape is undocumented and can change. Access depends on the post, region and Instagram's delivery policy; this does not guarantee arbitrary Instagram support or certify platform-terms compliance.

Play Video and Download Video become available only on success. Audio Only/Download Audio remain disabled because this adapter returns a combined video file, not an isolated audio stream or conversion process. Stories, profiles, short share redirects, photos and carousels are not extracted.

## Observed source evidence

The user-provided public Reel `DerYMOFsvXQ` returned a public embed with a matching shortcode and media URL, including with Harmonia's exact User-Agent and identity encoding. The actual CDN response returned 206 to a bounded range request and 200 for the full file: **3,220,008 bytes**. ffprobe identified **H.264, 720×1280; AAC; duration 12.585215 s**. Full ffmpeg decoding completed successfully. No media binary or expiring URL is committed. These checks alone are not an Android playback test.

## Validation and Android Studio

Parser JVM tests cover the escaped real embed shape, shortcode mismatch, privacy markers, unsafe URLs, photos/carousels, unavailable/login HTML, bounds and refusal to execute expressions. TS tests check actual-format actions, error preservation and absence of fabricated isolated audio. Exact executed counts, build results and final APK links are recorded in the draft PR; adding tests is not a claim that they passed.

The existing Android workflow accepts an optional `instagram_url` on manual dispatch. It runs the ordinary share/offline smoke first, then the real Instagram system SEND → discovered actions → online playback → native download → process restart → airplane-mode offline playback test. Ordinary PR CI does not depend on a third-party post remaining public. It never automates an installed Instagram account or collects credentials.

The optional `artifact_run_id` reuses the universal APK from a successful run of this workflow at the exact checked-out commit, skipping duplicate builds. Provenance is checked before download; release jobs skipped in this device-only mode are not counted as newly passed builds.

```powershell
git switch feat/harmonia-multiplatform-discovery
git pull --ff-only
npm.cmd ci
npx.cmd expo prebuild --platform android --no-install
```

Open `android` in Android Studio, sync with JDK 17 and build the release variant as in [Windows instructions](WINDOWS_BUILD.md). Version is **2.0.0-preview.3**, Android versionCode **9**, package `com.alhudar.harmonia`. Test signing only; preserve a production installation/signing identity.
