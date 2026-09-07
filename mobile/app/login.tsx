import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  BackHandler,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';
import {
  getApiBaseUrl,
  getStoredApiUrl,
  saveStoredApiUrl,
  testConnection,
  DEFAULT_API_URL,
  LAN_API_URL,
} from '../src/api/client';

export default function LoginScreen() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic server configuration
  const [currentUrl, setCurrentUrl] = useState(getApiBaseUrl());
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; latencyMs?: number; message: string } | null>(null);

  useEffect(() => {
    getStoredApiUrl().then((url) => {
      setCurrentUrl(url);
      setServerUrlInput(url);
    });
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    const res = await testConnection(serverUrlInput);
    setTestingConnection(false);
    setConnectionResult(res);
  };

  const handleSaveServerUrl = async () => {
    if (!serverUrlInput.trim()) return;
    await saveStoredApiUrl(serverUrlInput.trim());
    const updated = getApiBaseUrl();
    setCurrentUrl(updated);
    setServerModalVisible(false);
    setConnectionResult(null);
  };

  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Prevent Android hardware back button from accessing any screen behind Login
  useEffect(() => {
    const onBackPress = () => {
      BackHandler.exitApp();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (!isLoading && user) {
      if (user.roleCode === 'ADMIN') {
        router.replace('/(admin)/dashboard');
      } else if (user.roleCode === 'MANAGER') {
        router.replace('/(manager)/dashboard');
      } else if (user.roleCode === 'SECURITY_GUARD') {
        router.replace('/(guard)/home');
      } else {
        router.replace('/(admin)/dashboard');
      }
    }
  }, [user, isLoading]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setLoading(true);

    const result = await login(username.trim(), password.trim());
    setLoading(false);

    if (result.success) {
      if (result.roleCode === 'ADMIN') {
        router.replace('/(admin)/dashboard');
      } else if (result.roleCode === 'MANAGER') {
        router.replace('/(manager)/dashboard');
      } else if (result.roleCode === 'SECURITY_GUARD') {
        router.replace('/(guard)/home');
      } else {
        router.replace('/(admin)/dashboard');
      }
    } else {
      setError(result.error || 'Authentication failed.');
    }
  };

  const setPreset = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 16, 32),
            paddingBottom: Math.max(insets.bottom + 16, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.brandLogo}>
            <Ionicons name="laptop-outline" size={36} color={colors.cyan} />
          </View>
          <Text style={styles.companyName}>FAITH AUTOMATION</Text>
          <Text style={styles.appTitle}>IT Asset Inventory & Gate Tracking</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Enterprise Sign In</Text>
          <Text style={styles.formDesc}>
            Enter your company credentials to access your authorized role experience.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.rose} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username / Employee ID</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Username"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textDark} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textDark} />
              </>
            )}
          </TouchableOpacity>

          {/* Quick Role Fill Presets */}
          <View style={styles.presetsSection}>
            <Text style={styles.presetTitle}>DEMO ACCOUNT PRESETS:</Text>
            <View style={styles.presetButtonGroup}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setPreset('admin', 'admin123')}
              >
                <Text style={styles.presetButtonText}>Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setPreset('manager', 'manager123')}
              >
                <Text style={styles.presetButtonText}>Manager</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetButton, styles.presetButtonGuard]}
                onPress={() => setPreset('guard', 'guard123')}
              >
                <Text style={[styles.presetButtonText, { color: colors.amber }]}>Security Guard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Network / Server Info */}
        <TouchableOpacity
          style={styles.serverIndicator}
          onPress={() => {
            setServerUrlInput(currentUrl);
            setConnectionResult(null);
            setServerModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.serverStatusDot,
              connectionResult?.success ? { backgroundColor: colors.emerald } : { backgroundColor: colors.cyan },
            ]}
          />
          <Text style={styles.serverIndicatorText} numberOfLines={1}>
            Server: <Text style={styles.serverHighlight}>{currentUrl}</Text>
          </Text>
          <Ionicons name="pencil-outline" size={13} color={colors.cyan} />
        </TouchableOpacity>
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
                <Ionicons name="server-outline" size={20} color={colors.cyan} />
                <Text style={styles.serverModalTitle}>Backend Server Configuration</Text>
              </View>
              <TouchableOpacity onPress={() => setServerModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.serverModalDesc}>
              Configure the API endpoint address for this mobile application. You can test connectivity before saving.
            </Text>

            <View style={styles.serverInputGroup}>
              <Text style={styles.fieldLabel}>API BASE URL</Text>
              <TextInput
                style={styles.serverInput}
                placeholder="http://192.168.100.88:5000/api"
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

            {/* Quick Presets */}
            <View style={styles.presetButtonsWrap}>
              <Text style={styles.fieldLabel}>QUICK PRESETS:</Text>
              <View style={styles.modalPresetRow}>
                <TouchableOpacity
                  style={styles.modalPresetChip}
                  onPress={() => {
                    setServerUrlInput(DEFAULT_API_URL);
                    setConnectionResult(null);
                  }}
                >
                  <Ionicons name="globe-outline" size={13} color={colors.cyan} />
                  <Text style={styles.modalPresetText}>Public Tunnel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalPresetChip}
                  onPress={() => {
                    setServerUrlInput(LAN_API_URL);
                    setConnectionResult(null);
                  }}
                >
                  <Ionicons name="wifi-outline" size={13} color={colors.emerald} />
                  <Text style={[styles.modalPresetText, { color: colors.emerald }]}>Wi-Fi LAN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalPresetChip}
                  onPress={() => {
                    setServerUrlInput('http://localhost:5000/api');
                    setConnectionResult(null);
                  }}
                >
                  <Ionicons name="laptop-outline" size={13} color={colors.amber} />
                  <Text style={[styles.modalPresetText, { color: colors.amber }]}>Localhost</Text>
                </TouchableOpacity>
              </View>
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
                  color={connectionResult.success ? colors.emerald : colors.rose}
                />
                <Text
                  style={[
                    styles.testResultText,
                    { color: connectionResult.success ? colors.emerald : colors.rose },
                  ]}
                >
                  {connectionResult.message}
                </Text>
              </View>
            )}

            {/* Test & Save Actions */}
            <View style={styles.serverModalActions}>
              <TouchableOpacity
                style={styles.testBtn}
                onPress={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color={colors.cyan} />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={15} color={colors.cyan} />
                    <Text style={styles.testBtnText}>Test Connection</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveServerBtn} onPress={handleSaveServerUrl}>
                <Text style={styles.saveServerBtnText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.troubleHint}>
              💡 Use the Public Tunnel to connect over any Wi-Fi or cellular network without router firewall issues.
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderCyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.cyan,
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  appTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.roseBg,
    borderColor: colors.roseBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: colors.roseLight,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  eyeButton: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: colors.cyan,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 8,
    marginTop: 6,
    shadowColor: colors.cyan,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  presetsSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  presetTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  presetButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  presetButtonGuard: {
    borderColor: colors.amberBorder,
  },
  presetButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.cyan,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  footerHighlight: {
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  serverIndicator: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'center',
  },
  serverStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald,
  },
  serverIndicatorText: {
    fontSize: 11,
    color: colors.textMuted,
    maxWidth: 240,
  },
  serverHighlight: {
    color: colors.cyan,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 3, 9, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  serverModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  serverModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serverModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  serverModalDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  serverInputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  serverInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 46,
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  presetButtonsWrap: {
    gap: 6,
  },
  modalPresetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalPresetChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalPresetText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.cyan,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  testResultSuccess: {
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldBorder,
  },
  testResultError: {
    backgroundColor: colors.roseBg,
    borderColor: colors.roseBorder,
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  serverModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCyan,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cyan,
  },
  saveServerBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveServerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
  },
  troubleHint: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
});
