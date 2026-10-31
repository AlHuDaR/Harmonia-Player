"""Exercise the local HTTP/foreground service on the already-installed release APK."""
import pathlib
import subprocess

output = pathlib.Path("artifacts/android-smoke")
output.mkdir(parents=True, exist_ok=True)
apk = pathlib.Path("artifacts/local-cast-tests/app-release-androidTest.apk")
subprocess.run(["adb", "install", "-r", "-t", str(apk)], check=True)
subprocess.run(["adb", "shell", "cmd", "connectivity", "airplane-mode", "disable"], check=True)
subprocess.run(["adb", "shell", "svc", "wifi", "enable"], check=True)
result = subprocess.run(
    ["adb", "shell", "am", "instrument", "-w", "-r", "com.alhudar.harmonia.test/com.alhudar.harmonia.cast.LocalCastInstrumentation"],
    capture_output=True, text=True, timeout=120,
)
text = result.stdout + result.stderr
(output / "local-cast-instrumentation.txt").write_text(text)
print(text)
assert result.returncode == 0 and "HARMONIA_LOCAL_CAST_PASS 3 formats" in text, "Local file Cast instrumentation failed"
