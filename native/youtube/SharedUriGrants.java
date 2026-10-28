// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.youtube;
import java.util.LinkedHashMap;
/** Bounded references for separately delivered grants, including repeated file shares. */
final class SharedUriGrants {
    private final int limit;
    private final LinkedHashMap<String,Integer> values=new LinkedHashMap<>();
    SharedUriGrants(int limit){if(limit<1)throw new IllegalArgumentException();this.limit=limit;}
    synchronized void offer(String uri) {
        int count=values.getOrDefault(uri,0);values.remove(uri);
        if(values.size()>=limit)values.remove(values.keySet().iterator().next());
        values.put(uri,Math.min(320,count+1));
    }
    synchronized boolean contains(String uri){return values.containsKey(uri);}
    synchronized void release(String uri){values.computeIfPresent(uri,(key,count)->count<=1?null:count-1);}
}
