// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.cast;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** One selected file, one receiver, an unguessable path, and bounded HTTP resources. */
public final class LocalMediaServer implements Closeable {
    private final File file;
    private final long length, modified;
    private final String type, path;
    private final InetAddress receiver;
    private final ServerSocket listener;
    private final AtomicBoolean closed = new AtomicBoolean();
    private final Set<Client> clients = ConcurrentHashMap.newKeySet();
    private final ThreadPoolExecutor workers = new ThreadPoolExecutor(4, 4, 30, TimeUnit.SECONDS, new ArrayBlockingQueue<>(4), task -> daemon(task, "Harmonia local Cast HTTP"));
    private final ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor(task -> daemon(task, "Harmonia local Cast timeout"));
    private final Runnable unavailable;
    private static Thread daemon(Runnable task, String name) { Thread thread = new Thread(task, name); thread.setDaemon(true); return thread; }
    private static final class Client {
        final Socket socket; volatile long progress = System.nanoTime();
        Client(Socket socket) { this.socket = socket; }
        void close() { try { socket.close(); } catch (IOException ignored) {} }
    }
    public LocalMediaServer(File file, String type, String extension, InetAddress bind, InetAddress receiver, Runnable unavailable) throws IOException {
        if (!file.isFile() || file.length() <= 0 || !LocalMediaPolicy.mime(type) || !extension.matches("mp4|m4a|mp3|aac|webm|wav|ogg|flac")) throw new IOException("Invalid local Cast media.");
        this.file = file; length = file.length(); modified = file.lastModified(); this.type = type; this.receiver = receiver; this.unavailable = unavailable;
        path = "/cast/" + UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "") + "/media." + extension;
        listener = new ServerSocket();
        try { listener.setReuseAddress(false); listener.bind(new InetSocketAddress(bind, 0), 8); }
        catch (IOException error) { listener.close(); workers.shutdownNow(); timer.shutdownNow(); throw error; }
        daemon(this::accept, "Harmonia local Cast listener").start();
        timer.scheduleWithFixedDelay(() -> {
            long now = System.nanoTime();
            for (Client client : clients) if (now - client.progress > TimeUnit.SECONDS.toNanos(30)) client.close();
        }, 5, 5, TimeUnit.SECONDS);
    }
    public String url() {
        String host = listener.getInetAddress().getHostAddress();
        return "http://" + (host.contains(":") ? "[" + host + "]" : host) + ":" + listener.getLocalPort() + path;
    }
    public boolean isOpen() { return !closed.get(); }
    private void accept() {
        while (!closed.get()) try {
            Socket socket = listener.accept(); socket.setSoTimeout(10000); socket.setSendBufferSize(65536);
            if (!receiver.equals(socket.getInetAddress())) { socket.close(); continue; }
            Client client = new Client(socket); clients.add(client);
            try { workers.execute(() -> serve(client)); }
            catch (RejectedExecutionException full) { clients.remove(client); client.close(); }
        } catch (IOException error) { if (!closed.get()) { close(); unavailable.run(); } }
    }
    private static String line(InputStream input, int[] budget) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(); int previous = -1;
        while (true) {
            int next = input.read();
            if (next == -1 || --budget[0] < 0) throw new IOException("Incomplete or oversized HTTP headers.");
            if (previous == '\r' && next == '\n') {
                byte[] data = bytes.toByteArray(); return new String(data, 0, data.length - 1, StandardCharsets.US_ASCII);
            }
            if ((next < 32 && next != '\r' && next != '\t') || next > 126) throw new IOException("Invalid HTTP header.");
            bytes.write(next); previous = next;
        }
    }
    private boolean host(String value) {
        try {
            URI uri = new URI("http://" + value);
            String host = uri.getHost();
            return host != null && host.matches("[0-9a-fA-F:.\\[\\]]+") && uri.getPort() == listener.getLocalPort()
                    && uri.getRawUserInfo() == null && (uri.getPath() == null || uri.getPath().isEmpty())
                    && uri.getQuery() == null && uri.getFragment() == null && InetAddress.getByName(host).equals(listener.getInetAddress());
        } catch (Exception error) { return false; }
    }
    private void headers(OutputStream out, int status, String reason, long count, String extra) throws IOException {
        String data = "HTTP/1.1 " + status + " " + reason + "\r\nContent-Type: " + type + "\r\nContent-Length: " + count
                + "\r\nAccept-Ranges: bytes\r\nCache-Control: no-store\r\nConnection: close\r\nAccess-Control-Allow-Origin: *"
                + "\r\nAccess-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nAccess-Control-Allow-Headers: Range, If-Range, Content-Type"
                + "\r\nAccess-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, Content-Type"
                + "\r\nAccess-Control-Allow-Private-Network: true\r\n" + extra + "\r\n";
        out.write(data.getBytes(StandardCharsets.US_ASCII)); out.flush();
    }
    private void serve(Client client) {
        try (Socket socket = client.socket) {
            InputStream in = socket.getInputStream(); OutputStream out = socket.getOutputStream(); int[] budget = {16384};
            String[] request = line(in, budget).split(" ");
            if (request.length != 3 || !(request[2].equals("HTTP/1.1") || request[2].equals("HTTP/1.0"))) { headers(out, 400, "Bad Request", 0, ""); return; }
            Map<String, String> fields = new HashMap<>(); String field;
            while (!(field = line(in, budget)).isEmpty()) {
                int colon = field.indexOf(':');
                if (colon <= 0) { headers(out, 400, "Bad Request", 0, ""); return; }
                String key = field.substring(0, colon).toLowerCase(Locale.ROOT);
                if (fields.put(key, field.substring(colon + 1).trim()) != null) { headers(out, 400, "Bad Request", 0, ""); return; }
            }
            if (!host(fields.get("host")) || !MessageDigest.isEqual(request[1].getBytes(StandardCharsets.US_ASCII), path.getBytes(StandardCharsets.US_ASCII))) { headers(out, 404, "Not Found", 0, ""); return; }
            String method = request[0];
            if (method.equals("OPTIONS")) { headers(out, 204, "No Content", 0, ""); return; }
            if (!(method.equals("GET") || method.equals("HEAD"))) { headers(out, 405, "Method Not Allowed", 0, "Allow: GET, HEAD, OPTIONS\r\n"); return; }
            if (!file.isFile() || file.length() != length || file.lastModified() != modified) { headers(out, 410, "Gone", 0, ""); unavailable.run(); return; }
            long[] range;
            try { range = LocalMediaPolicy.range(method.equals("GET") ? fields.get("range") : null, length); }
            catch (IllegalArgumentException invalid) { headers(out, 416, "Range Not Satisfiable", 0, "Content-Range: bytes */" + length + "\r\n"); return; }
            long start = range[0], end = range[1], count = end - start + 1; boolean partial = method.equals("GET") && fields.containsKey("range");
            // If-Range is deliberately not advertised: send the complete current representation.
            if (fields.containsKey("if-range")) { start = 0; count = length; end = length - 1; partial = false; }
            headers(out, partial ? 206 : 200, partial ? "Partial Content" : "OK", count,
                    partial ? "Content-Range: bytes " + start + "-" + end + "/" + length + "\r\n" : "");
            if (method.equals("HEAD")) return;
            try (RandomAccessFile media = new RandomAccessFile(file, "r")) {
                media.seek(start); byte[] buffer = new byte[65536];
                while (count > 0 && !closed.get()) {
                    int read = media.read(buffer, 0, (int) Math.min(count, buffer.length));
                    if (read < 0) throw new EOFException(); out.write(buffer, 0, read); count -= read; client.progress = System.nanoTime();
                }
                out.flush();
            }
        } catch (IOException ignored) { /* Disconnected/slow clients may retry with a byte range. */ }
        finally { clients.remove(client); client.close(); }
    }
    @Override public void close() {
        if (!closed.compareAndSet(false, true)) return;
        try { listener.close(); } catch (IOException ignored) {}
        for (Client client : clients) client.close(); clients.clear(); workers.shutdownNow(); timer.shutdownNow();
    }
}
