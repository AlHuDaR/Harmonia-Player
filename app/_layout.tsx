import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { usePlayerStore, useLibraryStatus } from "@/store/playerStore";
import { cleanInterruptedDownloads } from "@/utils/downloads";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Player from "@/components/Player";
function Layout() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
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
  if (library.error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0c0e16",
          padding: 24,
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#ff9c9c" }}>
          Could not read the saved library. Your stored data has not been
          replaced.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => usePlayerStore.persist.rehydrate()}
          style={{ padding: 16 }}
        >
          <Text style={{ color: "white" }}>Retry loading library</Text>
        </Pressable>
      </View>
    );
  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: "#0c0e16", padding: 24 }}>
        <Text style={{ color: "white" }}>Loading library…</Text>
      </View>
    );
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0c0e16",
        paddingBottom: insets.bottom,
      }}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <Player />
      <StatusBar style="light" />
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
