import { useCallback, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isScanningShopee, setIsScanningShopee] = useState(false);

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.dashboard.stats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const {
    data: detections,
    isLoading: detectionsLoading,
    refetch: refetchDetections,
  } = trpc.detections.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const scanAllMutation = trpc.scan.all.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchDetections();
    },
  });

  const scanAllShopeeMutation = trpc.scan.allShopee.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchDetections();
    },
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchDetections()]);
    setRefreshing(false);
  }, [refetchStats, refetchDetections]);

  const handleScanAll = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsScanning(true);
    try {
      await scanAllMutation.mutateAsync({});
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanShopee = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsScanningShopee(true);
    try {
      await scanAllShopeeMutation.mutateAsync();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsScanningShopee(false);
    }
  };

  const recentDetections = detections?.slice(0, 5) ?? [];

  if (authLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.tint} />
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center gap-4">
          <IconSymbol name="exclamationmark.shield" size={64} color={colors.tint} />
          <Text className="text-2xl font-bold text-foreground">NCC 序號監控</Text>
          <Text className="text-base text-muted text-center">
            請先登入以使用監控功能
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              { backgroundColor: colors.tint },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={[styles.loginButtonText, { color: colors.background }]}>
              登入
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="gap-6">
          {/* Header */}
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">監控總覽</Text>
            <Text className="text-base text-muted">
              追蹤您的 NCC 序號使用情況
            </Text>
          </View>

          {/* Stats Cards */}
          {statsLoading ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <View className="gap-3">
              {/* First Row */}
              <View className="flex-row gap-3">
                <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
                  <Text className="text-sm text-muted mb-1">監控序號</Text>
                  <Text className="text-3xl font-bold text-foreground">
                    {stats?.activeSerials ?? 0}
                  </Text>
                  <Text className="text-xs text-muted">
                    共 {stats?.totalSerials ?? 0} 個
                  </Text>
                </View>
                <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
                  <Text className="text-sm text-muted mb-1">新發現</Text>
                  <Text
                    className="text-3xl font-bold"
                    style={{
                      color:
                        (stats?.newDetections ?? 0) > 0
                          ? colors.error
                          : colors.success,
                    }}
                  >
                    {stats?.newDetections ?? 0}
                  </Text>
                  <Text className="text-xs text-muted">
                    共 {stats?.totalDetections ?? 0} 筆
                  </Text>
                </View>
              </View>

              {/* Shopee Stats Card */}
              <View
                style={[
                  styles.shopeeCard,
                  { backgroundColor: "#EE4D2D15", borderColor: "#EE4D2D30" },
                ]}
              >
                <View className="flex-row items-center gap-2 mb-2">
                  <View
                    style={[styles.shopeeIcon, { backgroundColor: "#EE4D2D" }]}
                  >
                    <Text style={styles.shopeeIconText}>蝦</Text>
                  </View>
                  <Text className="text-base font-semibold text-foreground">
                    蝦皮監控
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-2xl font-bold" style={{ color: "#EE4D2D" }}>
                      {stats?.newShopeeDetections ?? 0}
                    </Text>
                    <Text className="text-xs text-muted">
                      新發現（共 {stats?.shopeeDetections ?? 0} 筆）
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.shopeeButton,
                      { backgroundColor: "#EE4D2D" },
                      pressed && styles.buttonPressed,
                      isScanningShopee && styles.buttonDisabled,
                    ]}
                    onPress={handleScanShopee}
                    disabled={isScanningShopee}
                  >
                    {isScanningShopee ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.shopeeButtonText}>掃描蝦皮</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View className="gap-3">
            <Pressable
              style={({ pressed }) => [
                styles.scanButton,
                { backgroundColor: colors.tint },
                pressed && styles.buttonPressed,
                isScanning && styles.buttonDisabled,
              ]}
              onPress={handleScanAll}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <IconSymbol name="magnifyingglass" size={20} color={colors.background} />
              )}
              <Text style={[styles.scanButtonText, { color: colors.background }]}>
                {isScanning ? "掃描中..." : "全面掃描（含蝦皮）"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.buttonPressedLight,
              ]}
              onPress={() => router.push("/(tabs)/serials")}
            >
              <IconSymbol name="plus.circle.fill" size={20} color={colors.tint} />
              <Text style={[styles.addButtonText, { color: colors.tint }]}>
                新增序號
              </Text>
            </Pressable>
          </View>

          {/* Recent Detections */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">
                最新偵測
              </Text>
              {recentDetections.length > 0 && (
                <Pressable
                  onPress={() => router.push("/(tabs)/detections")}
                  style={({ pressed }) => pressed && styles.buttonPressedLight}
                >
                  <Text style={{ color: colors.tint }} className="text-sm">
                    查看全部
                  </Text>
                </Pressable>
              )}
            </View>

            {detectionsLoading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : recentDetections.length === 0 ? (
              <View className="bg-surface rounded-2xl p-6 items-center border border-border">
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={48}
                  color={colors.success}
                />
                <Text className="text-foreground font-medium mt-3">
                  目前沒有偵測記錄
                </Text>
                <Text className="text-muted text-sm text-center mt-1">
                  新增序號並執行掃描以開始監控
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {recentDetections.map((detection) => (
                  <Pressable
                    key={detection.id}
                    style={({ pressed }) => [
                      styles.detectionCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.buttonPressedLight,
                    ]}
                    onPress={() => router.push("/(tabs)/detections")}
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text
                            className="text-foreground font-medium flex-1"
                            numberOfLines={1}
                          >
                            {detection.pageTitle || "無標題"}
                          </Text>
                          {detection.isShopee && (
                            <View style={styles.shopeeBadge}>
                              <Text style={styles.shopeeBadgeText}>蝦皮</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-muted text-sm mt-1" numberOfLines={2}>
                          {detection.snippet || detection.sourceUrl}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-2">
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  detection.status === "new"
                                    ? colors.error + "20"
                                    : detection.status === "processed"
                                    ? colors.success + "20"
                                    : colors.muted + "20",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color:
                                    detection.status === "new"
                                      ? colors.error
                                      : detection.status === "processed"
                                      ? colors.success
                                      : colors.muted,
                                },
                              ]}
                            >
                              {detection.status === "new"
                                ? "新發現"
                                : detection.status === "processed"
                                ? "已處理"
                                : "已忽略"}
                            </Text>
                          </View>
                          <Text className="text-muted text-xs">
                            {detection.serialNumber}
                          </Text>
                        </View>
                      </View>
                      <IconSymbol
                        name="chevron.right"
                        size={16}
                        color={colors.muted}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  loginButtonText: {
    fontWeight: "600",
    fontSize: 18,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  buttonPressedLight: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  scanButton: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scanButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  addButton: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  addButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  detectionCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  shopeeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  shopeeIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  shopeeIconText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  shopeeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shopeeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  shopeeBadge: {
    backgroundColor: "#EE4D2D",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shopeeBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
});
