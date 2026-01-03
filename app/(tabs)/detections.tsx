import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

type StatusFilter = "all" | "new" | "processed" | "ignored";
type SourceFilter = "all" | "shopee" | "general";

export default function DetectionsScreen() {
  const colors = useColors();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: detections,
    isLoading,
    refetch,
  } = trpc.detections.list.useQuery(
    { filter: sourceFilter },
    {
      enabled: isAuthenticated,
    }
  );

  const updateStatusMutation = trpc.detections.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredDetections = detections?.filter((d) => {
    if (statusFilter === "all") return true;
    return d.status === statusFilter;
  });

  const handleOpenUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("錯誤", "無法開啟此連結");
      }
    } catch (error) {
      Alert.alert("錯誤", "開啟連結時發生錯誤");
    }
  };

  const handleUpdateStatus = (
    id: number,
    currentStatus: string,
    title: string
  ) => {
    const options: { text: string; status: "new" | "processed" | "ignored" }[] =
      [];

    if (currentStatus !== "processed") {
      options.push({ text: "標記為已處理", status: "processed" });
    }
    if (currentStatus !== "ignored") {
      options.push({ text: "標記為忽略", status: "ignored" });
    }
    if (currentStatus !== "new") {
      options.push({ text: "標記為新發現", status: "new" });
    }

    Alert.alert(
      "更新狀態",
      `「${title || "無標題"}」`,
      [
        ...options.map((opt) => ({
          text: opt.text,
          onPress: () => updateStatusMutation.mutate({ id, status: opt.status }),
        })),
        { text: "取消", style: "cancel" as const },
      ],
      { cancelable: true }
    );
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return colors.error;
      case "processed":
        return colors.success;
      case "ignored":
        return colors.muted;
      default:
        return colors.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new":
        return "新發現";
      case "processed":
        return "已處理";
      case "ignored":
        return "已忽略";
      default:
        return status;
    }
  };

  const statusButtons: { label: string; value: StatusFilter }[] = [
    { label: "全部", value: "all" },
    { label: "新發現", value: "new" },
    { label: "已處理", value: "processed" },
    { label: "已忽略", value: "ignored" },
  ];

  const sourceButtons: { label: string; value: SourceFilter; color?: string }[] = [
    { label: "全部來源", value: "all" },
    { label: "蝦皮", value: "shopee", color: "#EE4D2D" },
    { label: "其他", value: "general" },
  ];

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
          <IconSymbol
            name="exclamationmark.shield"
            size={64}
            color={colors.tint}
          />
          <Text className="text-xl font-bold text-foreground">請先登入</Text>
          <Text className="text-base text-muted text-center">
            登入後即可查看偵測記錄
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-3xl font-bold text-foreground">偵測記錄</Text>
          <Text className="text-base text-muted mt-1">
            查看所有發現的冒用記錄
          </Text>
        </View>

        {/* Source Filter Pills */}
        <View style={styles.sourceFilterContainer}>
          {sourceButtons.map((btn) => (
            <Pressable
              key={btn.value}
              style={({ pressed }) => [
                styles.sourcePill,
                {
                  backgroundColor:
                    sourceFilter === btn.value
                      ? btn.color || colors.tint
                      : colors.surface,
                  borderColor:
                    sourceFilter === btn.value
                      ? btn.color || colors.tint
                      : colors.border,
                },
                pressed && styles.buttonPressedLight,
              ]}
              onPress={() => setSourceFilter(btn.value)}
            >
              {btn.value === "shopee" && (
                <View style={styles.shopeeIconSmall}>
                  <Text style={styles.shopeeIconTextSmall}>蝦</Text>
                </View>
              )}
              <Text
                style={{
                  color:
                    sourceFilter === btn.value ? "#FFFFFF" : colors.foreground,
                  fontWeight: sourceFilter === btn.value ? "600" : "400",
                  fontSize: 13,
                }}
              >
                {btn.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Status Filter Tabs */}
        <View
          style={[styles.filterContainer, { borderBottomColor: colors.border }]}
        >
          {statusButtons.map((btn) => (
            <Pressable
              key={btn.value}
              style={({ pressed }) => [
                styles.filterButton,
                statusFilter === btn.value && {
                  borderBottomColor: colors.tint,
                  borderBottomWidth: 2,
                },
                pressed && styles.buttonPressedLight,
              ]}
              onPress={() => setStatusFilter(btn.value)}
            >
              <Text
                style={{
                  color:
                    statusFilter === btn.value ? colors.tint : colors.muted,
                  fontWeight: statusFilter === btn.value ? "600" : "400",
                }}
              >
                {btn.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <FlatList
            data={filteredDetections}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 24, paddingTop: 16 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View className="items-center py-12">
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={64}
                  color={colors.success}
                />
                <Text className="text-foreground font-medium mt-4">
                  {statusFilter === "all"
                    ? sourceFilter === "shopee"
                      ? "沒有蝦皮冒用記錄"
                      : "目前沒有偵測記錄"
                    : `沒有${getStatusLabel(statusFilter)}的記錄`}
                </Text>
                <Text className="text-muted text-sm text-center mt-2">
                  執行掃描以偵測冒用情況
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.detectionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: item.isShopee ? "#EE4D2D40" : colors.border,
                  },
                ]}
              >
                {/* Shopee Banner */}
                {item.isShopee && (
                  <View style={styles.shopeeBanner}>
                    <View style={styles.shopeeIconSmall}>
                      <Text style={styles.shopeeIconTextSmall}>蝦</Text>
                    </View>
                    <Text style={styles.shopeeBannerText}>蝦皮賣場</Text>
                    {item.shopeeShopName && (
                      <Text style={styles.shopeeShopName}>
                        {item.shopeeShopName}
                      </Text>
                    )}
                  </View>
                )}

                {/* Card Content */}
                <Pressable
                  style={({ pressed }) => [
                    styles.cardContent,
                    pressed && styles.buttonPressedLight,
                  ]}
                  onPress={() => handleOpenUrl(item.sourceUrl)}
                >
                  <View className="flex-row items-start gap-3">
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: getStatusColor(item.status) + "20" },
                      ]}
                    >
                      <IconSymbol
                        name={
                          item.status === "new"
                            ? "exclamationmark.triangle"
                            : item.status === "processed"
                            ? "checkmark.circle.fill"
                            : "eye.slash"
                        }
                        size={20}
                        color={getStatusColor(item.status)}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-foreground font-medium text-base"
                        numberOfLines={2}
                      >
                        {item.pageTitle || "無標題"}
                      </Text>
                      {item.snippet && (
                        <Text
                          className="text-muted text-sm mt-1"
                          numberOfLines={3}
                        >
                          {item.snippet}
                        </Text>
                      )}
                      <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: getStatusColor(item.status) + "20" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: getStatusColor(item.status) },
                            ]}
                          >
                            {getStatusLabel(item.status)}
                          </Text>
                        </View>
                        <Text className="text-muted text-xs">
                          {item.serialNumber}
                        </Text>
                        <Text className="text-muted text-xs">•</Text>
                        <Text className="text-muted text-xs">
                          {formatDate(item.detectedAt)}
                        </Text>
                      </View>
                    </View>
                    <IconSymbol
                      name="arrow.up.right"
                      size={16}
                      color={colors.muted}
                    />
                  </View>
                </Pressable>

                {/* Action Row */}
                <View
                  style={[styles.actionRow, { borderTopColor: colors.border }]}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed && styles.buttonPressedLight,
                    ]}
                    onPress={() =>
                      handleUpdateStatus(
                        item.id,
                        item.status,
                        item.pageTitle || ""
                      )
                    }
                  >
                    <IconSymbol name="pencil" size={16} color={colors.tint} />
                    <Text style={{ color: colors.tint }} className="text-sm ml-1">
                      更新狀態
                    </Text>
                  </Pressable>
                  {item.isShopee && (
                    <>
                      <View
                        style={[
                          styles.actionDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          pressed && styles.buttonPressedLight,
                        ]}
                        onPress={() =>
                          Linking.openURL(
                            "https://shopee.tw/buyer/report/product"
                          )
                        }
                      >
                        <IconSymbol
                          name="exclamationmark.triangle"
                          size={16}
                          color="#EE4D2D"
                        />
                        <Text style={{ color: "#EE4D2D" }} className="text-sm ml-1">
                          向蝦皮舉報
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            )}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sourceFilterContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 8,
  },
  sourcePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  shopeeIconSmall: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: "#EE4D2D",
    alignItems: "center",
    justifyContent: "center",
  },
  shopeeIconTextSmall: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  filterButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: -1,
  },
  buttonPressedLight: {
    opacity: 0.7,
  },
  detectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  shopeeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EE4D2D15",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  shopeeBannerText: {
    color: "#EE4D2D",
    fontSize: 12,
    fontWeight: "600",
  },
  shopeeShopName: {
    color: "#EE4D2D",
    fontSize: 12,
    fontWeight: "400",
    marginLeft: 4,
  },
  cardContent: {
    padding: 16,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  actionDivider: {
    width: 1,
    marginVertical: 8,
  },
});
