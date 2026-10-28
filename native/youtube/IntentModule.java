package com.alhudar.harmonia.youtube;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.util.UUID;

public final class IntentModule extends ReactContextBaseJavaModule {
    private static final SharedUriGrants SHARED=new SharedUriGrants(320);
    private final java.util.concurrent.ExecutorService imports=new java.util.concurrent.ThreadPoolExecutor(1,1,0,java.util.concurrent.TimeUnit.SECONDS,new java.util.concurrent.ArrayBlockingQueue<>(10));
    private static final IntentInbox INBOX=new IntentInbox();
    private static volatile java.lang.ref.WeakReference<IntentModule> active=new java.lang.ref.WeakReference<>(null);
    IntentModule(ReactApplicationContext context) {super(context);active=new java.lang.ref.WeakReference<>(this);}
    @Override public String getName() {return "HarmoniaIntents";}
    // Called by the existing MainActivity hooks BEFORE React can replace the launch Intent.
    @SuppressWarnings("deprecation") // Legacy overloads are required below Android 13.
    public static synchronized void captureIncoming(Intent intent) {
        if(intent==null)return;
        String text=null;
        java.util.List<String> files=new java.util.ArrayList<>();
        try {
            if(Intent.ACTION_VIEW.equals(intent.getAction()))text=intent.getDataString();
            boolean media=intent.getType()!=null && (intent.getType().startsWith("audio/") || intent.getType().startsWith("video/") || "*/*".equals(intent.getType()));
            if(media && (Intent.ACTION_SEND.equals(intent.getAction()) || Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction()))) {
                java.util.ArrayList<Uri> uris=new java.util.ArrayList<>();
                if(Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())) {
                    java.util.ArrayList<Uri> many=android.os.Build.VERSION.SDK_INT>=33?intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM,Uri.class):intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                    if(many!=null)for(int i=0;i<Math.min(10,many.size());i++)if(many.get(i)!=null)uris.add(many.get(i));
                } else {Uri uri=android.os.Build.VERSION.SDK_INT>=33?intent.getParcelableExtra(Intent.EXTRA_STREAM,Uri.class):intent.getParcelableExtra(Intent.EXTRA_STREAM);if(uri!=null)uris.add(uri);}
                if(intent.getClipData()!=null)for(int i=0;i<Math.min(10,intent.getClipData().getItemCount());i++) {
                    Uri uri=intent.getClipData().getItemAt(i).getUri();if(uri!=null)uris.add(uri);
                }
                for(Uri uri:uris)if(files.size()<10 && "content".equals(uri.getScheme()) && !files.contains(uri.toString()) && uri.toString().length()<4096)files.add(uri.toString());
            }
            if(Intent.ACTION_SEND.equals(intent.getAction()) && "text/plain".equals(intent.getType())) {
                CharSequence shared=intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
                if(shared!=null)text=shared.toString();
            }
        } catch(RuntimeException malformed) {return;}
        // Bound grant references; actual data is read only after an explicit Import action.
        for(String file:files)SHARED.offer(file);
        IntentInbox.Entry value=files.isEmpty()?INBOX.offer(text,UUID.randomUUID().toString()):INBOX.offerFiles(files,UUID.randomUUID().toString());
        IntentModule module=active.get();
        if(value!=null && module!=null && module.getReactApplicationContext().hasActiveReactInstance()) {
            try {module.getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("HarmoniaLink",map(value));}
            catch(RuntimeException closedBridge) { /* Retained until a live JS bridge drains/acknowledges it. */ }
        }
    }
    private static WritableMap map(IntentInbox.Entry value) {
        if(value==null)return null;
        WritableMap m=Arguments.createMap();m.putString("text",value.text);m.putString("token",value.token);
        WritableArray files=Arguments.createArray();for(String uri:value.files)files.pushString(uri);m.putArray("files",files);return m;
    }
    @ReactMethod public void getPending(Promise promise) {promise.resolve(map(INBOX.poll()));}
    @ReactMethod public void acknowledge(String token) {INBOX.acknowledge(token);}
    @ReactMethod public void importShared(String value,Promise promise) {
        if(!SHARED.contains(value)){promise.reject("E_IMPORT","Shared file permission is unavailable. Share the file again.");return;}
        try {imports.execute(()->{
            java.io.File target=null;boolean success=false;
            try {
                Uri uri=Uri.parse(value);
                android.content.ContentResolver resolver=getReactApplicationContext().getContentResolver();
                String mime=resolver.getType(uri);
                if(mime==null || !(mime.startsWith("audio/")||mime.startsWith("video/")))throw new java.io.IOException("Only shared audio and video files can be imported.");
                String kind=mime.startsWith("audio/")?"audio":"video";
                java.io.File dir=new java.io.File(getReactApplicationContext().getFilesDir(),"imports");dir.mkdirs();
                String id=UUID.randomUUID().toString();target=new java.io.File(dir,id+".media");
                long count=0,start=android.os.SystemClock.elapsedRealtime();
                try(java.io.InputStream in=resolver.openInputStream(uri);java.io.OutputStream out=new java.io.FileOutputStream(target)) {
                    if(in==null)throw new java.io.IOException("Shared file is unavailable.");
                    byte[] buffer=new byte[65536];int n;
                    while((n=in.read(buffer))!=-1) {
                        count+=n;
                        if(Thread.currentThread().isInterrupted() || count>512L*1024*1024 || android.os.SystemClock.elapsedRealtime()-start>120000)throw new java.io.IOException("Shared file exceeds the import size or time limit.");
                        if(new android.os.StatFs(dir.getPath()).getAvailableBytes()<16L*1024*1024)throw new java.io.IOException("Not enough free storage.");
                        out.write(buffer,0,n);
                    }
                }
                MediaDownloadWorker.inspect(target,kind,false);
                WritableMap track=Arguments.createMap();track.putString("id","local:"+id);track.putString("title","Shared media");track.putString("artist","Local media");track.putString("kind",kind);track.putString("localUri",Uri.fromFile(target).toString());
                success=true;releaseShared(value);promise.resolve(track);
            }catch(Exception e){promise.reject("E_IMPORT",e instanceof java.io.IOException?e.getMessage():"Shared media could not be imported. Share the file again.");}
            finally{if(!success && target!=null)target.delete();}
        });}catch(java.util.concurrent.RejectedExecutionException e){promise.reject("E_IMPORT","Import is unavailable.");}
    }
    @ReactMethod public void releaseShared(String value){SHARED.release(value);}
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
    @Override public void invalidate(){imports.shutdownNow();java.lang.ref.WeakReference<IntentModule> current=active;if(current.get()==this)current.clear();super.invalidate();}
}
