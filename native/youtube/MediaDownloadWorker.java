// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import android.app.*;
import android.content.Context;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.net.Uri;
import android.os.*;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.*;
import java.io.*;
import okhttp3.*;
import org.json.*;
import com.alhudar.harmonia.youtube.TransferPolicy.PermanentFailure;

/** Durable platform-managed work. Failed/retried transfers restart cleanly; no false HTTP resume. */
public final class MediaDownloadWorker extends Worker {
    private static final String CHANNEL="harmonia-downloads";
    private final Context context;
    private final String id;
    public MediaDownloadWorker(@NonNull Context c,@NonNull WorkerParameters p) {super(c,p);context=c;id=p.getId().toString();}
    private File file(String suffix) {
        File dir=new File(context.getFilesDir(),"media-jobs");dir.mkdirs();return new File(dir,id+suffix);
    }
    private ForegroundInfo notification(String title,int progress) {
        NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Media downloads",NotificationManager.IMPORTANCE_LOW));
        PendingIntent cancel=WorkManager.getInstance(context).createCancelPendingIntent(getId());
        Notification n=new NotificationCompat.Builder(context,CHANNEL).setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle(title).setContentText("Harmonia media download")
            .setOngoing(true).setOnlyAlertOnce(true).setProgress(100,progress,progress==0)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel,"Cancel",cancel).build();
        return Build.VERSION.SDK_INT>=29?new ForegroundInfo(id.hashCode()&0x7fffffff,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC):new ForegroundInfo(id.hashCode()&0x7fffffff,n);
    }
    @NonNull @Override public Result doWork() {
        JSONObject record=null;boolean complete=false,retry=false;
        try {
            record=DownloadRecords.get(context,id);
            if(record==null || record.optString("status").equals("cancelled"))return Result.failure();
            if(record.optString("status").equals("complete")) {
                File saved=new File(Uri.parse(record.getJSONObject("track").getString("localUri")).getPath());
                if(!saved.isFile() || saved.length()==0)throw new PermanentFailure("The downloaded file is missing. Retry to download it again.");
                complete=true;return Result.success();
            }
            String title=record.getJSONObject("track").optString("title","Media");
            setForegroundAsync(notification(title,0)).get();
            JSONObject source=record.getJSONObject("source");
            DownloadRecords.update(context,id,"downloading",0,null,null);
            File video=file(".video.part"),audio=file(".audio.part"),output=file(".output.part");
            boolean separate=source.has("audioUri");
            File committed=file(extension(source,record.getJSONObject("track")));
            // A process can die after final rename but before WorkManager records success.
            if(committed.isFile()) {
                inspect(committed,record.getJSONObject("track").getString("kind"),separate);
                DownloadRecords.update(context,id,"complete",1,null,Uri.fromFile(committed).toString());
                complete=true;return Result.success();
            }
            for(File partial:new File[]{video,audio,output})partial.delete();
            transfer(source.getString("uri"),video,separate?0.7:1,0,title,source.optJSONObject("headers"));
            if(separate) {
                transfer(source.getString("audioUri"),audio,0.25,0.7,title,source.optJSONObject("headers"));
                checkStopped();inspect(video,"video",false);inspect(audio,"audio",false);MediaMux.merge(video,audio,output);
            } else if(!video.renameTo(output))throw new IOException("Could not finalize temporary media.");
            checkStopped();
            inspect(output,record.getJSONObject("track").getString("kind"),separate);
            File target=file(extension(source,record.getJSONObject("track")));
            if(!output.renameTo(target))throw new IOException("Could not commit downloaded media.");
            DownloadRecords.update(context,id,"complete",1,null,Uri.fromFile(target).toString());
            complete=true;return Result.success();
        } catch(Exception e) {
            if(isStopped()) return Result.failure();
            Throwable cause=e;while(cause instanceof java.util.concurrent.ExecutionException && cause.getCause()!=null)cause=cause.getCause();
            retry=TransferPolicy.retryable(cause,getRunAttemptCount());
            String reason=cause instanceof SafeHttp.HttpFailure?cause.getMessage():cause instanceof PermanentFailure?cause.getMessage():retry?"Network interrupted. Waiting to retry.":"Download failed. Check network, storage and source availability; retry resolves fresh formats.";
            try{DownloadRecords.update(context,id,retry?"retrying":"failed",0,reason,null);}catch(Exception ignored){}
            return retry?Result.retry():Result.failure();
        } finally {
            for(String suffix:new String[]{".video.part",".audio.part",".output.part"})file(suffix).delete();
            if(isStopped() || !complete) {
                File[] leftovers=file(".output.part").getParentFile().listFiles();
                if(leftovers!=null)for(File f:leftovers)if(f.getName().startsWith(id+"."))f.delete();
            }
            if(!complete && !retry && isStopped()) {
                try{DownloadRecords.update(context,id,"retrying",0,"Android paused background work. Waiting for network or scheduling.",null);}catch(Exception ignored){}
            }
        }
    }
    private String extension(JSONObject source,JSONObject track) throws Exception {
        String extension=source.optString("extension","");
        if(!extension.matches("(mp4|m4a|webm|mp3|aac|wav|ogg|flac|mov|mkv)"))extension=track.getString("kind").equals("audio")?"m4a":"mp4";
        return "."+extension;
    }
    private void checkStopped() throws InterruptedIOException {if(isStopped() || Thread.currentThread().isInterrupted())throw new InterruptedIOException("Cancelled");}
    private void transfer(String uri,File target,double weight,double offset,String title,JSONObject headers) throws Exception {
        // Only the existing extractor's fixed User-Agent may be forwarded. Never cookies/auth.
        // SafeHttp also validates all redirect destinations and resolved IPs.
        try(Response r=SafeHttp.open(uri,null,headers!=null && ExtractorDownloader.USER_AGENT.equals(headers.optString("User-Agent"))?ExtractorDownloader.USER_AGENT:null)) {
            if(r.code()!=200)throw new SafeHttp.HttpFailure(r.code());
            ResponseBody body=r.body();if(body==null)throw new PermanentFailure("Empty download response.");
            String type=r.header("Content-Type","").toLowerCase(java.util.Locale.ROOT);
            if(type.contains("text/") || type.contains("json") || type.contains("xml") || type.contains("mpegurl"))throw new PermanentFailure("Source returned a page or playlist instead of a media file.");
            long length=body.contentLength();
            if(length>0 && length>new StatFs(target.getParent()).getAvailableBytes()-32L*1024*1024)throw new PermanentFailure("Not enough free storage.");
            long count=0,last=0;
            try(InputStream in=body.byteStream();OutputStream out=new FileOutputStream(target,false)) {
                byte[] buffer=new byte[64*1024];int n;
                while((n=in.read(buffer))!=-1) {
                    checkStopped();out.write(buffer,0,n);count+=n;
                    if(System.currentTimeMillis()-last>750) {
                        last=System.currentTimeMillis();
                        if(new StatFs(target.getParent()).getAvailableBytes()<16L*1024*1024)throw new PermanentFailure("Not enough free storage.");
                        double p=offset+(length>0?Math.min(1,(double)count/length)*weight:0);
                        DownloadRecords.update(context,id,"downloading",p,null,null);
                        setForegroundAsync(notification(title,(int)(p*100)));
                    }
                }
            }
            TransferPolicy.verifyLength(length,count);
        }
    }
    static void inspect(File file,String kind,boolean requireAudio) throws Exception {
        if(file.length()==0)throw new PermanentFailure("Downloaded media is empty.");
        MediaExtractor e=new MediaExtractor();boolean audio=false,video=false;
        try {
            e.setDataSource(file.getPath());
            if(e.getDrmInitData()!=null) throw new PermanentFailure("DRM-protected media is not supported.");
            for(int i=0;i<e.getTrackCount();i++) {
                String mime=e.getTrackFormat(i).getString(MediaFormat.KEY_MIME);
                if(mime!=null && (mime.startsWith("audio/") || mime.startsWith("video/"))) {
                    e.selectTrack(i);e.seekTo(0,MediaExtractor.SEEK_TO_CLOSEST_SYNC);
                    long sampleSize=Build.VERSION.SDK_INT>=28?e.getSampleSize():16L*1024*1024;
                    if(sampleSize<=0 || sampleSize>16L*1024*1024)throw new PermanentFailure("Media sample is empty or exceeds the supported decoder buffer.");
                    java.nio.ByteBuffer sample=java.nio.ByteBuffer.allocate((int)sampleSize);
                    if((e.getSampleFlags() & MediaExtractor.SAMPLE_FLAG_ENCRYPTED)!=0)throw new PermanentFailure("Encrypted media samples are not supported.");
                    if(e.readSampleData(sample,0)<=0)throw new PermanentFailure("Downloaded track contains no playable samples.");
                    e.unselectTrack(i);
                    audio|=mime.startsWith("audio/");video|=mime.startsWith("video/");
                }
            }
            if((kind.equals("audio")&&!audio)||(kind.equals("video")&&!video)||(requireAudio&&!audio))throw new PermanentFailure("Downloaded file does not contain the requested media tracks.");
        } catch(PermanentFailure failure) { throw failure; }
        catch(Exception invalid) { throw new PermanentFailure("Downloaded media could not be decoded as the requested format."); }
        finally {e.release();}
    }
}
