import { useEffect, useState } from "react";
import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  View,
  AppState,
  ScrollView,
  Modal,
} from "react-native";
import { intentInbox } from "@/utils/incomingLinks";
import { sharedLinks, type SharedLink } from "@/utils/linkProviders";
import { Button, useMediaStyles } from "./MediaUI";
import { Text } from "./LocalizedText";
import SharedLinkCard from "./SharedLinkCard";
// Keep token deduplication across component remounts; repeated shares get new tokens.
const accept = intentInbox();
export default function IncomingLinks() {
  const styles = useMediaStyles();
  const [links, setLinks] = useState<{ link: SharedLink; key: string }[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const module = NativeModules.HarmoniaIntents;
    if (Platform.OS !== "android" || !module) return;
    let mounted = true;
    function receive(value: unknown) {
      if (!mounted) return;
      const text = accept(value);
      if (text === undefined || text.startsWith("harmonia:")) return;
      const found = sharedLinks(text);
      if (!found.length) {
        setError("No safe web link was found in the shared text.");
        return;
      }
      setError("");
      const token = (value as { token: string }).token;
      setLinks((current) => [
        ...current,
        ...found.map((link, i) => ({ link, key: `${token}:${i}` })),
      ]);
    }
    const listener = new NativeEventEmitter(module).addListener(
      "HarmoniaLink",
      receive,
    );
    const pending = async () => {
      // Drain the existing native module's pending queue, including cold starts.
      try {
        for (let i = 0; i < 32 && mounted; i++) {
          const value = await module.getPending();
          if (!value) break;
          receive(value);
        }
      } catch {
        if (mounted)
          setError("Could not read the shared link. Please share it again.");
      }
    };
    pending();
    const active = AppState.addEventListener("change", (s) => {
      if (s === "active") pending();
    });
    return () => {
      mounted = false;
      listener.remove();
      active.remove();
    };
  }, []);
  const current = links[0];
  return current || error ? (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        setError("");
        setLinks((items) => items.slice(1));
      }}
    >
      <View style={[styles.page, { padding: 16 }]}>
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          {!!error && (
            <>
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
              <Button title="Close" onPress={() => setError("")} />
            </>
          )}
          {current && (
            <SharedLinkCard
              key={current.key}
              link={current.link}
              onClose={() => setLinks((items) => items.slice(1))}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  ) : null;
}
