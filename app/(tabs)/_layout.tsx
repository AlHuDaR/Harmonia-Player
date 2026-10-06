import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
const tabs = [
  ["index", "Home", "home"],
  ["explore", "Search", "search"],
  ["downloads", "Downloads", "download"],
  ["library", "Library", "library-music"],
  ["settings", "Settings", "settings"],
] as const;
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#151925", borderTopColor: "#282d40" },
        tabBarActiveTintColor: "#b7c4ff",
        tabBarInactiveTintColor: "#929ab4",
      }}
    >
      {tabs.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ size, color }) => (
              <MaterialIcons name={icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
