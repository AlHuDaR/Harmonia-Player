# Standalone Android builds on Windows (no WSL)

Use Windows 10/11, Node.js 24 LTS **Windows Installer (.msi)** with npm, JDK 17, Git and Android Studio's SDK Manager. Keep the checkout in a short path such as `C:\src\Harmonia-Player` to avoid native-tool path limits. Allow several GB for the Android SDK/NDK and Gradle cache.

Install SDK Platform **36**, Build-Tools **36.0.0**, NDK **27.1.12297006**, CMake **3.22.1**, and Platform-Tools. The first Gradle invocation may install additional SDK components using accepted SDK licenses. No Docker, Linux shell, Python or WSL is required by the PowerShell script.

In a new PowerShell window, set your actual paths:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
node -v
npm -v
java -version
```

Clone/switch to this PR's feature branch, then run:

```powershell
git clone https://github.com/AlHuDaR/Harmonia-Player.git
cd Harmonia-Player
git switch feat/harmonia-tv-adaptive-preview5
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-android-release.ps1 -Mode arm64
```

The script runs `npm ci`, type checking, Expo Android prebuild, and **gradlew.bat assembleRelease** with ARM64 selection. It verifies APK signing, package identity, the embedded `assets/index.android.bundle`, ARM64 ABI contents and SHA-256. The JavaScript bundle is embedded; Metro is not needed for the installed release APK. Native PowerShell 5.1 or PowerShell 7 can invoke the script; external executable exit codes are checked explicitly.

Output: `artifacts\Harmonia-Player-arm64.apk`. Other modes are `universal`, `aab`, and `all`. Use `-SkipInstall` only after a successful lockfile install. APK verification runs for the modes produced by that invocation. AAB output is not installable directly and requires separate store/signing validation.

For JS checks on Windows, use `npm run typecheck` and `npm test`. The existing Unix-oriented `npm run dev` environment-variable syntax is independent of this release script; use `$env:EXPO_NO_TELEMETRY='1'; npx expo start` for Windows development.

## Signing and installation

Default builds are **test-signed**. Do not overwrite or regenerate the established production signing identity. An APK built with a different test/debug key cannot update an installed production-signed APK. Preserve user data and obtain a matching signed upgrade rather than uninstalling a production app without a backup.

Production signing remains opt-in through the existing protected configuration (`HARMONIA_PRODUCTION=1`, `HARMONIA_STORE_FILE`, `HARMONIA_STORE_PASSWORD`, `HARMONIA_KEY_ALIAS`, `HARMONIA_KEY_PASSWORD`). Never commit or print keys/passwords. Do not publish this preview.

For a fresh test device/emulator:

```powershell
adb install -r .\artifacts\Harmonia-Player-arm64.apk
adb shell am start -n com.alhudar.harmonia/.MainActivity
```

Use the universal APK on an x86_64 emulator; an ARM64-only APK needs an ARM64 device. Test Share from actual source apps as well as the automated system-intent test. For Wi-Fi interruptions, process death, notifications denied, retries and OEM battery limits, follow the validation checklist.

## Verification boundary

The new CI Windows job runs this PowerShell build on a Windows runner and uploads a separate Windows ARM64 artifact. Its observed result is recorded in PR checks; adding the job is not a claim that it passed. The Linux execution environment does not itself execute Windows programs or prove a Windows-native build. Neither passing build checks nor test signing authorizes production publication.


## Synchronize an existing checkout safely

Commit or stash your own work first. Do not reset the checkout. Use a new local review branch (choose a different local name if it already exists):

```powershell
cd C:\src\Harmonia-Player
git status --short
git fetch origin
git switch --create review/harmonia-tv-preview5 --track origin/feat/harmonia-tv-adaptive-preview5
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
$env:EXPO_NO_TELEMETRY='1'
npx.cmd expo prebuild --platform android --no-install
```

Open **the generated `android` directory** in Android Studio, select JDK 17 for Gradle, accept SDK licenses, then choose **File → Sync Project with Gradle Files**. Keep machine-specific `local.properties`, signing files and secrets untracked. Expo prebuild regenerates native files; maintain changes in `native/` and `plugins/`, not only in generated Android files.

## Debug APK and device development

```powershell
Push-Location android
.\gradlew.bat :app:assembleDebug '-PreactNativeArchitectures=arm64-v8a'
Pop-Location
adb install -r .\android\app\build\outputs\apk\debug\app-debug.apk
adb reverse tcp:8081 tcp:8081
$env:EXPO_NO_TELEMETRY='1'
npx.cmd expo start --localhost
```

This development debug APK requires Metro; use the release script below for a standalone APK with embedded JavaScript. For an x86_64 emulator select `x86_64` or use the universal release build. If a signing mismatch occurs, use a separate test emulator/device or obtain the matching signing identity; do not remove an installed production app and its data merely to make the install succeed.

## Standalone release APK and AAB

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-android-release.ps1 -Mode arm64 -SkipInstall
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-android-release.ps1 -Mode universal -SkipInstall
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-android-release.ps1 -Mode aab -SkipInstall
adb install -r .\artifacts\Harmonia-Player-arm64.apk
adb shell am start -n com.alhudar.harmonia/.MainActivity
adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT 'https://www.snapchat.com/spotlight/REPLACE_WITH_PUBLIC_ID' -n com.alhudar.harmonia/.MainActivity
```

Use a real authorized public URL in the last command. Test again with the app closed, running and after repeated shares. From Files or a source app, share a real audio/video file (and multiple files), import it, restart Harmonia and play it offline. Also test cancel/retry downloads, English/Arabic, speed/seek, background controls, Bluetooth and PiP. The matrix and unresolved gates are in [the repair record](MEDIA_REPAIR_2026_10.md).

The script copies release results to `artifacts\Harmonia-Player-arm64.apk`, `artifacts\Harmonia-Player-universal.apk` and `artifacts\Harmonia-Player.aab`. Generated originals are under `android\app\build\outputs\apk\release\app-release.apk` and `android\app\build\outputs\bundle\release\app-release.aab`. Default release builds remain test-signed; production requires the existing protected signing configuration. An AAB cannot be installed with `adb install`.


## Android TV / Mi Box — preview 5

Use **`-Mode universal`** for Mi Box: some models have 32-bit Android even with a 64-bit CPU. ARM64-only APKs will not cover those devices. Preview 5 is `2.0.0-preview.5` / versionCode `11`, requires Android 7/API 24+, and retains test signing. See the [Arabic TV guide](ANDROID_TV_AR.md) and [current verification record](TV_STREAMING_PREVIEW5.md). The TV launcher/focus changes and adaptive ladder do not substitute for physical-device acceptance or a successful live provider test.
