const {
  withAppBuildGradle,
  withMainApplication,
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");
module.exports = function withGoogleCast(config) {
  config = withAppBuildGradle(config, (mod) => {
    const marker = "// @generated Harmonia Google Cast";
    if (!mod.modResults.contents.includes(marker))
      mod.modResults.contents += `\n${marker}\ndependencies {\n    implementation 'com.google.android.gms:play-services-cast-framework:22.3.1'\n    implementation 'androidx.mediarouter:mediarouter:1.8.1'\n}\n`;
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    const marker = "// @generated Harmonia Cast package";
    if (!mod.modResults.contents.includes(marker)) {
      const anchor = /PackageList\(this\)\.packages\.apply\s*\{/;
      if (!anchor.test(mod.modResults.contents))
        throw new Error("Cannot register Harmonia Cast package.");
      mod.modResults.contents = mod.modResults.contents.replace(
        anchor,
        (match) =>
          `${match}\n              ${marker}\n              add(com.alhudar.harmonia.cast.HarmoniaCastPackage())`,
      );
    }
    return mod;
  });
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest["uses-permission"] ||= [];
    for (const name of [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.ACCESS_WIFI_STATE",
      "android.permission.CHANGE_WIFI_MULTICAST_STATE",
    ]) {
      if (
        !manifest["uses-permission"].some(
          (item) => item.$["android:name"] === name,
        )
      )
        manifest["uses-permission"].push({ $: { "android:name": name } });
    }
    const app = manifest.application[0];
    app["meta-data"] ||= [];
    const key =
      "com.google.android.gms.cast.framework.OPTIONS_PROVIDER_CLASS_NAME";
    if (!app["meta-data"].some((item) => item.$["android:name"] === key))
      app["meta-data"].push({
        $: {
          "android:name": key,
          "android:value": "com.alhudar.harmonia.cast.HarmoniaCastOptions",
        },
      });
    app.activity ||= [];
    if (
      !app.activity.some(
        (item) =>
          item.$["android:name"] ===
          "com.alhudar.harmonia.cast.CastPickerActivity",
      )
    )
      app.activity.push({
        $: {
          "android:name": "com.alhudar.harmonia.cast.CastPickerActivity",
          "android:exported": "false",
          "android:theme": "@style/HarmoniaCastPicker",
          "android:excludeFromRecents": "true",
        },
      });
    return mod;
  });
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const root = mod.modRequest.platformProjectRoot;
      const copy = (source, target) => {
        fs.mkdirSync(target, { recursive: true });
        for (const file of fs.readdirSync(source))
          if (file.endsWith(".java"))
            fs.copyFileSync(path.join(source, file), path.join(target, file));
      };
      copy(
        path.join(__dirname, "../native/cast"),
        path.join(root, "app/src/main/java/com/alhudar/harmonia/cast"),
      );
      const test = path.join(__dirname, "../native/cast-tests");
      if (fs.existsSync(test))
        copy(
          test,
          path.join(root, "app/src/test/java/com/alhudar/harmonia/cast"),
        );
      const values = path.join(root, "app/src/main/res/values");
      fs.mkdirSync(values, { recursive: true });
      fs.writeFileSync(
        path.join(values, "harmonia_cast.xml"),
        `<resources><style name="HarmoniaCastPicker" parent="Theme.AppCompat.DayNight.NoActionBar"><item name="android:windowIsTranslucent">true</item><item name="android:windowBackground">@android:color/transparent</item><item name="android:windowDimAmount">0</item><item name="android:windowIsFloating">false</item></style></resources>`,
      );
      return mod;
    },
  ]);
};
