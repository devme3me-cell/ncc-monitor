// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "list.bullet.rectangle": "list",
  "exclamationmark.shield": "security",
  "shield.fill": "shield",
  "gearshape.fill": "settings",
  // Actions
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "trash": "delete",
  "pencil": "edit",
  "magnifyingglass": "search",
  "arrow.clockwise": "refresh",
  "xmark": "close",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  // Status
  "exclamationmark.triangle": "warning",
  "exclamationmark.circle": "error",
  "info.circle": "info",
  "bell.fill": "notifications",
  "bell.badge.fill": "notifications-active",
  // Misc
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "arrow.up.right": "open-in-new",
  "doc.text": "description",
  "clock": "schedule",
  "eye": "visibility",
  "eye.slash": "visibility-off",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
