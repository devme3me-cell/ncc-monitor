import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Switch,
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

interface SerialFormData {
  name: string;
  serialNumber: string;
  isActive: boolean;
}

export default function SerialsScreen() {
  const colors = useColors();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<SerialFormData>({
    name: "",
    serialNumber: "",
    isActive: true,
  });
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: serials,
    isLoading,
    refetch,
  } = trpc.serials.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.serials.create.useMutation({
    onSuccess: () => {
      refetch();
      closeModal();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const updateMutation = trpc.serials.update.useMutation({
    onSuccess: () => {
      refetch();
      closeModal();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const deleteMutation = trpc.serials.delete.useMutation({
    onSuccess: () => {
      refetch();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const scanMutation = trpc.scan.single.useMutation({
    onSuccess: (result) => {
      refetch();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "掃描完成",
        `找到 ${result.totalResults} 筆結果，其中 ${result.newDetections} 筆為新發現`
      );
    },
    onError: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: "", serialNumber: "", isActive: true });
    setModalVisible(true);
  };

  const openEditModal = (serial: NonNullable<typeof serials>[number]) => {
    setEditingId(serial.id);
    setFormData({
      name: serial.name,
      serialNumber: serial.serialNumber,
      isActive: serial.isActive,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setFormData({ name: "", serialNumber: "", isActive: true });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.serialNumber.trim()) {
      Alert.alert("錯誤", "請填寫所有必填欄位");
      return;
    }

    if (editingId) {
      await updateMutation.mutateAsync({
        id: editingId,
        ...formData,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert("確認刪除", `確定要刪除「${name}」嗎？相關的偵測記錄也會一併刪除。`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id }),
      },
    ]);
  };

  const handleScan = (id: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    scanMutation.mutate({ serialId: id });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "從未掃描";
    const d = new Date(date);
    return d.toLocaleDateString("zh-TW", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
          <IconSymbol name="list.bullet.rectangle" size={64} color={colors.tint} />
          <Text className="text-xl font-bold text-foreground">請先登入</Text>
          <Text className="text-base text-muted text-center">
            登入後即可管理您的 NCC 序號
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
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-bold text-foreground">序號管理</Text>
              <Text className="text-base text-muted mt-1">
                管理您的 NCC 認證序號
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.addIconButton,
                { backgroundColor: colors.tint },
                pressed && styles.buttonPressed,
              ]}
              onPress={openAddModal}
            >
              <IconSymbol name="plus" size={24} color={colors.background} />
            </Pressable>
          </View>
        </View>

        {/* List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <FlatList
            data={serials}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 24, paddingTop: 0 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View className="items-center py-12">
                <IconSymbol
                  name="list.bullet.rectangle"
                  size={64}
                  color={colors.muted}
                />
                <Text className="text-foreground font-medium mt-4">
                  尚未新增任何序號
                </Text>
                <Text className="text-muted text-sm text-center mt-2">
                  點擊右上角的 + 按鈕新增序號
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.serialCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.cardContent,
                    pressed && styles.buttonPressedLight,
                  ]}
                  onPress={() => openEditModal(item)}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg font-semibold text-foreground">
                          {item.name}
                        </Text>
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor: item.isActive
                                ? colors.success
                                : colors.muted,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        className="text-base text-muted mt-1 font-mono"
                        selectable
                      >
                        {item.serialNumber}
                      </Text>
                      <Text className="text-sm text-muted mt-2">
                        最後掃描：{formatDate(item.lastScanAt)}
                      </Text>
                    </View>
                    <IconSymbol
                      name="chevron.right"
                      size={20}
                      color={colors.muted}
                    />
                  </View>
                </Pressable>

                {/* Action Buttons */}
                <View
                  style={[styles.actionRow, { borderTopColor: colors.border }]}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed && styles.buttonPressedLight,
                    ]}
                    onPress={() => handleScan(item.id)}
                    disabled={scanMutation.isPending}
                  >
                    {scanMutation.isPending &&
                    scanMutation.variables?.serialId === item.id ? (
                      <ActivityIndicator size="small" color={colors.tint} />
                    ) : (
                      <IconSymbol
                        name="magnifyingglass"
                        size={18}
                        color={colors.tint}
                      />
                    )}
                    <Text style={{ color: colors.tint }} className="text-sm ml-1">
                      掃描
                    </Text>
                  </Pressable>

                  <View
                    style={[styles.actionDivider, { backgroundColor: colors.border }]}
                  />

                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed && styles.buttonPressedLight,
                    ]}
                    onPress={() => handleDelete(item.id, item.name)}
                  >
                    <IconSymbol name="trash" size={18} color={colors.error} />
                    <Text style={{ color: colors.error }} className="text-sm ml-1">
                      刪除
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Add/Edit Modal */}
      {modalVisible && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <Pressable
              onPress={closeModal}
              style={({ pressed }) => pressed && styles.buttonPressedLight}
            >
              <Text style={{ color: colors.tint }} className="text-base">
                取消
              </Text>
            </Pressable>
            <Text className="text-lg font-semibold text-foreground">
              {editingId ? "編輯序號" : "新增序號"}
            </Text>
            <Pressable
              onPress={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              style={({ pressed }) => pressed && styles.buttonPressedLight}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text
                  style={{ color: colors.tint }}
                  className="text-base font-semibold"
                >
                  儲存
                </Text>
              )}
            </Pressable>
          </View>

          {/* Form */}
          <View className="p-6 gap-6">
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                序號名稱 *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="例如：藍牙耳機 A1"
                placeholderTextColor={colors.muted}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, name: text }))
                }
                returnKeyType="next"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                NCC 序號 *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.foreground,
                    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                  },
                ]}
                placeholder="例如：CCAH21LP1234T5"
                placeholderTextColor={colors.muted}
                value={formData.serialNumber}
                onChangeText={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    serialNumber: text.toUpperCase(),
                  }))
                }
                autoCapitalize="characters"
                returnKeyType="done"
              />
              <Text className="text-xs text-muted">
                輸入完整的 NCC 認證序號，系統會自動轉換為大寫
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-foreground">
                  啟用監控
                </Text>
                <Text className="text-xs text-muted mt-1">
                  關閉後將不會自動掃描此序號
                </Text>
              </View>
              <Switch
                value={formData.isActive}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, isActive: value }))
                }
                trackColor={{ false: colors.border, true: colors.tint + "80" }}
                thumbColor={formData.isActive ? colors.tint : colors.muted}
              />
            </View>
          </View>
        </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  addIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  buttonPressedLight: {
    opacity: 0.7,
  },
  serialCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  },
  modalContainer: {
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: Platform.OS === 'web' ? 500 : undefined,
    maxHeight: Platform.OS === 'web' ? '90%' : '100%',
    borderRadius: Platform.OS === 'web' ? 16 : 0,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      },
      default: {
        flex: 1,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
});
