#!/usr/bin/env python3
"""Bounded HTTP-only evidence. Never equate a reachable page with app compatibility.
Run: python3 scripts/test-media-compatibility.py > work/http-compatibility.json
Requires curl; ffprobe/ffmpeg enable downloaded sample inspection and software decoding.
Samples are candidates, not promises of availability or platform support.
"""
import concurrent.futures
import datetime
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def probe(sample):
    result = dict(sample, redirect_resolution="Not Tested", media_discovery="Not Tested",
                  playback="Not Tested", audio="Not Tested", download="Not Tested",
                  native_app="Not Tested")
    with tempfile.TemporaryDirectory(prefix="harmonia-http-") as directory:
        target = Path(directory) / "response"
        command = ["curl", "--silent", "--show-error", "--location", "--max-redirs", "5",
                   "--proto", "=https", "--proto-redir", "=https", "--max-time", "25",
                   "--max-filesize", "2097152", "--output", str(target),
                   "--write-out", "%{json}", sample["url"]]
        run = subprocess.run(command, capture_output=True, text=True, timeout=30)
        try:
            info = json.loads(run.stdout)
        except ValueError:
            info = {}
        code = info.get("http_code", 0)
        result.update(http_status=code, redirects=info.get("num_redirects", 0),
                      content_type=info.get("content_type"),
                      redirect_resolution="Passed" if code and not run.returncode else "Blocked")
        if run.returncode or code >= 400:
            result["reason"] = (run.stderr.strip() or f"HTTP {code}")[:300]
            return result
        result["reason"] = "HTTP response only; native extraction and Android playback not exercised."
        if sample.get("file"):
            result["download"] = "Passed"
            if shutil.which("ffprobe"):
                check = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name",
                                        "-of", "json", str(target)], capture_output=True, text=True, timeout=15)
                if not check.returncode:
                    result["streams"] = json.loads(check.stdout).get("streams", [])
                    result["audio"] = "Passed" if any(s["codec_type"] == "audio" for s in result["streams"]) else "Failed"
                    if shutil.which("ffmpeg"):
                        decode = subprocess.run(["ffmpeg", "-v", "error", "-i", str(target), "-t", "3", "-f", "null", "-"],
                                                capture_output=True, timeout=20)
                        result["software_decode"] = "Passed" if not decode.returncode else "Failed"
        if sample["platform"] == "Facebook":
            body = target.read_text(errors="replace")
            result["public_og_video_present"] = "og:video" in body
    return result


if __name__ == "__main__":
    samples = json.loads((ROOT / "tests/fixtures/media-compatibility/samples.json").read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(probe, samples))
    print(json.dumps({"date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      "scope": "HTTP only; not native app compatibility", "results": results}, indent=2))
