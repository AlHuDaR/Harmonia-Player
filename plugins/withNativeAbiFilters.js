const { withAppBuildGradle } = require("expo/config-plugins");

// Keep packaged native libraries aligned with React Native's selected ABI list.
// Release builds can select a single ABI for a smaller APK or all supported ABIs
// for a universal APK / Android App Bundle.
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
