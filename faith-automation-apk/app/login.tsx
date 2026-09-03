import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import {
  getApiBaseUrl,
  getStoredApiUrl,
  saveStoredApiUrl,
  testConnection,
  DEFAULT_API_URL,
} from '../src/api/client';
import { colors } from '../src/theme/colors';

export default function LoginScreen() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server Settings Modal State
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load stored custom server URL on mount
  useEffect(() => {
    getStoredApiUrl().then((url) => {
      setServerUrlInput(url);
    });
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      if (user.roleCode === 'ADMIN') router.replace('/(admin)/dashboard');
      else if (user.roleCode === 'MANAGER') router.replace('/(manager)/dashboard');
      else router.replace('/(guard)/home');
    }
  }, [user, isLoading]);

  // Android hardware back → exit app from login
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Login failed. Please try again.');
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    const res = await testConnection(serverUrlInput.trim());
    setTestingConnection(false);
    setConnectionResult(res);
  };

  const handleSaveServerUrl = async () => {
    if (!serverUrlInput.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid server URL');
      return;
    }
    await saveStoredApiUrl(serverUrlInput.trim());
    setServerModalVisible(false);
    setConnectionResult(null);
    setError(null);
    Alert.alert('Server Configured', `Active API URL:\n${getApiBaseUrl()}`);
  };

  const setPreset = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(insets.top + 20, 44), paddingBottom: Math.max(insets.bottom + 20, 36) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Ionicons name="laptop-outline" size={36} color={colors.cyanLight} />
          </View>
          <Text style={styles.brandTitle}>FAITH AUTOMATION</Text>
          <Text style={styles.brandSub}>IT INVENTORY & ASSET TRACKING</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Enterprise Sign In</Text>
              <Text style={styles.cardSubtitle}>Authorized employee credentials required.</Text>
            </View>
            <TouchableOpacity
              style={styles.serverSettingsBtn}
              onPress={() => setServerModalVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={18} color={colors.cyanLight} />
            </TouchableOpacity>
          </View>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>USERNAME</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={(v) => { setUsername(v); setError(null); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Enter password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.roseLight} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorText}>{error}</Text>
                {error.toLowerCase().includes('connect') && (
                  <TouchableOpacity onPress={() => setServerModalVisible(true)} style={{ marginTop: 6 }}>
                    <Text style={styles.errorActionText}>Tap to configure Server URL ⚙️</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textDark} />
            ) : (
              <>
                <Text style={styles.signInText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textDark} />
              </>
            )}
          </TouchableOpacity>

          {/* Current Server Indicator */}
          <TouchableOpacity
            style={styles.serverIndicator}
            onPress={() => setServerModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.serverStatusDot} />
            <Text style={styles.serverIndicatorText} numberOfLines={1}>
              Server: {getApiBaseUrl()}
            </Text>
            <Ionicons name="pencil-outline" size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Demo Presets */}
        <View style={styles.presetsCard}>
          <Text style={styles.presetsTitle}>DEMO ACCOUNT PRESETS</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setPreset('admin', 'admin123')}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.cyanLight} />
              <Text style={[styles.presetText, { color: colors.cyanLight }]}>Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setPreset('manager', 'manager123')}>
              <Ionicons name="briefcase-outline" size={14} color={colors.emeraldLight} />
              <Text style={[styles.presetText, { color: colors.emeraldLight }]}>Manager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setPreset('guard', 'guard123')}>
              <Ionicons name="scan-outline" size={14} color={colors.amberLight} />
              <Text style={[styles.presetText, { color: colors.amberLight }]}>Guard</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Faith Automation IT Inventory v1.0{'\n'}
          <Text style={styles.footerSub}>For authorized enterprise personnel only</Text>
        </Text>
      </ScrollView>

      {/* Server Configuration Modal */}
      <Modal
        visible={serverModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setServerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.serverModalCard}>
            <View style={styles.serverModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="server-outline" size={20} color={colors.cyanLight} />
                <Text style={styles.serverModalTitle}>Backend Server Configuration</Text>
              </View>
              <TouchableOpacity onPress={() => setServerModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.serverModalDesc}>
              Enter the LAN IP or HTTPS address of your company server running the IT Inventory backend.
            </Text>

            <View style={styles.serverInputGroup}>
              <Text style={styles.fieldLabel}>API BASE URL</Text>
              <TextInput
                style={styles.serverInput}
                placeholder="http://192.168.1.7:5000/api"
                placeholderTextColor={colors.textMuted}
                value={serverUrlInput}
                onChangeText={(v) => {
                  setServerUrlInput(v);
                  setConnectionResult(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Connection Test Result */}
            {connectionResult && (
              <View
                style={[
                  styles.testResultBox,
                  connectionResult.success ? styles.testResultSuccess : styles.testResultError,
                ]}
              >
                <Ionicons
                  name={connectionResult.success ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                  size={16}
                  color={connectionResult.success ? colors.emeraldLight : colors.roseLight}
                />
                <Text
                  style={[
                    styles.testResultText,
                    { color: connectionResult.success ? colors.emeraldLight : colors.roseLight },
                  ]}
                >
                  {connectionResult.message}
                </Text>
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.serverModalActions}>
              <TouchableOpacity
                style={styles.testBtn}
                onPress={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color={colors.cyanLight} />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={15} color={colors.cyanLight} />
                    <Text style={styles.testBtnText}>Test Connection</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setServerUrlInput(DEFAULT_API_URL);
                  setConnectionResult(null);
                }}
              >
                <Text style={styles.resetBtnText}>Default</Text>
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveServerBtn} onPress={handleSaveServerUrl}>
              <Text style={styles.saveServerBtnText}>Save & Apply Server</Text>
            </TouchableOpacity>

            <Text style={styles.troubleHint}>
              💡 Tip: Verify phone and computer are on the same Wi-Fi, or that your Windows Wi-Fi network profile is set to "Private".
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 24, gap: 20 },
  brand: { alignItems: 'center', gap: 10 },
  logoBox: {
    width: 76, height: 76, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderCyan,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.cyanLight, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  brandTitle: {
    fontSize: 20, fontWeight: '900', color: colors.textPrimary,
    letterSpacing: 2.5, textAlign: 'center',
  },
  brandSub: {
    fontSize: 10, fontWeight: '600', color: colors.cyanLight,
    letterSpacing: 1.5, textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 20, gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  cardSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  serverSettingsBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 48,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: 6 },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12,
    borderRadius: 8, backgroundColor: colors.roseBg, borderWidth: 1, borderColor: colors.roseBorder,
  },
  errorText: { fontSize: 12, color: colors.roseLight, lineHeight: 17 },
  errorActionText: { fontSize: 12, color: colors.cyanLight, fontWeight: '700', textDecorationLine: 'underline' },
  signInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, backgroundColor: colors.cyanLight,
  },
  signInBtnDisabled: { opacity: 0.65 },
  signInText: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  serverIndicator: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingTop: 4,
  },
  serverStatusDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyanLight,
  },
  serverIndicatorText: {
    fontSize: 10, color: colors.textMuted, fontFamily: 'monospace', maxWidth: 220,
  },
  presetsCard: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    padding: 14, gap: 10,
  },
  presetsTitle: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, textAlign: 'center' },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  presetText: { fontSize: 12, fontWeight: '700' },
  footer: {
    textAlign: 'center', fontSize: 11, color: colors.textMuted, lineHeight: 18,
  },
  footerSub: { color: colors.textMuted, fontSize: 10 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(3, 3, 9, 0.85)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  serverModalCard: {
    width: '100%', maxWidth: 360, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 20, gap: 12,
  },
  serverModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  serverModalTitle: {
    fontSize: 15, fontWeight: '800', color: colors.textPrimary,
  },
  serverModalDesc: {
    fontSize: 12, color: colors.textSecondary, lineHeight: 17,
  },
  serverInputGroup: { gap: 6 },
  serverInput: {
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, height: 46, color: colors.textPrimary, fontSize: 13, fontFamily: 'monospace',
  },
  testResultBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
    borderRadius: 8, borderWidth: 1,
  },
  testResultSuccess: { backgroundColor: colors.emeraldBg, borderColor: colors.emeraldBorder },
  testResultError: { backgroundColor: colors.roseBg, borderColor: colors.roseBorder },
  testResultText: { fontSize: 12, fontWeight: '600', flex: 1 },
  serverModalActions: {
    flexDirection: 'row', gap: 10,
  },
  testBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 8, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderCyan,
  },
  testBtnText: { fontSize: 13, fontWeight: '700', color: colors.cyanLight },
  resetBtn: {
    paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  resetBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  saveServerBtn: {
    paddingVertical: 13, borderRadius: 10, backgroundColor: colors.cyanLight,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  saveServerBtnText: { fontSize: 14, fontWeight: '800', color: colors.textDark },
  troubleHint: {
    fontSize: 11, color: colors.textMuted, lineHeight: 16, textAlign: 'center', marginTop: 4,
  },
});
