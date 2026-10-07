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
} from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
import { deleteDownload, downloadTrack } from "@/utils/downloads";
import { message } from "@/types/media";
import { useTheme } from "@/utils/theme";
export default function DownloadsScreen() {
  const styles = useMediaStyles();
  const theme = useTheme();
  const downloads = usePlayerStore((s) => s.downloads);
  const offline = downloads
    .filter((d) => d.status === "complete" && d.track.localUri)
    .map((d) => d.track);
  const [error, setError] = useState("");
  return (
    <Page title="Downloads">
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
      {downloads.map((d) => (
        <SurfaceCard key={d.track.id}>
          <Text
            style={{ color: d.status === "failed" ? theme.error : theme.muted }}
          >
            {d.status === "complete"
              ? "Ready offline"
              : d.status === "failed"
                ? "Download failed"
                : "Downloading"}
          </Text>
          {d.status === "downloading" && (
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
              </Text>
            </>
          )}
          {!!d.error && <Text style={styles.error}>{d.error}</Text>}
          <TrackCard
            compact
            track={d.track}
            list={d.status === "complete" ? offline : undefined}
          />
          {d.status === "failed" && (
            <Button
              title="Retry download"
              onPress={() =>
                downloadTrack(d.track).catch((e) => setError(message(e)))
              }
            />
          )}
          {d.status !== "downloading" && (
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
