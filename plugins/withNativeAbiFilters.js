const { withAppBuildGradle } = require("expo/config-plugins");

// React Native's architecture property limits native compilation, but the Expo
// SDK 52 template does not filter prebuilt AAR libraries when packaging an APK.
// Honor the same property for packaging; debug emulator builds can still use
// x86_64 while build-apk.sh selects arm64-v8a for the Galaxy S24 Ultra.
module.exports = function withNativeAbiFilters(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== "groovy") {
      throw new Error(
        "Harmonia ABI filtering requires the Expo Groovy template.",
      );
    }
    const marker = "// @generated Harmonia ABI filters";
    if (!mod.modResults.contents.includes(marker)) {
      if (!/defaultConfig\s*\{/.test(mod.modResults.contents)) {
        throw new Error(
          "Could not locate Android defaultConfig for ABI filtering.",
        );
      }
      mod.modResults.contents = mod.modResults.contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {
        ${marker}
        ndk {
            abiFilters(*((findProperty('reactNativeArchitectures') ?: 'armeabi-v7a,arm64-v8a,x86,x86_64').split(',')))
        }`,
      );
    }
    return mod;
  });
};
