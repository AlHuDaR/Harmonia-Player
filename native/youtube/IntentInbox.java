// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;
import java.util.ArrayDeque;
final class IntentInbox {
    static final class Entry {final String text,token;final java.util.List<String> files;Entry(String text,String token){this(text,token,java.util.Collections.emptyList());}Entry(String text,String token,java.util.List<String> files){this.text=text;this.token=token;this.files=files;}}
    private final ArrayDeque<Entry> queue=new ArrayDeque<>();
    synchronized Entry offer(String text,String token) {
        if(text==null || text.length()>4096)return null;
        if(queue.size()>=32)queue.removeFirst();
        Entry e=new Entry(text,token);queue.addLast(e);return e;
    }
    synchronized Entry offerFiles(java.util.List<String> files,String token) {
        if(files.isEmpty())return null;
        if(queue.size()>=32)queue.removeFirst();
        Entry e=new Entry("",token,new java.util.ArrayList<>(files));queue.addLast(e);return e;
    }
    synchronized Entry poll(){return queue.pollFirst();}
    synchronized void acknowledge(String token){queue.removeIf(e->e.token.equals(token));}
}
