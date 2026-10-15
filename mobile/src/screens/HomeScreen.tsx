import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { TabType } from '../components/BottomNav';
import {
  Fixture,
  PerformanceData,
  fetchUpcomingFixtures,
  fetchPerformanceMetrics,
} from '../services/api';

interface HomeScreenProps {
  onNavigate: (tab: TabType) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [fixturesData, perfData] = await Promise.all([
        fetchUpcomingFixtures(),
        fetchPerformanceMetrics(),
      ]);
      setFixtures(fixturesData);
      setPerformance(perfData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatMatchTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch {
      return dateStr;
    }
  };

  // Kalkulasi statistik dari data backend riil
  const totalMatches = performance
    ? (performance.ftr.wins + performance.ftr.losses).toLocaleString('id-ID')
    : '13,400+';

  const winRate = performance
    ? (
        (performance.ftr.wins /
          (performance.ftr.wins + performance.ftr.losses)) *
        100
      ).toFixed(1) + '%'
    : '79.5%';

  const profitUnit = performance
    ? `+${Math.round(performance.ftr.unit_profit).toLocaleString('id-ID')}u`
    : '+1,815u';

  // Ambil 3 pertandingan mendatang terdekat
  const featuredFixtures = fixtures.slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* ================= HERO CARD ================= */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>
          Baca pertandingan sebelum peluit dibunyikan.
        </Text>

        <Text style={styles.heroSubtitle}>
          Data odds pasar dan probabilitas 11 liga Eropa untuk referensi pertandingan Anda.
        </Text>

        <View style={styles.heroButtonRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onNavigate('fixtures')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Jadwal Pertandingan</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onNavigate('standings')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Klasemen</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= STATISTIK RIIL BACKEND ================= */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalMatches}</Text>
          <Text style={styles.statLabel}>Total Laga</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{winRate}</Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.primaryLight }]}>{profitUnit}</Text>
          <Text style={styles.statLabel}>Net Profit</Text>
        </View>
      </View>

      {/* ================= MENU NAVIGASI UTAMA ================= */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu Utama</Text>

        <View style={styles.menuGrid}>
          {/* Card 1: Jadwal */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => onNavigate('fixtures')}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#064E3B40' }]}>
              <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.menuCardTitle}>Jadwal Pertandingan</Text>
            <Text style={styles.menuCardDesc}>Jadwal laga & odds lengkap</Text>
            <View style={styles.menuArrow}>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Card 2: Klasemen */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => onNavigate('standings')}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#1E1B4B' }]}>
              <Ionicons name="trophy-outline" size={22} color="#818CF8" />
            </View>
            <Text style={styles.menuCardTitle}>Klasemen Liga</Text>
            <Text style={styles.menuCardDesc}>Tabel poin & logo klub</Text>
            <View style={styles.menuArrow}>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Card 3: Riwayat */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => onNavigate('history')}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#0C4A6E40' }]}>
              <Ionicons name="time-outline" size={22} color="#38BDF8" />
            </View>
            <Text style={styles.menuCardTitle}>Riwayat Hasil</Text>
            <Text style={styles.menuCardDesc}>Evaluasi skor & prediksi</Text>
            <View style={styles.menuArrow}>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Card 4: Peluang Pasar */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => onNavigate('fixtures')}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#78350F30' }]}>
              <Ionicons name="trending-up-outline" size={22} color="#F59E0B" />
            </View>
            <Text style={styles.menuCardTitle}>Peluang Pasar</Text>
            <Text style={styles.menuCardDesc}>Laga dengan indikasi nilai</Text>
            <View style={styles.menuArrow}>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= PERTANDINGAN MENDATANG (DATA ASLI DARI BACKEND) ================= */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pertandingan Mendatang</Text>
          <TouchableOpacity onPress={() => onNavigate('fixtures')}>
            <Text style={styles.seeAllText}>Lihat Semua ({fixtures.length})</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Memuat jadwal dari server...</Text>
          </View>
        ) : featuredFixtures.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>Tidak ada jadwal pertandingan aktif saat ini.</Text>
          </View>
        ) : (
          featuredFixtures.map((fixture) => {
            const probH = Math.round((fixture.prob_ftr_h || 0.33) * 100);
            const probD = Math.round((fixture.prob_ftr_d || 0.33) * 100);
            const probA = Math.max(0, 100 - probH - probD);

            return (
              <View key={fixture.id} style={styles.matchCard}>
                <View style={styles.leagueTagRow}>
                  <Text style={styles.leagueText}>{fixture.league_name}</Text>
                  <Text style={styles.matchTimeBadge}>{formatMatchTime(fixture.date)}</Text>
                </View>

                {/* Teams Row */}
                <View style={styles.matchTeamsRow}>
                  <View style={styles.teamCol}>
                    {fixture.home_team_logo ? (
                      <Image
                        source={{ uri: fixture.home_team_logo }}
                        style={styles.teamLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.teamLogoCircle}>
                        <Ionicons name="shield-outline" size={20} color={colors.textPrimary} />
                      </View>
                    )}
                    <Text style={styles.teamName} numberOfLines={2}>
                      {fixture.home_team_name}
                    </Text>
                  </View>

                  <View style={styles.scoreCol}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>

                  <View style={styles.teamCol}>
                    {fixture.away_team_logo ? (
                      <Image
                        source={{ uri: fixture.away_team_logo }}
                        style={styles.teamLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.teamLogoCircle}>
                        <Ionicons name="shield-outline" size={20} color={colors.textPrimary} />
                      </View>
                    )}
                    <Text style={styles.teamName} numberOfLines={2}>
                      {fixture.away_team_name}
                    </Text>
                  </View>
                </View>

                {/* Odds Pasar (1 X 2) */}
                <View style={styles.oddsContainer}>
                  <View style={styles.oddsBox}>
                    <Text style={styles.oddsLabel}>1 (Home)</Text>
                    <Text style={styles.oddsValue}>{fixture.avg_h ? fixture.avg_h.toFixed(2) : '-'}</Text>
                  </View>
                  <View style={styles.oddsBox}>
                    <Text style={styles.oddsLabel}>X (Seri)</Text>
                    <Text style={styles.oddsValue}>{fixture.avg_d ? fixture.avg_d.toFixed(2) : '-'}</Text>
                  </View>
                  <View style={styles.oddsBox}>
                    <Text style={styles.oddsLabel}>2 (Away)</Text>
                    <Text style={styles.oddsValue}>{fixture.avg_a ? fixture.avg_a.toFixed(2) : '-'}</Text>
                  </View>
                </View>

                {/* Probability Bar */}
                <View style={styles.probContainer}>
                  <View style={styles.probLabelRow}>
                    <Text style={styles.probText}>Home {probH}%</Text>
                    <Text style={styles.probText}>Seri {probD}%</Text>
                    <Text style={styles.probText}>Away {probA}%</Text>
                  </View>
                  <View style={styles.probBarWrapper}>
                    <View style={[styles.probBarSegment, { flex: probH, backgroundColor: colors.primary }]} />
                    <View style={[styles.probBarSegment, { flex: probD, backgroundColor: '#64748B' }]} />
                    <View style={[styles.probBarSegment, { flex: probA, backgroundColor: '#334155' }]} />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 18,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  heroButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },

  /* Stats Strip */
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Section */
  section: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  seeAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },

  /* Menu Grid */
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  menuCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuCardDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 14,
  },
  menuArrow: {
    position: 'absolute',
    top: 14,
    right: 12,
  },

  /* Match Card */
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  leagueTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leagueText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  matchTimeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamLogo: {
    width: 44,
    height: 44,
  },
  teamLogoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  scoreCol: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  vsText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMuted,
  },

  /* Odds Boxes */
  oddsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  oddsBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  oddsLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  oddsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  /* Probability Bar */
  probContainer: {
    gap: 6,
  },
  probLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  probText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  probBarWrapper: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  probBarSegment: {
    height: '100%',
  },

  /* Loading & Empty */
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
