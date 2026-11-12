import { useState } from "react";
import { Linking } from "react-native";
import { Text } from "./LocalizedText";
import { Button, useMediaStyles } from "./MediaUI";
export const REPOSITORY = "https://github.com/AlHuDaR/Harmonia-Player";
export default function RepositoryLink({
  issues = false,
}: {
  issues?: boolean;
}) {
  const [error, setError] = useState("");
  const styles = useMediaStyles();
  return (
    <>
      <Button
        title={issues ? "Open GitHub Issues" : "Open repository"}
        onPress={() => {
          setError("");
          void Linking.openURL(REPOSITORY + (issues ? "/issues" : "")).catch(() =>
            setError("Could not open GitHub."),
          );
        }}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </>
  );
}
