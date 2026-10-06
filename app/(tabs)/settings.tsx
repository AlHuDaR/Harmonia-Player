import { useLocale } from "@/utils/i18n";
import { NativeModules, Platform } from "react-native";
import { Text } from "@/components/LocalizedText";
import { useState } from "react";
import { Switch, View, Linking } from "react-native";
import { Page, Button, styles } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
export default function SettingsScreen() {
  const { language, t } = useLocale();
  const settings = usePlayerStore((s) => s.settings);
  const [feedback, setFeedback] = useState("");
  return (
    <Page title="Settings">
      <Text style={styles.heading}>Language</Text>
      <View style={styles.row}>
        <Button
          title={language === "en" ? "✓ English" : "English"}
          onPress={() => usePlayerStore.setState({ language: "en" })}
        />
        <Button
          title={language === "ar" ? "✓ العربية" : "العربية"}
          onPress={() => usePlayerStore.setState({ language: "ar" })}
        />
      </View>
      <Text style={styles.heading}>YouTube links</Text>
      <Text style={styles.text}>
        Share a YouTube link to Harmonia, or enable supported links in Android
        settings.
      </Text>
      {Platform.OS === "android" && (
        <Button
          title="Open link settings"
          onPress={() =>
            NativeModules.HarmoniaIntents.openSettings().catch(() =>
              Linking.openSettings(),
            )
          }
        />
      )}
      <Text style={styles.heading}>Privacy</Text>
      <Text style={styles.text}>
        Your library stays on this device. YouTube receives requests when you
        search or stream. No advertising or analytics SDK is included.
      </Text>
      <Text style={styles.heading}>Playback</Text>
      <View style={styles.row}>
        <Text style={{ ...styles.text, flex: 1 }}>
          Background playback & media controls
        </Text>
        <Switch
          accessibilityLabel={t("Background playback")}
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
          accessibilityLabel={t("Automatic Picture in Picture")}
          value={settings.autoPip}
          onValueChange={(autoPip) =>
            usePlayerStore.getState().updateSettings({ autoPip })
          }
        />
      </View>
      <Text style={styles.heading}>YouTube</Text>
      <Text style={styles.text}>
        Search, playback and downloads run directly on this Android device using
        NewPipe Extractor. No API key, Google login or resolver server is
        required. Restricted videos and YouTube changes can affect availability.
      </Text>
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
      <Text style={styles.text}>Harmonia Player 1.4.0 · Coded By AlHuDaR</Text>
      <Text style={styles.heading}>Support the developer</Text>
      <Text style={styles.text}>
        Enjoying Harmonia? Your support helps development and improvements.
      </Text>
      <Text style={styles.text}>
        Donations will be available here once a payment method is added.
      </Text>
      <Button
        title="Source code and licences"
        onPress={() => {
          Linking.openURL(
            "https://github.com/AlHuDaR/Harmonia-Player/tree/feat/on-device-youtube",
          ).catch(() => setFeedback("Could not open the source link."));
        }}
      />
      <Text style={styles.text}>
        GPL-3.0-or-later · Uses NewPipe Extractor v0.26.5 by Team NewPipe.
        Source and licence: github.com/AlHuDaR/Harmonia-Player
      </Text>
    </Page>
  );
}
