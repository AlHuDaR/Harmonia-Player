import { useState } from "react";
import { View } from "react-native";
import { Text } from "./LocalizedText";
import { Input, Button, useMediaStyles } from "./MediaUI";
import { youtubeTrack } from "@/utils/youtube";
import { directTrack, message } from "@/types/media";
import { usePlayerStore } from "@/store/playerStore";
import { importMedia } from "@/utils/downloads";
export default function OpenMedia() {
  const styles = useMediaStyles();
  const [show, setShow] = useState(false),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    setError("");
    try {
      usePlayerStore
        .getState()
        .setCurrentTrack((await youtubeTrack(url)) || directTrack(url));
      setUrl("");
      setShow(false);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Button title="Open link" onPress={() => setShow(!show)} />
        <Button
          title="Import local audio or video"
          onPress={() => importMedia().catch((e) => setError(message(e)))}
        />
      </View>
      {show && (
        <>
          <Input
            accessibilityLabel="Media URL"
            placeholder="YouTube link or direct media URL"
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={open}
          />
          <Button
            title={busy ? "Opening…" : "Open URL"}
            onPress={open}
            disabled={busy}
          />
        </>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
