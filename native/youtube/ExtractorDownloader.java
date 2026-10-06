// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;
import okhttp3.ResponseBody;
import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException;

public final class ExtractorDownloader extends Downloader {
    public static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0";
    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS).readTimeout(25, TimeUnit.SECONDS)
            .callTimeout(40, TimeUnit.SECONDS).build();

    @Override public Response execute(Request request) throws IOException, ReCaptchaException {
        okhttp3.Request.Builder builder = new okhttp3.Request.Builder()
                .url(request.url()).header("User-Agent", USER_AGENT);
        for (Map.Entry<String, List<String>> header : request.headers().entrySet()) {
            builder.removeHeader(header.getKey());
            for (String value : header.getValue()) builder.addHeader(header.getKey(), value);
        }
        byte[] bytes = request.dataToSend();
        RequestBody body = bytes == null ? null : RequestBody.create(null, bytes);
        if (body == null && (request.httpMethod().equals("POST") || request.httpMethod().equals("PUT"))) {
            body = RequestBody.create(null, new byte[0]);
        }
        builder.method(request.httpMethod(), body);
        try (okhttp3.Response result = client.newCall(builder.build()).execute()) {
            if (result.code() == 429) throw new ReCaptchaException("YouTube is rate limiting this connection. Retry later or change network.", request.url());
            ResponseBody responseBody = result.body();
            return new Response(result.code(), result.message(), result.headers().toMultimap(),
                    responseBody == null ? "" : responseBody.string(), result.request().url().toString());
        }
    }
}
