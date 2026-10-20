const { withAndroidManifest } = require("expo/config-plugins");
module.exports = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    const app = manifest.application[0];
    app.service = app.service || [];
    const name = "androidx.work.impl.foreground.SystemForegroundService";
    if (!app.service.some((s) => s.$["android:name"] === name))
      app.service.push({
        $: {
          "android:name": name,
          "android:foregroundServiceType": "dataSync",
          "tools:node": "merge",
        },
      });
    return mod;
  });
