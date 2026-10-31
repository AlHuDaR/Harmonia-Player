package com.alhudar.harmonia.cast;
import org.junit.*;
import static org.junit.Assert.*;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;

public class LocalMediaServerTest {
    private File file; private byte[] bytes; private LocalMediaServer server;
    @Before public void setup() throws Exception {
        file = File.createTempFile("harmonia-cast", ".mp3"); bytes = new byte[200000]; new Random(42).nextBytes(bytes); Files.write(file.toPath(), bytes);
        server = new LocalMediaServer(file, "audio/mpeg", "mp3", InetAddress.getByName("127.0.0.1"), InetAddress.getByName("127.0.0.1"), () -> {});
    }
    @After public void close() { if (server != null) server.close(); if (file != null) file.delete(); }
    static final class Reply { int status; Map<String, String> headers = new HashMap<>(); byte[] body; }
    Reply request(String method, String path, String fields) throws Exception {
        URL url = new URL(server.url());
        try (Socket socket = new Socket(url.getHost(), url.getPort())) {
            socket.setSoTimeout(5000);
            socket.getOutputStream().write((method + " " + path + " HTTP/1.1\r\nHost: " + url.getAuthority() + "\r\n" + fields + "\r\n").getBytes("US-ASCII"));
            ByteArrayOutputStream out = new ByteArrayOutputStream(); byte[] buffer = new byte[8192]; int n;
            while ((n = socket.getInputStream().read(buffer)) != -1) out.write(buffer, 0, n);
            byte[] raw = out.toByteArray(); String text = new String(raw, "ISO-8859-1"); int split = text.indexOf("\r\n\r\n");
            assertTrue(split > 0); String[] lines = text.substring(0, split).split("\r\n"); Reply reply = new Reply(); reply.status = Integer.parseInt(lines[0].split(" ")[1]);
            for (int i = 1; i < lines.length; i++) { int colon = lines[i].indexOf(':'); reply.headers.put(lines[i].substring(0, colon).toLowerCase(Locale.ROOT), lines[i].substring(colon + 1).trim()); }
            reply.body = Arrays.copyOfRange(raw, split + 4, raw.length); return reply;
        }
    }
    String path() throws Exception { return new URL(server.url()).getPath(); }
    @Test public void fullGetAndHeadDescribeTheSameSelectedFile() throws Exception {
        Reply get = request("GET", path(), ""); assertEquals(200, get.status); assertArrayEquals(bytes, get.body);
        Reply head = request("HEAD", path(), ""); assertEquals(200, head.status); assertEquals("200000", head.headers.get("content-length")); assertEquals(0, head.body.length);
        assertEquals("audio/mpeg", head.headers.get("content-type")); assertEquals("bytes", head.headers.get("accept-ranges"));
    }
    @Test public void seekRangesAreByteExactIncludingOpenEndedAndSuffixRanges() throws Exception {
        for (String range : Arrays.asList("bytes=0-31", "bytes=13000-14999", "bytes=199950-", "bytes=-48", "bytes=199995-999999")) {
            Reply reply = request("GET", path(), "Range: " + range + "\r\n"); long[] expected = LocalMediaPolicy.range(range, bytes.length);
            assertEquals(206, reply.status); assertArrayEquals(Arrays.copyOfRange(bytes, (int) expected[0], (int) expected[1] + 1), reply.body);
            assertEquals("bytes " + expected[0] + "-" + expected[1] + "/200000", reply.headers.get("content-range"));
        }
    }
    @Test public void invalidAndMultiRangesHaveNoFileBody() throws Exception {
        for (String range : Arrays.asList("bytes=999999-", "bytes=100-0", "bytes=-0", "bytes=0-1,3-4", "bytes=-", "bytes=9223372036854775808-")) {
            Reply reply = request("GET", path(), "Range: " + range + "\r\n"); assertEquals(416, reply.status); assertEquals("bytes */200000", reply.headers.get("content-range")); assertEquals(0, reply.body.length);
        }
    }
    @Test public void corsPrivateNetworkPreflightAndTokenProtection() throws Exception {
        Reply options = request("OPTIONS", path(), "Origin: https://www.gstatic.com\r\nAccess-Control-Request-Private-Network: true\r\n");
        assertEquals(204, options.status); assertEquals("*", options.headers.get("access-control-allow-origin")); assertEquals("true", options.headers.get("access-control-allow-private-network"));
        for (String target : Arrays.asList("/", path().replace("/cast/", "/cast/wrong"), path() + "?token=other", "/../../private.db")) {
            Reply reply = request("GET", target, ""); assertEquals(404, reply.status); assertEquals(0, reply.body.length);
        }
    }
    @Test public void rejectsWritesAndStopsServingWhenTheFileChanges() throws Exception {
        assertEquals(405, request("POST", path(), "").status);
        Files.write(file.toPath(), new byte[]{1}); Reply gone = request("GET", path(), ""); assertEquals(410, gone.status); assertEquals(0, gone.body.length);
    }
    @Test public void closeRevokesTheEndpointAndReleasesThePort() throws Exception {
        URL url = new URL(server.url()); server.close(); assertFalse(server.isOpen());
        // TCP teardown may briefly complete a queued handshake; the revoked URL must never serve media.
        try (Socket socket = new Socket(url.getHost(), url.getPort())) {
            socket.setSoTimeout(1000); socket.getOutputStream().write(("GET " + url.getPath() + " HTTP/1.1\r\nHost: " + url.getAuthority() + "\r\n\r\n").getBytes("US-ASCII"));
            byte[] response = new byte[1024]; int read = socket.getInputStream().read(response);
            assertTrue(read < 0 || !new String(response, 0, read, "US-ASCII").startsWith("HTTP/1.1 200"));
        } catch (IOException expected) {}
    }
    @Test public void privateRootsRejectTraversalAndSiblingPrefixPaths() throws Exception {
        File root = new File(file.getParent(), "owned");
        assertTrue(LocalMediaPolicy.privateFile(new File(root, "downloads/a.mp3"), Arrays.asList(root)));
        assertFalse(LocalMediaPolicy.privateFile(new File(root, "../private.mp3"), Arrays.asList(root)));
        assertFalse(LocalMediaPolicy.privateFile(new File(root.getPath() + "-other", "a.mp3"), Arrays.asList(root)));
        assertFalse(LocalMediaPolicy.mime("application/dash+xml"));
    }
}
