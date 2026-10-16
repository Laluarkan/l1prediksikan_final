import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { APP_NAME, FULL_VERSION_STRING } from '../../config/version';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
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
                <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Tentang & Privasi</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* App Brand Header */}
            <View style={styles.brandCard}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.brandName}>{APP_NAME}</Text>
              <Text style={styles.tagline}>Sepak Bola Modern • Prediksi Berbasis AI</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>{FULL_VERSION_STRING}</Text>
              </View>
            </View>

            {/* About Platform */}
            <View style={styles.infoCard}>
              <Text style={styles.cardHeader}>TENTANG PLATFORM</Text>
              <Text style={styles.cardParagraph}>
                L1 {APP_NAME} adalah sistem analitik prediktif dan machine learning mandiri yang dirancang untuk memproses puluhan ribu rekaman data pertandingan, pergerakan odds pasar historis, dan formasi tim di 11 liga teratas Eropa.
              </Text>
              <Text style={styles.cardParagraph}>
                Platform ini bertujuan memberikan transparansi penuh terhadap probabilitas matematika sepak bola sebelum pertandingan dimulai.
              </Text>
            </View>

            {/* Security & Data Privacy */}
            <View style={styles.infoCard}>
              <Text style={styles.cardHeader}>KEAMANAN & PRIVASI DATA</Text>

              <View style={styles.securityItem}>
                <Ionicons name="lock-closed" size={18} color="#10B981" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.securityTitle}>Enkripsi Password Tingkat Tinggi</Text>
                  <Text style={styles.securityDesc}>
                    Password akun Anda dienkripsi menggunakan algoritma standar industri PBKDF2 dengan salt unik pada database server.
                  </Text>
                </View>
              </View>

              <View style={styles.securityItem}>
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.securityTitle}>Privasi Login Google</Text>
                  <Text style={styles.securityDesc}>
                    Masuk dengan akun Google tidak pernah membagikan password Google Anda kepada server kami.
                  </Text>
                </View>
              </View>

              <View style={styles.securityItem}>
                <Ionicons name="server" size={18} color="#38BDF8" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.securityTitle}>Koneksi API Aman (SSL/TLS)</Text>
                  <Text style={styles.securityDesc}>
                    Seluruh komunikasi antara aplikasi mobile dan backend Render dilindungi enkripsi end-to-end HTTPS.
                  </Text>
                </View>
              </View>
            </View>

            {/* Privacy Policy Link Card */}
            <TouchableOpacity
              style={styles.privacyLinkCard}
              onPress={() => Linking.openURL('https://l1prediksikan.my.id/legal')}
              activeOpacity={0.7}
            >
              <View style={styles.privacyLinkLeft}>
                <Ionicons name="document-text-outline" size={20} color={colors.primaryLight} />
                <View style={{ gap: 2 }}>
                  <Text style={styles.privacyLinkTitle}>Kebijakan Privasi & Ketentuan</Text>
                  <Text style={styles.privacyLinkSub}>l1prediksikan.my.id/legal</Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Disclaimer */}
            <View style={styles.disclaimerCard}>
              <View style={styles.disclaimerHeader}>
                <Ionicons name="warning-outline" size={18} color="#F59E0B" />
                <Text style={styles.disclaimerTitle}>Pernyataan Penyangkalan (Disclaimer)</Text>
              </View>
              <Text style={styles.disclaimerText}>
                Seluruh data, analisis probabilitas, dan estimasi nilai (Value Bet) di dalam aplikasi ini semata-mata disajikan untuk kepentingan referensi analitis olahraga, riset data, dan hiburan.
              </Text>
              <Text style={styles.disclaimerText}>
                {APP_NAME} bukan merupakan penyedia layanan perjudian atau operator taruhan berlisensi dan tidak memfasilitasi transaksi uang riil. Keputusan finansial apa pun sepenuhnya merupakan tanggung jawab pribadi pengguna.
              </Text>
            </View>

            {/* Copyright */}
            <Text style={styles.copyrightText}>
              © 2026 L1 {APP_NAME}. Hak Cipta Dilindungi Undang-Undang.
            </Text>
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
  brandCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    color: colors.textMuted,
  },
  versionBadge: {
    backgroundColor: '#064E3B40',
    borderWidth: 1,
    borderColor: '#05966950',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  cardParagraph: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  securityItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  securityDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  disclaimerCard: {
    backgroundColor: '#78350F20',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 16,
  },
  copyrightText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 12,
  },
  privacyLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privacyLinkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  privacyLinkSub: {
    fontSize: 11,
    color: colors.primaryLight,
  },
});
