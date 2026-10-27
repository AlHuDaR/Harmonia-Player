// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import android.content.Context;
import androidx.work.*;
import com.facebook.react.bridge.*;
import java.io.File;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

public final class MediaModule extends ReactContextBaseJavaModule {
    private final ThreadPoolExecutor executor=new ThreadPoolExecutor(2,2,0,TimeUnit.SECONDS,new ArrayBlockingQueue<>(12));
    public MediaModule(ReactApplicationContext c){super(c);}
    @Override public String getName(){return "HarmoniaMedia";}
    @Override public void invalidate(){executor.shutdownNow();super.invalidate();}
    @ReactMethod public void discover(String url,Promise p){
        try {executor.execute(()->{
            try{p.resolve(MediaDiscovery.discover(url).toString());}
            catch(Exception e){p.reject("E_DISCOVERY",e instanceof java.io.IOException?e.getMessage():"The source returned an incompatible media response.");}
        });}catch(RejectedExecutionException e){p.reject("E_BUSY","Too many source requests. Retry shortly.");}
    }
    @ReactMethod public synchronized void enqueueDownload(String trackJson,String sourceJson,Promise p){
        Context c=getReactApplicationContext();
        try {
            JSONObject track=new JSONObject(trackJson),source=new JSONObject(sourceJson);
            SafeHttp.url(source.getString("uri"));if(source.has("audioUri"))SafeHttp.url(source.getString("audioUri"));
            if(!track.has("id") || !track.optString("kind").matches("audio|video"))throw new IllegalArgumentException();
            JSONArray all=DownloadRecords.all(c);
            for(int i=0;i<all.length();i++) {
                JSONObject r=all.getJSONObject(i);
                if(!r.getJSONObject("track").getString("id").equals(track.getString("id")))continue;
                String state=r.getString("status");
                if(state.equals("queued")||state.equals("downloading")||state.equals("retrying")){p.resolve(r.toString());return;}
                if(state.equals("complete")) {
                    String local=r.getJSONObject("track").optString("localUri");
                    if(!local.isEmpty() && new File(android.net.Uri.parse(local).getPath()).isFile()){p.resolve(r.toString());return;}
                }
                forget(r.getString("nativeId"));
            }
            OneTimeWorkRequest request=new OneTimeWorkRequest.Builder(MediaDownloadWorker.class)
                .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build();
            String id=request.getId().toString();track.remove("localUri");
            JSONObject record=new JSONObject().put("nativeId",id).put("createdAt",System.currentTimeMillis()).put("track",track).put("source",source).put("status","queued").put("progress",0);
            DownloadRecords.put(c,id,record);
            try{WorkManager.getInstance(c).enqueueUniqueWork("harmonia-"+track.getString("id"),ExistingWorkPolicy.KEEP,request).getResult().get();}
            catch(Exception e){DownloadRecords.forget(c,id);throw e;}
            record.remove("source");p.resolve(record.toString());
        } catch(Exception e){p.reject("E_DOWNLOAD","Could not queue download. Check source, storage and background-work availability.");}
    }
    @ReactMethod public void downloads(Promise p){
        try{
            Context c=getReactApplicationContext();JSONArray records=DownloadRecords.all(c);
            for(int i=0;i<records.length();i++) {
                JSONObject r=records.getJSONObject(i);String status=r.optString("status"),id=r.getString("nativeId");
                if(status.equals("queued")||status.equals("downloading")||status.equals("retrying")) {
                    WorkInfo info=WorkManager.getInstance(c).getWorkInfoById(UUID.fromString(id)).get();
                    if(info!=null && info.getState()==WorkInfo.State.CANCELLED) DownloadRecords.update(c,id,"cancelled",0,"Download cancelled.",null);
                    else if(info==null || info.getState()==WorkInfo.State.FAILED) DownloadRecords.update(c,id,"failed",0,"Background job stopped. Retry to resolve fresh media.",null);
                }
                if(status.equals("cancelled")) {
                    File dir=new File(c.getFilesDir(),"media-jobs");File[] files=dir.listFiles();
                    if(files!=null)for(File f:files)if(f.getName().startsWith(id+"."))f.delete();
                }
            }
            p.resolve(DownloadRecords.all(c).toString());
        }
        catch(Exception e){p.reject("E_RECORDS","Could not read persistent download jobs.");}
    }
    @ReactMethod public synchronized void cancel(String id,Promise p){
        try{
            UUID uuid=UUID.fromString(id);JSONObject r=DownloadRecords.get(getReactApplicationContext(),id);
            if(r!=null && r.optString("status").equals("complete")){p.resolve(null);return;}
            if(r!=null){r.put("status","cancelled").put("progress",0).put("error","Download cancelled.");r.getJSONObject("track").remove("localUri");r.remove("source");DownloadRecords.put(getReactApplicationContext(),id,r);}
            WorkManager.getInstance(getReactApplicationContext()).cancelWorkById(uuid);p.resolve(null);
        }catch(Exception e){p.reject("E_CANCEL","Could not cancel download.");}
    }
    private void forget(String id) throws Exception {
        WorkManager.getInstance(getReactApplicationContext()).cancelWorkById(UUID.fromString(id));
        DownloadRecords.forget(getReactApplicationContext(),id);
        File dir=new File(getReactApplicationContext().getFilesDir(),"media-jobs");
        File[] files=dir.listFiles();if(files!=null)for(File f:files)if(f.getName().startsWith(id+"."))f.delete();
    }
    @ReactMethod public synchronized void forgetDownload(String id,Promise p){try{forget(id);p.resolve(null);}catch(Exception e){p.reject("E_DELETE","Could not remove download.");}}
}
