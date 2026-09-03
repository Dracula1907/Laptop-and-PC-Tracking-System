import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';
import { API_BASE_URL } from '../src/api/client';

export default function LoginScreen() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
                onPress={() => setPreset('manager', 'admin123')}
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
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Server Endpoint: <Text style={styles.footerHighlight}>{API_BASE_URL}</Text>
          </Text>
        </View>
      </ScrollView>
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
});
