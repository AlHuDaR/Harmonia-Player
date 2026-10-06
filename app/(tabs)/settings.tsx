import { useState } from "react";
import { Text, Switch, View } from "react-native";
import { Page, Input, Button, styles } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
export default function SettingsScreen() {
  const settings = usePlayerStore((s) => s.settings);
  const [key, setKey] = useState(settings.youtubeApiKey);
  const [resolver, setResolver] = useState(settings.resolverUrl);
  const [feedback, setFeedback] = useState("");
  function save() {
    try {
      if (resolver.trim()) {
        const url = new URL(resolver.trim());
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          url.search ||
          url.hash
        )
          throw new Error(
            "Enter an HTTPS resolver URL without credentials, query, or fragment.",
          );
      }
      usePlayerStore
        .getState()
        .updateSettings({
          youtubeApiKey: key.trim(),
          resolverUrl: resolver.trim().replace(/\/$/, ""),
        });
      setFeedback("Settings saved on this device.");
    } catch {
      setFeedback(
        "Enter an HTTPS resolver URL without credentials, query, or fragment.",
      );
    }
  }
  return (
    <Page title="Settings">
      <Text style={styles.heading}>Playback</Text>
      <View style={styles.row}>
        <Text style={{ ...styles.text, flex: 1 }}>
          Background playback & media controls
        </Text>
        <Switch
          accessibilityLabel="Background playback"
          value={settings.background}
          onValueChange={(background) =>
            usePlayerStore.getState().updateSettings({ background })
          }
        />
      </View>
      <View style={styles.row}>
        <Text style={{ ...styles.text, flex: 1 }}>
          Automatic Picture in Picture
        </Text>
        <Switch
          accessibilityLabel="Automatic Picture in Picture"
          value={settings.autoPip}
          onValueChange={(autoPip) =>
            usePlayerStore.getState().updateSettings({ autoPip })
          }
        />
      </View>
      <Text style={styles.heading}>YouTube integration</Text>
      <Text style={styles.text}>
        Optional. Keys are stored locally in app storage, not encrypted. Use a
        restricted YouTube Data API key, never a privileged server credential.
        Playback requires your own resolver service.
      </Text>
      <Input
        accessibilityLabel="YouTube API key"
        placeholder="YouTube Data API key"
        value={key}
        onChangeText={setKey}
        secureTextEntry
        autoCorrect={false}
      />
      <Input
        accessibilityLabel="Resolver URL"
        placeholder="https://your-resolver.example.com"
        value={resolver}
        onChangeText={setResolver}
        keyboardType="url"
        autoCorrect={false}
      />
      <Button title="Save settings" onPress={save} />
      {!!feedback && (
        <Text accessibilityRole="alert" style={styles.text}>
          {feedback}
        </Text>
      )}
      <Text style={styles.heading}>Storage</Text>
      <Text style={styles.text}>
        Favorites, playlists, downloads and the latest 100 played tracks persist
        on this device. Uninstalling removes app-private files.
      </Text>
      <Button
        title="Clear listening history"
        onPress={() => {
          usePlayerStore.getState().clearHistory();
          setFeedback("History cleared.");
        }}
      />
      <Text style={styles.text}>
        Harmonia Player 1.1.0 · Audio and video playback with Expo Video
      </Text>
    </Page>
  );
}
