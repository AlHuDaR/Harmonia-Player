# Third-party software

Harmonia Player is distributed under GPL-3.0-or-later. See LICENSE.

## Google Cast sender

Google Play services Cast Framework 22.3.1 is distributed under Google's Android
SDK terms: https://developer.android.com/studio/terms.html
SDK documentation and applicable terms: https://developers.google.com/cast/docs/android_sender
AndroidX MediaRouter 1.8.1 is Apache-2.0, Android Open Source Project.
Cast, Chromecast and Google TV are Google trademarks. Harmonia uses the standard
Cast device picker and Default Media Receiver; it is not endorsed by Google.

## NewPipe Extractor v0.26.5

Copyright Team NewPipe and its contributors. Licensed GPL-3.0-or-later.
Source: https://github.com/TeamNewPipe/NewPipeExtractor/tree/v0.26.5
Licence: https://github.com/TeamNewPipe/NewPipeExtractor/blob/v0.26.5/LICENSE

Harmonia integrates the unmodified library through an original Android bridge;
it is not affiliated with or endorsed by Team NewPipe or YouTube.
The dependency and its transitive dependencies are fetched by Gradle. Their
notices and licences remain applicable. React Native, Expo, Media3, OkHttp,
Rhino, jsoup, protobuf, nanojson and other dependencies retain their respective
licences and attribution. npm dependencies are pinned in package-lock.json.

Corresponding Harmonia source and build instructions:
https://github.com/AlHuDaR/Harmonia-Player
The APK workflow checks out the matching commit. For a distributed APK, publish
the exact source revision/PR link with it, including the native bridge and build
scripts. No proprietary extractor or hidden server component is required.

## Background media work (preview 2)

AndroidX WorkManager 2.10.1 — Apache-2.0, Android Open Source Project.
Source/license: https://android.googlesource.com/platform/frameworks/support/+/androidx-work-release/work/

Guava 33.4.8-android — Apache-2.0, Google and contributors. Required for the
ListenableFuture API shared by WorkManager and the existing Media3 dependency
resolution (which selects the empty listenablefuture compatibility artifact).
Source/license: https://github.com/google/guava/tree/v33.4.8
These permissive licenses are compatible with GPL-3.0 distribution; retain their
notices and corresponding project source/build instructions with distributions.

JUnit 4.13.2 (EPL-1.0) and JSON-java 20250517 are test-only dependencies and are
not bundled into the release APK. No Python, yt-dlp Android wrapper, FFmpeg,
aria2 or third-party social extraction binary is added by this increment.
See docs/MULTIPLATFORM_PROVIDER_REVIEW.md for evaluated alternatives and limits.
