import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
const { createApp } = createRequire(resolve("package.json"))(
  "./server/index.js",
);
async function serve(
  resolve: (id: string) => Promise<unknown>,
  run: (url: string) => Promise<void>,
) {
  const server = createApp(resolve).listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((r, reject) =>
      server.close((e: Error | undefined) => (e ? reject(e) : r())),
    );
  }
}
describe("YouTube resolver API", () => {
  it("validates video IDs before invoking the resolver and does not cache signed URLs", async () => {
    let calls = 0;
    await serve(
      async (id) => {
        calls++;
        return { url: `https://media.example/${id}.mp4` };
      },
      async (url) => {
        expect((await fetch(`${url}/resolve/bad-id`)).status).toBe(400);
        expect(calls).toBe(0);
        const response = await fetch(`${url}/resolve/abcdefghijk`);
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect((await response.json()).url).toBe(
          "https://media.example/abcdefghijk.mp4",
        );
        expect((await fetch(`${url}/download/abcdefghijk`)).status).toBe(410);
      },
    );
  });
  it("returns an actionable error without exposing subprocess details", async () => {
    await serve(
      async () => {
        throw Error("secret implementation detail");
      },
      async (url) => {
        const response = await fetch(`${url}/resolve/abcdefghijk`);
        expect(response.status).toBe(502);
        expect(JSON.stringify(await response.json())).not.toContain("secret");
      },
    );
  });
});
