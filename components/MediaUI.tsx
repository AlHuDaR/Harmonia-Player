import { useTheme } from "@/utils/theme";
import { useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Image,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./LocalizedText";
import { useLocale } from "@/utils/i18n";
import { usePlayerStore } from "@/store/playerStore";
import type { Track } from "@/types/media";
export function useMediaStyles() {
  const theme = useTheme();
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: theme.background },
    content: { padding: 16, paddingBottom: 32, gap: 12 },
    title: { color: theme.text, fontSize: 21, fontWeight: "700" },
    heading: { color: theme.text, fontSize: 18, fontWeight: "600" },
    text: { color: theme.muted, fontSize: 14 },
    input: {
      color: theme.text,
      backgroundColor: theme.surface,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
    },
    button: {
      backgroundColor: "transparent",
      borderRadius: 22,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: 44,
      justifyContent: "center",
    },
    buttonText: {
      color: theme.text,
      fontSize: 13,
      fontWeight: "500",
      flexShrink: 1,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    card: { paddingVertical: 8, gap: 8 },
    error: { color: theme.error },
  });
}
export function Page({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const styles = useMediaStyles();
  return (
    <SafeAreaView style={styles.page} edges={["left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
const icons: Record<
  string,
  React.ComponentProps<typeof MaterialIcons>["name"]
> = {
  Play: "play-arrow",
  Download: "download",
  "Add To": "playlist-add",
  Background: "headphones",
  Popup: "picture-in-picture-alt",
  "Quality / audio": "tune",
  Share: "share",
  Description: "info-outline",
  "Add to queue": "queue-music",
  "Open URL": "link",
  "Open link": "link",
  "Search songs, artists, or videos": "search",
  Downloads: "download",
  "View library": "library-music",
  "View recent": "history",
  "Play all": "play-arrow",
  "Import local audio or video": "folder-open",
};
export function Button({
  title,
  onPress,
  disabled,
  raw = false,
  expanded,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  raw?: boolean;
  expanded?: boolean;
}) {
  const theme = useTheme();
  const styles = useMediaStyles();
  const { t } = useLocale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={raw ? title : t(title)}
      accessibilityState={{ disabled: !!disabled, expanded }}
      aria-expanded={expanded}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? theme.selected : "transparent" },
        disabled && { opacity: 0.35 },
      ]}
    >
      <View style={styles.row}>
        {icons[title] && (
          <MaterialIcons name={icons[title]} color={theme.text} size={20} />
        )}
        <Text raw={raw} style={styles.buttonText}>
          {title}
        </Text>
        {expanded !== undefined && <MaterialIcons name={expanded ? "expand-less" : "expand-more"} color={theme.muted} size={22} />}
      </View>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  disabled,
  active,
  size = 25,
}: {
  name: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  size?: number;
}) {
  const theme = useTheme();
  const { t } = useLocale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(label)}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 22,
        backgroundColor: active || pressed ? theme.selected : "transparent",
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : 1,
      })}
    >
      <MaterialIcons
        name={name}
        color={active ? theme.accent : theme.text}
        size={size}
      />
    </Pressable>
  );
}
export function Input(props: React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  const styles = useMediaStyles();
  const { t, rtl } = useLocale();
  return (
    <TextInput
      {...props}
      accessibilityLabel={
        props.accessibilityLabel ? t(props.accessibilityLabel) : undefined
      }
      placeholder={props.placeholder ? t(props.placeholder) : undefined}
      placeholderTextColor={theme.muted}
      style={[styles.input, { textAlign: rtl ? "right" : "left" }, props.style]}
      autoCapitalize="none"
    />
  );
}
export function TrackCard({
  track,
  playlistId,
  list,
  compact = false,
}: {
  track: Track;
  playlistId?: string;
  list?: Track[];
  compact?: boolean;
}) {
  const theme = useTheme();
  const styles = useMediaStyles();
  const [menu, setMenu] = useState(false);
  const state = usePlayerStore();
  const { t, rtl } = useLocale();
  const favorite = state.favorites.includes(track.id);
  const play = () => {
    if (list)
      state.playList(
        list,
        list.findIndex((x) => x.id === track.id),
      );
    else state.setCurrentTrack(track);
  };
  return (
    <View
      style={[
        styles.card,
        compact && { flexDirection: "row", alignItems: "center", gap: 12 },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("Play")} ${track.title}`}
        onPress={play}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {track.cover ? (
          <Image
            source={{ uri: track.cover }}
            style={
              compact
                ? { width: 64, height: 64, borderRadius: 12 }
                : { width: "100%", aspectRatio: 16 / 9, borderRadius: 12 }
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              height: compact ? 64 : 100,
              width: compact ? 64 : "100%",
              borderRadius: 12,
              backgroundColor: theme.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="music-note" size={40} color={theme.muted} />
          </View>
        )}
      </Pressable>
      <View style={[styles.row, compact && { flex: 1, minWidth: 0 }]}>
        <Pressable
          onPress={play}
          style={{ flex: 1 }}
          accessibilityRole="button"
          accessibilityLabel={`${t("Play")} ${track.title}`}
        >
          <Text
            raw
            style={[styles.heading, compact && { fontSize: 15 }]}
            numberOfLines={2}
          >
            {track.title}
          </Text>
          <Text raw style={styles.text} numberOfLines={1}>
            {track.artist}
            {track.localUri ? ` · ${t("Offline")}` : ""}
          </Text>
        </Pressable>
        {favorite && (
          <MaterialIcons name="favorite" size={18} color={theme.accent} />
        )}
        <IconButton
          name="more-vert"
          label="More options"
          onPress={() => setMenu(true)}
        />
      </View>
      <Modal
        visible={menu}
        transparent
        animationType="slide"
        onRequestClose={() => setMenu(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: theme.scrim,
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            accessibilityLabel={t("Close")}
            onPress={() => setMenu(false)}
          />
          <SafeAreaView
            style={{
              backgroundColor: theme.surface,
              padding: 20,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              direction: rtl ? "rtl" : "ltr",
            }}
          >
            <Text raw style={styles.heading} numberOfLines={2}>
              {track.title}
            </Text>
            <Button
              title="Play"
              onPress={() => {
                setMenu(false);
                play();
              }}
            />
            <Button
              title={favorite ? "♥ Saved" : "♡ Favorite"}
              onPress={() => {
                state.addTrack(track);
                state.toggleFavorite(track.id);
                setMenu(false);
              }}
            />
            <Button
              title="Add to queue"
              onPress={() => {
                state.enqueue(track);
                setMenu(false);
              }}
            />
            {playlistId && (
              <Button
                title="Remove"
                onPress={() => {
                  state.removeFromPlaylist(playlistId, track.id);
                  setMenu(false);
                }}
              />
            )}
            <Button title="Cancel" onPress={() => setMenu(false)} />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { t } = useLocale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(title)}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 56,
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <MaterialIcons
        name={icons[title] || "more-horiz"}
        size={23}
        color={theme.text}
      />
      <Text
        style={{ color: theme.muted, fontSize: 11, textAlign: "center" }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const styles = useMediaStyles();
  return (
    <View
      style={[
        styles.row,
        { justifyContent: "space-between", flexWrap: "wrap", marginTop: 8 },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[styles.heading, { flexShrink: 1 }]}
      >
        {title}
      </Text>
      {action && onPress && <Button title={action} onPress={onPress} />}
    </View>
  );
}
export function SurfaceCard({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: 18,
        padding: 16,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}
export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useLocale();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={t(label)}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: selected ? theme.accent : theme.border,
        backgroundColor: selected || pressed ? theme.selected : theme.surface,
      })}
    >
      <Text
        style={{
          color: selected ? theme.accent : theme.text,
          fontWeight: selected ? "700" : "500",
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function EmptyState({
  icon = "music-note",
  title,
  description,
  action,
  onPress,
}: {
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  description: string;
  action?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const styles = useMediaStyles();
  return (
    <SurfaceCard>
      <MaterialIcons name={icon} size={28} color={theme.accent} />
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.text}>{description}</Text>
      {action && onPress && <Button title={action} onPress={onPress} />}
    </SurfaceCard>
  );
}
