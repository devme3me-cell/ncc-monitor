import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { getApiBaseUrl } from "@/constants/oauth";

type AuthMode = "login" | "register";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { refresh } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = mode === "login";

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("錯誤", "請輸入電子郵件和密碼");
      return;
    }

    if (!isLogin && !name.trim()) {
      Alert.alert("錯誤", "請輸入您的名稱");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin
        ? { email: email.trim(), password }
        : { email: email.trim(), password, name: name.trim() };

      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("錯誤", data.error || (isLogin ? "登入失敗" : "註冊失敗"));
        return;
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Refresh auth state
      await refresh();

      // Navigate to home
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Auth error:", error);
      Alert.alert("錯誤", "網路連線失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(isLogin ? "register" : "login");
    setPassword("");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressedLight,
            ]}
            onPress={handleBack}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.tint} />
            <Text style={{ color: colors.tint, fontSize: 16, marginLeft: 4 }}>
              返回
            </Text>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <View
              style={[styles.iconContainer, { backgroundColor: colors.tint + "15" }]}
            >
              <IconSymbol name="shield.fill" size={48} color={colors.tint} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              NCC 序號監控
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {isLogin ? "登入以使用監控功能" : "建立新帳號"}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  名稱
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
                  placeholder="您的名稱"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                電子郵件
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
                placeholder="your@email.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                密碼
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  placeholder="至少 6 個字元"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <Pressable
                  style={[styles.eyeButton, { backgroundColor: colors.surface }]}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <IconSymbol
                    name={showPassword ? "eye.slash" : "eye"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: colors.tint },
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? "登入" : "註冊"}
                </Text>
              )}
            </Pressable>

            {/* Toggle Mode */}
            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleText, { color: colors.muted }]}>
                {isLogin ? "還沒有帳號？" : "已經有帳號？"}
              </Text>
              <Pressable onPress={toggleMode}>
                <Text style={[styles.toggleLink, { color: colors.tint }]}>
                  {isLogin ? "立即註冊" : "立即登入"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.muted }]}>
              登入即表示您同意我們的服務條款
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 16,
  },
  buttonPressedLight: {
    opacity: 0.7,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeButton: {
    position: "absolute",
    right: 4,
    top: 4,
    bottom: 4,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 4,
  },
  toggleText: {
    fontSize: 14,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
  },
});
