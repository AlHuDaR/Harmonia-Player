import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { NativeModules, Platform, Switch, View, Linking } from "react-native";
import { Text } from "@/components/LocalizedText";
import {
  Page,
  Button,
  ChoiceChip,
  SurfaceCard,
  useMediaStyles,
} from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
import { useLocale } from "@/utils/i18n";
import { useTheme } from "@/utils/theme";
import ThemePicker from "@/components/ThemePicker";
export default function SettingsScreen() {
  const { language, t } = useLocale();
  const styles = useMediaStyles();
  const theme = useTheme();
  const { settings, autoQueue, updateSettings } = usePlayerStore();
  const [feedback, setFeedback] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const hasHistory = usePlayerStore((state) => state.history.length > 0);
  useFocusEffect(useCallback(() => () => setConfirmClear(false), []));
  return (
    <Page title="Settings">
      <SurfaceCard>
        <Text style={styles.heading}>Appearance</Text>
        <View style={{ ...styles.row, flexWrap: "wrap" }}>
          {(["light", "dark", "system"] as const).map((value) => (
            <ChoiceChip
              key={value}
              selected={settings.theme === value}
              label={value[0].toUpperCase() + value.slice(1)}
              onPress={() => updateSettings({ theme: value })}
            />
          ))}
        </View>
        <Text style={styles.text}>Color palette</Text>
        <ThemePicker />
        <Text style={styles.text}>
          AMOLED Black uses a true black background in Dark mode.
        </Text>
        <Text style={styles.text}>Surface transparency</Text>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          <ChoiceChip
            label="Subtle"
            selected={settings.transparency === "subtle"}
            onPress={() => updateSettings({ transparency: "subtle" })}
          />
          <ChoiceChip
            label="Solid"
            selected={settings.transparency === "solid"}
            onPress={() => updateSettings({ transparency: "solid" })}
          />
        </View>
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.heading}>Language</Text>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          <ChoiceChip
            label="English"
            selected={language === "en"}
            onPress={() => usePlayerStore.setState({ language: "en" })}
          />
          <ChoiceChip
            label="العربية"
            selected={language === "ar"}
            onPress={() => usePlayerStore.setState({ language: "ar" })}
          />
        </View>
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.heading}>Playback</Text>
        {(
          [
            [
              "Background playback",
              settings.background,
              (background: boolean) => updateSettings({ background }),
            ],
            [
              "Automatic Picture in Picture",
              settings.autoPip,
              (autoPip: boolean) => updateSettings({ autoPip }),
            ],
            [
              "Auto-enqueue related videos",
              autoQueue,
              (value: boolean) => usePlayerStore.setState({ autoQueue: value }),
            ],
          ] as const
        ).map(([label, value, onValueChange]) => (
          <View key={label} style={styles.row}>
            <Text style={{ ...styles.text, flex: 1 }}>{label}</Text>
            <Switch
              accessibilityLabel={t(label)}
              value={value}
              onValueChange={onValueChange}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor={theme.dark ? theme.text : theme.surface}
            />
          </View>
        ))}
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.heading}>Downloads</Text>
        <Text style={styles.text}>Preferred download format</Text>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {(["audio", "video"] as const).map((kind) => (
            <ChoiceChip
              key={kind}
              selected={settings.downloadKind === kind}
              label={kind === "audio" ? "Audio" : "Video"}
              onPress={() => updateSettings({ downloadKind: kind })}
            />
          ))}
        </View>
        <Text style={styles.text}>
          Choose available quality in the player before downloading.
        </Text>
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.heading}>Links</Text>
        <Text style={styles.text}>
          Share supported links from other apps using Share → Harmonia.
        </Text>
        {Platform.OS === "android" && (
          <Button
            title="Open link settings"
            onPress={() => {
              Promise.resolve()
                .then(() => NativeModules.HarmoniaIntents.openSettings())
                .catch(() => Linking.openSettings())
                .catch(() => setFeedback("Could not open link settings."));
            }}
          />
        )}
      </SurfaceCard>
      <SurfaceCard>
        <Text style={styles.heading}>Storage & Privacy</Text>
        <Text style={styles.text}>
          Favorites, playlists, downloads and the latest 100 played tracks
          persist on this device. Uninstalling removes app-private files.
        </Text>
        <Text style={styles.text}>
          Normal updates keep your library and preferences.
        </Text>
        <Text style={styles.text}>
          Your library stays on this device. Online media and search requests are sent to the relevant provider.
        </Text>
        {confirmClear ? (
          <View style={{ gap: 8 }}>
            <Text accessibilityRole="alert" style={styles.text}>
              Remove all tracks from your listening history?
            </Text>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              <Button title="Cancel" onPress={() => setConfirmClear(false)} />
              <Button title="Clear history" onPress={() => {
                usePlayerStore.getState().clearHistory();
                setConfirmClear(false);
                setFeedback("History cleared.");
              }} />
            </View>
          </View>
        ) : (
          <Button title="Clear listening history" disabled={!hasHistory} onPress={() => {
            setFeedback("");
            setConfirmClear(true);
          }} />
        )}
        {feedback === "History cleared." && (
          <Text accessibilityRole="alert" style={styles.text}>{feedback}</Text>
        )}
      </SurfaceCard>
      <SurfaceCard>
        <Button title="About Harmonia" onPress={() => router.navigate("/about")} />
      </SurfaceCard>
      {!!feedback && feedback !== "History cleared." && (
        <Text accessibilityRole="alert" style={styles.text}>
          {feedback}
        </Text>
      )}
    </Page>
  );
}
