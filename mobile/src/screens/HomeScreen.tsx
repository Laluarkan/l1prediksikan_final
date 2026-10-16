import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  fetchStandings,
  getCurrentSeason,
} from '../services/api';
import { CompactMatchCard } from '../components/CompactMatchCard';
import { MatchDetailModal } from '../components/modals/MatchDetailModal';

interface HomeScreenProps {
  onNavigate: (tab: TabType) => void;
}

// Definisi Top 5 Liga Eropa (Bundesliga, EPL, La Liga, Ligue 1, Serie A)
const TOP_5_LEAGUES_CONFIG = [
  { code: 'D1', pattern: /bundes/i, name: 'Bundesliga' },
  { code: 'E0', pattern: /premier|epl/i, name: 'Premier League' },
  { code: 'SP1', pattern: /la liga|primera/i, name: 'La Liga' },
  { code: 'F1', pattern: /ligue 1/i, name: 'Ligue 1' },
  { code: 'I1', pattern: /serie a/i, name: 'Serie A' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [standingsMap, setStandingsMap] = useState<Record<string, number>>({});
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  const currentSeason = getCurrentSeason();
  const seasonParts = currentSeason.split('/');
  const seasonLabel = seasonParts.length === 2 ? `20${seasonParts[0]}/${seasonParts[1]}` : currentSeason;

  const loadData = useCallback(async () => {
    try {
      const [fixturesData, perfData, ...standingsResults] = await Promise.all([
        fetchUpcomingFixtures(),
        fetchPerformanceMetrics(currentSeason),
        ...TOP_5_LEAGUES_CONFIG.map((l) => fetchStandings(l.code, currentSeason)),
      ]);

      setFixtures(fixturesData);
      setPerformance(perfData);

      // Bangun peta peringkat klasemen klub: { "arsenal": 1, "manchester city": 2, ... }
      const newStandingsMap: Record<string, number> = {};
      standingsResults.forEach((res) => {
        if (Array.isArray(res)) {
          res.forEach((item) => {
            if (item.team && typeof item.rank === 'number') {
              newStandingsMap[item.team.toLowerCase().trim()] = item.rank;
            }
          });
        }
      });
      setStandingsMap(newStandingsMap);
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentSeason]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter 5 Laga Mendatang: Tepat 1 laga per liga dari Top 5 Liga Eropa.
  // Dimulai dari tanggal match terbaru (terdekat). Jika ada beberapa match di tanggal tersebut,
  // pilih 1 match yang timnya memiliki posisi klasemen tertinggi.
  const top5Fixtures = useMemo(() => {
    if (!fixtures || fixtures.length === 0) return [];

    const result: Fixture[] = [];

    TOP_5_LEAGUES_CONFIG.forEach((league) => {
      // 1. Ambil laga yang cocok dengan liga ini
      const leagueMatches = fixtures.filter((f) => league.pattern.test(f.league_name));
      if (leagueMatches.length === 0) return;

      // 2. Urutkan berdasarkan tanggal & jam kickoff (terdekat lebih dulu)
      leagueMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 3. Ambil tanggal paling awal yang ada (match terbaru yang belum dimainkan)
      const earliestDateStr = leagueMatches[0].date ? leagueMatches[0].date.split('T')[0] : '';

      // 4. Ambil semua match pada tanggal tersebut (misal tanggal 17 ada 3 match)
      const matchesOnEarliestDate = earliestDateStr
        ? leagueMatches.filter((f) => (f.date || '').startsWith(earliestDateStr))
        : [leagueMatches[0]];

      // 5. Dari match pada tanggal tersebut, pilih 1 match dengan posisi klasemen tertinggi
      matchesOnEarliestDate.sort((a, b) => {
        const rankAHome = standingsMap[a.home_team_name.toLowerCase().trim()] ?? 99;
        const rankAAway = standingsMap[a.away_team_name.toLowerCase().trim()] ?? 99;
        const bestRankA = Math.min(rankAHome, rankAAway);
        const sumRankA = rankAHome + rankAAway;

        const rankBHome = standingsMap[b.home_team_name.toLowerCase().trim()] ?? 99;
        const rankBAway = standingsMap[b.away_team_name.toLowerCase().trim()] ?? 99;
        const bestRankB = Math.min(rankBHome, rankBAway);
        const sumRankB = rankBHome + rankBAway;

        if (bestRankA !== bestRankB) {
          return bestRankA - bestRankB; // Rank 1, 2, 3 lebih diprioritaskan
        }
        return sumRankA - sumRankB;
      });

      // Ambil 1 match terbaik untuk liga ini
      if (matchesOnEarliestDate.length > 0) {
        result.push(matchesOnEarliestDate[0]);
      }
    });

    return result;
  }, [fixtures, standingsMap]);

  // Kalkulasi statistik dari data backend riil musim terbaru saja untuk semua liga
  const ftrWins = performance?.ftr.wins ?? 0;
  const ftrLosses = performance?.ftr.losses ?? 0;
  const totalMatchesCount = ftrWins + ftrLosses;
  const totalMatches = performance ? totalMatchesCount.toLocaleString('id-ID') : '-';
  const winRate = performance
    ? totalMatchesCount > 0
      ? ((ftrWins / totalMatchesCount) * 100).toFixed(1) + '%'
      : '0.0%'
    : '-';

  const profitVal = performance?.ftr.unit_profit;
  const profitUnit =
    profitVal !== undefined
      ? `${profitVal >= 0 ? '+' : ''}${Math.abs(profitVal) < 10 ? profitVal.toFixed(2) : Math.round(profitVal).toLocaleString('id-ID')}u`
      : '-';

  return (
    <>
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
          <Text style={styles.heroTitle}>Baca pertandingan sebelum peluit dibunyikan.</Text>
          <Text style={styles.heroSubtitle}>
            Data odds pasar dan probabilitas statistik 11 liga Eropa untuk referensi pertandingan Anda.
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

        {/* ================= STATISTIK RIIL MUSIM TERBARU ================= */}
        <View style={styles.statsContainer}>
          <View style={styles.statsHeaderRow}>
            <View style={styles.statsBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.statsBadgeText}>Performa Musim {seasonLabel} • Semua Liga</Text>
            </View>
          </View>

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
              <Text
                style={[
                  styles.statNumber,
                  { color: profitVal !== undefined && profitVal < 0 ? '#F87171' : colors.primaryLight },
                ]}
              >
                {profitUnit}
              </Text>
              <Text style={styles.statLabel}>Net Profit</Text>
            </View>
          </View>
        </View>

        {/* ================= MENU NAVIGASI UTAMA (2x2 GRID RAPI) ================= */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu Utama</Text>

          <View style={styles.menuContainer}>
            <View style={styles.menuRow}>
              <TouchableOpacity
                style={styles.menuCard}
                onPress={() => onNavigate('fixtures')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#064E3B40' }]}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuCardTitle} numberOfLines={1}>Jadwal</Text>
                  <Text style={styles.menuCardDesc} numberOfLines={1}>Odds & analisa</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuCard}
                onPress={() => onNavigate('standings')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#1E1B4B' }]}>
                  <Ionicons name="trophy-outline" size={20} color="#818CF8" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuCardTitle} numberOfLines={1}>Klasemen</Text>
                  <Text style={styles.menuCardDesc} numberOfLines={1}>Poin & klub</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.menuArrow} />
              </TouchableOpacity>
            </View>

            <View style={styles.menuRow}>
              <TouchableOpacity
                style={styles.menuCard}
                onPress={() => onNavigate('history')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#0C4A6E40' }]}>
                  <Ionicons name="time-outline" size={20} color="#38BDF8" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuCardTitle} numberOfLines={1}>Riwayat</Text>
                  <Text style={styles.menuCardDesc} numberOfLines={1}>Evaluasi skor</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuCard}
                onPress={() => onNavigate('parlay')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#064E3B40' }]}>
                  <Ionicons name="sparkles" size={20} color="#10B981" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuCardTitle} numberOfLines={1}>Parlay AI</Text>
                  <Text style={styles.menuCardDesc} numberOfLines={1}>Tiket multi-leg</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.menuArrow} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ================= 5 PERTANDINGAN MENDATANG TOP 5 LIGA EROPA ================= */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Pertandingan Mendatang</Text>
              <Text style={styles.sectionSubtitle}>Top 5 laga pilihan</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('fixtures')}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Memuat jadwal pilihan dari server...</Text>
            </View>
          ) : top5Fixtures.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>Tidak ada jadwal aktif untuk Top 5 Liga saat ini.</Text>
            </View>
          ) : (
            <View style={styles.matchesList}>
              {top5Fixtures.map((fixture) => (
                <CompactMatchCard
                  key={fixture.id}
                  fixture={fixture}
                  onPress={() => setSelectedFixture(fixture)}
                  showLeagueBadge={true}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Detail Pertandingan Ketika Card Ditekan */}
      <MatchDetailModal
        visible={!!selectedFixture}
        fixture={selectedFixture}
        onClose={() => setSelectedFixture(null)}
      />
    </>
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
  statsContainer: {
    gap: 8,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statsBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  /* Menu Navigation Grid */
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  menuContainer: {
    gap: 10,
  },
  menuRow: {
    flexDirection: 'row',
    gap: 10,
  },
  menuCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
    gap: 1,
  },
  menuCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuCardDesc: {
    fontSize: 9.5,
    color: colors.textMuted,
  },
  menuArrow: {
    marginLeft: 2,
  },

  /* Matches List */
  matchesList: {
    gap: 10,
  },
  loadingContainer: {
    padding: 24,
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
