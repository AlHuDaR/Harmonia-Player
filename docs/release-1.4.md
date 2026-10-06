# Harmonia 1.4 release candidate

## Included
- Persistent English / Arabic language selection; RTL interface layout, translated labels, app errors and accessibility names. Original titles and channel names remain unchanged.
- Clean Home; link entry and file import live in Library. Cards use a three-dot action sheet instead of oversized button blocks.
- Audio/video mode, seek bar, Previous/Next, shuffle and repeat. Downloads and playlists retain a playback list. Previous follows actual playback history, including shuffled playback. Explicit queue entries take priority. Repeat-one applies at track end; Next still advances.
- Android VIEW and text/plain SEND support. YouTube watch, short, live and youtu.be links open on cold launch or while running. Only validated YouTube video links are accepted from external apps. No automatic downloads or clipboard reading.
- Coded By AlHuDaR, privacy summary and support section. No payment provider configured.

## Distribution status
The CI artifact remains a **test APK**, signed with the existing development key. It is not a store-approved or production-signed release. The source remains GPL-3.0-or-later; a commercial distribution must provide the corresponding source and licence notices. Do not promise Google account sync, casting, commenting or YouTube personalization: they are not implemented.

To build a production-signed APK, set `HARMONIA_PRODUCTION=1`, `HARMONIA_STORE_FILE` (absolute private keystore path), `HARMONIA_STORE_PASSWORD`, `HARMONIA_KEY_ALIAS`, and `HARMONIA_KEY_PASSWORD`, then run `npm run build:apk`. The build fails if a required variable is missing. Keep the keystore backed up privately and never commit it or passwords. Use this same signing key for every public update. Switching from the development certificate to a new release certificate requires reinstalling the test app; app-private data would be removed, so plan migration before launch.

Android 12+ may require the user to enable supported addresses under Settings → Apps → Harmonia → Open by default. Harmonia cannot verify ownership of youtube.com or override YouTube's existing defaults. Share → Harmonia remains available for text links. WhatsApp's internal browser can also affect link opening.

## Device acceptance gate
On S24 Ultra and at least one other supported Android device:
1. Change English → Arabic → restart → English. Check text scaling, landscape, RTL ordering and readable mixed-language titles.
2. Play search result → collapse → browse → reopen. Seek, pause, change audio/video and quality; position should be preserved.
3. Download three files, disable the network, play from Downloads. Exercise Next, Previous, shuffle, repeat-one, repeat-all and end-of-list.
4. Cold and warm VIEW intents for watch/short/live/short links; cold and warm WhatsApp text shares. Verify invalid links show an error and never trigger a download.
5. Lock screen, Bluetooth disconnect/reconnect, incoming call, background playback and Android PiP.
6. Confirm upgrade installation with the same certificate, storage failure handling, library retention and removal behavior.

Example explicit intent checks:
```
adb shell am start -a android.intent.action.VIEW -d 'https://www.youtube.com/watch?v=abcdefghijk' com.alhudar.harmonia
adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT 'https://youtu.be/abcdefghijk' com.alhudar.harmonia
```
Use an actual publicly playable video ID for end-to-end testing. A passing build and mocked/browser tests do not certify live YouTube behavior or external app chooser behavior.

## Remaining commercial release work
Owner-held production signing credentials, device acceptance, distribution-policy review, and a tested user-data backup/migration plan. Persistent resumable download jobs and export to public storage remain separate work. Donation collection stays disabled until the owner chooses a provider.
