import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function manifestTransform() {
  let transform: (mod: any) => any = () => { throw new Error("Missing manifest transform"); };
  const module = { exports: null as any };
  new Function("require", "module", readFileSync("plugins/withAndroidTV.js", "utf8"))((name: string) =>
    name === "expo/config-plugins" ? {
      withAndroidManifest: (config: any, callback: typeof transform) => { transform = callback; return config; },
      withDangerousMod: (config: any) => config,
    } : require(name), module);
  module.exports({});
  return transform;
}
describe("combined phone and Android TV manifest", () => {
  it("adds a television launcher without removing the phone launcher or requiring touch", () => {
    const transform=manifestTransform();
    const launcher={action:[{$:{"android:name":"android.intent.action.MAIN"}}],category:[{$:{"android:name":"android.intent.category.LAUNCHER"}}]};
    const mod={modResults:{manifest:{application:[{$:{},activity:[{"intent-filter":[launcher]}]}]}}};
    const result=transform(mod).modResults.manifest;
    expect(launcher.category.map((c)=>c.$["android:name"])).toEqual(["android.intent.category.LAUNCHER","android.intent.category.LEANBACK_LAUNCHER"]);
    expect(result["uses-feature"].find((f:any)=>f.$["android:name"]==="android.hardware.touchscreen").$["android:required"]).toBe("false");
    expect(result.application[0].$["android:banner"]).toBe("@drawable/harmonia_tv_banner");
    transform(mod);
    expect(launcher.category).toHaveLength(2);
    expect(result["uses-feature"]).toHaveLength(3);
  });
});
