// SPDX-License-Identifier: GPL-3.0-or-later
package com.alhudar.harmonia.cast;

import android.content.Context;
import android.net.*;
import java.io.IOException;
import java.net.*;

final class LocalCastNetwork {
    static final String UNAVAILABLE = "Connect this phone and the Cast receiver to the same Wi-Fi, then retry.";
    final Network network; final InetAddress address; final boolean wifi;
    LocalCastNetwork(Network network, InetAddress address, boolean wifi) { this.network = network; this.address = address; this.wifi = wifi; }
    static LocalCastNetwork select(Context context, InetAddress receiver) throws IOException {
        if (receiver == null || receiver.isLoopbackAddress() || receiver.isAnyLocalAddress() || receiver.isMulticastAddress()) throw new IOException(UNAVAILABLE);
        ConnectivityManager manager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        LocalCastNetwork fallback = null;
        for (Network network : manager.getAllNetworks()) {
            NetworkCapabilities caps = manager.getNetworkCapabilities(network); LinkProperties links = manager.getLinkProperties(network);
            if (caps == null || links == null || caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) ||
                    !(caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET))) continue;
            for (LinkAddress link : links.getLinkAddresses()) {
                InetAddress ip = link.getAddress();
                if (ip.getAddress().length != receiver.getAddress().length || ip.isLoopbackAddress() || ip.isAnyLocalAddress() || ip.isLinkLocalAddress() || ip.isMulticastAddress()) continue;
                // Strip an unnecessary IPv6 interface scope from globally routable/ULA addresses.
                LocalCastNetwork candidate = new LocalCastNetwork(network, InetAddress.getByAddress(ip.getAddress()), caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI));
                for (RouteInfo route : links.getRoutes()) if (!route.isDefaultRoute() && route.matches(receiver)) return candidate;
                if (fallback == null) fallback = candidate;
            }
        }
        if (fallback != null) return fallback;
        throw new IOException(UNAVAILABLE);
    }
}
