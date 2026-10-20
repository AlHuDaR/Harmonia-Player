// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import okhttp3.*;

/** Public HTTPS only, including DNS answers and every redirect. No auth/cookie jar. */
final class SafeHttp {
    static boolean publicAddress(InetAddress address) {
        byte[] b=address.getAddress();
        if(address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) return false;
        if(b.length==4) {
            int a=b[0]&255,c=b[1]&255;
            return a!=0 && a!=127 && a<224 && !(a==100 && c>=64 && c<=127)
                && !(a==169 && c==254) && !(a==192 && (c==0 || c==168))
                && !(a==198 && (c==18 || c==19 || c==51)) && !(a==203 && c==0);
        }
        // Only globally routable IPv6 2000::/3; exclude documentation space.
        return (b[0]&0xe0)==0x20 && !((b[0]&255)==0x20 && (b[1]&255)==1 && (b[2]&255)==0x0d && (b[3]&255)==0xb8);
    }
    static HttpUrl url(String value) throws IOException {
        HttpUrl u=HttpUrl.parse(value);
        if(u==null || !u.isHttps() || !u.username().isEmpty() || !u.password().isEmpty() || u.port()!=443)
            throw new IOException("Only public HTTPS media links are supported.");
        String h=u.host().toLowerCase(Locale.ROOT);
        if(!h.contains(".") || h.matches(".*\\.(local|localhost|internal|lan|home|test|invalid|localdomain|corp)$") || h.endsWith(".home.arpa"))
            throw new IOException("Local or internal addresses are not supported.");
        return u;
    }
    static final OkHttpClient CLIENT=new OkHttpClient.Builder()
        .connectTimeout(15,TimeUnit.SECONDS).readTimeout(30,TimeUnit.SECONDS)
        .followRedirects(false).followSslRedirects(false)
        .dns(host -> {
            List<InetAddress> addresses=Dns.SYSTEM.lookup(host);
            for(InetAddress a:addresses) if(!publicAddress(a)) throw new UnknownHostException("Private/internal destination rejected");
            return addresses;
        }).build();
    private static final OkHttpClient DISCOVERY=CLIENT.newBuilder().callTimeout(45,TimeUnit.SECONDS).build();
    static Response open(String value, String range) throws IOException { return openWith(DISCOVERY,value,range,null); }
    static Response open(String value, String range, String userAgent) throws IOException { return openWith(CLIENT,value,range,userAgent); }
    private static Response openWith(OkHttpClient client,String value,String range,String userAgent) throws IOException {
        HttpUrl u=url(value);
        for(int hop=0;hop<6;hop++) {
            Request.Builder request=new Request.Builder().url(u).header("User-Agent",userAgent==null?"Harmonia/2.0 public-media":userAgent).header("Accept-Encoding","identity");
            if(range!=null) request.header("Range",range);
            Response r=client.newCall(request.build()).execute();
            if(r.code()<300 || r.code()>399) return r;
            String location=r.header("Location"); r.close();
            HttpUrl next=location==null?null:u.resolve(location);
            if(next==null) throw new IOException("Invalid media redirect.");
            u=url(next.toString());
        }
        throw new IOException("Too many media redirects.");
    }
    static String text(String value, int max) throws IOException {
        try(Response r=open(value,null)) {
            if(!r.isSuccessful()) throw new HttpFailure(r.code());
            if(r.body()==null) throw new IOException("Empty source response.");
            try(InputStream in=r.body().byteStream(); ByteArrayOutputStream out=new ByteArrayOutputStream()) {
                byte[] b=new byte[8192];int n;
                while((n=in.read(b))!=-1) { if(out.size()+n>max) throw new IOException("Source response is too large.");out.write(b,0,n); }
                return out.toString("UTF-8");
            }
        }
    }
    static final class HttpFailure extends IOException {
        final int code;
        HttpFailure(int code) { super(code==401||code==403?"This source denied public access (HTTP "+code+"). Login, embedding, region or source policy may be required; Harmonia will not bypass it."
            :code==404?"This media was not found or is no longer public.":code==429?"This source is rate limiting requests. Retry later.":"Source returned HTTP "+code+".");this.code=code; }
    }
}
