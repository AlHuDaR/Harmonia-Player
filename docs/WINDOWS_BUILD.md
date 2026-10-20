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
git switch feat/harmonia-multiplatform-discovery
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
