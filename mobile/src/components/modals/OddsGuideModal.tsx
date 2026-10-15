import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface OddsGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export const OddsGuideModal: React.FC<OddsGuideModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="book" size={22} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Panduan Nilai Taruhan</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Lead Intro */}
            <View style={styles.introCard}>
              <Ionicons name="bulb-outline" size={24} color={colors.primary} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.introTitle}>Filosofi Analitik L1Prediksikan</Text>
                <Text style={styles.introDesc}>
                  Kami menggunakan algoritma Machine Learning & Reinforcement Learning untuk menemukan peluang matematis di mana bandar salah menilai probabilitas suatu pertandingan.
                </Text>
              </View>
            </View>

            {/* Section 1: 1X2 Full Time Result */}
            <View style={styles.guideCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.badgeIcon, { backgroundColor: '#064E3B40' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>1X2</Text>
                </View>
                <Text style={styles.cardTitle}>Pasar 1X2 (Tebak Hasil Akhir)</Text>
              </View>

              <Text style={styles.cardText}>
                Pasar taruhan sepak bola paling standar dengan 3 pilihan hasil pertandingan waktu normal (90 menit + injury time):
              </Text>

              <View style={styles.optionsRow}>
                <View style={styles.optionBox}>
                  <Text style={styles.optionCode}>1</Text>
                  <Text style={styles.optionName}>Home Win</Text>
                  <Text style={styles.optionSub}>Tuan Rumah Menang</Text>
                </View>
                <View style={styles.optionBox}>
                  <Text style={styles.optionCode}>X</Text>
                  <Text style={styles.optionName}>Draw</Text>
                  <Text style={styles.optionSub}>Skor Imbang/Seri</Text>
                </View>
                <View style={styles.optionBox}>
                  <Text style={styles.optionCode}>2</Text>
                  <Text style={styles.optionName}>Away Win</Text>
                  <Text style={styles.optionSub}>Tim Tamu Menang</Text>
                </View>
              </View>
            </View>

            {/* Section 2: Over/Under 2.5 Goals */}
            <View style={styles.guideCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.badgeIcon, { backgroundColor: '#0C4A6E40' }]}>
                  <Text style={[styles.badgeText, { color: '#38BDF8' }]}>O/U</Text>
                </View>
                <Text style={styles.cardTitle}>Pasar Over / Under 2.5 Gol</Text>
              </View>

              <Text style={styles.cardText}>
                Memprediksi total akumulasi gol yang dicetak oleh kedua tim dalam 90 menit pertandingan:
              </Text>

              <View style={styles.ouContainer}>
                <View style={styles.ouItem}>
                  <View style={styles.ouBadgeGreen}>
                    <Text style={styles.ouBadgeText}>Over 2.5 Gol</Text>
                  </View>
                  <Text style={styles.ouDetail}>
                    Minimal tercipta 3 gol atau lebih. Contoh skor: 2-1, 3-0, 2-2, 3-1.
                  </Text>
                </View>

                <View style={styles.ouItem}>
                  <View style={styles.ouBadgeBlue}>
                    <Text style={styles.ouBadgeText}>Under 2.5 Gol</Text>
                  </View>
                  <Text style={styles.ouDetail}>
                    Maksimal tercipta 2 gol saja. Contoh skor: 0-0, 1-0, 0-1, 1-1, 2-0.
                  </Text>
                </View>
              </View>
            </View>

            {/* Section 3: Apa itu Value Bet? */}
            <View style={[styles.guideCard, { borderColor: '#F59E0B60' }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.badgeIcon, { backgroundColor: '#78350F30' }]}>
                  <Ionicons name="sparkles" size={16} color="#F59E0B" />
                </View>
                <Text style={styles.cardTitle}>Bagaimana AI Menemukan &quot;Value Bet&quot;?</Text>
              </View>

              <Text style={styles.cardText}>
                &quot;Value&quot; terjadi jika probabilitas kemenangan yang dihitung model AI kami lebih tinggi daripada probabilitas implisit bandar odds pasar:
              </Text>

              <View style={styles.formulaBox}>
                <Text style={styles.formulaTitle}>Rumus Expected Value (EV):</Text>
                <Text style={styles.formulaMath}>EV = (Probabilitas AI × Odds Pasar) - 1</Text>
                <Text style={styles.formulaDesc}>
                  Jika EV bernilai positif (&gt; 0), AI akan memberikan badge &quot;VALUE BET&quot; karena dalam jangka panjang keputusan ini memberikan ekspektasi profit positif.
                </Text>
              </View>
            </View>

            {/* Section 4: Konsep Unit */}
            <View style={styles.guideCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.badgeIcon, { backgroundColor: '#1E1B4B' }]}>
                  <Ionicons name="cash-outline" size={16} color="#818CF8" />
                </View>
                <Text style={styles.cardTitle}>Apa itu Satuan &quot;Unit&quot;?</Text>
              </View>

              <Text style={styles.cardText}>
                Unit adalah ukuran standar taruhan untuk mengukur performa secara objektif terlepas dari jumlah modal individu:
              </Text>

              <View style={styles.unitBox}>
                <Text style={styles.unitHighlight}>1 Unit = Ukuran Taruhan Standar Anda</Text>
                <Text style={styles.unitExample}>
                  Contoh: Jika modal Anda Rp 2.000.000, 1 Unit bisa bernilai Rp 50.000 (2.5%). Jika aplikasi mencatat performa +10 Units, Anda untung 10x dari ukuran standar (Rp 500.000).
                </Text>
              </View>
            </View>

            {/* Close action */}
            <TouchableOpacity style={styles.gotItBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.gotItText}>Saya Mengerti</Text>
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
    maxHeight: '92%',
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
  introCard: {
    flexDirection: 'row',
    backgroundColor: '#064E3B20',
    borderWidth: 1,
    borderColor: '#05966950',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  introTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  introDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  guideCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  optionBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCode: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  optionName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  optionSub: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  ouContainer: {
    gap: 8,
    marginTop: 4,
  },
  ouItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  ouBadgeGreen: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ouBadgeBlue: {
    backgroundColor: '#0C4A6E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ouBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ouDetail: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  formulaBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    gap: 4,
  },
  formulaTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  formulaMath: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  formulaDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  unitBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  unitHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  unitExample: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  gotItBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  gotItText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
