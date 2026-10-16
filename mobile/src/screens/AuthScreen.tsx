import React, { useState, useEffect, useRef } from 'react';
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
  checkEmailExists,
  saveUserSession,
} from '../services/auth';
import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_CONFIG, fetchGoogleUserProfile } from '../services/googleAuth';
import { GoogleAuthModal } from '../components/modals/GoogleAuthModal';

interface AuthScreenProps {
  onSuccess: (session: UserSession) => void;
  onClose?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onClose }) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Status Validasi Live Email
  const [isEmailChecking, setIsEmailChecking] = useState(false);
  const [emailWarning, setEmailWarning] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Validasi format email standar
  const isValidEmailFormat = (str: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(str.trim());
  };

  // Checklist Ketentuan Keamanan Password (Live)
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const isPasswordSecure = hasMinLength && hasNumber && hasUppercase && hasLowercase;

  // Live Email Validation: Memeriksa apakah email sudah terdaftar di database server
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();

    // Reset warning jika kosong atau tidak valid
    if (!trimmed || !isValidEmailFormat(trimmed)) {
      setEmailWarning('');
      setIsEmailChecking(false);
      return;
    }

    // Hanya lakukan pengecekan duplikasi pada mode register
    if (mode !== 'register') {
      setEmailWarning('');
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsEmailChecking(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const exists = await checkEmailExists(trimmed);
        if (exists) {
          setEmailWarning('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.');
        } else {
          setEmailWarning('');
        }
      } catch {
        setEmailWarning('');
      } finally {
        setIsEmailChecking(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [email, mode]);

  // Submit Handler: Register atau Login
  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    if (mode === 'register') {
      // ===== VALIDASI FORM REGISTER =====
      if (!trimmedUsername) {
        setErrorMessage('Username wajib diisi.');
        return;
      }
      if (trimmedUsername.length < 3) {
        setErrorMessage('Username minimal terdiri dari 3 karakter.');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        setErrorMessage('Username hanya boleh memuat huruf, angka, dan garis bawah (_).');
        return;
      }

      if (!trimmedEmail) {
        setErrorMessage('Alamat email wajib diisi.');
        return;
      }
      if (!isValidEmailFormat(trimmedEmail)) {
        setErrorMessage('Format email tidak valid (contoh: nama@gmail.com).');
        return;
      }
      if (emailWarning) {
        setErrorMessage('Silakan gunakan email lain yang belum terdaftar.');
        return;
      }

      if (!password) {
        setErrorMessage('Password wajib diisi.');
        return;
      }
      if (!isPasswordSecure) {
        setErrorMessage('Password belum memenuhi seluruh ketentuan keamanan di bawah kolom.');
        return;
      }

      setLoading(true);
      const res = await registerAccount(trimmedUsername, trimmedEmail, password);
      setLoading(false);

      if (res.success && res.session) {
        setSuccessMessage('Akun Anda berhasil didaftarkan! Mengalihkan...');
        setTimeout(() => {
          onSuccess(res.session!);
        }, 500);
      } else {
        setErrorMessage(res.message || 'Registrasi gagal. Silakan coba lagi.');
      }
    } else {
      // ===== VALIDASI FORM LOGIN =====
      if (!trimmedEmail) {
        setErrorMessage('Silakan masukkan alamat email Anda.');
        return;
      }
      if (!isValidEmailFormat(trimmedEmail)) {
        setErrorMessage('Format email tidak valid (contoh: nama@gmail.com).');
        return;
      }
      if (!password) {
        setErrorMessage('Silakan masukkan password Anda.');
        return;
      }

      setLoading(true);
      const res = await loginAccount(trimmedEmail, password);
      setLoading(false);

      if (res.success && res.session) {
        setSuccessMessage('Berhasil masuk! Memuat data...');
        setTimeout(() => {
          onSuccess(res.session!);
        }, 400);
      } else {
        setErrorMessage(res.message || 'Gagal masuk. Periksa kembali email dan password Anda.');
      }
    }
  };

  // Hook OAuth Google menggunakan Web Client ID
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CONFIG.webClientId,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        handleGoogleOAuthSuccess(authentication.accessToken);
      }
    }
  }, [googleResponse]);

  const handleGoogleOAuthSuccess = async (accessToken: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const profile = await fetchGoogleUserProfile(accessToken);
      if (profile && profile.email) {
        const googleName = profile.name || profile.email.split('@')[0];
        const res = await syncGoogleAccount(googleName, profile.email, profile.picture);
        if (res.success && res.session) {
          setSuccessMessage('Akun Google berhasil terhubung!');
          setTimeout(() => {
            onSuccess(res.session!);
          }, 400);
        } else {
          setErrorMessage(res.message || 'Gagal menyinkronkan akun Google ke server.');
        }
      } else {
        setErrorMessage('Gagal memuat profil akun Google.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan autentikasi Google.');
    } finally {
      setLoading(false);
    }
  };

  // Login Cepat via Google (Gmail) - Password TIDAK disertakan
  const handleGoogleAuth = async () => {
    setErrorMessage('');
    try {
      if (promptGoogleAsync) {
        const result = await promptGoogleAsync();
        if (result.type === 'cancel' || result.type === 'dismiss') {
          return;
        }
      } else {
        setShowGoogleModal(true);
      }
    } catch (error) {
      console.warn('OAuth prompt error, menampilkan modal:', error);
      setShowGoogleModal(true);
    }
  };

  const executeGoogleSync = async (googleEmail: string) => {
    setLoading(true);
    setErrorMessage('');
    const googleName = username.trim() || googleEmail.split('@')[0];
    const res = await syncGoogleAccount(googleName, googleEmail);
    setLoading(false);

    if (res.success && res.session) {
      setShowGoogleModal(false);
      setSuccessMessage('Akun Google berhasil terhubung!');
      setTimeout(() => {
        onSuccess(res.session!);
      }, 400);
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
        username: 'tamu',
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
          {onClose ? (
            <TouchableOpacity style={styles.topCloseBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}

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
              ? 'Lengkapi username, email, dan password aman Anda.'
              : 'Gunakan email dan password terdaftar untuk mengakses analitik.'}
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
              setEmailWarning('');
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

        {/* Notifikasi Error Banner */}
        {errorMessage.length > 0 ? (
          <View style={styles.errorAlert}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorAlertText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Notifikasi Sukses Banner */}
        {successMessage.length > 0 ? (
          <View style={styles.successAlert}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primaryLight} />
            <Text style={styles.successAlertText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          {/* 1. INPUT USERNAME (Hanya di mode Register) */}
          {mode === 'register' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Username <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={styles.inputBox}>
                <Ionicons name="at-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.inputField}
                  placeholder="contoh: laluarkan"
                  placeholderTextColor={colors.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          ) : null}

          {/* 2. INPUT ALAMAT EMAIL DENGAN LIVE WARNING */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>
                Alamat Email <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              {isEmailChecking ? (
                <View style={styles.inlineCheckingBox}>
                  <ActivityIndicator size="small" color={colors.primaryLight} />
                  <Text style={styles.inlineCheckingText}>Memeriksa...</Text>
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.inputBox,
                emailWarning ? styles.inputBoxError : null,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailWarning ? '#EF4444' : colors.textMuted}
              />
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

            {/* Live Warning Email Sudah Terdaftar */}
            {emailWarning ? (
              <View style={styles.fieldWarningBox}>
                <Ionicons name="alert-circle" size={15} color="#EF4444" />
                <Text style={styles.fieldWarningText}>{emailWarning}</Text>
              </View>
            ) : null}
          </View>

          {/* 3. INPUT PASSWORD (SATU SAJA + ICON MATA) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Password <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>

            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.inputField}
                placeholder={mode === 'register' ? 'Buat password aman Anda' : 'Masukkan password'}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Live Checklist Keamanan Password (Hanya di mode Register) */}
            {mode === 'register' ? (
              <View style={styles.checklistContainer}>
                <Text style={styles.checklistTitle}>Ketentuan Keamanan Password:</Text>

                <View style={styles.checklistItem}>
                  <Ionicons
                    name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasMinLength ? '#10B981' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.checklistLabel,
                      hasMinLength ? styles.checklistLabelMet : null,
                    ]}
                  >
                    Minimal 8 karakter
                  </Text>
                </View>

                <View style={styles.checklistItem}>
                  <Ionicons
                    name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasNumber ? '#10B981' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.checklistLabel,
                      hasNumber ? styles.checklistLabelMet : null,
                    ]}
                  >
                    Harus ada angka (0-9)
                  </Text>
                </View>

                <View style={styles.checklistItem}>
                  <Ionicons
                    name={hasUppercase ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasUppercase ? '#10B981' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.checklistLabel,
                      hasUppercase ? styles.checklistLabelMet : null,
                    ]}
                  >
                    Harus ada huruf besar (A-Z)
                  </Text>
                </View>

                <View style={styles.checklistItem}>
                  <Ionicons
                    name={hasLowercase ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasLowercase ? '#10B981' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.checklistLabel,
                      hasLowercase ? styles.checklistLabelMet : null,
                    ]}
                  >
                    Harus ada huruf kecil (a-z)
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Tombol Hijau: Hanya Bertuliskan "Daftar" / "Masuk" */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || (mode === 'register' && (!!emailWarning || !isPasswordSecure))) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || (mode === 'register' && (!!emailWarning || !isPasswordSecure))}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'register' ? 'Daftar' : 'Masuk'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Pemisah "atau" */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>atau</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Pilihan Google (Tanpa Password) & Tamu */}
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

        {/* Footer info privasi */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} />
          <Text style={styles.footerNoteText}>
            Password Anda dienkripsi secara aman menggunakan standar kriptografi server.
          </Text>
        </View>
      </ScrollView>

      {/* Modal Masuk dengan Akun Google */}
      <GoogleAuthModal
        visible={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSubmit={executeGoogleSync}
        loading={loading}
      />
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
  topCloseBtn: {
    position: 'absolute',
    top: -10,
    right: 0,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    zIndex: 10,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inlineCheckingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineCheckingText: {
    fontSize: 11,
    color: colors.primaryLight,
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
  inputBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#7F1D1D12',
  },
  inputField: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  fieldWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  fieldWarningText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  checklistContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  checklistTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  checklistLabelMet: {
    color: '#10B981',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
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
