// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.cast;

import android.app.Activity;
import android.app.Application;
import android.app.UiModeManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;
import androidx.mediarouter.app.MediaRouteButton;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.android.gms.cast.*;
import com.google.android.gms.cast.framework.*;
import com.google.android.gms.cast.framework.media.RemoteMediaClient;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.PendingResult;

/** All Cast SDK access, including callbacks and disposal, stays on Android's main thread. */
public final class HarmoniaCastModule extends ReactContextBaseJavaModule implements Application.ActivityLifecycleCallbacks {
    private final ReactApplicationContext context;
    private CastContext cast;
    private RemoteMediaClient observed;
    private boolean initialized;
    private String connection = "disconnected";
    private String unavailable = "Google Cast needs Google Play services on an Android phone.";
    private String mediaReason = "This source cannot be sent to a Cast receiver. Local playback is available.";
    private String label = "Cast";
    private boolean eligible;
    private String ownedContentId = "";
    private String loadingContentId = "";
    private int revision;
    private volatile int listeners;
    private final RemoteMediaClient.Callback mediaCallback = new RemoteMediaClient.Callback() {
        @Override public void onStatusUpdated() { emit(); }
        @Override public void onMetadataUpdated() { emit(); }
    };
    private final RemoteMediaClient.ProgressListener progress = (position, duration) -> emit();
    private final SessionManagerListener<CastSession> sessions = new SessionManagerListener<CastSession>() {
        @Override public void onSessionStarting(CastSession s) { connection = "connecting"; emit(); }
        @Override public void onSessionStarted(CastSession s, String id) { connected(); }
        @Override public void onSessionStartFailed(CastSession s, int code) { disconnected(code); }
        @Override public void onSessionEnding(CastSession s) { connection = "disconnecting"; emit(); }
        @Override public void onSessionEnded(CastSession s, int code) { disconnected(code); }
        @Override public void onSessionResuming(CastSession s, String id) { connection = "connecting"; emit(); }
        @Override public void onSessionResumed(CastSession s, boolean suspended) { connected(); }
        @Override public void onSessionResumeFailed(CastSession s, int code) { disconnected(code); }
        @Override public void onSessionSuspended(CastSession s, int reason) { connection = "suspended"; emit(); }
    };
    public HarmoniaCastModule(ReactApplicationContext context) { super(context); this.context = context; }
    @Override public String getName() { return "HarmoniaCast"; }
    @ReactMethod public void addListener(String name) { listeners++; }
    @ReactMethod public void removeListeners(double count) { listeners = Math.max(0, listeners - (int) count); }
    private void initialize() {
        if (initialized) return;
        initialized = true;
        UiModeManager mode = (UiModeManager) context.getSystemService(Context.UI_MODE_SERVICE);
        if (mode != null && mode.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION) return;
        try {
            if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) != ConnectionResult.SUCCESS) return;
            cast = CastContext.getSharedInstance(context);
            cast.getSessionManager().addSessionManagerListener(sessions, CastSession.class);
            ((Application) context.getApplicationContext()).registerActivityLifecycleCallbacks(this);
            CastSession session = session();
            if (session != null && session.isConnected()) connected();
        } catch (RuntimeException error) { cast = null; }
    }
    private CastSession session() { return cast == null ? null : cast.getSessionManager().getCurrentCastSession(); }
    private RemoteMediaClient client() { CastSession session = session(); return session == null ? null : session.getRemoteMediaClient(); }
    private void watch(RemoteMediaClient next) {
        if (observed == next) return;
        if (observed != null) { observed.unregisterCallback(mediaCallback); observed.removeProgressListener(progress); }
        observed = next;
        if (next != null) { next.registerCallback(mediaCallback); next.addProgressListener(progress, 1000); }
    }
    private void connected() { connection = "connected"; watch(client()); emit(); }
    private void disconnected(int code) {
        connection = "disconnected"; watch(null); ownedContentId = ""; emit();
        if (code != 0) error("Cast connection failed. Check the receiver and Wi-Fi, then retry.");
    }
    private WritableMap snapshot() {
        WritableMap state = Arguments.createMap();
        state.putInt("revision", ++revision);
        state.putBoolean("available", cast != null);
        state.putString("connection", connection);
        CastSession session = session();
        state.putString("deviceName", session != null && session.getCastDevice() != null ? session.getCastDevice().getFriendlyName() : "");
        RemoteMediaClient client = client();
        state.putString("contentId", client != null && client.getMediaInfo() != null ? client.getMediaInfo().getContentId() : "");
        state.putString("ownedContentId", ownedContentId);
        state.putBoolean("hasMedia", client != null && client.hasMediaSession() && client.getPlayerState() != MediaStatus.PLAYER_STATE_IDLE);
        state.putDouble("position", client == null ? 0 : Math.max(0, client.getApproximateStreamPosition() / 1000.0));
        state.putDouble("duration", client == null ? 0 : Math.max(0, client.getStreamDuration() / 1000.0));
        state.putBoolean("playing", client != null && client.isPlaying());
        state.putBoolean("buffering", client != null && client.isBuffering());
        MediaStatus status = client == null ? null : client.getMediaStatus();
        state.putBoolean("canSeek", status != null && status.isMediaCommandSupported(MediaStatus.COMMAND_SEEK));
        state.putBoolean("canPause", status != null && status.isMediaCommandSupported(MediaStatus.COMMAND_PAUSE));
        state.putBoolean("canVolume", status != null && status.isMediaCommandSupported(MediaStatus.COMMAND_SET_VOLUME));
        state.putDouble("volume", status == null ? 1 : status.getStreamVolume());
        state.putInt("idleReason", client == null ? 0 : client.getIdleReason());
        return state;
    }
    private void event(String name, Object payload) {
        if (listeners > 0 && context.hasActiveReactInstance()) context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(name, payload);
    }
    private void emit() { event("HarmoniaCastState", snapshot()); }
    private void error(String message) { event("HarmoniaCastError", message); }
    @ReactMethod public void getState(Promise promise) {
        UiThreadUtil.runOnUiThread(() -> { initialize(); promise.resolve(snapshot()); });
    }
    @ReactMethod public void configure(boolean canCast, String reason, String castLabel, String unavailableLabel) {
        UiThreadUtil.runOnUiThread(() -> { eligible = canCast; mediaReason = reason; label = castLabel; unavailable = unavailableLabel; });
    }
    @ReactMethod public void showPicker(boolean requestPlayback, Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            initialize();
            if (cast == null) { promise.reject("CAST_UNAVAILABLE", unavailable); return; }
            Activity activity = getCurrentActivity();
            if (activity == null) { promise.reject("CAST_ACTIVITY", unavailable); return; }
            try { openPicker(activity, requestPlayback); promise.resolve(null); }
            catch (RuntimeException error) { promise.reject("CAST_PICKER", unavailable); }
        });
    }
    private void openPicker(Activity activity, boolean requestPlayback) {
        if (requestPlayback) event("HarmoniaCastPicker", null);
        Intent intent = new Intent(activity, CastPickerActivity.class);
        intent.putExtra("label", label); intent.putExtra("unavailable", unavailable);
        activity.startActivity(intent);
    }
    @ReactMethod public void adopt(String contentId, Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            RemoteMediaClient client = client();
            if (client != null && client.getMediaInfo() != null && contentId.equals(client.getMediaInfo().getContentId())) {
                ownedContentId = contentId; promise.resolve(null); emit();
            } else promise.reject("CAST_SESSION", "Cast receiver disconnected.");
        });
    }
    @ReactMethod public void load(ReadableMap media, double position, boolean autoplay, Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            try {
                String uri = media.getString("uri"), type = media.getString("contentType");
                if (!CastMediaPolicy.supports(uri, type)) { promise.reject("CAST_SOURCE", mediaReason); return; }
                RemoteMediaClient client = client();
                if (client == null || session() == null || !session().isConnected()) { promise.reject("CAST_SESSION", "Cast receiver disconnected."); return; }
                MediaMetadata metadata = new MediaMetadata(MediaMetadata.MEDIA_TYPE_MOVIE);
                metadata.putString(MediaMetadata.KEY_TITLE, media.getString("title"));
                metadata.putString(MediaMetadata.KEY_SUBTITLE, media.getString("artist"));
                MediaInfo info = new MediaInfo.Builder(uri).setContentType(type).setStreamType(MediaInfo.STREAM_TYPE_BUFFERED).setMetadata(metadata).build();
                ownedContentId = uri; loadingContentId = uri;
                MediaLoadRequestData data = new MediaLoadRequestData.Builder().setMediaInfo(info).setAutoplay(autoplay).setCurrentTime(Math.max(0, (long) (position * 1000))).build();
                client.load(data).setResultCallback(result -> {
                    if (uri.equals(loadingContentId)) loadingContentId = "";
                    if (result.getStatus().isSuccess()) { promise.resolve(null); emit(); }
                    else promise.reject("CAST_RECEIVER", "Cast receiver rejected the request. Try local playback or another public MP4/HLS source.");
                });
            } catch (RuntimeException error) { promise.reject("CAST_LOAD", "Cast playback failed. Try local playback or another public MP4/HLS source."); }
        });
    }
    private void result(PendingResult<RemoteMediaClient.MediaChannelResult> operation, Promise promise) {
        operation.setResultCallback(result -> {
            if (result.getStatus().isSuccess()) { promise.resolve(null); emit(); }
            else promise.reject("CAST_RECEIVER", "Cast receiver rejected the request. Try local playback or another public MP4/HLS source.");
        });
    }
    @ReactMethod public void command(String action, double value, Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            try {
                RemoteMediaClient client = client();
                if (client == null) { promise.reject("CAST_SESSION", "Cast receiver disconnected."); return; }
                switch (action) {
                    case "play": result(client.play(), promise); break;
                    case "pause": result(client.pause(), promise); break;
                    case "seek": result(client.seek(new MediaSeekOptions.Builder().setPosition(Math.max(0, (long) (value * 1000))).build()), promise); break;
                    case "volume": result(client.setStreamVolume(Math.max(0, Math.min(1, value))), promise); break;
                    default: promise.reject("CAST_COMMAND", "Unsupported Cast control.");
                }
            } catch (RuntimeException error) { promise.reject("CAST_CONTROL", "Cast control failed. Check the receiver connection."); }
        });
    }
    @ReactMethod public void stopOwned(String contentId, Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            RemoteMediaClient client = client();
            if (client != null && contentId.equals(ownedContentId) && (contentId.equals(loadingContentId) || client.getMediaInfo() == null || contentId.equals(client.getMediaInfo().getContentId()))) {
                client.stop().setResultCallback(result -> {
                    if (result.getStatus().isSuccess()) {
                        if (contentId.equals(ownedContentId)) ownedContentId = "";
                        if (contentId.equals(loadingContentId)) loadingContentId = "";
                        promise.resolve(null); emit();
                    } else promise.reject("CAST_STOP", "Could not stop the Cast receiver.");
                });
            } else promise.resolve(null);
        });
    }
    @ReactMethod public void disconnect(Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            try {
                if (cast != null) cast.getSessionManager().endCurrentSession(true);
                promise.resolve(null);
            } catch (RuntimeException error) { promise.reject("CAST_DISCONNECT", "Cast control failed. Check the receiver connection."); }
        });
    }
    @Override public void onActivityResumed(Activity activity) {
        if (!activity.getClass().getName().equals("expo.modules.video.FullscreenPlayerActivity")) return;
        // Add to Media3's controller, so visibility follows native controls and never covers subtitles.
        int id = activity.getResources().getIdentifier("exo_extra_controls", "id", activity.getPackageName());
        View view = activity.findViewById(id);
        if (!(view instanceof ViewGroup)) return;
        ViewGroup controls = (ViewGroup) view;
        if (controls.findViewWithTag("harmonia-cast") != null) return;
        try {
            MediaRouteButton button = new MediaRouteButton(activity);
            CastButtonFactory.setUpMediaRouteButton(activity, button);
            button.setAlwaysVisible(true);
            button.setTag("harmonia-cast"); button.setContentDescription(label); button.setFocusable(true);
            int size = (int) (48 * activity.getResources().getDisplayMetrics().density);
            controls.addView(button, 0, new ViewGroup.LayoutParams(size, size));
            button.setOnClickListener(v -> {
                if (eligible || "connected".equals(connection)) openPicker(activity, eligible);
                else Toast.makeText(activity, mediaReason, Toast.LENGTH_LONG).show();
            });
        } catch (RuntimeException ignored) { error(unavailable); }
    }
    @Override public void invalidate() {
        UiThreadUtil.runOnUiThread(() -> {
            watch(null);
            if (cast != null) cast.getSessionManager().removeSessionManagerListener(sessions, CastSession.class);
            ((Application) context.getApplicationContext()).unregisterActivityLifecycleCallbacks(this);
        });
        super.invalidate();
    }
    @Override public void onActivityCreated(Activity a, Bundle b) {}
    @Override public void onActivityStarted(Activity a) {}
    @Override public void onActivityPaused(Activity a) {}
    @Override public void onActivityStopped(Activity a) {}
    @Override public void onActivitySaveInstanceState(Activity a, Bundle b) {}
    @Override public void onActivityDestroyed(Activity a) {
        if (a instanceof CastPickerActivity && "disconnected".equals(connection)) event("HarmoniaCastPickerClosed", null);
    }
}
