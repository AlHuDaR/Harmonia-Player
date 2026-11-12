# Harmonia professional audit

**Review date** 12 November 2026
**Baseline** Android preview 8, `2.0.0-preview.8`, version code 14, `main` at `31fe038`
**Scope** Expo Router screens and navigation, theme and localization, player lifecycle, search, storage and queues, download reconciliation, Android intent/provider/Cast bridges, the optional resolver, build configuration, permissions, and automated coverage.

## Findings and disposition

| Severity | Area | Finding | Disposition |
| --- | --- | --- | --- |
| High | Dependencies | npm reports seven affected packages across two dependency chains. Expo Router brings in an affected percent decoder. Malformed input can cause excessive decoding work. The registry also flags glob and minimatch through Expo fingerprinting. Actual exposure of each route on the standalone APK was not reproduced. | Open. npm's proposed remediation moves Expo and Router to SDK 58. Validate that migration on an isolated branch and rerun the audit before public release. |
| Medium | Playback and navigation | The hardware Back handler was mounted only after media resolution. While a source was loading or had failed, Android could route Back past the expanded player. | Fixed. The handler now belongs to the track-level player and remains present during loading and error states. Device Back acceptance is pending. |
| Medium | Downloads | Progress writes moved the updated record to the end of the list. Rows could jump while a user tried to open or cancel another job. | Fixed. Existing records update in place. A reconciliation test covers a progress update with another download present. |
| Medium | Settings and local data | Clearing history immediately committed a destructive operation from one tap. The privacy copy named YouTube alone, although discovery and playback also reach other providers. | Fixed. Settings asks for confirmation, disables the action when history is empty, and explains provider requests. Browser coverage exercises cancellation and clearing while preserving saved tracks. |
| Medium | Sharing and localization | The full-screen incoming-share dialog did not use safe-area padding or set its own layout direction. | Fixed in code. The dialog uses the safe area and the selected language direction. Android Share and cutout checks are pending. |
| Medium | Android background work | Native transfer state is durable, but interrupted downloads restart. Long-running WorkManager jobs need quota and lifecycle coverage under Android 16, including notification denial and network transitions. | Open. Preserve the current transfer engine until device traces justify a change. |
| Medium | Search and provider reliability | YouTube requests share a fixed-size worker pool with an unbounded queue. JS cancels stale responses for display, while already submitted native work can continue. Provider discovery can also change with upstream HTML, expiry, geo restrictions and rate limits. | Open. Measure saturation, then bound or cancel superseded search work without delaying current playback or downloads. Validate each supported provider against permitted public fixtures. |
| Medium | Release readiness | The repository's default Android build uses development signing. Store-ready signing, install-over-old testing, provider compliance review, and physical handset and receiver acceptance remain release gates. | Open. Build and sign through the documented production procedure when ready. |
| Low | Downloads and battery | JS queried native jobs every 1.5 seconds while active jobs existed, even during background states when JS was still running. | Fixed. Foreground reconciliation resumes on app activation. Native work remains platform managed. Battery impact has not been measured. |
| Low | Library and rendering | Library collections lacked title/artist search. Playlist rendering repeatedly searched the full track array and track cards subscribed to the entire store. | Improved. Favorites, Local media and Saved tracks now use bilingual local search with a clear control. Playlist lookup uses an indexed map, and cards subscribe only to their favorite status. |
| Low | UI and accessibility | The header and About used the template icon. The drawer could overflow short windows. The About hierarchy repeated the developer credit and support copy obscured the actual destination. The drawer backdrop duplicated the close action in accessibility navigation. | Improved. The header and About now share a themed play mark. The drawer scrolls, the backdrop is skipped in accessibility navigation, and About has a branded identity card, app version and developer credit. Settings links to About. Support uses official GitHub Issues for feedback, and Source Code & Licenses uses the official repository. |
| Low | Bundle size | The icon barrel brought other icon families into the production export despite the app using only Material Icons. | Fixed. Direct Material Icons imports reduced the web export from 38 to 20 assets and the reported JS bundle from about 1.8 MB to 1.4 MB. These are export sizes, not APK size or startup measurements. |
| Low | Large libraries and accessibility | Library and Downloads render their collections in scroll views. Large libraries and big text can make these screens expensive or harder to navigate. | Open. Profile larger collections before moving them to virtualized lists. Include TalkBack and Android TV focus in acceptance. |

Dependency details: [decoder advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f), [older decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Screen and integration review

| Surface | What was checked | Remaining acceptance |
| --- | --- | --- |
| Home, Recent and Library | Recent and saved collections, quick access, queue order, playlist actions, offline badges, local import entry, history clearing and title/artist search. | Large libraries, playlist deletion confirmation and external keyboard or TV focus. |
| Search | Debounce, cancellation at the JS boundary, duplicate suppression, pagination, error retry, Arabic and English text direction, clear control. | Provider latency and request pressure on weak networks and rapid native searches. |
| Player and Watch Details | Mini and expanded player, source resolution, quality changes, speed, looping, resume, play queue, PiP setup, actions and error paths. | Physical audio focus, headset/lock-screen controls, interruptions, screen lock, PiP and restoration with real codecs. |
| Downloads | Native queue reconciliation, missing-file recovery, cancellation, retries, app-private files and offline status. | Interrupted transfers, low storage, job quota, battery saver and notification denial on current Android. |
| Cast | Sender lifecycle, capability gating, remote ownership, local file serving and short-lived source grants. Local serving is bounded and has explicit cleanup paths. | Real Chromecast and Mi Box across connect, disconnect, network change, receiver loss, local media, and provider expiry. |
| Shared links | Intent parsing, bounded content grants, provider discovery, URL classification, browser handoff and native import bounds. Native discovery/transfer validates HTTPS and redirects. Playback redirects in the platform player need separate verification. | Real Share-sheet round trips and provider matrix. A saved link is not evidence that the provider supports playback or downloads. |
| Settings, About, Support, Licenses | Themes, language, preferences, privacy, destructive-action confirmation, repository destinations and developer identity. | TalkBack and larger font sizes across narrow and landscape layouts on Android. |
| Build and optional server | Generated manifest, declared foreground services, blocked broad storage/microphone permissions, Expo prebuild, production-signing path and bounded YouTube-only resolver inputs. | Final merged APK permissions, native tests, release artifact and production signing. Avoid exposing the optional resolver as a public service without deployment limits. |

## Prioritized roadmap

1. **P0 · Release acceptance.** Replace the template launcher icon, then build and sign an ARM64 candidate, inspect merged APK permissions, patch the Expo dependency chains, and test install-over-old. Run the share, download, background playback and Cast matrix on the oldest supported Android version and a current phone, plus Mi Box or Chromecast. Include Arabic, light/dark, TalkBack and larger text.
2. **P1 · Reliable downloads.** Add explicit Wi-Fi-only policy, queue scheduling and improved retry reasons. Enable byte-range resume only with validated server ranges and matching content validators. Plex is a reference for clear quality and offline choices. [Plex Downloads](https://support.plex.tv/articles/downloads-overview/)
3. **P1 · Player and Cast continuity.** Add track/subtitle selection, clearer receiver state and consistent Cast controls. Validate media-session behavior through lock screen, Bluetooth and audio focus. VLC provides a reference for multi-track and subtitle usability. [VLC Android](https://www.videolan.org/vlc/download-android.html) · [Google Cast design](https://developers.google.com/cast/docs/design_checklist/) · [Android background media](https://developer.android.com/media/media3/session/background-playback)
4. **P2 · Library at scale.** Add sorting, album/artist grouping, playlist reordering and a duplicate-aware local library. Profile before introducing virtualized views and indexing. Offer user-initiated export for playlists and preferences.
5. **P2 · Personalization.** Add a sleep timer and per-media playback preferences after queue, background and Cast interactions are stable. Measure startup, scroll latency, memory and battery on hardware before claiming improvements.

Android references: [Edge-to-edge and insets](https://developer.android.com/develop/ui/views/layout/edge-to-edge) · [Long-running workers](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/long-running).

## Verification

- TypeScript passed. Vitest passed all 192 tests. Expo Doctor passed 21 of 21 checks.
- A standalone JVM run passed 46 JUnit tests covering provider parsing, transfer policy, intents and local Cast HTTP. The NewPipe-dependent Cast source suite and Android instrumentation need the full native build.
- Playwright passed all 20 tests in Chromium Headless Shell, including Arabic/English layouts, library filtering, history confirmation, player controls, and developer navigation. Screenshots were reviewed at narrow, landscape and default widths.
- Expo Android prebuild and JavaScript bundle export succeeded. These checks do not compile or install a native APK. Track the full build and artifact status in the pull request.
- The APK, physical Android behavior, background playback, live social providers and external Cast receivers require separate acceptance.
