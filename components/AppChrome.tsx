import { useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./LocalizedText";
import { useLocale } from "@/utils/i18n";
import { useTheme } from "@/utils/theme";
import { usePlayerStore } from "@/store/playerStore";
const menu = [
  ["Settings", "/settings", "settings"],
  ["About Harmonia", "/about", "info-outline"],
  ["Support the Developer", "/support", "favorite-border"],
  ["Source Code & Licenses", "/licenses", "code"],
] as const;
const tabs = [
  ["Home", "/", "home"],
  ["Recent", "/samples", "history"],
  ["Search", "/explore", "search"],
  ["Library", "/library", "library-music"],
] as const;
export function Header() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const { t, rtl } = useLocale();
  const insets = useSafeAreaInsets();
  const dismiss = () => setOpen(false);
  return (
    <>
      <View
        style={{
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View
          style={{
            height: 44,
            flexDirection: "row",
            direction: "ltr",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Open menu")}
            onPress={() => setOpen(true)}
            style={{
              width: 44,
              height: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="menu" size={22} color={theme.text} />
          </Pressable>
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 22, height: 22, borderRadius: 6 }}
          />
          <Text
            raw
            style={{ color: theme.text, fontSize: 15, fontWeight: "700" }}
          >
            Harmonia
          </Text>
        </View>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.scrim,
            direction: rtl ? "rtl" : "ltr",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Close menu")}
            onPress={dismiss}
            style={{ position: "absolute", inset: 0 }}
          />
          <View
            style={{
              width: "82%",
              maxWidth: 330,
              height: "100%",
              padding: 16,
              paddingTop: insets.top + 12,
              backgroundColor: theme.surface,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text
                raw
                style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}
              >
                Harmonia
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Close menu")}
                onPress={dismiss}
                style={{ padding: 12 }}
              >
                <MaterialIcons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>
            {menu.map(([label, path, icon]) => (
              <Pressable
                key={path}
                accessibilityRole="button"
                accessibilityLabel={t(label)}
                onPress={() => {
                  dismiss();
                  usePlayerStore.getState().setExpanded(false);
                  router.navigate(path as Href);
                }}
                style={{
                  minHeight: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingVertical: 10,
                }}
              >
                <MaterialIcons name={icon} size={21} color={theme.muted} />
                <Text style={{ color: theme.text, flex: 1, flexShrink: 1 }}>
                  {label}
                </Text>
              </Pressable>
            ))}
            <Text
              raw
              style={{ color: theme.muted, marginTop: 24, flexShrink: 1 }}
            >
              Coded By AlHuDaR
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}
export function BottomNavigation() {
  const theme = useTheme();
  const { t } = useLocale();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityLabel={t("Main navigation")}
      style={{
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderColor: theme.border,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        flexDirection: "row",
        flexShrink: 0,
      }}
    >
      {tabs.map(([label, href, icon]) => {
        const selected =
          path === href || (href === "/library" && path === "/downloads");
        const color = selected ? theme.accent : theme.muted;
        return (
          <Pressable
            key={href}
            accessibilityRole="tab"
            accessibilityLabel={t(label)}
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => {
              usePlayerStore.getState().setExpanded(false);
              router.navigate(href as Href);
            }}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 54,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <MaterialIcons name={icon} size={22} color={color} style={{ backgroundColor: selected ? theme.selected : "transparent", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 3 }} />
            <Text style={{ color, fontSize: 11, textAlign: "center" }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
