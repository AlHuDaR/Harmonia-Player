export default {
  expo: {
    name: "Harmonia Player",
    slug: "harmonia-player",
    version: "1.4.0",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: "harmonia",
    userInterfaceStyle: "dark",
    android: {
      package: "com.alhudar.harmonia",
      versionCode: 5,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: false,
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            ...[
              "youtube.com",
              "www.youtube.com",
              "m.youtube.com",
              "music.youtube.com",
            ].flatMap((host) =>
              ["http", "https"].flatMap((scheme) =>
                ["/watch", "/shorts/", "/live/", "/embed/"].map(
                  (pathPrefix) => ({ scheme, host, pathPrefix }),
                ),
              ),
            ),
          ],
        },
        {
          action: "VIEW",
          autoVerify: false,
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            { scheme: "https", host: "youtu.be" },
            { scheme: "http", host: "youtu.be" },
          ],
        },
        {
          action: "SEND",
          category: ["DEFAULT"],
          data: [{ mimeType: "text/plain" }],
        },
      ],
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
      "expo-status-bar",
      "./plugins/withNativeAbiFilters",
      "./plugins/withNewPipe",
      "./plugins/withReleaseSigning",
      "expo-asset",
      "expo-font",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/icon.png",
          imageWidth: 180,
          resizeMode: "contain",
          backgroundColor: "#0c0e16",
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            buildToolsVersion: "36.0.0",
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
