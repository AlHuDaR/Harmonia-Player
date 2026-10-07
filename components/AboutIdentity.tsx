import { Image, View } from "react-native";
import Constants from "expo-constants";
import { Text } from "./LocalizedText";
import { useMediaStyles } from "./MediaUI";
export default function AboutIdentity() {
  const styles = useMediaStyles();
  return (
    <View style={{ gap: 10, alignItems: "flex-start" }}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={{ width: 42, height: 42, borderRadius: 12 }}
      />
      <Text raw style={styles.heading}>
        Harmonia Player
      </Text>
      <Text style={styles.text}>
        Version{" "}
        {Constants.expoConfig?.version ?? require("../package.json").version}
      </Text>
      <Text
        raw
        testID="developer-credit"
        style={{ ...styles.heading, alignSelf: "stretch", flexShrink: 1 }}
      >
        Coded By AlHuDaR
      </Text>
    </View>
  );
}
