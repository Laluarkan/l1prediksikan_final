import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { UserSession } from '../services/auth';

interface HeaderProps {
  onOpenSidebar?: () => void;
  user: UserSession | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onOpenGuide: () => void;
  onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  user,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  onOpenNotifications,
  onOpenGuide,
  onOpenAbout,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const isMember = user && !user.isGuest;
  const isGoogle = isMember && (user.provider === 'google' || user.email.includes('@gmail.com'));

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleLogoutPress = () => {
    setDropdownVisible(false);
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari akun?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Menu Drawer Toggle */}
      <TouchableOpacity
        onPress={onOpenSidebar}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.menuButton}
        activeOpacity={0.7}
      >
        <Ionicons name="menu-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* Brand Logo & Name */}
      <View style={styles.logoWrapper}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Prediksikan</Text>
      </View>

      {/* Right Side: Quick Theme Switch, Notification & Login/Avatar */}
      <View style={styles.rightActionsRow}>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.notificationHeaderBtn, { backgroundColor: isDark ? '#1E293B70' : '#F1F5F9', borderColor: colors.border }]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={18}
            color={isDark ? "#F59E0B" : colors.textPrimary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOpenNotifications}
          style={[styles.notificationHeaderBtn, { backgroundColor: isDark ? '#1E293B70' : '#F1F5F9', borderColor: colors.border }]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={18} color="#F59E0B" />
        </TouchableOpacity>

        {!isMember ? (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={onOpenAuth}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={16} color="#10B981" />
            <Text style={styles.loginBtnText}>Masuk</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => setDropdownVisible(true)}
            activeOpacity={0.8}
          >
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{getInitials(user.name)}</Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Floating User Profile Dropdown Modal */}
      {isMember && (
        <Modal
          visible={dropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
            <View style={styles.dropdownOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {/* User Profile Summary */}
                  <View style={styles.dropdownUserCard}>
                    <View style={styles.dropdownAvatarRow}>
                      {user.avatarUrl ? (
                        <Image source={{ uri: user.avatarUrl }} style={styles.dropdownAvatarImg} />
                      ) : (
                        <View style={styles.dropdownAvatarPlaceholder}>
                          <Text style={styles.dropdownAvatarInitial}>{getInitials(user.name)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.dropdownUserName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {user.name}
                        </Text>
                        <Text style={[styles.dropdownUserEmail, { color: colors.textMuted }]} numberOfLines={1}>
                          {user.email}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dropdownBadgeRow}>
                      <View
                        style={[
                          styles.memberBadge,
                          {
                            backgroundColor: isDark ? '#064E3B40' : '#DCFCE7',
                            borderColor: isDark ? '#05966950' : '#86EFAC',
                          },
                        ]}
                      >
                        {isGoogle ? (
                          <Ionicons name="logo-google" size={11} color="#EA4335" />
                        ) : (
                          <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                        )}
                        <Text
                          style={[
                            styles.memberBadgeText,
                            { color: isDark ? colors.primaryLight : '#15803D' },
                          ]}
                        >
                          {isGoogle ? 'Akun Google' : 'Member Aktif'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />

                  {/* Dropdown Menu Items */}
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDropdownVisible(false);
                      onOpenProfile();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person-outline" size={18} color={colors.primary} />
                    <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>Profil & Akun Saya</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDropdownVisible(false);
                      onOpenNotifications();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="notifications-outline" size={18} color="#F59E0B" />
                    <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>Notifikasi Jadwal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDropdownVisible(false);
                      onOpenGuide();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="book-outline" size={18} color="#38BDF8" />
                    <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>Panduan Nilai Taruhan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDropdownVisible(false);
                      onOpenAbout();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="shield-checkmark-outline" size={18} color="#818CF8" />
                    <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>Tentang & Privasi</Text>
                  </TouchableOpacity>

                  <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />

                  {/* Logout Item */}
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={handleLogoutPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                    <Text style={[styles.dropdownItemText, { color: '#EF4444', fontWeight: '700' }]}>Keluar Akun</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 20,
  },
  menuButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationHeaderBtn: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: '#1E293B70',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#33415560',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B35',
    borderWidth: 1,
    borderColor: '#05966965',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  loginBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 3,
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryDark,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: '#00000045',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 56,
    right: 14,
    width: 250,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 12,
  },
  dropdownUserCard: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  dropdownAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dropdownAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownAvatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dropdownUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dropdownUserEmail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dropdownBadgeRow: {
    flexDirection: 'row',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B40',
    borderWidth: 1,
    borderColor: '#05966950',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
