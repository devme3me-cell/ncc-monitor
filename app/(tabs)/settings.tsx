import { View, Text, Pressable, StyleSheet, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      logout();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const handleLogout = () => {
    Alert.alert("確認登出", "確定要登出嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "登出",
        style: "destructive",
        onPress: () => logoutMutation.mutate(),
      },
    ]);
  };

  const handleLogin = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/login");
  };

  return (
    <ScreenContainer className="p-6">
      <View className="gap-6">
        {/* Header */}
        <View className="gap-1">
          <Text className="text-3xl font-bold text-foreground">設定</Text>
          <Text className="text-base text-muted">管理您的帳戶與偏好設定</Text>
        </View>

        {/* Account Section */}
        <View className="gap-3">
          <Text className="text-sm font-medium text-muted uppercase tracking-wide">
            帳戶
          </Text>

          {loading ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text className="text-muted">載入中...</Text>
            </View>
          ) : isAuthenticated && user ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View className="flex-row items-center gap-4">
                <View
                  style={[styles.avatar, { backgroundColor: colors.tint + "20" }]}
                >
                  <Text style={{ color: colors.tint }} className="text-xl font-bold">
                    {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-foreground">
                    {user.name || "使用者"}
                  </Text>
                  {user.email && (
                    <Text className="text-sm text-muted">{user.email}</Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.buttonPressedLight,
              ]}
              onPress={handleLogin}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View
                    style={[styles.iconContainer, { backgroundColor: colors.tint + "20" }]}
                  >
                    <IconSymbol name="house.fill" size={20} color={colors.tint} />
                  </View>
                  <Text className="text-base font-medium text-foreground">
                    使用 Google 登入
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.muted} />
              </View>
            </Pressable>
          )}
        </View>

        {/* Info Section */}
        <View className="gap-3">
          <Text className="text-sm font-medium text-muted uppercase tracking-wide">
            關於
          </Text>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base text-foreground">應用程式版本</Text>
                <Text className="text-base text-muted">1.0.0</Text>
              </View>

              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />

              <View className="gap-2">
                <Text className="text-base font-medium text-foreground">
                  NCC 序號監控系統
                </Text>
                <Text className="text-sm text-muted leading-relaxed">
                  此應用程式可協助您管理 NCC 認證序號，並自動監控 Google
                  搜尋結果，偵測是否有其他賣家冒用您的序號。
                </Text>
              </View>

              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />

              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  功能說明
                </Text>
                <View className="gap-1">
                  <Text className="text-sm text-muted">
                    • 新增並管理您的 NCC 序號
                  </Text>
                  <Text className="text-sm text-muted">
                    • 自動掃描 Google 搜尋結果
                  </Text>
                  <Text className="text-sm text-muted">
                    • 發現冒用時即時通知
                  </Text>
                  <Text className="text-sm text-muted">
                    • 追蹤並管理偵測記錄
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        {isAuthenticated && (
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              { backgroundColor: colors.error + "15", borderColor: colors.error + "30" },
              pressed && styles.buttonPressedLight,
            ]}
            onPress={handleLogout}
          >
            <IconSymbol name="house.fill" size={20} color={colors.error} />
            <Text style={{ color: colors.error }} className="text-base font-medium ml-2">
              登出
            </Text>
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  buttonPressedLight: {
    opacity: 0.7,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
});
