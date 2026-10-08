# Customer polish review

Based on main `31ce963` (Harmonia 1.5.0). This pass changes presentation and local browsing; it adds no catalogue, recommendation service, tracking, or runtime dependency.

## UX audit

| Area | What works | Finding and decision |
| --- | --- | --- |
| Home | Compact, real local data, nine-item maximum | “Speed dial” mixed played and merely saved items. Show actual recently played items, quick access, useful onboarding and the current session's playing item. Keep three columns on normal phones, two for narrow screens or larger font scale. |
| Search | Request cancellation, pagination, actionable errors | Blank initial results area lacked guidance. Add a bilingual introductory state, themed loading indicator and consistent thumbnail placeholders. Preserve search behavior. |
| Samples | Existing saved tracks, no fake catalogue | Name implied excerpts but content was saved tracks. Rename to Recent, use deduplicated listening history order, skip missing IDs, and offer Play all. Keep `/samples` route for compatibility. |
| Library | Favorites, playlists and imports already persist | Large repeated artwork lists obscured collections; empty text referred to importing from Home. Add collection choices, compact rows, expandable playlists, and clear import guidance. Downloads and Recent have dedicated access. |
| Downloads | Offline list transport, retry/delete, real progress | Raw status and percentages had little hierarchy. Add localized status, progress bar, compact cards and useful empty state. Preserve download implementation. |
| Mini player | Persistent above navigation, compact controls | Already useful. Shared pressed/selected treatment improves feedback without changing persistence or controls. |
| Full player | Audio/video, quality, queue, share, PiP, fullscreen, background and transport | Main play action used text glyphs and artist was missing from the main title block. Use Material icons, accent emphasis and artist subtitle. Keep all existing actions and media lifecycle; leave developer credit in About, Support and drawer rather than the listening screen. |
| Drawer/navigation | Four compact tabs; preferences separate from developer pages | Replace Samples with Recent and add selected pill emphasis. Keep developer credit and the separate Settings/About/Support/Licenses destinations. |
| Settings | Correct preference scope, immediate language switching | Plain selection text and ungrouped rows lacked hierarchy. Group six preference sections in surface cards; add accessible choice controls and theme previews. Preserve old mode/transparency preferences. |
| About | Version, branding, full “Coded By AlHuDaR” | Already appropriate. Keep identity and credits. |
| Support | GitHub reporting/support is functional | Disabled donation placeholder looked unfinished. Remove speculative donation UI; retain real support action and credit. |
| Licenses | Real source, GPL and NewPipe notices | Appropriate for customers; retain source and license links. |
| Appearance | Central theme hook already exists | Expand it with light/dark token palettes for Harmonia, Midnight, AMOLED Black, Ocean and Sunset. AMOLED uses true black in Dark mode. System still follows device appearance. |
| Arabic/English | Locale wrapper, dynamic language, RTL root, raw track titles | Translate all new labels and guidance. Choices wrap; track/artist lines truncate; compact controls retain 44-pixel minimum targets. Keep transport and timeline LTR. |
| Empty states/typography/cards | Existing shared UI primitives | Reuse a small set of section, surface, choice and empty-state helpers. Increase Home title labels to 13px, add artwork fallbacks, and compact Library/Recent rows. Avoid a new framework or broad style cleanup. |

## Implemented scope

- Home: real listening history (maximum nine), quick access, counts from actual favorites/downloads, current-session now-playing shortcut, and onboarding.
- Recent: history-backed list and Play all; clearing history immediately empties it without deleting saved tracks.
- Library: one selected collection at a time (Favorites, Playlists, imported Local media, remote Saved tracks). Completed downloads stay in Downloads; playlist contents remain accessible and use their saved ordering.
- Appearance: five lightweight central presets, semantic background/surface/elevated/text/muted/border/accent/selected/error/warning tokens, contrast-tested palettes, accessible preview choices.
- Settings: six grouped preference cards; developer pages stay separate.
- Shared controls: pressed feedback, selected treatment, radio checked semantics on native and web, compact track variant and artwork fallbacks.
- Player: artist subtitle and primary transport icon/accent polish only.
- Downloads: existing progress presented visually, localized status, actionable empty state.
- Search and Support: clearer first-use guidance and removal of inactive donation placeholder.

The storage key remains `harmonia-library-v1`. Preset is an additive setting; old/missing/unknown values fall back to Harmonia. Existing mode, transparency, language, media, history, playlists, favorites and downloads are retained. No autoplay or expiring media URL restoration was introduced. Package ID, signing plugins/configuration, dependency manifest/lockfile and Android CI are unchanged.

## Feature review

Complexity includes reliable Android background behavior, storage safety and bilingual UX, not just adding a button.

| Feature | Classification | Decision |
| --- | --- | --- |
| Sleep timer | HIGH VALUE / HIGH COMPLEXITY | Defer: reliable sleep through background execution needs native playback lifecycle work. |
| Search history | HIGH VALUE / LOW COMPLEXITY | Defer: needs an explicit retention/clear-history design and additive storage tests. |
| Recently searched | HIGH VALUE / LOW COMPLEXITY | Same feature as search history; avoid redundant UI. |
| Queue management/reorder | HIGH VALUE / LOW COMPLEXITY | Existing enqueue, move-up and remove already work. Preserve; richer drag/reorder UI deferred. |
| Better playlist creation/editing | HIGH VALUE / LOW COMPLEXITY | Improve browsing and creation presentation now; rename/reorder and destructive-action confirmations deferred. |
| Download progress/status | HIGH VALUE / LOW COMPLEXITY | Implement visual status/progress using existing values. |
| Download quality presets | HIGH VALUE / HIGH COMPLEXITY | Defer: format availability varies, audio/video merging and fallback policy need coverage. Existing format preference and quality picker retained. |
| Favorite artists/channels | LOW PRIORITY | Defer: requires a separate entity model and navigation. |
| Playback speed | HIGH VALUE / LOW COMPLEXITY | Defer to focused player work, including audio quality and mode-switch behavior tests. |
| Audio-only quick toggle | HIGH VALUE / LOW COMPLEXITY | Already exists in player; retain and improve selected feedback. |
| Continue playback position | HIGH VALUE / HIGH COMPLEXITY | Defer: existing position intentionally transient; restart recovery must refresh sources and avoid autoplay. Home only reopens the current session. |
| Share track/link | HIGH VALUE / LOW COMPLEXITY | Already exists; retain. |
| Theme presets | HIGH VALUE / LOW COMPLEXITY | Implement. |
| AMOLED mode | HIGH VALUE / LOW COMPLEXITY | Implement as preset with true black in Dark mode. |
| Custom accent color | LOW PRIORITY | Defer: curated presets keep contrast predictable. |
| Backup/export library/preferences | HIGH VALUE / HIGH COMPLEXITY | Defer: safe schema, local file handling and restore validation require separate work. |
| Import/export playlists | HIGH VALUE / HIGH COMPLEXITY | Defer: source identifiers, formats and deduplication need a defined contract. |
| Cast support | HIGH VALUE / HIGH COMPLEXITY | Defer: native integration, discovery and source compatibility. |
| Equalizer | LOW PRIORITY | Defer: native audio-session integration and device support. |
| Lyrics | LOW PRIORITY | Defer: no bundled lyric data or approved external source. |

## Validation and limits

- `npm ci`: passes with a writable workspace npm cache; no dependency changes.
- `npx expo-doctor@latest`: 21/21 checks pass with `EXPO_NO_TELEMETRY=1` and Node's configured environment-proxy support.
- `npm run typecheck`: passes.
- `npm test`: 59 tests pass, including preset migration/persistence and normal-text contrast across ten palettes. Local server tests require network-enabled sandbox execution.
- `npm run test:web`: 9 tests pass. Existing audio/video play/pause/seek, list navigation, library persistence, language, developer credit and compact Home checks retained; added real history/clear and preset/Arabic layout checks.
- `npm run build:web`: passes.
- `npm run prebuild:android`: passes without manifest/lockfile changes.
- Android JS export: passes.
- Full APK/AAB build unavailable locally: installed SDK has platform 35/build-tools 35 and NDK 26, while the unchanged release configuration requires platform 36/build-tools 36 and NDK 27.1.12297006. Preserve the existing Android workflow to validate release artifacts on the PR.

Browser screenshots cover English light/dark, Home, both players, Arabic Settings at narrow and landscape sizes. They are fixture-based UI checks, not production recommendations. Native NewPipe, WhatsApp link intents, background/PiP, actual font scaling and Android Back need a physical-device smoke test for this branch. Prior S24 Ultra testing of 1.5.0 is not testing of these changes. No native playback/link/signing implementation was altered.

Large libraries still use the existing scroll-based collection architecture; virtualization and full-player action regrouping are deferred to avoid risky rewrites. Recent uses the existing last-100 history limit. There is no persistent restart resume feature in this pass.
