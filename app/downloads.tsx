import { Text } from "@/components/LocalizedText";
import { useState } from "react";
import { View } from "react-native";
import {
  Page,
  TrackCard,
  Button,
  EmptyState,
  SurfaceCard,
  useMediaStyles,
  Input,
  ChoiceChip,
} from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
import {
  deleteDownload,
  downloadTrack,
  cancelDownload,
} from "@/utils/downloads";
import { message } from "@/types/media";
import { useTheme } from "@/utils/theme";
import { filterDownloads, type DownloadFilter } from "@/utils/downloadFilters";
import { useLocale } from "@/utils/i18n";
export default function DownloadsScreen() {
  const styles = useMediaStyles();
  const theme = useTheme();
  const { t } = useLocale();
  const downloads = usePlayerStore((s) => s.downloads);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DownloadFilter>("all");
  const visible = filterDownloads(downloads, query, filter);
  const offline = visible
    .filter((d) => d.status === "complete" && d.track.localUri)
    .map((d) => d.track);
  const [error, setError] = useState("");
  return (
    <Page title="Downloads">
      {!!downloads.length && <>
        <Input accessibilityLabel="Search downloads" placeholder="Search downloads" value={query} onChangeText={setQuery} />
        <View style={[styles.row, { flexWrap: "wrap" }]} accessibilityRole="radiogroup" accessibilityLabel={t("Download status")}>
          {([ ["all", "All"], ["active", "Active"], ["offline", "Offline"], ["attention", "Needs attention"] ] as const).map(([value, label]) =>
            <ChoiceChip key={value} label={label} selected={filter === value} onPress={() => setFilter(value)} />)}
        </View>
        {!visible.length && <Text style={styles.text}>No matching downloads.</Text>}
      </>}
      {!!offline.length && (
        <Button
          title="Play all"
          onPress={() => usePlayerStore.getState().playList(offline, 0)}
        />
      )}
      <Text style={styles.text}>
        Files are saved privately on this device for offline playback.
      </Text>
      {!downloads.length && (
        <EmptyState
          icon="download"
          title="No downloads yet"
          description="Use Download in the player to keep a track for offline listening."
        />
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {visible.map((d) => (
        <SurfaceCard key={d.track.id}>
          <Text
            style={{ color: d.status === "failed" ? theme.error : theme.muted }}
          >
            {d.status === "complete"
              ? "Ready offline"
              : d.status === "failed"
                ? "Download failed"
                : d.status === "cancelled"
                  ? "Download cancelled."
                  : d.status === "queued"
                    ? "Queued"
                    : d.status === "retrying"
                      ? "Waiting to retry"
                      : "Downloading"}
          </Text>
          {["queued", "downloading", "retrying"].includes(d.status) && (
            <>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round(d.progress * 100),
                }}
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.border,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.max(0, Math.min(100, d.progress * 100))}%`,
                    backgroundColor: theme.accent,
                  }}
                />
              </View>
              <Text raw style={styles.text}>
                {Math.round(d.progress * 100)}%
                {typeof d.bytesDownloaded === "number" ? ` · ${(d.bytesDownloaded / 1048576).toFixed(1)} MB` : ""}
                {d.bytesPerSecond ? ` · ${(d.bytesPerSecond / 1024).toFixed(0)} KB/s` : ""}
              </Text>
            </>
          )}
          {!!d.error && <Text style={styles.error}>{d.error}</Text>}
          <TrackCard
            compact
            track={d.track}
            list={d.status === "complete" ? offline : undefined}
          />
          {["failed", "cancelled"].includes(d.status) && (
            <Button
              title="Retry download"
              onPress={() =>
                downloadTrack(d.track).catch((e) => setError(message(e)))
              }
            />
          )}
          {d.nativeId &&
            ["queued", "downloading", "retrying"].includes(d.status) && (
              <Button
                title="Cancel download"
                onPress={() =>
                  cancelDownload(d.track.id).catch((e) => setError(message(e)))
                }
              />
            )}
          {!["queued", "downloading", "retrying"].includes(d.status) && (
            <Button
              title="Delete download"
              onPress={() =>
                deleteDownload(d.track).catch((e) => setError(message(e)))
              }
            />
          )}
        </SurfaceCard>
      ))}
    </Page>
  );
}
