import { expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ discover: vi.fn() }));
vi.mock("react-native", () => ({ NativeModules: { HarmoniaMedia: native }, Platform: { OS: "android" } }));
import { discoverRemote, takeDiscoveredMedia } from "../utils/providerBridge";
import { resolveSource } from "../utils/youtube";

// Opt-in synthetic bridge benchmark, NOT Android decoder or live provider latency.
// The baseline mirrors a525d9c: discovery followed by unconditional rediscovery.
it.skipIf(process.env.HARMONIA_BENCHMARK !== "1")("compares main's two discoveries with one-use playback handoff (30 samples)", async () => {
  const page = "https://vimeo.com/987654";
  const track = { id: "benchmark", title: "Fixture", artist: "Fixture", sourcePage: page, formatId: "mp4", kind: "video" as const };
  native.discover.mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return JSON.stringify({ title: "Fixture", formats: [{ id: "mp4", label: "720p MP4", kind: "video", uri: "https://cdn.example.com/video.mp4", extension: "mp4", downloadable: true }] });
  });
  const data: Record<string, { discovery: number[]; source: number[] }> = {
    before: { discovery: [], source: [] }, after: { discovery: [], source: [] },
  };
  for (let i = 0; i < 30; i++) {
    for (const mode of ["before", "after"] as const) {
      takeDiscoveredMedia(page);
      const start = performance.now();
      await discoverRemote(page);
      data[mode].discovery.push(performance.now() - start);
      if (mode === "before") await discoverRemote(page);
      else await resolveSource(track);
      data[mode].source.push(performance.now() - start);
    }
  }
  const summary = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return { n: sorted.length, medianMs: +((sorted[14] + sorted[15]) / 2).toFixed(2), p95Ms: +sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2) };
  };
  process.stdout.write("SYNTHETIC 20ms bridge; no decoder, no human Play delay " + JSON.stringify(Object.fromEntries(Object.entries(data).map(([mode, samples]) => [mode, { discovery: summary(samples.discovery), sourceResolved: summary(samples.source) }]))) + "\n");
  expect(native.discover).toHaveBeenCalledTimes(90);
  takeDiscoveredMedia(page);
}, 10000);
