import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  UserSession,
  registerAccount,
  loginAccount,
  syncGoogleAccount,
  saveUserSession,
} from '../services/auth';

interface AuthScreenProps {
  onSuccess: (session: UserSession) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Validasi format email standar
  const isValidEmail = (str: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(str.trim());
  };

  // Submit Handler: Register atau Login
  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (mode === 'register') {
      // ===== VALIDASI FORM REGISTER (SESUAI WEB) =====
      if (!trimmedName) {
        setErrorMessage('Nama lengkap wajib diisi.');
        return;
      }
      if (trimmedName.length < 2) {
        setErrorMessage('Nama minimal terdiri dari 2 karakter.');
        return;
      }

      if (!trimmedEmail) {
        setErrorMessage('Alamat email wajib diisi.');
        return;
      }
      if (!isValidEmail(trimmedEmail)) {
        setErrorMessage('Format email tidak valid (contoh: nama@gmail.com).');
        return;
      }

      setLoading(true);
      const res = await registerAccount(trimmedName, trimmedEmail);
      setLoading(false);

      if (res.success && res.session) {
        setSuccessMessage(res.message || 'Akun Anda berhasil disimpan di database!');
        setTimeout(() => {
          onSuccess(res.session!);
        }, 600);
      } else {
        setErrorMessage(res.message || 'Registrasi gagal. Silakan coba lagi.');
      }
    } else {
      // ===== VALIDASI FORM LOGIN =====
      if (!trimmedEmail) {
        setErrorMessage('Silakan isi alamat email Anda.');
        return;
      }
      if (!isValidEmail(trimmedEmail)) {
        setErrorMessage('Format email tidak valid (contoh: nama@gmail.com).');
        return;
      }

      setLoading(true);
      const res = await loginAccount(trimmedEmail);
      setLoading(false);

      if (res.success && res.session) {
        setSuccessMessage('Berhasil masuk! Memuat data...');
        setTimeout(() => {
          onSuccess(res.session!);
        }, 500);
      } else {
        setErrorMessage(res.message || 'Gagal masuk. Periksa kembali email Anda.');
      }
    }
  };

  // Login Cepat via Google / Gmail (Tersinkron ke Database Backend)
  const handleGoogleAuth = () => {
    Alert.prompt
      ? Alert.prompt(
          'Masuk dengan Akun Google',
          'Masukkan alamat Gmail Anda untuk sinkronisasi otomatis dengan database:',
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Masuk & Sinkron',
              onPress: async (inputEmail?: string) => {
                if (!inputEmail || !isValidEmail(inputEmail)) {
                  setErrorMessage('Alamat email Google tidak valid.');
                  return;
                }
                executeGoogleSync(inputEmail.trim());
              },
            },
          ],
          'plain-text',
          email.includes('@gmail.com') ? email : ''
        )
      : executeGoogleSync(email.trim() || 'pengguna.google@gmail.com');
  };

  const executeGoogleSync = async (googleEmail: string) => {
    setLoading(true);
    setErrorMessage('');
    const googleName = name.trim() || googleEmail.split('@')[0];
    const res = await syncGoogleAccount(googleName, googleEmail);
    setLoading(false);

    if (res.success && res.session) {
      setSuccessMessage('Akun Google berhasil terhubung ke database!');
      setTimeout(() => {
        onSuccess(res.session!);
      }, 500);
    } else {
      setErrorMessage(res.message || 'Gagal menyinkronkan akun Google.');
    }
  };

  // Akses Tamu
  const handleGuestAuth = async () => {
    setLoading(true);
    setErrorMessage('');
    setTimeout(async () => {
      const session: UserSession = {
        name: 'Pengguna Tamu',
        email: 'tamu@prediksikan.id',
        isGuest: true,
        provider: 'guest',
      };
      await saveUserSession(session);
      setLoading(false);
      onSuccess(session);
    }, 300);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Logo & Judul */}
        <View style={styles.headerBox}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.mainTitle}>
            {mode === 'register' ? 'Daftar Akun Baru' : 'Masuk ke Akun Anda'}
          </Text>
          <Text style={styles.subTitle}>
            {mode === 'register'
              ? 'Sesuai web L1 Prediksi-Kan: masukkan nama dan email untuk tersimpan langsung di database pusat.'
              : 'Gunakan alamat email terdaftar Anda untuk mengakses dasbor analitik.'}
          </Text>
        </View>

        {/* Tab Switcher: Daftar Akun vs Masuk */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'register' ? styles.tabButtonActive : null]}
            onPress={() => {
              setMode('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.tabText, mode === 'register' ? styles.tabTextActive : null]}
            >
              Daftar Akun
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, mode === 'login' ? styles.tabButtonActive : null]}
            onPress={() => {
              setMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.tabText, mode === 'login' ? styles.tabTextActive : null]}
            >
              Masuk
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notifikasi Error */}
        {errorMessage.length > 0 ? (
          <View style={styles.errorAlert}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorAlertText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Notifikasi Sukses */}
        {successMessage.length > 0 ? (
          <View style={styles.successAlert}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primaryLight} />
            <Text style={styles.successAlertText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* Form Inputs Sesuai Web L1 Prediksi-Kan */}
        <View style={styles.formContainer}>
          {/* 1. INPUT NAMA LENGKAP (Hanya di mode Register) */}
          {mode === 'register' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Nama Lengkap <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Contoh: Lalu Naufal Arkan"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>
          ) : null}

          {/* 2. INPUT ALAMAT EMAIL */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {mode === 'register' ? 'Alamat Email' : 'Alamat Email Terdaftar'}{' '}
              <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.inputField}
                placeholder="nama@gmail.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Card Info Sinkronisasi Database */}
          <View style={styles.dbInfoCard}>
            <Ionicons name="cloud-done-outline" size={18} color={colors.primaryLight} />
            <Text style={styles.dbInfoText}>
              {mode === 'register'
                ? 'Akun otomatis tersinkronisasi dan disimpan permanen di database backend kami (PostgreSQL).'
                : 'Sistem akan memverifikasi email Anda langsung dari basis data server.'}
            </Text>
          </View>

          {/* Tombol Submit Utama */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Ionicons
                  name={mode === 'register' ? 'person-add-outline' : 'log-in-outline'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.submitButtonText}>
                  {mode === 'register' ? 'Daftar & Simpan ke Database' : 'Masuk ke Akun'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Pemisah "atau" */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>atau metode cepat</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Pilihan Google & Tamu */}
        <View style={styles.socialButtonsGroup}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text style={styles.googleButtonText}>Lanjutkan dengan Akun Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="compass-outline" size={18} color={colors.textMuted} />
            <Text style={styles.guestButtonText}>Masuk sebagai Tamu (Eksplorasi)</Text>
          </TouchableOpacity>
        </View>

        {/* Footer info privasi sesuai web */}
        <View style={styles.footerNote}>
          <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
          <Text style={styles.footerNoteText}>
            L1 Prediksi-Kan menerapkan otentikasi aman tanpa menyimpan password terbuka.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 40,
    gap: 18,
  },
  headerBox: {
    alignItems: 'center',
    gap: 6,
  },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7F1D1D25',
    borderWidth: 1,
    borderColor: '#EF444450',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorAlertText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#064E3B30',
    borderWidth: 1,
    borderColor: '#05966950',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  successAlertText: {
    flex: 1,
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '500',
  },
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    gap: 10,
  },
  inputField: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  dbInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05966912',
    borderWidth: 1,
    borderColor: '#05966935',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    marginTop: 2,
  },
  dbInfoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  socialButtonsGroup: {
    gap: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    height: 46,
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    height: 42,
  },
  guestButtonText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  footerNoteText: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
});
