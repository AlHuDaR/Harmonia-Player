package com.alhudar.harmonia.youtube;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.util.UUID;
import java.util.ArrayDeque;

public final class IntentModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    private final ArrayDeque<WritableMap> pending = new ArrayDeque<>();
    private boolean initialRead;
    IntentModule(ReactApplicationContext context) { super(context); context.addActivityEventListener(this); }
    @Override public String getName() { return "HarmoniaIntents"; }
    private WritableMap capture(Intent intent) {
        if(intent==null) return null;
        String text=null;
        if(Intent.ACTION_VIEW.equals(intent.getAction())) text=intent.getDataString();
        if(Intent.ACTION_SEND.equals(intent.getAction()) && "text/plain".equals(intent.getType())) {
            CharSequence shared=intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if(shared!=null) text=shared.toString();
        }
        if(text==null || text.length()>4096) return null;
        WritableMap value=Arguments.createMap();value.putString("text",text);value.putString("token",UUID.randomUUID().toString());return value;
    }
    private void readInitial(Intent arriving) {
        if(initialRead) return;
        Activity activity=getCurrentActivity();
        if(activity==null) return; // Foreground drain can retry when attached.
        initialRead=true;
        Intent initial=activity.getIntent();
        if(initial!=arriving) {
            WritableMap value=capture(initial);
            if(value!=null) pending.addLast(value);
        }
    }
    @Override public synchronized void onNewIntent(Intent intent) {
        // Preserve the launch share if a second intent arrives before JS drains.
        readInitial(intent);
        initialRead=true;
        WritableMap value=capture(intent);
        if(value==null) return;
        // Bounded retention while JS starts; do not overwrite the previous share.
        if(pending.size()>=32) pending.removeFirst();
        pending.addLast(value);
        if(getReactApplicationContext().hasActiveReactInstance())
            getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("HarmoniaLink",Arguments.makeNativeMap(value.toHashMap()));
    }
    @ReactMethod public synchronized void getPending(Promise promise) {
        readInitial(null);
        promise.resolve(pending.pollFirst());
    }
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
    @Override public void onActivityResult(Activity activity,int requestCode,int resultCode,Intent data) {}
    @Override public void invalidate(){getReactApplicationContext().removeActivityEventListener(this);super.invalidate();}
}
