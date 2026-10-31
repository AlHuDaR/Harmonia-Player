import { Text } from "@/components/LocalizedText";
import { SafeAreaView } from "react-native-safe-area-context";
import VideoRow from "@/components/VideoRow";
import SearchInput from "@/components/SearchInput";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { Button, EmptyState, useMediaStyles } from "@/components/MediaUI";
import { searchYouTube } from "@/utils/youtube";
import { SearchController } from "@/utils/searchController";
import { useTheme } from "@/utils/theme";
import { useLocale } from "@/utils/i18n";

export default function SearchScreen() {
  const styles = useMediaStyles();
  const theme = useTheme();
  const { t } = useLocale();
  const [controller] = useState(() => new SearchController(searchYouTube));
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => () => controller.dispose(), [controller]);
  const busy =
    state.status === "loading" ||
    state.status === "debouncing" ||
    state.loadingMore;
  return (
    <SafeAreaView style={styles.page} edges={["left", "right"]}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={styles.title}>Search</Text>
        <SearchInput
          accessibilityLabel="Search query"
          placeholder="Search songs, artists, or videos"
          value={state.query}
          onChangeText={controller.setQuery}
          onSubmitEditing={controller.submit}
        />
        <Button
          title="Search"
          onPress={controller.submit}
          disabled={state.status === "loading" || state.loadingMore}
        />
        {busy && (
          <ActivityIndicator
            accessibilityLabel={t("Searching…")}
            color={theme.accent}
          />
        )}
        {!!state.error && (
          <>
            <Text accessibilityRole="alert" style={styles.error}>
              {state.error}
            </Text>
            <Button title="Retry" onPress={controller.retry} />
          </>
        )}
      </View>
      <FlatList
        data={state.results}
        keyExtractor={(track) => track.id}
        renderItem={({ item }) => <VideoRow track={item} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        onEndReached={controller.more}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !busy && !state.error ? (
            state.status === "ready" ? (
              <EmptyState
                icon="search"
                title="No results found."
                description="Try another title or artist."
              />
            ) : (
              <EmptyState
                icon="search"
                title="Find your next listen"
                description="Search YouTube by title or artist. You can also open a link or import a file in Library."
              />
            )
          ) : null
        }
        ListFooterComponent={
          state.nextPage ? (
            <Button
              title={busy ? "Loading…" : "Load more"}
              onPress={controller.more}
              disabled={busy || !!state.error}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
