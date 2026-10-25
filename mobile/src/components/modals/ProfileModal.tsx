import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { UserSession, saveUserSession, deleteUserAccount } from '../../services/auth';
import { FULL_VERSION_STRING } from '../../config/version';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: UserSession | null;
  onLogout: () => void;
  onUpdateUser?: (updated: UserSession) => void;
  onOpenNotifications?: () => void;
  onOpenAuth?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  user,
  onLogout,
  onUpdateUser,
  onOpenNotifications,
  onOpenAuth,
}) => {
  const { colors, isDark } = useTheme();
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'P';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      Alert.alert('Perhatian', 'Nama tampilan tidak boleh kosong.');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const updatedUser: UserSession = {
        ...user,
        name: displayName.trim(),
      };
      await saveUserSession(updatedUser);
      if (onUpdateUser) onUpdateUser(updatedUser);
      setIsEditing(false);
      Alert.alert('Berhasil', 'Nama profil Anda berhasil diperbarui!');
    } catch {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Bersihkan Cache Aplikasi',
      'Apakah Anda ingin membersihkan data cache sementara untuk mengoptimalkan ruang penyimpanan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Bersihkan',
          style: 'default',
          onPress: async () => {
            setClearingCache(true);
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const cacheKeys = allKeys.filter(
                (k) =>
                  k.startsWith('@prediksikan_fixtures_cache') ||
                  k.startsWith('@prediksikan_cache') ||
                  k.startsWith('@prediksikan_history_cache')
              );
              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
              }
              Alert.alert(
                'Cache Dibersihkan',
                'Seluruh cache data pertandingan dan riwayat sementara berhasil dibersihkan.'
              );
            } catch {
              Alert.alert('Informasi', 'Penyimpanan cache lokal Anda sudah optimal.');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const handleLogoutConfirm = () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari akun ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => {
            onClose();
            onLogout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    if (!user) return;
    Alert.alert(
      'Hapus Akun & Data Permanen',
      'Tindakan ini akan menghapus sesi login, data tersimpan, dan preferensi akun Anda secara permanen sesuai kebijakan privasi Google Play. Apakah Anda yakin?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Hapus Akun',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteUserAccount(user);
            if (res.success) {
              Alert.alert('Akun Dihapus', res.message, [
                {
                  text: 'OK',
                  onPress: () => {
                    onClose();
                    onLogout();
                  },
                },
              ]);
            } else {
              Alert.alert('Gagal', res.message);
            }
          },
        },
      ]
    );
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      await Linking.openURL('https://l1prediksikan.my.id/legal');
    } catch {
      Alert.alert('Tautan Eksternal', 'Buka peramban dan kunjungi: https://l1prediksikan.my.id/legal');
    }
  };

  const isGoogle = user?.provider === 'google' || user?.email?.includes('@gmail.com');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="person-circle" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profil & Akun Saya</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* User Identity Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarContainer}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg as any} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{getInitials(user?.name)}</Text>
                  </View>
                )}
                <View style={styles.onlineBadge} />
              </View>

              <Text style={styles.userName}>{user?.name || 'Pengguna'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'tamu@prediksikan.id'}</Text>

              <View style={styles.badgeRow}>
                {user?.isGuest ? (
                  <View style={[styles.pillBadge, { backgroundColor: '#334155' }]}>
                    <Ionicons name="compass-outline" size={12} color="#94A3B8" />
                    <Text style={[styles.pillText, { color: '#94A3B8' }]}>Akses Tamu</Text>
                  </View>
                ) : (
                  <View style={[styles.pillBadge, { backgroundColor: '#064E3B60', borderColor: '#059669' }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={[styles.pillText, { color: '#10B981' }]}>
                      {isGoogle ? 'Member Google' : 'Member Terverifikasi'}
                    </Text>
                  </View>
                )}

                {user?.isStaff ? (
                  <View style={[styles.pillBadge, { backgroundColor: '#7C2D1250', borderColor: '#EA580C' }]}>
                    <Ionicons name="shield-checkmark" size={12} color="#FB923C" />
                    <Text style={[styles.pillText, { color: '#FB923C' }]}>Admin</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Guest Upgrade Card */}
            {user?.isGuest && onOpenAuth && (
              <View style={styles.guestUpgradeCard}>
                <View style={styles.guestUpgradeIconCol}>
                  <Ionicons name="sparkles" size={24} color="#F59E0B" />
                </View>
                <View style={styles.guestUpgradeTextCol}>
                  <Text style={styles.guestUpgradeTitle}>Simpan Preferensi & Akun</Text>
                  <Text style={styles.guestUpgradeDesc}>
                    Masuk atau daftarkan akun gratis untuk mengaktifkan notifikasi laga dan sinkronisasi lintas perangkat.
                  </Text>
                  <TouchableOpacity
                    style={styles.guestLoginBtn}
                    onPress={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.guestLoginBtnText}>Masuk / Daftar Akun</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Account Details (Consumer-friendly data only) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>INFORMASI DETAIL AKUN</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Username</Text>
                <Text style={styles.detailValue}>
                  @{user?.username || user?.name?.toLowerCase().replace(/\s+/g, '_') || 'tamu'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status Akun</Text>
                <View style={styles.statusBadgeRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.statusBadgeText}>Aktif</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Metode Masuk</Text>
                <View style={styles.providerBadge}>
                  {isGoogle ? (
                    <>
                      <Ionicons name="logo-google" size={13} color="#EA4335" />
                      <Text style={styles.providerText}>Google OAuth (Gmail)</Text>
                    </>
                  ) : user?.isGuest ? (
                    <>
                      <Ionicons name="compass-outline" size={13} color="#94A3B8" />
                      <Text style={styles.providerText}>Tamu (Guest)</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="mail-outline" size={13} color="#10B981" />
                      <Text style={styles.providerText}>Email & Sandi Terenkripsi</Text>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tipe Keanggotaan</Text>
                <Text style={styles.detailValue}>
                  {user?.isGuest ? 'Akses Tamu' : 'Free Member (Akses Penuh)'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Versi Aplikasi</Text>
                <Text style={styles.detailValue}>{FULL_VERSION_STRING}</Text>
              </View>
            </View>

            {/* Quick Settings & Storage */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>PREFERENSI & PENYIMPANAN</Text>

              {onOpenNotifications && (
                <TouchableOpacity
                  style={styles.settingRowBtn}
                  onPress={() => {
                    onClose();
                    onOpenNotifications();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="notifications-outline" size={18} color="#F59E0B" />
                    <Text style={styles.settingRowText}>Pengaturan Notifikasi & Jadwal</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.settingRowBtn}
                onPress={handleClearCache}
                disabled={clearingCache}
                activeOpacity={0.7}
              >
                <View style={styles.settingRowLeft}>
                  <Ionicons name="sparkles-outline" size={18} color="#38BDF8" />
                  <Text style={styles.settingRowText}>
                    {clearingCache ? 'Membersihkan Cache...' : 'Bersihkan Cache & Memori Lokal'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Edit Display Name */}
            {!user?.isGuest && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>UBAH NAMA TAMPILAN</Text>
                {isEditing ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.inputField}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Masukkan nama baru"
                      placeholderTextColor={colors.textMuted}
                    />
                    <View style={styles.editActionRow}>
                      <TouchableOpacity
                        style={styles.cancelEditBtn}
                        onPress={() => {
                          setDisplayName(user?.name || '');
                          setIsEditing(false);
                        }}
                      >
                        <Text style={styles.cancelEditText}>Batal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveEditBtn}
                        onPress={handleSaveName}
                        disabled={saving}
                      >
                        <Text style={styles.saveEditText}>{saving ? 'Menyimpan...' : 'Simpan'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.readOnlyNameRow}>
                    <Text style={styles.readOnlyName}>{user?.name}</Text>
                    <TouchableOpacity
                      style={styles.editToggleBtn}
                      onPress={() => setIsEditing(true)}
                    >
                      <Ionicons name="pencil-outline" size={15} color={colors.primaryLight} />
                      <Text style={styles.editToggleText}>Ubah</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Legal & Privacy Compliance */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>KEBIJAKAN PRIVASI & HUKUM</Text>
              <TouchableOpacity
                style={styles.legalBtn}
                onPress={handleOpenPrivacyPolicy}
                activeOpacity={0.7}
              >
                <View style={styles.legalBtnLeft}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primaryLight} />
                  <View style={{ gap: 2 }}>
                    <Text style={styles.legalBtnTitle}>Kebijakan Privasi & Ketentuan</Text>
                    <Text style={styles.legalBtnSub}>Sesuai Regulasi Google Play Store 2024</Text>
                  </View>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogoutConfirm}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.logoutBtnText}>
                {user?.isGuest ? 'Keluar Mode Tamu' : 'Keluar dari Akun'}
              </Text>
            </TouchableOpacity>

            {/* Delete Account (Mandatory Google Play Requirement) */}
            {!user?.isGuest && (
              <TouchableOpacity
                style={styles.deleteAccountBtn}
                onPress={handleDeleteAccount}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={15} color="#94A3B8" />
                <Text style={styles.deleteAccountText}>Hapus Akun & Data Saya</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#064E3B40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  body: {
    paddingHorizontal: 18,
  },
  bodyContent: {
    paddingVertical: 18,
    gap: 14,
    paddingBottom: 36,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  guestUpgradeCard: {
    flexDirection: 'row',
    backgroundColor: '#78350F20',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F59E0B50',
    gap: 12,
  },
  guestUpgradeIconCol: {
    paddingTop: 2,
  },
  guestUpgradeTextCol: {
    flex: 1,
    gap: 6,
  },
  guestUpgradeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FDE68A',
  },
  guestUpgradeDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
  },
  guestLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  guestLoginBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  readOnlyNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readOnlyName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editToggleText: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  editContainer: {
    gap: 10,
  },
  inputField: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary,
  },
  editActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  cancelEditText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveEditText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7F1D1D25',
    borderWidth: 1,
    borderColor: '#EF444450',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  legalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legalBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legalBtnTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  legalBtnSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    marginBottom: 20,
  },
  deleteAccountText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
