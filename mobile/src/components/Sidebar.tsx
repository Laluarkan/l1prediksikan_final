import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { UserSession } from '../services/auth';
import { TabType } from './BottomNav';
import { APP_VERSION, APP_NAME } from '../config/version';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.78, 300);

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  user: UserSession | null;
  currentTab: TabType;
  onNavigate: (tab: TabType) => void;
  onLogout: () => void;
  onShowOnboarding?: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onOpenGuide: () => void;
  onOpenAbout: () => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  visible,
  onClose,
  user,
  currentTab,
  onNavigate,
  onLogout,
  onShowOnboarding,
  onOpenProfile,
  onOpenNotifications,
  onOpenGuide,
  onOpenAbout,
  onOpenAuth,
}) => {
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSelectTab = (tab: TabType) => {
    onNavigate(tab);
    onClose();
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Keluar dari Aplikasi',
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop to tap and close */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Drawer Content */}
        <View style={styles.drawerContainer}>
          {/* User Profile Card */}
          <View style={styles.profileSection}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || 'Pengguna'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email || 'tamu@prediksikan.id'}
              </Text>
              <View
                style={[
                  styles.badgePill,
                  user?.isGuest ? styles.badgeGuest : styles.badgeMember,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    user?.isGuest ? styles.badgeGuestText : styles.badgeMemberText,
                  ]}
                >
                  {user?.isGuest ? 'Akses Tamu' : 'Member Aktif'}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {/* Section 1: Navigasi Utama */}
            <View style={styles.menuGroup}>
              <Text style={styles.groupTitle}>NAVIGASI UTAMA</Text>

              <TouchableOpacity
                style={[styles.menuItem, currentTab === 'home' ? styles.menuItemActive : null]}
                onPress={() => handleSelectTab('home')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={currentTab === 'home' ? 'home' : 'home-outline'}
                  size={20}
                  color={currentTab === 'home' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[styles.menuItemText, currentTab === 'home' ? styles.menuItemTextActive : null]}
                >
                  Beranda
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentTab === 'fixtures' ? styles.menuItemActive : null]}
                onPress={() => handleSelectTab('fixtures')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={currentTab === 'fixtures' ? 'calendar' : 'calendar-outline'}
                  size={20}
                  color={currentTab === 'fixtures' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[styles.menuItemText, currentTab === 'fixtures' ? styles.menuItemTextActive : null]}
                >
                  Jadwal Pertandingan
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentTab === 'parlay' ? styles.menuItemActive : null]}
                onPress={() => handleSelectTab('parlay')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={currentTab === 'parlay' ? 'ticket' : 'ticket-outline'}
                  size={20}
                  color={currentTab === 'parlay' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[styles.menuItemText, currentTab === 'parlay' ? styles.menuItemTextActive : null]}
                >
                  Tiket Parlay AI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentTab === 'standings' ? styles.menuItemActive : null]}
                onPress={() => handleSelectTab('standings')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={currentTab === 'standings' ? 'trophy' : 'trophy-outline'}
                  size={20}
                  color={currentTab === 'standings' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[styles.menuItemText, currentTab === 'standings' ? styles.menuItemTextActive : null]}
                >
                  Klasemen Liga
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentTab === 'history' ? styles.menuItemActive : null]}
                onPress={() => handleSelectTab('history')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={currentTab === 'history' ? 'time' : 'time-outline'}
                  size={20}
                  color={currentTab === 'history' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[styles.menuItemText, currentTab === 'history' ? styles.menuItemTextActive : null]}
                >
                  Riwayat & Evaluasi
                </Text>
              </TouchableOpacity>
            </View>

            {/* Section 2: Perintilan & Pengaturan */}
            <View style={styles.menuGroup}>
              <Text style={styles.groupTitle}>PENGATURAN & LAINNYA</Text>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onOpenProfile();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={20} color={colors.primaryLight} />
                <Text style={styles.menuItemText}>Profil & Akun</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onOpenNotifications();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
                <Text style={styles.menuItemText}>Notifikasi Jadwal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  if (onShowOnboarding) onShowOnboarding();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles-outline" size={20} color="#38BDF8" />
                <Text style={styles.menuItemText}>Tur Pengenalan Aplikasi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onOpenGuide();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="book-outline" size={20} color="#818CF8" />
                <Text style={styles.menuItemText}>Panduan Nilai Taruhan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  onOpenAbout();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
                <Text style={styles.menuItemText}>Tentang & Privasi</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Bottom Section: Logout or Guest Login Button */}
          <View style={styles.bottomSection}>
            {user?.isGuest ? (
              <TouchableOpacity
                style={styles.guestLoginBtn}
                onPress={() => {
                  onClose();
                  onOpenAuth();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <Text style={styles.guestLoginText}>Masuk / Daftar Akun</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogoutPress}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>Keluar Akun</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.versionText}>{APP_NAME} v{APP_VERSION}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#00000080',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#0F172A',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: 48,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  badgeMember: {
    backgroundColor: '#064E3B40',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  badgeGuest: {
    backgroundColor: '#33415550',
    borderWidth: 1,
    borderColor: '#475569',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgeMemberText: {
    color: colors.primaryLight,
  },
  badgeGuestText: {
    color: colors.textMuted,
  },

  menuScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  menuGroup: {
    marginBottom: 20,
    gap: 4,
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    paddingHorizontal: 10,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: '#064E3B30',
  },
  menuItemText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  menuItemTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },

  bottomSection: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  guestLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 8,
  },
  guestLoginText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  versionText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
});
