package com.alhudar.harmonia.youtube;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.util.UUID;

public final class IntentModule extends ReactContextBaseJavaModule {
    private static final IntentInbox INBOX=new IntentInbox();
    private static volatile java.lang.ref.WeakReference<IntentModule> active=new java.lang.ref.WeakReference<>(null);
    IntentModule(ReactApplicationContext context) {super(context);active=new java.lang.ref.WeakReference<>(this);}
    @Override public String getName() {return "HarmoniaIntents";}
    // Called by the existing MainActivity hooks BEFORE React can replace the launch Intent.
    public static synchronized void captureIncoming(Intent intent) {
        if(intent==null)return;
        String text=null;
        try {
            if(Intent.ACTION_VIEW.equals(intent.getAction()))text=intent.getDataString();
            if(Intent.ACTION_SEND.equals(intent.getAction()) && "text/plain".equals(intent.getType())) {
                CharSequence shared=intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
                if(shared!=null)text=shared.toString();
            }
        } catch(RuntimeException malformed) {return;}
        IntentInbox.Entry value=INBOX.offer(text,UUID.randomUUID().toString());
        IntentModule module=active.get();
        if(value!=null && module!=null && module.getReactApplicationContext().hasActiveReactInstance()) {
            try {module.getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("HarmoniaLink",map(value));}
            catch(RuntimeException closedBridge) { /* Retained until a live JS bridge drains/acknowledges it. */ }
        }
    }
    private static WritableMap map(IntentInbox.Entry value) {
        if(value==null)return null;
        WritableMap m=Arguments.createMap();m.putString("text",value.text);m.putString("token",value.token);return m;
    }
    @ReactMethod public void getPending(Promise promise) {promise.resolve(map(INBOX.poll()));}
    @ReactMethod public void acknowledge(String token) {INBOX.acknowledge(token);}
    @ReactMethod public void openBrowser(String url, Promise promise) {
        try {
            Uri uri=Uri.parse(url);
            if(!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) || uri.getUserInfo()!=null)
                throw new IllegalArgumentException();
            Intent intent=new Intent(Intent.ACTION_VIEW,uri);
            // Select a browser instead of re-entering our own YouTube VIEW filter.
            intent.setSelector(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_BROWSER));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);promise.resolve(null);
        } catch(Exception e) {promise.reject("E_BROWSER","Could not open the browser.");}
    }
    @ReactMethod public void openSettings(Promise promise) {
        try {
            Intent intent=new Intent(Settings.ACTION_APP_OPEN_BY_DEFAULT_SETTINGS,Uri.parse("package:"+getReactApplicationContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);getReactApplicationContext().startActivity(intent);promise.resolve(null);
        } catch(Exception e) {promise.reject("E_SETTINGS","Could not open link settings.");}
    }
    @ReactMethod public void addListener(String name) {}
    @ReactMethod public void removeListeners(double count) {}
    @Override public void invalidate(){java.lang.ref.WeakReference<IntentModule> current=active;if(current.get()==this)current.clear();super.invalidate();}
}
