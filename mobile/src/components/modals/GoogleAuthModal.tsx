import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as defaultColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

interface GoogleAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  loading: boolean;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  visible,
  onClose,
  onSubmit,
  loading,
}) => {
  const { colors, isDark } = useTheme();
  const [googleEmail, setGoogleEmail] = useState('');
  const [error, setError] = useState('');

  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
  };

  const handleSubmit = async () => {
    const clean = googleEmail.trim().toLowerCase();
    if (!clean) {
      setError('Silakan masukkan alamat Gmail Anda.');
      return;
    }
    if (!isValidEmail(clean)) {
      setError('Format email tidak valid (contoh: nama@gmail.com).');
      return;
    }

    setError('');
    await onSubmit(clean);
  };

  const handleQuickAppend = (domain: string) => {
    if (!googleEmail.includes('@')) {
      setGoogleEmail(googleEmail.trim() + domain);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialogCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[styles.googleIconCircle, { backgroundColor: isDark ? '#FFFFFF' : '#F1F5F9' }]}>
              <Ionicons name="logo-google" size={22} color="#EA4335" />
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : colors.surfaceLight }]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Masuk dengan Akun Google</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sesuai ketentuan sistem, otentikasi akun Google tidak memerlukan pengisian password.
          </Text>

          {/* Input Box */}
          <View style={[styles.inputBox, { backgroundColor: isDark ? '#1E293B' : colors.surfaceLight, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.inputField, { color: colors.textPrimary }]}
              placeholder="nama.anda@gmail.com"
              placeholderTextColor={colors.textMuted}
              value={googleEmail}
              onChangeText={(txt) => {
                setGoogleEmail(txt);
                if (error) setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          {/* Quick Domain Suggestion */}
          {!googleEmail.includes('@') && googleEmail.length > 2 && (
            <TouchableOpacity
              style={[
                styles.suggestionPill,
                {
                  backgroundColor: isDark ? '#064E3B40' : '#DCFCE7',
                  borderColor: isDark ? '#05966950' : '#86EFAC',
                },
              ]}
              onPress={() => handleQuickAppend('@gmail.com')}
            >
              <Text style={[styles.suggestionText, { color: isDark ? colors.primaryLight : '#15803D' }]}>
                + Tambahkan @gmail.com
              </Text>
            </TouchableOpacity>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: isDark ? '#1E293B' : colors.surfaceLight }]}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Masuk Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  googleIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginTop: 4,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
  },
  suggestionPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7F1D1D20',
    padding: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: defaultColors.primary,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
