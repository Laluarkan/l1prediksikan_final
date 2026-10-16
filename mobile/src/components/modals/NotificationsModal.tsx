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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const NOTIFS_STORAGE_KEY = '@prediksikan_notif_settings';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
}) => {
  const [matchReminder, setMatchReminder] = useState(true);
  const [valueBetAlert, setValueBetAlert] = useState(true);
  const [scoreUpdate, setScoreUpdate] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [dndMode, setDndMode] = useState(false);

  // Load preferences from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTIFS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.matchReminder !== undefined) setMatchReminder(parsed.matchReminder);
          if (parsed.valueBetAlert !== undefined) setValueBetAlert(parsed.valueBetAlert);
          if (parsed.scoreUpdate !== undefined) setScoreUpdate(parsed.scoreUpdate);
          if (parsed.weeklyDigest !== undefined) setWeeklyDigest(parsed.weeklyDigest);
          if (parsed.dndMode !== undefined) setDndMode(parsed.dndMode);
        }
      } catch (e) {
        console.warn('Failed to load notif settings', e);
      }
    };
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  // Save changes
  const updateSetting = async (key: string, val: boolean) => {
    try {
      const updated = {
        matchReminder: key === 'matchReminder' ? val : matchReminder,
        valueBetAlert: key === 'valueBetAlert' ? val : valueBetAlert,
        scoreUpdate: key === 'scoreUpdate' ? val : scoreUpdate,
        weeklyDigest: key === 'weeklyDigest' ? val : weeklyDigest,
        dndMode: key === 'dndMode' ? val : dndMode,
      };
      await AsyncStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save notif settings', e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="notifications" size={22} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Pengaturan Notifikasi</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.leadText}>
              Pilih peringatan pertandingan dan sinyal odds AI yang ingin Anda terima secara langsung di perangkat Anda.
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
                value={matchReminder}
                onValueChange={(val) => {
                  setMatchReminder(val);
                  updateSetting('matchReminder', val);
                }}
                trackColor={{ false: '#334155', true: colors.primaryDark }}
                thumbColor={matchReminder ? colors.primary : '#94A3B8'}
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
                value={valueBetAlert}
                onValueChange={(val) => {
                  setValueBetAlert(val);
                  updateSetting('valueBetAlert', val);
                }}
                trackColor={{ false: '#334155', true: '#B45309' }}
                thumbColor={valueBetAlert ? '#F59E0B' : '#94A3B8'}
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
                value={scoreUpdate}
                onValueChange={(val) => {
                  setScoreUpdate(val);
                  updateSetting('scoreUpdate', val);
                }}
                trackColor={{ false: '#334155', true: colors.primaryDark }}
                thumbColor={scoreUpdate ? colors.primary : '#94A3B8'}
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
                value={weeklyDigest}
                onValueChange={(val) => {
                  setWeeklyDigest(val);
                  updateSetting('weeklyDigest', val);
                }}
                trackColor={{ false: '#334155', true: colors.primaryDark }}
                thumbColor={weeklyDigest ? colors.primary : '#94A3B8'}
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
                  value={dndMode}
                  onValueChange={(val) => {
                    setDndMode(val);
                    updateSetting('dndMode', val);
                  }}
                  trackColor={{ false: '#334155', true: '#6D28D9' }}
                  thumbColor={dndMode ? '#A78BFA' : '#94A3B8'}
                />
              </View>
              <Text style={styles.dndDesc}>
                Bisukan seluruh nada dering dan getaran notifikasi antara pukul 23:00 s/d 06:00 WIB.
              </Text>
            </View>

            {/* Test Notification Button */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => {
                Alert.alert(
                  'Tes Notifikasi Berhasil',
                  'Sistem notifikasi Prediksikan aktif dan terhubung ke perangkat Anda.',
                  [{ text: 'Bagus' }]
                );
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="paper-plane-outline" size={16} color={colors.primaryLight} />
              <Text style={styles.testBtnText}>Kirim Tes Notifikasi</Text>
            </TouchableOpacity>
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
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: colors.border,
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
  },
  leadText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  toggleIconCol: {
    justifyContent: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
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
    backgroundColor: '#F59E0B20',
    borderColor: '#F59E0B60',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hotBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  toggleDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  dndCard: {
    backgroundColor: '#1E1B4B30',
    borderWidth: 1,
    borderColor: '#4338CA50',
    borderRadius: 14,
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
    color: '#C4B5FD',
  },
  dndDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
  },
});
