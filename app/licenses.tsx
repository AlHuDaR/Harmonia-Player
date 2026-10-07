import { useState } from "react";
import { Linking } from "react-native";
import { Page, Button, useMediaStyles } from "@/components/MediaUI";
import { Text } from "@/components/LocalizedText";
import RepositoryLink, { REPOSITORY } from "@/components/RepositoryLink";
export default function LicensesScreen() {
  const styles = useMediaStyles();
  const [error, setError] = useState("");
  return (
    <Page title="Source Code & Licenses">
      <Text raw style={styles.heading}>
        GPL-3.0-or-later
      </Text>
      <Text style={styles.text}>
        Harmonia is free software. Source code and license terms are available
        in the repository.
      </Text>
      <Text raw selectable style={styles.text}>
        {REPOSITORY}
      </Text>
      <RepositoryLink />
      <Text style={styles.heading}>NewPipe Extractor</Text>
      <Text style={styles.text}>
        Uses NewPipe Extractor by Team NewPipe under GPL-3.0-or-later.
      </Text>
      <Text style={styles.text}>
        Other dependencies retain their respective licenses. See the third-party
        notices and bundled dependency license files.
      </Text>
      <Button
        title="Third-party notices"
        onPress={() =>
          Linking.openURL(
            `${REPOSITORY}/blob/main/THIRD_PARTY_NOTICES.md`,
          ).catch(() => setError("Could not open the source link."))
        }
      />
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </Page>
  );
}
