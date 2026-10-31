# Cast and bilingual search upgrade

Historical preview.6 implementation and validation record. [Preview.7](YOUTUBE_CAST_PREVIEW7.md) supersedes the blanket YouTube-source exclusion, and [preview.8](DOWNLOADED_CAST_PREVIEW8.md) adds downloaded-file Cast. The owner has since confirmed both streaming and downloaded-file casting on Mi Box. Pending status and test counts below describe the original preview.6 review; use the [README](../README.md) for the current feature summary.

## Inspection and plan

Freshly fetched `origin/main` is `8754201662f872439217bbba2a7caade4cc83685`, the merge of PR #34. Earlier media repairs and preview.5 adaptive/TV changes are included. PR #34's final review reported no unresolved code findings. Its documented open items include dependency advisories, downstream Media3/NewPipe request policy, range resume and physical device/Windows acceptance.

Playback uses `expo-video` (Media3 on Android), with Java modules copied and registered by Expo config plugins. Expo's native fullscreen activity is separate from ReactActivity. YouTube Auto creates local DASH manifests; extraction may return signed URLs, headers or separate audio. Social discovery produces temporary provider URLs. The current policy rejects these sources until a tested receiver/source contract exists; temporary signatures alone do not make a URL incompatible with Cast. Direct public HTTPS MP4/HLS without credentials, headers or query parameters are candidates, subject to receiver codecs, authentication, CORS and manifest contents. DASH is deliberately local-only in this build. See the [direct YouTube casting investigation](YOUTUBE_CAST_INVESTIGATION.md) for the distinction between this implementation's limits and Cast's format support.

Plan: retain native Media3 and all existing provider/download paths; integrate the official Google Cast sender SDK through the existing native strategy; add a standard picker and explicit receiver/local handoff; add a shared first-strong-direction clearable search input and one cancellable/debounced search controller; fix bounded playback recovery/resume where supported; apply compatible audit fixes, then validate JS, native, APK and Expo compatibility. Preserve package/signing/minimum SDK/ABIs and TV launcher/focus. Do not merge or publish artifacts.

## Implementation

- Official Google Cast Framework **22.3.1**, with stable AndroidX MediaRouter **1.8.1**, integrated through `plugins/withGoogleCast.js` and `native/cast`. This avoids an additional React Native wrapper and its version/architecture constraints. SDK 23 currently brings a prerelease MediaRouter; the selected stable combination supports the existing API 24 minimum. Native methods/callbacks run on the main thread and are disposed with the React module.
- Standard SDK receiver chooser/controller in a non-exported FragmentActivity; session/reconnection and remote media status/progress bridge. Themed, localized Cast control in the React player; a genuine SDK MediaRouteButton is attached to Media3's fullscreen primary-controls row through application activity callbacks, without editing Expo's player or overlaying subtitles. Successful handoff returns to the sender control panel. Receiver-side fullscreen display remains the receiver's responsibility.
- `utils/cast.ts` and `hooks/useCastPlayback.ts` own eligibility and handoff. Local audio pauses before LOAD. A rejected load must be stopped successfully before local audio resumes; an uncertain stop or suspended session keeps local audio paused. Disconnect and Play locally restore the last receiver position **paused**; press Play to continue. Closing/changing a source stops this player's receiver media and gates new local autoplay until STOP completes. Matching active resumed media is adopted without a duplicate LOAD. An unrelated receiver item is not overwritten on app startup. Choosing a different track returns to local playback; tap Cast to send that new eligible track explicitly.
- Receiver play/pause, seek, progress and stream volume follow SDK capabilities. Sender speed, audio-only switching, PiP and local fullscreen are unavailable during remote ownership; they remain available locally. Receiver media/codec/CORS/authentication failures are surfaced. The native picker also supplies device changes/disconnection. No automatic retry loop, mirroring, credentials, provider bypass, local HTTP server or DRM implementation is added.
- Shared `SearchInput` covers both existing search fields (online search and Downloads). The 48dp clear control hides for an empty draft, immediately resets results and keeps input focus. Search/filter/history/library records stay separate. First strong letters determine RTL/LTR; numerals/punctuation do not change the base direction. Values and cursor selections are never rewritten or forced. Raw result titles/artists use their own text direction.
- `SearchController` debounces 400ms, deduplicates Enter/button/debounce and pagination, aborts/invalidates old work immediately when the draft changes, and supplies idle/loading/empty/error/retry states. Native extraction may finish in its bounded native HTTP call, but obsolete results cannot reach the screen. NFC/outer whitespace normalization is applied at the search boundary only; the editable draft and meaningful internal whitespace remain unchanged. Search survives tab navigation and the player overlay; it is not newly persisted across process restarts.
- Additive `harmonia-library-v1` migration preserves all existing records. At most 100 resume points store positions for videos of at least 60 seconds, excluding the first 5 and last 10 seconds and live/unknown durations. Bookmarks store the existing track/source identity and position, never newly resolved playback URLs; no restart autoplay is added. YouTube qualities share a bookmark key. Playback speed survives source/retry changes. Manual playback retry re-resolves the source and retains current position; late mode selection cannot replace a newly selected track.
- Preview **2.0.0-preview.6 / versionCode 12**. Package, signing strategy, API 24 minimum, target/compile 36 and ARM32/ARM64/x86/x86_64 universal ABI intent are retained. Android TV keeps Media3, Leanback launch, hidden-background-focus handling and focusable controls; sender Cast controls are phone-only.

## Baseline dependency correction and security

The checked-in manifest had Expo SDK 57 with **Router 58.0.28**. Expo Doctor reproduced duplicate native modules (screens, status-bar, DOM webview and log-box). Expo's installed SDK compatibility map specifies Router **~57.0.29**. Aligning Router to that range removes the cross-SDK duplicates; Doctor passes **21/21**. This is a compatibility repair to the existing SDK, not an SDK 58 migration. The manifest and lockfile record the compatible tree.

A non-forced `npm audit fix --ignore-scripts` was attempted; no verified compatible advisory fix was available. The compatible tree's current audit reports **17 affected entries: 5 high, 10 moderate, 2 low** (not 17 independent exploits). Roots include decode-uri-component/query-string through Router 57, Zod through Expo CLI, deepmerge, glob and minimatch. Advertised fixes require SDK/Router major changes or unrelated downgrades. No force, major SDK migration or transitive override was applied. Audit remains failing. The previous Media3/NewPipe downstream request-policy limitations and range-resume work remain outside this focused change; see [the repair record](MEDIA_REPAIR_2026_10.md).

## Cast prerequisites and source limits

Install a standalone APK: Expo Go/web do not contain this native bridge. Use an Android phone with current Google Play services and a compatible Chromecast/Google TV/Cast receiver on the same reachable Wi-Fi; isolation/guest networks can prevent discovery. No Play services is handled without removing local playback. This uses Google's **Default Media Receiver**, so no custom receiver registration/application ID is required. Custom UI or receiver-side authentication/DRM handling would require a separate registered receiver and tested media contract. Additional unprotected formats may be possible with the Default Media Receiver, subject to source and device capabilities.

Eligible URLs are direct public **HTTPS `.mp4` or `.m3u8`** endpoints, without any query/fragment, custom headers, credentials, nonstandard port, local/private IP, local DNS name, provider metadata or separate audio. This deliberately excludes all extracted YouTube/social sources, downloaded/shared local files and generated DASH. Public DASH is also withheld until source/receiver capabilities are verified. MP4/HLS eligibility cannot prove codecs, public access, CORS, DRM absence, live seekability or segment accessibility; the receiver's real result remains authoritative. A private/login-required playlist or DRM stream will not acquire authentication support by casting it.

## Windows / Android Studio

Use the existing [Windows guide](WINDOWS_BUILD.md), Node 24 LTS, JDK 17 and Android Studio's SDK Manager. Keep a short checkout path such as `C:\src\Harmonia-Player`. Install Platform 36, Build-Tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1. The PowerShell script now explicitly checks CMake; both CI setup paths install it rather than waiting for an implicit native-tool download. No Unix command was added to the Windows path.

```powershell
npm ci
npm run typecheck
npm test
npx expo-doctor@latest
.\scripts\build-android-release.ps1 -Mode universal -SkipInstall
# artifacts\Harmonia-Player-universal.apk
cd android
.\gradlew.bat :app:testReleaseUnitTest --max-workers=2 --no-daemon
```

Open the generated `android` folder in Android Studio after prebuild. Keep the existing signing settings; default local release artifacts are test-signed. Do not publish the APK/AAB automatically. There is no need for `expo prebuild --clean` during ordinary builds.

The earlier Windows [job 122719344540](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/40659700794/job/122719344540) is now diagnosable: both app and Expo CMake configuration failed because downloading `react-android-0.86.3-release.aar` from Maven Central **read timed out**. The Node action deprecation annotation was unrelated. Check network/Maven availability and retry after a transient download failure; this evidence does not establish a PowerShell syntax, Cast or Android code failure. The final runtime revision passed the hosted Windows PowerShell ARM64 build; Windows 10 and Android Studio device acceptance remains manual.

## Manual acceptance before merge

- [ ] Phone, English and Arabic: type `١٢٣ عربي English`, `video عربي 123.mp4`, punctuation and a URL; edit in the middle, select/copy/paste, backspace, submit from the keyboard. Verify direction/cursor, no icon collision, clear focus, no duplicate requests, empty/retry states and fast query replacement.
- [ ] Downloads: clear X restores the currently selected status filter's results without removing any records. Verify favorites, playlists, saved links and history after upgrade/restart.
- [ ] On real Cast hardware: open a public compatible MP4, tap Cast in portrait and native fullscreen, select the receiver, confirm exactly one audio output, then play/pause/seek/volume/progress. Repeat with public compatible HLS; confirm source-dependent live/codec/CORS behavior.
- [ ] Cancel picker/no receivers, change device, disconnect, Play locally, rotate, background/foreground, Wi-Fi loss/reconnect, receiver media replacement and close/change the track while LOAD is pending. Local playback must stay paused while receiver stop/status is uncertain.
- [ ] Try YouTube Auto/local DASH, extracted Instagram/Facebook/Snapchat media, downloaded/shared files, signed URLs, invalid/private/authenticated media and unsupported codecs. Confirm an explanation or receiver error and usable local playback; never supply credentials or expect a bypass.
- [ ] Re-test real YouTube, Instagram, Facebook and Snapchat playback/download/sharing, quality/audio switching, subtitles, background notification controls and PiP; automated fixture coverage does not prove current provider availability.
- [ ] Resume a long video, retry a transient/expired source, switch qualities and reopen; verify speed/bookmark and no old audio. Near-end/short/live videos should not create a resume point.
- [ ] TV: launch from Leanback and phone launcher; navigate with the physical D-pad, ensure visible focus and no hidden browsing focus, play Media3 HLS/DASH/manual qualities, seek/subtitles/fullscreen/back and offline downloads. Test the actual TV codec/ABI combination.
- [ ] Build/install from Windows 10 PowerShell and Android Studio; verify the universal ABI/package/signature identity and owner signing compatibility before distribution.

**Physical Chromecast/Google TV, Android phone/TV, lifecycle and live-provider acceptance remain pending. An APK build is not Cast device verification.**

## Executed validation — October 31, 2026

- `npm run typecheck` and `npm run lint`: passed. The repository's lint command is `tsc --noEmit`; it has no independent ESLint configuration.
- `npm test -- --maxWorkers=2`: **154 tests in 16 files passed**, including the existing media/social/download/library/TV tests and new search, Cast handoff/policy/plugin and resume tests.
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:web`: **19 tests passed**. These include real fixture MP3/MP4 playback/seek/speed, library/queue/theme/keyboard regressions and five added bilingual-search/Cast-unavailable scenarios. This is browser/component behavior, not native receiver testing.
- Web export passed from the final runtime source; Expo Doctor **21/21 passed** after Router compatibility correction. Prettier check on modified UI/new TS/JS sources and `git diff --check` passed.
- The first browser run hit Metro cold-start navigation timeouts; readiness now waits for the actual app bundle instead of HTML. The final full run passes. The added seek fixture was corrected to serve real HTTP byte ranges; a full-body-only mock cannot validate seeking.
- Native prebuild and universal release assembly passed. **35 Gradle JVM tests in 9 classes passed**, with zero failures, errors or skips. The APK contains the Cast package, options-provider metadata, non-exported picker, Wi-Fi/network permissions, preserved TV launcher/banner and API/identity settings.
- Hosted Linux release, Windows PowerShell ARM64 build and Android API 35 emulator sharing checks passed at runtime revision `4c9b275`. No physical Cast/phone/TV or live-provider playback verification is claimed. The local host's `adb devices` attempt could not initialize its default home directory; the emulator evidence comes from hosted CI.
- `npm audit` exits nonzero for the 17 affected entries described above. This is an outstanding security result, not a passing audit.

### Native follow-up

Initial hosted Linux and Windows builds at `40e5d73` passed all applicable JS checks but failed Android resource linking on `android:windowDimAmount` in the new picker theme. That invalid attribute was corrected to Android's `android:backgroundDimAmount`; final Linux and Windows builds pass. This is distinct from the earlier PR's Maven download timeout. The follow-up also preserves receiver position zero exactly, bounds unknown remote times at zero, catches unavailable Play-services initialization, disables inaccessible receiver seeking and aborts an unmounted player's pending mode request.

The native helper is named `ensureCastInitialized`, avoiding React Native's public `initialize()` lifecycle method. Media3's primary controller row hosts the fullscreen Cast button; AndroidX MediaRouter 1.8.1 source confirms `performClick()` always invokes `showDialog()`, even after an OnClickListener. The native button therefore delegates **showDialog itself** to the dedicated FragmentActivity, and selects the standard SDK chooser/controller rather than the optional system output switcher. This prevents a plain-Activity FragmentManager failure and an invisible system-panel host. Real-device acceptance is still pending.

Google's binary SDK has separate terms, recorded in [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md). Redistribution compatibility with Harmonia/NewPipe GPL-3.0-or-later remains unverified and is an owner license-review item.

## Final build and artifact record

Runtime revision: **`4c9b275bb35f87d9ffac7a6b77ed1b8685db2293`**. [CI run 41205082577](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/41205082577) passed Linux release assembly/verification (ARM64 APK, universal APK and AAB), native JVM tests, hosted Windows PowerShell ARM64 assembly/signature checks, and the Android emulator share-smoke job. The optional live Instagram case had no supplied URL; a passing smoke job is not live-provider or Cast hardware verification. The final documentation commit changes no runtime files.

**[Download the universal test APK artifact](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/41205082577/artifacts/13044408719)** (ZIP, GitHub sign-in may be required; CI retention ends November 14, 2026). The archive contains `Harmonia-Player-universal.apk`. [Windows-built ARM64 artifact](https://github.com/AlHuDaR/Harmonia-Player/actions/runs/41205082577/artifacts/13044204827). These are test build artifacts; no release or store deployment was performed.

Local universal APK: `artifacts/Harmonia-Player-universal.apk`, **96,388,059 bytes**, SHA-256 **`3953ad6f6f2fbd0c8d32f4777f525cc8fada1107923a1b368e5260f9e15f3edd`**. This hash identifies the local build, not the separately compiled CI archive. APK Signature Scheme v2 verifies with one test signer. AAPT/ZIP inspection confirms `com.alhudar.harmonia`, preview.6/code 12, minSdk 24/targetSdk 36, all four ABI directories, a nonempty embedded JS bundle, Cast/retained media classes, Leanback launch/banner and no broad storage/microphone permissions. Google's version metadata is merged correctly. The APK's optional VCS metadata reports `NO_SUPPORTED_VCS_FOUND`; source provenance is recorded here rather than claimed as embedded.

The constrained local container required recovery from disk exhaustion and an evidenced 8 GB cgroup OOM kill: generated Gradle transforms were moved to temporary storage, completed disposable C++ object files were removed while linked libraries were retained, and assembly/JVM verification resumed with one worker and a 2 GB heap. All sixteen C++ targets across four ABIs had already compiled from the unchanged C++ sources; those completed targets were excluded from the resumed invocation. The independent hosted build passed the normal repository scripts without those local recovery exclusions. No tests or release lint checks were suppressed.

Physical receiver discovery/playback, native bilingual cursor behavior, phone/TV lifecycle/D-pad/codec acceptance, actual Windows 10/Android Studio use, live provider success and SDK redistribution-license compatibility remain pending. npm audit remains failing for the 17 documented affected entries. Follow the manual checklist before merging.
