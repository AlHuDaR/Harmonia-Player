// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;
import android.content.Context;
import android.content.SharedPreferences;
import org.json.*;
final class DownloadRecords {
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("harmonia-download-jobs-v1",Context.MODE_PRIVATE); }
    static synchronized JSONObject get(Context c,String id) throws Exception {
        String value=prefs(c).getString(id,null);return value==null?null:new JSONObject(value);
    }
    static synchronized void put(Context c,String id,JSONObject value) throws Exception {
        if(!prefs(c).edit().putString(id,value.toString()).commit()) throw new java.io.IOException("Could not persist download record.");
    }
    static synchronized void update(Context c,String id,String status,double progress,String error,String uri) throws Exception {
        JSONObject r=get(c,id);if(r==null || !TransferPolicy.canTransition(r.optString("status"),status))return;
        r.put("status",status).put("progress",Math.max(0,Math.min(1,progress)));
        if(error!=null)r.put("error",error);else r.remove("error");
        if(uri!=null)r.getJSONObject("track").put("localUri",uri);
        if(status.equals("complete")||status.equals("failed")||status.equals("cancelled"))r.remove("source");
        if(status.equals("failed")||status.equals("cancelled"))r.getJSONObject("track").remove("localUri");
        put(c,id,r);
    }
    static synchronized JSONArray all(Context c) throws Exception {
        JSONArray a=new JSONArray();for(String id:prefs(c).getAll().keySet()){JSONObject r=get(c,id);if(r!=null){JSONObject safe=new JSONObject(r.toString());safe.remove("source");a.put(safe);}}return a;
    }
    static synchronized void forget(Context c,String id) { prefs(c).edit().remove(id).commit(); }
}
