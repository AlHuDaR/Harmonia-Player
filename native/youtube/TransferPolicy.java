// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;
import java.io.IOException;
final class TransferPolicy {
    static class PermanentFailure extends IOException {PermanentFailure(String message){super(message);}}
    static boolean retryable(Throwable cause,int attempt) {
        return attempt<4 && !(cause instanceof javax.net.ssl.SSLHandshakeException) && !(cause instanceof javax.net.ssl.SSLPeerUnverifiedException) && cause instanceof IOException && !(cause instanceof PermanentFailure)
            && (!(cause instanceof SafeHttp.HttpFailure) || ((SafeHttp.HttpFailure)cause).code==429 || ((SafeHttp.HttpFailure)cause).code>=500);
    }
    static boolean canTransition(String from,String to) {
        if(from.equals(to))return true;
        if(from.equals("complete"))return to.equals("failed"); // missing/corrupt local file
        return !from.equals("failed") && !from.equals("cancelled");
    }
    static void verifyLength(long expected,long actual) throws IOException {
        if(actual==0)throw new PermanentFailure("Downloaded media is empty.");
        if(expected>=0 && actual!=expected)throw new IOException("Incomplete transfer.");
    }
}
