const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withMainApplication,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");
const VERSION = "v0.26.5";
module.exports = function withNewPipe(config) {
  config = withProjectBuildGradle(config, (mod) => {
    const marker = "// @generated Harmonia NewPipe repository";
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents += `\n${marker}\nallprojects { repositories { maven { url 'https://jitpack.io' } } }\n`;
    }
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    const marker = "// @generated Harmonia NewPipe dependencies";
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents += `\n${marker}\nandroid { compileOptions { coreLibraryDesugaringEnabled true } }\ndependencies {\n    implementation 'com.github.teamnewpipe:NewPipeExtractor:${VERSION}'\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs_nio:2.1.5'\n}\n`;
    }
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    const marker = "// @generated Harmonia NewPipe package";
    if (!mod.modResults.contents.includes(marker)) {
      const anchor = /val packages = PackageList\(this\)\.packages/;
      if (!anchor.test(mod.modResults.contents))
        throw new Error(
          "Cannot register Harmonia YouTube native package in MainApplication.",
        );
      mod.modResults.contents = mod.modResults.contents.replace(
        anchor,
        (match) =>
          `${match}\n            ${marker}\n            packages.add(com.alhudar.harmonia.youtube.YouTubePackage())`,
      );
    }
    return mod;
  });
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const target = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/main/java/com/alhudar/harmonia/youtube",
      );
      fs.mkdirSync(target, { recursive: true });
      for (const file of fs.readdirSync(
        path.join(__dirname, "../native/youtube"),
      )) {
        if (file.endsWith(".java"))
          fs.copyFileSync(
            path.join(__dirname, "../native/youtube", file),
            path.join(target, file),
          );
      }
      const rules = path.join(
        mod.modRequest.platformProjectRoot,
        "app/proguard-rules.pro",
      );
      const marker = "# Harmonia NewPipe Rhino";
      const content = fs.readFileSync(rules, "utf8");
      if (!content.includes(marker))
        fs.appendFileSync(
          rules,
          `\n${marker}\n-keep class org.mozilla.javascript.** { *; }\n-keep class org.mozilla.classfile.ClassFileWriter\n-dontwarn org.mozilla.javascript.tools.**\n`,
        );
      return mod;
    },
  ]);
};
