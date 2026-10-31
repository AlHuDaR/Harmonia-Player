import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
it("adds Cast configuration idempotently without removing phone/TV launchers or package identity", () => {
  let manifestTransform = (mod: any) => mod;
  let gradleTransform = (mod: any) => mod;
  let appTransform = (mod: any) => mod;
  const module = { exports: null as any };
  new Function(
    "require",
    "module",
    "__dirname",
    readFileSync("plugins/withGoogleCast.js", "utf8"),
  )(
    (name: string) =>
      name === "expo/config-plugins"
        ? {
            withAndroidManifest: (
              config: any,
              fn: typeof manifestTransform,
            ) => {
              manifestTransform = fn;
              return config;
            },
            withAppBuildGradle: (config: any, fn: typeof gradleTransform) => {
              gradleTransform = fn;
              return config;
            },
            withMainApplication: (config: any, fn: typeof appTransform) => {
              appTransform = fn;
              return config;
            },
            withDangerousMod: (config: any) => config,
          }
        : require(name),
    module,
    "/unused",
  );
  module.exports({});
  const activity = {
    $: { "android:name": ".MainActivity" },
    "intent-filter": [
      {
        category: [
          { $: { "android:name": "android.intent.category.LAUNCHER" } },
          {
            $: { "android:name": "android.intent.category.LEANBACK_LAUNCHER" },
          },
        ],
      },
    ],
  };
  const mod = {
    modResults: {
      manifest: {
        $: { package: "com.alhudar.harmonia" },
        application: [{ $: {}, activity: [activity] }],
      },
    },
  };
  manifestTransform(mod);
  manifestTransform(mod);
  const result: any = mod.modResults.manifest;
  expect(result.$.package).toBe("com.alhudar.harmonia");
  expect(result.application[0].activity).toHaveLength(2);
  expect(result.application[0].activity[0]).toEqual(activity);
  expect(result.application[0]["meta-data"]).toHaveLength(1);
  expect(result.application[0].activity[1].$["android:exported"]).toBe("false");
  expect(result["uses-permission"]).toHaveLength(4);
  const build = { modResults: { contents: "dependencies {}" } };
  gradleTransform(build);
  gradleTransform(build);
  expect(
    build.modResults.contents.match(/play-services-cast-framework/g),
  ).toHaveLength(1);
  const app = {
    modResults: { contents: "PackageList(this).packages.apply { }" },
  };
  appTransform(app);
  appTransform(app);
  expect(
    app.modResults.contents.match(/HarmoniaCastPackage\(\)/g),
  ).toHaveLength(1);
  expect(() =>
    appTransform({ modResults: { contents: "unsupported template" } }),
  ).toThrow("Cannot register");
});
