package com.alhudar.harmonia.cast;

import android.app.*;
import android.content.*;
import android.net.*;
import android.os.*;
import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

/** Framework-only device tests: no test-runner dependency and no receiver/provider/network bypass in the app. */
public final class LocalCastInstrumentation extends Instrumentation {
    private static final String PREFIX = "harmonia:local:0123456789abcdef:";
    private static void check(boolean condition, String label) { if (!condition) throw new AssertionError(label); }
    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
    private void shell(String command) throws Exception {
        try (ParcelFileDescriptor result = getUiAutomation().executeShellCommand(command); InputStream in = new ParcelFileDescriptor.AutoCloseInputStream(result)) { byte[] buffer = new byte[2048]; while (in.read(buffer) != -1) {} }
    }
    private void foreground() throws Exception { shell("input keyevent KEYCODE_WAKEUP"); shell("am start -W -n com.alhudar.harmonia/.MainActivity"); Thread.sleep(500); }
    private InetAddress receiver() throws Exception {
        ConnectivityManager manager = (ConnectivityManager) getTargetContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        for (int attempt = 0; attempt < 30; attempt++) {
        for (Network network : manager.getAllNetworks()) {
            NetworkCapabilities caps = manager.getNetworkCapabilities(network); LinkProperties links = manager.getLinkProperties(network);
            if (caps == null || links == null || !(caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET))) continue;
            for (LinkAddress link : links.getLinkAddresses()) if (link.getAddress() instanceof Inet4Address && !link.getAddress().isLoopbackAddress()) return link.getAddress();
        }
        Thread.sleep(500);
        }
        throw new AssertionError("No emulator LAN interface");
    }
    private File fixture(String name) throws Exception {
        File file = new File(getTargetContext().getFilesDir(), "cast-test-" + name);
        try (InputStream in = getContext().getAssets().open(name); OutputStream out = new FileOutputStream(file)) { byte[] buffer = new byte[8192]; int n; while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n); }
        return file;
    }
    private LocalCastService.Grant prepare(File file, String kind, String nonce, InetAddress receiver) throws Exception {
        CountDownLatch done = new CountDownLatch(1); LocalCastService.Grant[] grant = {null}; String[] failure = {null};
        runOnMainSync(() -> LocalCastService.prepare(getTargetContext(), Uri.fromFile(file).toString(), kind, PREFIX + kind, nonce, "Cast test", receiver, new LocalCastService.Callback() {
            public void ready(LocalCastService.Grant media) { grant[0] = media; done.countDown(); }
            public void failed(String code, String message) { failure[0] = code; done.countDown(); }
        }));
        check(done.await(15, TimeUnit.SECONDS), "Local preparation timeout"); check(grant[0] != null, "Local preparation failed: " + failure[0]); return grant[0];
    }
    private byte[] request(LocalCastService.Grant grant, String method, String extra, int status) throws Exception {
        URL url = new URL(grant.uri);
        try (Socket socket = new Socket(url.getHost(), url.getPort())) {
            socket.setSoTimeout(5000); socket.getOutputStream().write((method + " " + url.getPath() + " HTTP/1.1\r\nHost: " + url.getAuthority() + "\r\n" + extra + "\r\n").getBytes("US-ASCII"));
            ByteArrayOutputStream out = new ByteArrayOutputStream(); byte[] buffer = new byte[8192]; int n; while ((n = socket.getInputStream().read(buffer)) != -1) out.write(buffer, 0, n);
            byte[] raw = out.toByteArray(); String text = new String(raw, "ISO-8859-1"); int split = text.indexOf("\r\n\r\n"); check(split > 0 && text.startsWith("HTTP/1.1 " + status + " "), "HTTP status");
            check(text.substring(0, split).contains("Access-Control-Allow-Private-Network: true"), "Receiver private-network CORS");
            return Arrays.copyOfRange(raw, split + 4, raw.length);
        }
    }
    private void release(String kind) throws Exception {
        runOnMainSync(() -> LocalCastService.release(PREFIX + kind));
        for (int i = 0; i < 30 && LocalCastService.active(PREFIX + kind); i++) Thread.sleep(100);
        check(!LocalCastService.active(PREFIX + kind), "Local source was not released"); Thread.sleep(300);
    }
    @Override public void onStart() {
        Bundle results = new Bundle(); List<File> files = new ArrayList<>();
        int outcome = Activity.RESULT_CANCELED;
        try {
            InetAddress receiver = receiver(); foreground(); int count = 0;
            for (String name : Arrays.asList("tone.mp3", "tone.m4a", "video.mp4")) {
                File file = fixture(name); files.add(file); String kind = name.equals("video.mp4") ? "video" : "audio";
                LocalCastService.Grant grant = prepare(file, kind, "test-" + name, receiver);
                check(grant.contentType.equals(name.equals("tone.mp3") ? "audio/mpeg" : name.equals("tone.m4a") ? "audio/mp4" : "video/mp4"), "Detected media type");
                check(!grant.uri.contains("127.0.0.1") && !grant.uri.contains("file:"), "Receiver-reachable source address");
                check(LocalCastService.claim(grant.token, grant.uri, grant.contentType, grant.contentId), "Native local grant");
                check(!LocalCastService.claim(grant.token, grant.uri, grant.contentType, grant.contentId), "Native grant replay");
                check(request(grant, "HEAD", "", 200).length == 0, "HEAD response body");
                byte[] start = request(grant, "GET", "Range: bytes=0-31\r\n", 206); byte[] expected = new byte[32];
                try (RandomAccessFile source = new RandomAccessFile(file, "r")) { source.readFully(expected); }
                check(Arrays.equals(start, expected), "Exact range bytes");
                check(request(grant, "GET", "Range: bytes=-32\r\n", 206).length == 32, "Suffix seek");
                request(grant, "OPTIONS", "Origin: https://www.gstatic.com\r\nAccess-Control-Request-Private-Network: true\r\n", 204);
                shell("input keyevent KEYCODE_HOME"); shell("input keyevent KEYCODE_SLEEP"); Thread.sleep(1500);
                check(!((PowerManager) getTargetContext().getSystemService(Context.POWER_SERVICE)).isInteractive(), "Screen did not sleep");
                check(request(grant, "GET", "Range: bytes=64-95\r\n", 206).length == 32, "Background/screen-off serving");
                boolean foreground = false;
                for (ActivityManager.RunningServiceInfo running : ((ActivityManager) getTargetContext().getSystemService(Context.ACTIVITY_SERVICE)).getRunningServices(100))
                    if (running.service.getClassName().equals(LocalCastService.class.getName())) foreground |= running.foreground;
                check(foreground, "Hosting service is not foreground");
                release(kind); try { request(grant, "GET", "", 200); throw new AssertionError("Revoked URL remained readable"); } catch (IOException expectedClosed) {}
                foreground(); count++;
            }
            results.putString("stream", "HARMONIA_LOCAL_CAST_PASS " + count + " formats; native grants, seek, CORS, foreground/screen-off and cleanup"); outcome = Activity.RESULT_OK;
        } catch (Throwable error) { results.putString("stream", "HARMONIA_LOCAL_CAST_FAIL " + (error instanceof AssertionError ? error.getMessage() : error.getClass().getSimpleName())); }
        finally { try { release("audio"); release("video"); } catch (Exception ignored) {} for (File file : files) file.delete(); }
        finish(outcome, results);
    }
}
