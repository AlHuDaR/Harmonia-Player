# Facebook public Reel extraction fix — 2026-11-16

The APK from PR #60 did not fix `https://www.facebook.com/share/r/19trbCXy4d/`. This follow-up addresses the actual extraction failure. PR #60's diagnostic/redirect improvements alone were insufficient.

Two causes were reproduced. Harmonia requested the page without HTML negotiation headers and read only Open Graph video tags. Facebook's response contained no such stream tags. A request using the same Harmonia user-agent with explicit public HTML Accept/Accept-Language headers returned static `application/json` / `data-sjs` metadata on the public video page. Reels can still omit that JSON; one bounded request to the public watch URL for the exact resolved video ID returned it. No account, cookies, authorization, private API, script execution or third-party download service is used.

`FacebookPublicVideo` keeps the existing Open Graph path and adds parsing of the observed `Video.videoDeliveryLegacyFields.browser_native_{hd,sd}_url` fields. It accepts only the requested video ID and matching legacy identity, ignores recommendations and executable/inactive script content, rejects explicit private/protected/live flags, and bounds HTML size, JSON block size, nesting, script count and traversal work. It validates each returned candidate through the existing progressive MP4 response probe before offering HD/SD choices. The original shared URL remains the source for retries. Access-denied responses are propagated without trying another endpoint. Snapchat and other adapters retain their current request behavior.

| Check | Before | After | Scope |
| --- | --- | --- | --- |
| Reported shared Reel → discovery | Failed | Passed | Actual new Java discovery/parser and media response validation with curl as external transport: two page requests, two media probes |
| Reported Reel HD download | Not Tested | Passed | HTTP 200; 8,942,832 bytes; H.264 720×1280 + AAC; three seconds decoded by FFmpeg |
| Reported Reel SD download | Not Tested | Passed | HTTP 200; 2,245,596 bytes; H.264 360×640 + AAC; three seconds decoded by FFmpeg |
| Additional public Reel `1195289147628387` | Not Tested | Passed | New discovery/parser and MP4 probes via external transport, HD/SD; full download not tested |
| Wrong identity, executable/inactive scripts, unsafe links, explicit protected/private/live flags, excessive size/depth | Not Tested | Passed | Native rejection fixtures |
| Access-denied request | Passed | Passed | No fallback after HTTP 403 |
| Old Open Graph formats | Passed | Passed | Existing interface and ID retained |
| Arabic/emoji numeric title entities | Failed (literal entities) | Passed | Native fixture |
| Android runtime playback/download | Not Tested | Not Tested | External checks are not device verification; consult PR CI for APK/build and device smoke results |

Raw results are in `evidence/facebook-reel-fix-2026-11-16.json`; signed media URLs are deliberately omitted. The transport harness uses the real `FacebookPublicVideo.discover` and `MediaDiscovery.probe` code, supplying curl-fetched responses through the adapter's test interfaces because this workspace's native networking cannot use its private-address proxy. The downloaded samples were fetched separately from the exact parsed public SD/HD fields. This is stronger than a synthetic parser fixture but does not certify all Facebook URLs or Android playback.

Local validation: TypeScript typecheck Passed; all 197 application tests Passed; 41 selected native tests Passed, including eight Facebook parser/discovery tests, public HTML request negotiation and Arabic title decoding. The new Java class and fixtures are copied by the existing Android prebuild plugin. Android build/native Gradle tests and device smoke verification run in the PR workflow; their live status is the authority before distributing an APK. Remaining limits include undocumented public JSON shape changes, regional/access restrictions, live streams, encrypted media and isolated audio extraction.
