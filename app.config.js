export default {
  expo: {
    name: "Harmonia Player",
    slug: "harmonia-player",
    version: "1.1.0",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: "harmonia",
    userInterfaceStyle: "dark",
    newArchEnabled: false,
    android: {
      package: "com.alhudar.harmonia",
      versionCode: 2,
      permissions: [
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "android.permission.WAKE_LOCK",
      ],
      allowBackup: false,
      blockedPermissions: [
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
    },
    ios: { supportsTablet: true },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-asset",
      "expo-font",
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: "35.0.0",
          },
        },
      ],
      [
        "expo-video",
        { supportsBackgroundPlayback: true, supportsPictureInPicture: true },
      ],
    ],
    experiments: { typedRoutes: true },
  },
};
