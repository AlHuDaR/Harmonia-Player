package com.alhudar.harmonia.youtube;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.util.UUID;

public final class IntentModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    private WritableMap pending;
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
    @Override public synchronized void onNewIntent(Intent intent) {
        initialRead=true;
        pending=capture(intent);
        if(pending!=null && getReactApplicationContext().hasActiveReactInstance())
            getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("HarmoniaLink",Arguments.makeNativeMap(pending.toHashMap()));
    }
    @ReactMethod public synchronized void getPending(Promise promise) {
        if(!initialRead) {initialRead=true;Activity activity=getCurrentActivity();pending=capture(activity==null?null:activity.getIntent());}
        WritableMap value=pending;pending=null;promise.resolve(value);
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
