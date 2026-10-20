[CmdletBinding()]
param(
  [ValidateSet('arm64','universal','aab','all')][string]$Mode='arm64',
  [switch]$SkipInstall
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$projectRoot=Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  foreach ($tool in @('node','npm.cmd','npx.cmd','java')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Missing $tool. Install Node 24 LTS and JDK 17, then restart PowerShell." }
  }
  if (-not $env:ANDROID_HOME) {
    if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_HOME=$env:ANDROID_SDK_ROOT }
    elseif ($env:LOCALAPPDATA -and (Test-Path "$env:LOCALAPPDATA\Android\Sdk")) { $env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk" }
    else { throw 'Set ANDROID_HOME to the Android SDK directory.' }
  }
  foreach ($item in @('platforms\android-36','build-tools\36.0.0','ndk\27.1.12297006')) {
    if (-not (Test-Path (Join-Path $env:ANDROID_HOME $item))) { throw "Missing Android SDK component: $item. Install it with Android Studio SDK Manager." }
  }
  if ($env:HARMONIA_PRODUCTION -eq '1') {
    foreach ($key in @('HARMONIA_STORE_FILE','HARMONIA_STORE_PASSWORD','HARMONIA_KEY_ALIAS','HARMONIA_KEY_PASSWORD')) {
      if (-not [Environment]::GetEnvironmentVariable($key)) { throw "Missing production signing setting: $key" }
    }
  }
  $env:EXPO_NO_TELEMETRY='1'; $env:CI='1'
  if (-not $SkipInstall) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' } }
  & npm.cmd run typecheck; if ($LASTEXITCODE -ne 0) { throw 'Type checking failed.' }
  & npx.cmd expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }
  New-Item -ItemType Directory -Force -Path artifacts | Out-Null
  function Invoke-AndroidBuild([string]$Target,[string]$Abis,[string]$Source,[string]$Destination) {
    Push-Location android
    try {
      & .\gradlew.bat $Target "-PreactNativeArchitectures=$Abis" --max-workers=2 --no-daemon '-Dorg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g'
      if ($LASTEXITCODE -ne 0) { throw "Gradle failed: $Target" }
    } finally { Pop-Location }
    Copy-Item -Force $Source $Destination
  }
  if ($Mode -in @('arm64','all')) { Invoke-AndroidBuild ':app:assembleRelease' 'arm64-v8a' 'android\app\build\outputs\apk\release\app-release.apk' 'artifacts\Harmonia-Player-arm64.apk' }
  if ($Mode -in @('universal','all')) { Invoke-AndroidBuild ':app:assembleRelease' 'armeabi-v7a,arm64-v8a,x86,x86_64' 'android\app\build\outputs\apk\release\app-release.apk' 'artifacts\Harmonia-Player-universal.apk' }
  if ($Mode -in @('aab','all')) { Invoke-AndroidBuild ':app:bundleRelease' 'armeabi-v7a,arm64-v8a,x86,x86_64' 'android\app\build\outputs\bundle\release\app-release.aab' 'artifacts\Harmonia-Player.aab' }
  foreach ($apk in @('Harmonia-Player-arm64.apk','Harmonia-Player-universal.apk')) {
    if (($apk -like '*arm64*' -and $Mode -in @('arm64','all')) -or ($apk -like '*universal*' -and $Mode -in @('universal','all'))) {
      & (Join-Path $env:ANDROID_HOME 'build-tools\36.0.0\apksigner.bat') verify --verbose (Join-Path artifacts $apk)
      if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
      $apkPath=Join-Path artifacts $apk
      $badging=& (Join-Path $env:ANDROID_HOME 'build-tools\36.0.0\aapt.exe') dump badging $apkPath
      if ($LASTEXITCODE -ne 0 -or $badging[0] -notmatch "name='com.alhudar.harmonia'") { throw 'Unexpected APK package identity.' }
      Write-Host $badging[0]
      Add-Type -AssemblyName System.IO.Compression.FileSystem
      $archive=[System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $apkPath))
      try {
        $bundle=$archive.GetEntry('assets/index.android.bundle')
        if (-not $bundle -or $bundle.Length -eq 0) { throw 'Standalone APK is missing its JavaScript bundle.' }
        if ($apk -like '*arm64*') {
          $abis=@($archive.Entries | Where-Object { $_.FullName -match '^lib/[^/]+/.+' } | ForEach-Object { $_.FullName.Split('/')[1] } | Sort-Object -Unique)
          if ($abis.Count -ne 1 -or $abis[0] -ne 'arm64-v8a') { throw 'Unexpected ARM64 APK ABI contents.' }
        }
      } finally { $archive.Dispose() }
      Get-FileHash -Algorithm SHA256 $apkPath
    }
  }
  if ($env:HARMONIA_PRODUCTION -ne '1') { Write-Warning 'Test signing only. Do not publish to Google Play or replace a production app with a different signing identity.' }
  Write-Host "Build completed: $projectRoot\artifacts"
} finally { Pop-Location }
