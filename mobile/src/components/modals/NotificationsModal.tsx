import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import {
  AppNotification,
  NotificationSettings,
  getNotifications,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  formatNotificationTime,
  fetchRemoteBroadcasts,
  createRemoteBroadcast,
} from '../../services/notificationService';
import { getUserSession, UserSession } from '../../services/auth';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'inbox' | 'settings' | 'admin'>('inbox');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [adminTitle, setAdminTitle] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminType, setAdminType] = useState<'system' | 'match' | 'value_bet' | 'parlay'>('system');
  const [isSubmittingBroadcast, setIsSubmittingBroadcast] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    matchReminder: true,
    valueBetAlert: true,
    scoreUpdate: false,
    weeklyDigest: true,
    dndMode: false,
  });

  const loadData = async () => {
    try {
      const sess = await getUserSession();
      setUserSession(sess);
      const notifs = await fetchRemoteBroadcasts();
      setNotifications(notifs);
      const setts = await getNotificationSettings();
      setSettings(setts);
    } catch (err) {
      console.warn('Gagal memuat data notifikasi:', err);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleToggleSetting = async (key: keyof NotificationSettings, val: boolean) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    await saveNotificationSettings(updated);
  };

  const handleMarkAsRead = async (id: string) => {
    const updated = await markNotificationAsRead(id);
    setNotifications(updated);
  };

  const handleMarkAllRead = async () => {
    const updated = await markAllNotificationsAsRead();
    setNotifications(updated);
  };

  const handleDeleteNotif = async (id: string) => {
    const updated = await deleteNotification(id);
    setNotifications(updated);
  };

  const handleClearAllConfirm = () => {
    Alert.alert(
      'Bersihkan Notifikasi',
      'Apakah Anda yakin ingin menghapus semua riwayat pemberitahuan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua',
          style: 'destructive',
          onPress: async () => {
            await clearAllNotifications();
            setNotifications([]);
          },
        },
      ]
    );
  };

  const handleSendTestNotification = async () => {
    const updated = await addNotification({
      title: 'Pemberitahuan Tes 🔔',
      message: 'Sistem notifikasi Prediksikan berfungsi aktif dan siap mengirimkan sinyal pertandingan.',
      type: 'system',
    });
    setNotifications(updated);
    setActiveTab('inbox');
    Alert.alert(
      'Notifikasi Terkirim',
      'Notifikasi baru telah berhasil dibuat dan ditambahkan ke daftar pesan masuk Anda.',
      [{ text: 'Lihat', style: 'default' }]
    );
  };

  const handleSendBroadcast = async () => {
    if (!adminTitle.trim() || !adminMessage.trim()) {
      Alert.alert('Form Belum Lengkap', 'Silakan isi judul dan pesan siaran notifikasi.');
      return;
    }

    setIsSubmittingBroadcast(true);
    try {
      const res = await createRemoteBroadcast({
        title: adminTitle.trim(),
        message: adminMessage.trim(),
        notif_type: adminType,
        admin_email: userSession?.email,
      });

      if (res.success) {
        Alert.alert('Siaran Notifikasi Terkirim', res.message);
        setAdminTitle('');
        setAdminMessage('');
        setActiveTab('inbox');
        const updated = await fetchRemoteBroadcasts();
        setNotifications(updated);
      } else {
        Alert.alert('Gagal Mengirim', res.message);
      }
    } finally {
      setIsSubmittingBroadcast(false);
    }
  };

  const getNotifIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'value_bet':
        return { name: 'flash' as const, color: '#F59E0B', bg: '#78350F35' };
      case 'match':
        return { name: 'football' as const, color: colors.primaryLight, bg: '#064E3B40' };
      case 'score':
        return { name: 'checkmark-circle' as const, color: '#38BDF8', bg: '#0C4A6E40' };
      case 'parlay':
        return { name: 'layers' as const, color: '#818CF8', bg: '#1E1B4B' };
      default:
        return { name: 'notifications' as const, color: colors.primary, bg: '#064E3B40' };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="notifications" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifikasi & Pemberitahuan</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tabs Switcher */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'inbox' && styles.tabButtonActive]}
              onPress={() => setActiveTab('inbox')}
              activeOpacity={0.7}
            >
              <View style={styles.tabContentRow}>
                <Ionicons
                  name="mail-unread-outline"
                  size={16}
                  color={activeTab === 'inbox' ? colors.primaryLight : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'inbox' && styles.tabButtonTextActive,
                  ]}
                >
                  Pemberitahuan
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
              onPress={() => setActiveTab('settings')}
              activeOpacity={0.7}
            >
              <View style={styles.tabContentRow}>
                <Ionicons
                  name="options-outline"
                  size={16}
                  color={activeTab === 'settings' ? colors.primaryLight : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'settings' && styles.tabButtonTextActive,
                  ]}
                >
                  Pengaturan
                </Text>
              </View>
            </TouchableOpacity>

            {userSession?.isStaff && (
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'admin' && styles.tabButtonActive]}
                onPress={() => setActiveTab('admin')}
                activeOpacity={0.7}
              >
                <View style={styles.tabContentRow}>
                  <Ionicons
                    name="megaphone-outline"
                    size={16}
                    color={activeTab === 'admin' ? colors.primaryLight : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTab === 'admin' && styles.tabButtonTextActive,
                    ]}
                  >
                    Siaran Admin
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Content Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'inbox' ? (
              <>
                {/* Inbox Action Row */}
                {notifications.length > 0 && (
                  <View style={styles.inboxActionsRow}>
                    {unreadCount > 0 && (
                      <TouchableOpacity
                        style={styles.actionBtnSmall}
                        onPress={handleMarkAllRead}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="checkmark-done" size={14} color={colors.primaryLight} />
                        <Text style={styles.actionBtnSmallText}>Tandai Dibaca</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtnSmall, { backgroundColor: '#7F1D1D20', borderColor: '#EF444440' }]}
                      onPress={handleClearAllConfirm}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={[styles.actionBtnSmallText, { color: '#EF4444' }]}>Hapus Semua</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Notifications List */}
                {notifications.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="notifications-off-outline" size={32} color={colors.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>Belum Ada Pemberitahuan</Text>
                    <Text style={styles.emptySubtitle}>
                      Pemberitahuan jadwal pertandingan, sinyal odds AI, dan rangkuman mingguan akan tampil di sini.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyActionBtn}
                      onPress={handleSendTestNotification}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="paper-plane-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.emptyActionBtnText}>Kirim Tes Notifikasi</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  notifications.map((item) => {
                    const iconConfig = getNotifIcon(item.type);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.notifCard,
                          !item.isRead && styles.notifCardUnread,
                        ]}
                        onPress={() => handleMarkAsRead(item.id)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.notifIconCircle, { backgroundColor: iconConfig.bg }]}>
                          <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
                        </View>
                        <View style={styles.notifBody}>
                          <View style={styles.notifTitleRow}>
                            <Text style={styles.notifTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            {!item.isRead && <View style={styles.notifDot} />}
                          </View>
                          <Text style={styles.notifMessage}>{item.message}</Text>
                          <View style={styles.notifFooter}>
                            <Text style={styles.notifTime}>
                              {formatNotificationTime(item.timestamp)}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteNotif(item.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={styles.deleteNotifBtn}
                            >
                              <Ionicons name="trash-outline" size={13} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            ) : activeTab === 'settings' ? (
              <>
                <Text style={styles.leadText}>
                  Pilih jenis sinyal pertandingan dan preferensi peringatan yang ingin Anda terima secara langsung.
                </Text>

                {/* List Item 1: Kick-off reminder */}
                <View style={styles.toggleItem}>
                  <View style={styles.toggleIconCol}>
                    <View style={[styles.iconCircle, { backgroundColor: '#064E3B40' }]}>
                      <Ionicons name="alarm-outline" size={20} color={colors.primary} />
                    </View>
                  </View>
                  <View style={styles.toggleTextCol}>
                    <Text style={styles.toggleTitle}>Pengingat Kick-Off Pertandingan</Text>
                    <Text style={styles.toggleDesc}>
                      Pemberitahuan 30 menit sebelum laga tim unggulan dan 11 liga top Eropa dimulai.
                    </Text>
                  </View>
                  <Switch
                    value={settings.matchReminder}
                    onValueChange={(val) => handleToggleSetting('matchReminder', val)}
                    trackColor={{ false: '#334155', true: colors.primaryDark }}
                    thumbColor={settings.matchReminder ? colors.primary : '#94A3B8'}
                  />
                </View>

                {/* List Item 2: Value Bet Alert */}
                <View style={styles.toggleItem}>
                  <View style={styles.toggleIconCol}>
                    <View style={[styles.iconCircle, { backgroundColor: '#78350F35' }]}>
                      <Ionicons name="flash-outline" size={20} color="#F59E0B" />
                    </View>
                  </View>
                  <View style={styles.toggleTextCol}>
                    <View style={styles.titleBadgeRow}>
                      <Text style={styles.toggleTitle}>Peringatan Value Bet AI</Text>
                      <View style={styles.hotBadge}>
                        <Text style={styles.hotBadgeText}>UNGGULAN</Text>
                      </View>
                    </View>
                    <Text style={styles.toggleDesc}>
                      Dapatkan notifikasi seketika saat model mendeteksi ketidaksesuaian odds bandar (Expected Value positif).
                    </Text>
                  </View>
                  <Switch
                    value={settings.valueBetAlert}
                    onValueChange={(val) => handleToggleSetting('valueBetAlert', val)}
                    trackColor={{ false: '#334155', true: '#B45309' }}
                    thumbColor={settings.valueBetAlert ? '#F59E0B' : '#94A3B8'}
                  />
                </View>

                {/* List Item 3: Skor & Evaluasi Pasca Laga */}
                <View style={styles.toggleItem}>
                  <View style={styles.toggleIconCol}>
                    <View style={[styles.iconCircle, { backgroundColor: '#0C4A6E40' }]}>
                      <Ionicons name="checkmark-done-circle-outline" size={20} color="#38BDF8" />
                    </View>
                  </View>
                  <View style={styles.toggleTextCol}>
                    <Text style={styles.toggleTitle}>Update Skor & Evaluasi Hasil</Text>
                    <Text style={styles.toggleDesc}>
                      Laporan rekapitulasi skor akhir dan status menang/kalah (Won/Lost) untuk laga yang Anda ikuti.
                    </Text>
                  </View>
                  <Switch
                    value={settings.scoreUpdate}
                    onValueChange={(val) => handleToggleSetting('scoreUpdate', val)}
                    trackColor={{ false: '#334155', true: colors.primaryDark }}
                    thumbColor={settings.scoreUpdate ? colors.primary : '#94A3B8'}
                  />
                </View>

                {/* List Item 4: Rangkuman Mingguan Parlay */}
                <View style={styles.toggleItem}>
                  <View style={styles.toggleIconCol}>
                    <View style={[styles.iconCircle, { backgroundColor: '#1E1B4B' }]}>
                      <Ionicons name="layers-outline" size={20} color="#818CF8" />
                    </View>
                  </View>
                  <View style={styles.toggleTextCol}>
                    <Text style={styles.toggleTitle}>Rangkuman Tiket Parlay Mingguan</Text>
                    <Text style={styles.toggleDesc}>
                      Analisis performa kombinasi tiket ganda dan akumulasi profit mingguan setiap hari Senin.
                    </Text>
                  </View>
                  <Switch
                    value={settings.weeklyDigest}
                    onValueChange={(val) => handleToggleSetting('weeklyDigest', val)}
                    trackColor={{ false: '#334155', true: colors.primaryDark }}
                    thumbColor={settings.weeklyDigest ? colors.primary : '#94A3B8'}
                  />
                </View>

                {/* Section: Jam Tenang (Do Not Disturb) */}
                <View style={styles.dndCard}>
                  <View style={styles.dndHeaderRow}>
                    <View style={styles.dndTitleRow}>
                      <Ionicons name="moon-outline" size={18} color="#A78BFA" />
                      <Text style={styles.dndTitle}>Mode Malam (Jam Tenang)</Text>
                    </View>
                    <Switch
                      value={settings.dndMode}
                      onValueChange={(val) => handleToggleSetting('dndMode', val)}
                      trackColor={{ false: '#334155', true: '#6D28D9' }}
                      thumbColor={settings.dndMode ? '#A78BFA' : '#94A3B8'}
                    />
                  </View>
                  <Text style={styles.dndDesc}>
                    Bisukan seluruh nada dering dan getaran notifikasi antara pukul 23:00 s/d 06:00 WIB.
                  </Text>
                </View>

                {/* Test Notification Button */}
                <TouchableOpacity
                  style={styles.testBtn}
                  onPress={handleSendTestNotification}
                  activeOpacity={0.8}
                >
                  <Ionicons name="paper-plane-outline" size={16} color={colors.primaryLight} />
                  <Text style={styles.testBtnText}>Kirim Tes Notifikasi Baru</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ================= PANEL SIARAN ADMIN ================= */
              <View style={styles.adminPanel}>
                <View style={styles.adminNotice}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.primaryLight} />
                  <Text style={styles.adminNoticeText}>
                    Anda masuk sebagai <Text style={{ fontWeight: '700', color: colors.primaryLight }}>Staf Admin</Text>. Siaran notifikasi manual yang dikirimkan dari sini akan disimpan ke database server dan langsung terdistribusi ke seluruh pengguna aplikasi mobile & web.
                  </Text>
                </View>

                {/* Kategori Siaran */}
                <Text style={styles.inputLabel}>Kategori Notifikasi</Text>
                <View style={styles.catPickerRow}>
                  {(
                    [
                      { id: 'system', label: 'Sistem 📢' },
                      { id: 'match', label: 'Match ⚽' },
                      { id: 'value_bet', label: 'Value Bet ⚡' },
                      { id: 'parlay', label: 'Parlay 🎯' },
                    ] as const
                  ).map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChip,
                        adminType === cat.id && styles.catChipActive,
                      ]}
                      onPress={() => setAdminType(cat.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          adminType === cat.id && styles.catChipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Input Judul */}
                <Text style={styles.inputLabel}>Judul Notifikasi</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Misal: Sinyal Value Bet Pekan Ini ⚡"
                  placeholderTextColor={colors.textMuted}
                  value={adminTitle}
                  onChangeText={setAdminTitle}
                />

                {/* Input Pesan */}
                <Text style={styles.inputLabel}>Isi Pesan Notifikasi</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Tuliskan isi pengumuman atau info pertandingan..."
                  placeholderTextColor={colors.textMuted}
                  value={adminMessage}
                  onChangeText={setAdminMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Tombol Kirim Siaran */}
                <TouchableOpacity
                  style={[styles.adminSubmitBtn, isSubmittingBroadcast && styles.adminSubmitBtnDisabled]}
                  onPress={handleSendBroadcast}
                  disabled={isSubmittingBroadcast}
                  activeOpacity={0.8}
                >
                  {isSubmittingBroadcast ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={15} color="#FFFFFF" />
                      <Text style={styles.adminSubmitBtnText}>Terbitkan Siaran ke Semua User</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#0B1120',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  body: {
    paddingHorizontal: 18,
  },
  bodyContent: {
    paddingVertical: 16,
    gap: 12,
    paddingBottom: 32,
  },
  inboxActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  actionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  notifCardUnread: {
    borderColor: colors.primaryDark,
    backgroundColor: '#0F261E50',
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBody: {
    flex: 1,
    gap: 4,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  notifDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
    marginLeft: 6,
  },
  notifMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  notifFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  notifTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  deleteNotifBtn: {
    padding: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  leadText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  toggleIconCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextCol: {
    flex: 1,
    gap: 3,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hotBadge: {
    backgroundColor: '#78350F',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hotBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FDE68A',
  },
  toggleDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  dndCard: {
    backgroundColor: '#1E1B4B30',
    borderWidth: 1,
    borderColor: '#4338CA40',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginTop: 4,
  },
  dndHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dndTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dndTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C7D2FE',
  },
  dndDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B30',
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    marginTop: 6,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  /* Styles Panel Siaran Admin */
  adminPanel: {
    gap: 12,
    paddingTop: 4,
  },
  adminNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#064E3B25',
    borderWidth: 1,
    borderColor: '#05966950',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  adminNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#D1FAE5',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  catPickerRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  catChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
  },
  textArea: {
    height: 100,
    paddingTop: 10,
  },
  adminSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  adminSubmitBtnDisabled: {
    opacity: 0.6,
  },
  adminSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

