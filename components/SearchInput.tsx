import { useRef } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { FocusablePressable } from "./FocusablePressable";
import { useTheme } from "@/utils/theme";
import { useLocale } from "@/utils/i18n";
import { textDirection } from "@/utils/textDirection";

export default function SearchInput({
  value = "",
  onChangeText,
  style,
  ...props
}: TextInputProps) {
  const input = useRef<TextInput>(null);
  const theme = useTheme();
  const { t, rtl } = useLocale();
  const direction = textDirection(value, rtl ? "rtl" : "ltr");
  return (
    <View
      style={{
        flexDirection: rtl ? "row-reverse" : "row",
        direction: "ltr",
        alignItems: "center",
        backgroundColor: theme.surface,
        borderRadius: 24,
        paddingHorizontal: 4,
      }}
    >
      <View pointerEvents="none" style={{ paddingHorizontal: 12 }}>
        <MaterialIcons name="search" size={22} color={theme.muted} />
      </View>
      <TextInput
        {...props}
        ref={input}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={t(props.accessibilityLabel || "Search query")}
        placeholder={props.placeholder ? t(props.placeholder) : undefined}
        placeholderTextColor={theme.muted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        style={[
          {
            flex: 1,
            minWidth: 0,
            minHeight: 48,
            paddingVertical: 12,
            fontSize: 16,
            color: theme.text,
            writingDirection: direction,
            textAlign: direction === "rtl" ? "right" : "left",
          },
          style,
        ]}
      />
      {value.length > 0 && (
        <FocusablePressable
          accessibilityRole="button"
          accessibilityLabel={t("Clear search")}
          onPress={() => {
            onChangeText?.("");
            input.current?.focus();
          }}
          style={{
            minWidth: 48,
            minHeight: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="close" size={22} color={theme.text} />
        </FocusablePressable>
      )}
    </View>
  );
}
