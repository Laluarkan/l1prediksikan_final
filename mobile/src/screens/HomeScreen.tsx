import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
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
import { getWitaDateKey } from '../utils/dateUtils';
import { syncDynamicNotifications, fetchRemoteBroadcasts } from '../services/notificationService';

interface HomeScreenProps {
  onNavigate: (tab: TabType) => void;
}

// Definisi Liga Top 5 Eropa (Bundesliga, EPL, La Liga, Ligue 1, Serie A)
const TOP_5_LEAGUES_CONFIG = [
  { code: 'D1', pattern: /bundes/i, name: 'Bundesliga' },
  { code: 'E0', pattern: /^(?!.*scottish).*(premier|epl)/i, name: 'Premier League' },
  { code: 'SP1', pattern: /la\s*liga/i, name: 'La Liga' },
  { code: 'F1', pattern: /ligue\s*1/i, name: 'Ligue 1' },
  { code: 'I1', pattern: /serie\s*a/i, name: 'Serie A' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { colors, isDark } = useTheme();

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [standingsMap, setStandingsMap] = useState<Record<string, number>>({});
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
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

      // Bangun peta peringkat klasemen klub
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

      syncDynamicNotifications(fixturesData).catch((e) => console.warn('Sync notif dynamic error:', e));
      fetchRemoteBroadcasts().catch((e) => console.warn('Fetch broadcasts error:', e));
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

  // Tombol Hapus Cache di Beranda
  const handleClearCache = async () => {
    try {
      setIsClearingCache(true);
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(
        (k) =>
          k.includes('cache') ||
          k.includes('fixtures') ||
          k.includes('standings') ||
          k.includes('history') ||
          k.includes('parlay')
      );
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      await loadData();
      Alert.alert(
        'Cache Berhasil Dibersihkan',
        'Data lokal telah di-reset dan data pertandingan terbaru dimuat langsung dari server.'
      );
    } catch (err) {
      console.warn('Gagal menghapus cache:', err);
      Alert.alert('Info', 'Cache telah dibersihkan.');
    } finally {
      setIsClearingCache(false);
    }
  };

  // 1. Ambil 5 match pilihan:
  //    - Prioritaskan 1 match per liga dari Top 5 Liga Eropa dengan posisi klasemen tertinggi.
  //    - Jika top 5 liga sudah tidak ada / kurang dari 5, ambil match dari liga lain yang akan main dengan tetap posisi tertinggi.
  // 2. Urutkan seluruh pertandingan dari yang LEBIH AWAL MAIN (kronologis)
  const top5Fixtures = useMemo(() => {
    if (!fixtures || fixtures.length === 0) return [];

    const selectedMatches: Fixture[] = [];
    const usedMatchIds = new Set<number>();

    // 1. Ambil 1 match terbaik dari Top 5 Liga Eropa
    TOP_5_LEAGUES_CONFIG.forEach((league) => {
      const leagueMatches = fixtures.filter((f) => {
        if (/scottish/i.test(f.league_name)) return false;
        if (f.league_code) return f.league_code === league.code;
        return league.pattern.test(f.league_name);
      });
      if (leagueMatches.length === 0) return;

      leagueMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const earliestDateStr = leagueMatches[0].date ? getWitaDateKey(leagueMatches[0].date) : '';
      const matchesOnEarliestDate = earliestDateStr
        ? leagueMatches.filter((f) => getWitaDateKey(f.date) === earliestDateStr)
        : [leagueMatches[0]];

      matchesOnEarliestDate.sort((a, b) => {
        const rankAHome = standingsMap[a.home_team_name.toLowerCase().trim()] ?? 99;
        const rankAAway = standingsMap[a.away_team_name.toLowerCase().trim()] ?? 99;
        const bestRankA = Math.min(rankAHome, rankAAway);
        const rankBHome = standingsMap[b.home_team_name.toLowerCase().trim()] ?? 99;
        const rankBAway = standingsMap[b.away_team_name.toLowerCase().trim()] ?? 99;
        const bestRankB = Math.min(rankBHome, rankBAway);
        return bestRankA - bestRankB;
      });

      if (matchesOnEarliestDate.length > 0) {
        selectedMatches.push(matchesOnEarliestDate[0]);
        usedMatchIds.add(matchesOnEarliestDate[0].id);
      }
    });

    // 2. Jika match kurang dari 5, ambil dari liga lain yang akan main
    if (selectedMatches.length < 5) {
      const otherMatches = fixtures.filter((f) => !usedMatchIds.has(f.id));
      otherMatches.sort((a, b) => {
        const rankAHome = standingsMap[a.home_team_name.toLowerCase().trim()] ?? 99;
        const rankAAway = standingsMap[a.away_team_name.toLowerCase().trim()] ?? 99;
        const bestRankA = Math.min(rankAHome, rankAAway);
        const rankBHome = standingsMap[b.home_team_name.toLowerCase().trim()] ?? 99;
        const rankBAway = standingsMap[b.away_team_name.toLowerCase().trim()] ?? 99;
        const bestRankB = Math.min(rankBHome, rankBAway);
        if (bestRankA !== bestRankB) return bestRankA - bestRankB;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      for (const m of otherMatches) {
        if (selectedMatches.length >= 5) break;
        selectedMatches.push(m);
        usedMatchIds.add(m.id);
      }
    }

    // 3. Urutkan hasil akhir secara KRONOLOGIS (yang lebih awal main berada di atas)
    selectedMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return selectedMatches;
  }, [fixtures, standingsMap]);

  // Statistik performa
  const ftrWins = performance?.ftr.wins ?? 0;
  const ftrLosses = performance?.ftr.losses ?? 0;
  const ftrTotalCount = ftrWins + ftrLosses;
  const ftrTotalLabel = performance ? ftrTotalCount.toLocaleString('id-ID') : '-';
  const ftrWinsLabel = performance ? ftrWins.toLocaleString('id-ID') : '-';
  const ftrWinRateLabel = performance
    ? ftrTotalCount > 0
      ? ((ftrWins / ftrTotalCount) * 100).toFixed(1) + '%'
      : '0.0%'
    : '-';

  const ouWins = performance?.ou.wins ?? 0;
  const ouLosses = performance?.ou.losses ?? 0;
  const ouTotalCount = ouWins + ouLosses;
  const ouTotalLabel = performance ? ouTotalCount.toLocaleString('id-ID') : '-';
  const ouWinsLabel = performance ? ouWins.toLocaleString('id-ID') : '-';
  const ouWinRateLabel = performance
    ? ouTotalCount > 0
      ? ((ouWins / ouTotalCount) * 100).toFixed(1) + '%'
      : '0.0%'
    : '-';

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
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
        {/* ================= STATISTIK RIIL MUSIM TERBARU & TOMBOL HAPUS CACHE ================= */}
        <View style={styles.statsContainer}>
          <View style={styles.statsHeaderRow}>
            <View style={[styles.statsBadge, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', borderColor: colors.border }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statsBadgeText, { color: colors.textPrimary }]}>
                Performa Musim {seasonLabel}
              </Text>
            </View>

            {/* Tombol Hapus Cache di Beranda Atas */}
            <TouchableOpacity
              style={[styles.clearCacheBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.borderLight }]}
              onPress={handleClearCache}
              disabled={isClearingCache}
              activeOpacity={0.7}
            >
              {isClearingCache ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh-circle-outline" size={14} color={colors.primary} />
                  <Text style={[styles.clearCacheText, { color: colors.textSecondary }]}>Hapus Cache</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Cards: HDA (1X2) & O/U */}
          <View style={[styles.perfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.perfCardHeader}>
              <View style={[styles.perfLabelBadgeHda, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
                <Text style={[styles.perfLabelTextHda, { color: colors.primary }]}>HDA (1X2)</Text>
              </View>
              <Text style={[styles.perfCardSubText, { color: colors.textMuted }]}>Hasil Akhir Pertandingan</Text>
            </View>

            <View style={styles.statsStrip}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{ftrTotalLabel}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Laga</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{ftrWinsLabel}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Menang</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{ftrWinRateLabel}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Win Rate</Text>
              </View>
            </View>

            <View style={[styles.perfCardHeader, { marginTop: 12 }]}>
              <View style={[styles.perfLabelBadgeOu, { backgroundColor: '#38BDF820', borderColor: '#38BDF840' }]}>
                <Text style={[styles.perfLabelTextOu, { color: '#0284C7' }]}>O/U (Over / Under 2.5)</Text>
              </View>
              <Text style={[styles.perfCardSubText, { color: colors.textMuted }]}>Total Gol Laga</Text>
            </View>

            <View style={styles.statsStrip}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{ouTotalLabel}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Laga</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{ouWinsLabel}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Menang</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{ouWinRateLabel}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Win Rate</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================= MENU NAVIGASI UTAMA (2x2 GRID RAPI) ================= */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Menu Utama</Text>

          <View style={styles.menuContainer}>
            <View style={styles.menuRow}>
              <TouchableOpacity
                style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => onNavigate('fixtures')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#05966920' }]}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>Jadwal</Text>
                  <Text style={[styles.menuCardDesc, { color: colors.textMuted }]} numberOfLines={1}>Odds & analisa</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => onNavigate('parlay')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#05966920' }]}>
                  <Ionicons name="ticket" size={20} color={colors.primary} />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>Parlay</Text>
                  <Text style={[styles.menuCardDesc, { color: colors.textMuted }]} numberOfLines={1}>Tiket multi-leg</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.menuArrow} />
              </TouchableOpacity>
            </View>

            <View style={styles.menuRow}>
              <TouchableOpacity
                style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => onNavigate('standings')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#6366F120' }]}>
                  <Ionicons name="trophy-outline" size={20} color="#6366F1" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>Klasemen</Text>
                  <Text style={[styles.menuCardDesc, { color: colors.textMuted }]} numberOfLines={1}>Poin & klub</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => onNavigate('user')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#38BDF820' }]}>
                  <Ionicons name="person-outline" size={20} color="#38BDF8" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>Akun & Favorit</Text>
                  <Text style={[styles.menuCardDesc, { color: colors.textMuted }]} numberOfLines={1}>Match tersimpan</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.menuArrow} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ================= 5 PERTANDINGAN MENDATANG (URUTAN LEBIH AWAL MAIN) ================= */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pertandingan Mendatang</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>5 Laga pilihan terawal main</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('fixtures')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat jadwal pilihan dari server...</Text>
            </View>
          ) : top5Fixtures.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tidak ada jadwal aktif saat ini.</Text>
            </View>
          ) : (
            <View style={styles.matchesList}>
              {top5Fixtures.map((fixture) => (
                <CompactMatchCard
                  key={fixture.id}
                  fixture={fixture}
                  onPress={() => setSelectedFixture(fixture)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Match Detail Modal */}
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
  },
  content: {
    padding: 14,
    gap: 16,
  },
  statsContainer: {
    gap: 10,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  clearCacheText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  perfCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  perfCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  perfLabelBadgeHda: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  perfLabelTextHda: {
    fontSize: 10,
    fontWeight: '800',
  },
  perfLabelBadgeOu: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  perfLabelTextOu: {
    fontSize: 10,
    fontWeight: '800',
  },
  perfCardSubText: {
    fontSize: 10,
    fontWeight: '500',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  menuContainer: {
    gap: 8,
  },
  menuRow: {
    flexDirection: 'row',
    gap: 8,
  },
  menuCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
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
  },
  menuCardTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  menuCardDesc: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  menuArrow: {
    marginRight: 2,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 11,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  matchesList: {
    gap: 8,
  },
});
