const express = require("express");
const cors = require("cors");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execute = promisify(execFile);

// Only fixed YouTube URLs are passed to the resolver; arbitrary client URLs are never fetched.
function createApp(
  resolve = async (id) => {
    const { stdout } = await execute(
      process.env.YT_DLP_PATH || "yt-dlp",
      [
        "--no-playlist",
        "--js-runtimes",
        "node",
        "--no-warnings",
        "--skip-download",
        "--dump-single-json",
        "--socket-timeout",
        "15",
        "-f",
        "best[ext=mp4]/best",
        `https://www.youtube.com/watch?v=${id}`,
      ],
      { timeout: 30000, maxBuffer: 4 * 1024 * 1024 },
    );
    const data = JSON.parse(stdout);
    if (!data.url || new URL(data.url).protocol !== "https:")
      throw new Error("No compatible HTTPS stream available");
    return { url: data.url, title: data.title };
  },
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: process.env.ALLOWED_ORIGIN || false }));
  let active = 0;
  app.get("/", (_req, res) => res.send("Harmonia Player Download Server"));
  app.get("/resolve/:videoId", async (req, res) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(req.params.videoId))
      return res.status(400).json({ error: "Invalid YouTube video ID" });
    if (active >= 2)
      return res.status(429).json({ error: "Resolver busy. Retry shortly." });
    active++;
    try {
      res
        .set("Cache-Control", "no-store")
        .json(await resolve(req.params.videoId));
    } catch {
      res.status(502).json({
        error:
          "YouTube resolution failed. Update yt-dlp or use a direct media URL. Some videos require authentication or are restricted.",
      });
    } finally {
      active--;
    }
  });
  // Preserve a clear response for old clients instead of silently serving the wrong file format.
  app.get("/download/:videoId", (_req, res) =>
    res.status(410).json({
      error:
        "Use /resolve/:videoId, then download the returned media file in the app.",
    }),
  );
  return app;
}
if (require.main === module)
  createApp().listen(process.env.PORT || 3000, () =>
    console.log(`Server running on port ${process.env.PORT || 3000}`),
  );
module.exports = { createApp };
