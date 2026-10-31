const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");
module.exports = (config) => {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest["uses-feature"] ||= [];
    for (const name of ["android.hardware.touchscreen", "android.hardware.faketouch", "android.software.leanback"]) {
      let feature = manifest["uses-feature"].find((item) => item.$["android:name"] === name);
      if (!feature) { feature = { $: { "android:name": name } }; manifest["uses-feature"].push(feature); }
      feature.$["android:required"] = "false";
    }
    const app = manifest.application[0];
    app.$["android:banner"] = "@drawable/harmonia_tv_banner";
    for (const activity of app.activity || []) {
      const launcher = (activity["intent-filter"] || []).find((filter) =>
        (filter.action || []).some((action) => action.$["android:name"] === "android.intent.action.MAIN") &&
        (filter.category || []).some((category) => category.$["android:name"] === "android.intent.category.LAUNCHER"));
      if (launcher && !launcher.category.some((category) => category.$["android:name"] === "android.intent.category.LEANBACK_LAUNCHER"))
        launcher.category.push({ $: { "android:name": "android.intent.category.LEANBACK_LAUNCHER" } });
    }
    return mod;
  });
  return withDangerousMod(config, ["android", async (mod) => {
    const directory = path.join(mod.modRequest.platformProjectRoot, "app/src/main/res/drawable");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "harmonia_tv_banner.xml"), `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="320dp" android:height="180dp" android:viewportWidth="320" android:viewportHeight="180">
<path android:fillColor="#0c0e16" android:pathData="M0,0h320v180h-320z"/>
<path android:fillColor="#7c9cff" android:pathData="M150,38h18v64a22,22 0,1 1,-18 -21zM168,38l44,12v20l-44,-12z"/>
</vector>`);
    return mod;
  }]);
};
