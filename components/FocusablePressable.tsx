import { forwardRef, useState } from "react";
import { Pressable, type View } from "react-native";
import { useTheme } from "@/utils/theme";

/** Native directional focus plus a visible focus ring for remotes and keyboards. */
export const FocusablePressable = forwardRef<View, React.ComponentProps<typeof Pressable>>(
  function FocusablePressable({ style, onFocus, onBlur, focusable, disabled, ...props }, ref) {
    const [focused, setFocused] = useState(false);
    const theme = useTheme();
    return <Pressable {...props} ref={ref} disabled={disabled} focusable={focusable ?? !disabled}
      onFocus={(event) => { setFocused(true); onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); onBlur?.(event); }}
      style={(state) => [typeof style === "function" ? style(state) : style,
        focused && { outlineColor: theme.accent, outlineWidth: 3, outlineStyle: "solid", backgroundColor: theme.selected }]} />;
  },
);
