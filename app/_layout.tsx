import { FocusablePressable as Pressable } from "@/components/FocusablePressable";
import IncomingLinks from "@/components/IncomingLinks";
import { useLocale } from "@/utils/i18n";
import { Text } from "@/components/LocalizedText";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, AppState } from "react-native";
import { useEffect, useState } from "react";
import { usePlayerStore, useLibraryStatus } from "@/store/playerStore";
import {
  cleanInterruptedDownloads,
  syncNativeDownloads,
} from "@/utils/downloads";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Player from "@/components/Player";
import { Header, BottomNavigation } from "@/components/AppChrome";
import { useTheme } from "@/utils/theme";
function Layout() {
  const { rtl } = useLocale();
  const theme = useTheme();
  const expanded = usePlayerStore((s) => s.expanded);
  const [ready, setReady] = useState(false);
  const [downloadSyncError, setDownloadSyncError] = useState(false);
  const hasNativeJobs = usePlayerStore((s) =>
    s.downloads.some(
      (d) =>
        d.nativeId && ["queued", "downloading", "retrying"].includes(d.status),
    ),
  );
  const library = useLibraryStatus();
  useEffect(() => {
    let mounted = true;
    const finish = () =>
      cleanInterruptedDownloads()
        .catch(() => {})
        .finally(() => {
          if (mounted) setReady(true);
        });
    if (library.hydrated) finish();
    return () => {
      mounted = false;
    };
  }, [library.hydrated]);
  useEffect(() => {
    if (!ready) return;
    let pending = false;
    const sync = async () => {
      if (pending) return;
      pending = true;
      try {
        await syncNativeDownloads();
        setDownloadSyncError(false);
      } catch {
        setDownloadSyncError(true);
      } finally {
        pending = false;
      }
    };
    sync();
    const timer = hasNativeJobs ? setInterval(sync, 1500) : undefined;
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => {
      if (timer) clearInterval(timer);
      foreground.remove();
    };
  }, [ready, hasNativeJobs]);
  if (library.error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          padding: 24,
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.error }}>
          Could not read the saved library. Your stored data has not been
          replaced.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => usePlayerStore.persist.rehydrate()}
          style={{ padding: 16 }}
        >
          <Text style={{ color: theme.text }}>Retry loading library</Text>
        </Pressable>
      </View>
    );
  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, padding: 24 }}>
        <Text style={{ color: theme.text }}>Loading library…</Text>
      </View>
    );
  return (
    <View
      style={{
        direction: rtl ? "rtl" : "ltr",
        flex: 1,
        backgroundColor: theme.background,
      }}
    >
      {downloadSyncError && (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.error, padding: 8 }}
        >
          Could not synchronize background downloads. Records remain on this
          device.
        </Text>
      )}
      <Header />
      <View style={{ flex: 1, minHeight: 0 }}>
        <View
          style={{ flex: 1, opacity: expanded ? 0 : 1 }}
          pointerEvents={expanded ? "none" : "auto"}
          accessibilityElementsHidden={expanded}
          importantForAccessibility={expanded ? "no-hide-descendants" : "auto"}
          aria-hidden={expanded}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
        <IncomingLinks />
        <Player />
      </View>
      <BottomNavigation />
      <StatusBar style={theme.dark ? "light" : "dark"} />
    </View>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Layout />
    </SafeAreaProvider>
  );
}
