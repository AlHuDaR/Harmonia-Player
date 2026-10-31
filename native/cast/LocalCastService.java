// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.cast;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.net.*;
import android.net.wifi.WifiManager;
import android.os.*;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.google.android.gms.cast.MediaInfo;
import com.google.android.gms.cast.framework.*;
import com.google.android.gms.cast.framework.media.RemoteMediaClient;
import java.net.InetAddress;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Foreground, session-scoped LAN hosting of exactly one app-owned media file. */
public final class LocalCastService extends Service {
    private static final String CHANNEL = "harmonia-local-cast", PREPARE = "prepare", RESERVE = "reserve", STOP = "stop";
    private static final int NOTIFICATION = 0x48434c;
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final Map<String, Request> REQUESTS = new ConcurrentHashMap<>();
    private static volatile LocalCastService instance;
    private static volatile boolean reserved;
    private static String caption = "Casting downloaded media", stopLabel = "Stop casting";
    interface Callback { void ready(Grant media); void failed(String code, String message); }
    static final class Grant {
        final String uri, contentType, contentId, token;
        Grant(String uri, String type, String id, String token) { this.uri = uri; contentType = type; contentId = id; this.token = token; }
    }
    private static final class Request {
        final String uri, kind, id, nonce, title, token = UUID.randomUUID().toString();
        final InetAddress receiver; final Callback callback; final AtomicBoolean finished = new AtomicBoolean();
        volatile boolean cancelled, claimed; volatile Grant grant; volatile Future<?> future;
        Request(String uri, String kind, String id, String nonce, String title, InetAddress receiver, Callback callback) {
            this.uri = uri; this.kind = kind; this.id = id; this.nonce = nonce; this.title = title; this.receiver = receiver; this.callback = callback;
        }
        void fail(String code, String message) { if (finished.compareAndSet(false, true)) callback.failed(code, message); }
    }
    static void labels(String text, String stop) {
        if (caption.equals(text) && stopLabel.equals(stop)) return;
        caption = text; stopLabel = stop;
        if (instance != null && instance.current != null) instance.notification(instance.current.title);
    }
    static void reserve(Context context) {
        reserved = true;
        try { ContextCompat.startForegroundService(context, new Intent(context, LocalCastService.class).setAction(RESERVE)); }
        catch (RuntimeException error) { reserved = false; throw error; }
    }
    static void cancelReservation() {
        reserved = false; MAIN.post(() -> { LocalCastService service = instance; if (service != null && service.current == null) service.finish(); });
    }
    static void prepare(Context context, String uri, String kind, String id, String nonce, String title, InetAddress receiver, Callback callback) {
        if (id == null || !id.matches("harmonia:local:[a-f0-9]{16}:(audio|video)") || nonce == null || nonce.length() > 80) { callback.failed("CAST_LOCAL", LocalCastMedia.UNAVAILABLE); return; }
        Request request = new Request(uri, kind, id, nonce, title, receiver, callback);
        for (Request previous : REQUESTS.values()) if (!previous.claimed) cancel(previous.nonce);
        REQUESTS.put(nonce, request);
        try { ContextCompat.startForegroundService(context, new Intent(context, LocalCastService.class).setAction(PREPARE).putExtra("nonce", nonce)); }
        catch (RuntimeException error) { REQUESTS.remove(nonce); request.fail("CAST_LOCAL_BACKGROUND", "Open Harmonia to start casting this download, then retry."); }
    }
    static void cancel(String nonce) {
        Request request = REQUESTS.get(nonce);
        if (request == null || request.claimed) return;
        request.cancelled = true; request.fail("CAST_CANCELLED", "Cast preparation cancelled. Local playback is available."); REQUESTS.remove(nonce, request);
        if (request.future != null) request.future.cancel(true);
        MAIN.post(() -> { LocalCastService service = instance; if (service != null && service.current == request) service.finish(); });
    }
    static boolean active(String id) {
        LocalCastService service = instance;
        return service != null && service.current != null && service.current.id.equals(id) && service.host != null && service.host.isOpen();
    }
    static boolean claim(String token, String uri, String type, String id) {
        LocalCastService service = instance; Request request = service == null ? null : service.current;
        if (request == null || request.cancelled || request.claimed || request.grant == null || !active(id)) return false;
        Grant grant = request.grant;
        if (!grant.token.equals(token) || !grant.uri.equals(uri) || !grant.contentType.equals(type) || !grant.contentId.equals(id)) return false;
        request.claimed = true; return true;
    }
    static void release(String id) {
        Runnable release = () -> { LocalCastService service = instance; if (service != null && service.current != null && service.current.id.equals(id)) service.finish(); };
        if (Looper.myLooper() == Looper.getMainLooper()) release.run(); else MAIN.post(release);
    }
    private final ThreadPoolExecutor worker = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(1));
    private volatile Request current;
    private volatile LocalMediaServer host;
    private PowerManager.WakeLock wake;
    private WifiManager.WifiLock wifi;
    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback networkCallback;
    private CastContext cast;
    private RemoteMediaClient client;
    private boolean seenMedia;
    private int startId;
    private void later(Runnable task, long delay) { MAIN.postAtTime(task, this, SystemClock.uptimeMillis() + delay); }
    private final RemoteMediaClient.Callback media = new RemoteMediaClient.Callback() {
        @Override public void onStatusUpdated() {
            Request request = current; MediaInfo info = client == null ? null : client.getMediaInfo();
            if (request == null || info == null) return;
            if (request.id.equals(info.getContentId())) seenMedia = true;
            else if (seenMedia && client.hasMediaSession()) finish();
        }
    };
    private final SessionManagerListener<CastSession> sessions = new SessionManagerListener<CastSession>() {
        @Override public void onSessionEnded(CastSession session, int error) { finish(); }
        @Override public void onSessionStartFailed(CastSession session, int error) { finish(); }
        @Override public void onSessionResumeFailed(CastSession session, int error) { finish(); }
        @Override public void onSessionStarted(CastSession session, String id) { watch(session); }
        @Override public void onSessionResumed(CastSession session, boolean suspended) { watch(session); }
        @Override public void onSessionStarting(CastSession session) {}
        @Override public void onSessionEnding(CastSession session) {}
        @Override public void onSessionResuming(CastSession session, String id) {}
        @Override public void onSessionSuspended(CastSession session, int reason) { /* Continue serving through a transient control interruption. */ }
    };
    private void watch(CastSession session) {
        if (client != null) client.unregisterCallback(media);
        client = session == null ? null : session.getRemoteMediaClient(); if (client != null) client.registerCallback(media);
    }
    @Override public void onCreate() {
        super.onCreate(); instance = this;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Harmonia Cast", NotificationManager.IMPORTANCE_LOW));
        notification("Harmonia");
        try { cast = CastContext.getSharedInstance(); if (cast != null) { cast.getSessionManager().addSessionManagerListener(sessions, CastSession.class); watch(cast.getSessionManager().getCurrentCastSession()); } }
        catch (RuntimeException unavailable) { cast = null; /* Native bridge gates real requests on a connected SDK session. */ }
    }
    private void notification(String title) {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent open = launch == null ? null : PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, LocalCastService.class).setAction(STOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new NotificationCompat.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle(title == null || title.isEmpty() ? "Harmonia" : title).setContentText(caption).setContentIntent(open)
                .setOnlyAlertOnce(true).setOngoing(true).setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, stopLabel, stop).build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIFICATION, notification);
    }
    @Override public int onStartCommand(Intent intent, int flags, int id) {
        startId = id;
        if (intent == null || STOP.equals(intent.getAction())) { endCast(); finish(); return START_NOT_STICKY; }
        notification(current == null ? "Harmonia" : current.title);
        if (RESERVE.equals(intent.getAction())) {
            later(() -> { if (instance == this && current == null) finish(); }, 120000);
            if (!reserved && current == null) finish(); return START_NOT_STICKY;
        }
        Request request = REQUESTS.get(intent.getStringExtra("nonce"));
        if (request == null || request.cancelled) { if (current == null) finish(); return START_NOT_STICKY; }
        if (current != null && current != request && current.cancelled && !current.claimed) clearCurrent();
        if (current != null && current != request) { request.fail("CAST_LOCAL_BUSY", "Stop the current Cast before sharing another download."); REQUESTS.remove(request.nonce, request); return START_NOT_STICKY; }
        if (current == request && request.future != null) return START_NOT_STICKY;
        current = request; seenMedia = false; reserved = false; notification(request.title);
        try { acquire(false); worker.purge(); request.future = worker.submit(() -> {
            LocalMediaServer server = null;
            try {
                LocalCastMedia media = LocalCastMedia.inspect(this, request.uri, request.kind);
                LocalCastNetwork network = LocalCastNetwork.select(this, request.receiver);
                if (request.cancelled || Thread.currentThread().isInterrupted()) return;
                server = new LocalMediaServer(media.file, media.type, media.extension, network.address, request.receiver,
                        () -> MAIN.post(() -> { if (current == request) { endCast(); finish(); } }));
                LocalMediaServer ready = server;
                MAIN.post(() -> {
                    if (request.cancelled || current != request || instance != this) { ready.close(); return; }
                    try {
                        host = ready; acquire(network.wifi); monitor(network);
                        Grant grant = new Grant(ready.url(), media.type, request.id, request.token); request.grant = grant;
                        if (request.finished.compareAndSet(false, true)) request.callback.ready(grant);
                        later(() -> { if (instance == this && current == request && !request.claimed) finish(); }, 120000);
                    } catch (RuntimeException error) { ready.close(); request.fail("CAST_LOCAL", LocalCastNetwork.UNAVAILABLE); finish(); }
                });
            } catch (Exception error) {
                if (server != null) server.close(); String reason = error instanceof java.io.IOException && LocalCastNetwork.UNAVAILABLE.equals(error.getMessage()) ? LocalCastNetwork.UNAVAILABLE : LocalCastMedia.UNAVAILABLE;
                MAIN.post(() -> { request.fail("CAST_LOCAL", reason); if (current == request) finish(); });
            }
        }); } catch (RuntimeException busy) { request.fail("CAST_LOCAL_BUSY", "Stop the current Cast before sharing another download."); finish(); }
        return START_NOT_STICKY;
    }
    private void acquire(boolean useWifi) {
        if (wake == null) { PowerManager power = (PowerManager) getSystemService(POWER_SERVICE); wake = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Harmonia:localCast"); wake.setReferenceCounted(false); renewWake(wake); }
        if (useWifi && wifi == null) { WifiManager manager = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE); wifi = manager.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "Harmonia:localCast"); wifi.setReferenceCounted(false); wifi.acquire(); }
    }
    private void renewWake(PowerManager.WakeLock held) {
        if (instance != this || current == null || wake != held) return;
        // Refresh only while this foreground source exists; a missed cleanup cannot hold the CPU indefinitely.
        held.acquire(10 * 60 * 1000L);
        later(() -> renewWake(held), 4 * 60 * 1000L);
    }
    private void monitor(LocalCastNetwork network) {
        connectivity = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        Request monitored = current;
        Runnable lost = () -> { if (current == monitored && instance == this) { endCast(); finish(); } };
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override public void onLost(Network missing) { if (network.network.equals(missing)) MAIN.post(lost); }
            @Override public void onLinkPropertiesChanged(Network changed, LinkProperties properties) {
                if (!network.network.equals(changed)) return;
                for (LinkAddress address : properties.getLinkAddresses()) if (Arrays.equals(address.getAddress().getAddress(), network.address.getAddress())) return;
                MAIN.post(lost);
            }
        };
        connectivity.registerNetworkCallback(new NetworkRequest.Builder().addTransportType(network.wifi ? NetworkCapabilities.TRANSPORT_WIFI : NetworkCapabilities.TRANSPORT_ETHERNET).build(), networkCallback);
        LinkProperties initial = connectivity.getLinkProperties(network.network); boolean present = false;
        if (initial != null) for (LinkAddress address : initial.getLinkAddresses()) present |= Arrays.equals(address.getAddress().getAddress(), network.address.getAddress());
        if (!present) throw new IllegalStateException("Local network was lost.");
    }
    private void endCast() { try { if (cast != null) cast.getSessionManager().endCurrentSession(true); } catch (RuntimeException ignored) {} }
    private void clearCurrent() {
        Request request = current; current = null;
        if (request != null) { request.cancelled = true; if (request.future != null) request.future.cancel(true); REQUESTS.remove(request.nonce, request); request.fail("CAST_CANCELLED", "Cast preparation cancelled. Local playback is available."); }
        seenMedia = false;
        if (host != null) { host.close(); host = null; }
        if (connectivity != null && networkCallback != null) { try { connectivity.unregisterNetworkCallback(networkCallback); } catch (RuntimeException ignored) {} networkCallback = null; }
        if (wifi != null && wifi.isHeld()) wifi.release(); wifi = null;
        if (wake != null && wake.isHeld()) wake.release(); wake = null;
    }
    private void finish() {
        clearCurrent();
        stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(startId);
    }
    @Override public void onDestroy() {
        MAIN.removeCallbacksAndMessages(this);
        finish(); worker.shutdownNow(); if (client != null) client.unregisterCallback(media);
        if (cast != null) cast.getSessionManager().removeSessionManagerListener(sessions, CastSession.class);
        if (instance == this) instance = null; super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}
