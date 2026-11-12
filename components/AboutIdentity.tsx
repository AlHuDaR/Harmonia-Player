import { View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTheme } from "@/utils/theme";
import Constants from "expo-constants";
import { Text } from "./LocalizedText";
import { SurfaceCard, useMediaStyles } from "./MediaUI";
export default function AboutIdentity() {
  const styles = useMediaStyles();
  const theme = useTheme();
  return (
    <SurfaceCard>
      <View style={{ gap: 10, alignItems: "flex-start" }}>
        <View style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.selected,
        }}>
          <MaterialIcons name="play-circle-filled" size={38} color={theme.accent} />
        </View>
        <Text raw style={[styles.title, { fontSize: 27 }]}>
          Harmonia Player
        </Text>
        <Text style={styles.text}>
          Version{" "}
          {Constants.expoConfig?.version ?? require("../package.json").version}
        </Text>
        <Text
          raw
          testID="developer-credit"
          style={[styles.text, { color: theme.text, alignSelf: "stretch" }]}
        >
          Coded by AlHuDaR
        </Text>
      </View>
    </SurfaceCard>
  );
}
