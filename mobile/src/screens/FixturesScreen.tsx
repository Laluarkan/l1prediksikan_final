import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  PanResponder,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { getLeagueLogoUrl } from '../utils/logo';
import { Fixture, fetchUpcomingFixtures } from '../services/api';
import { CompactMatchCard } from '../components/CompactMatchCard';
import { MatchDetailModal } from '../components/modals/MatchDetailModal';
import { HistoryScreen } from './HistoryScreen';
import {
  getWitaDateKey,
  getTodayWitaDate,
  formatWitaShortDate,
  formatWitaFullDate,
  getWitaRelativeLabel,
} from '../utils/dateUtils';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Set kode liga resmi Top 5 Eropa (D1=Bundesliga, E0=Premier League, SP1=La Liga, I1=Serie A, F1=Ligue 1)
const TOP_5_LEAGUE_CODES = new Set(['D1', 'E0', 'SP1', 'I1', 'F1', 'd1', 'e0', 'sp1', 'i1', 'f1']);

export const isTop5League = (leagueCode?: string, leagueName?: string): boolean => {
  if (leagueCode && TOP_5_LEAGUE_CODES.has(leagueCode)) return true;
  const l = (leagueName || '').toLowerCase();
  if (l.includes('scottish')) return false; // Scottish Premiership (SC0) secara eksplisit bukan Top 5
  return (
    l.includes('bundesliga') ||
    l.includes('premier league') ||
    l.includes('la liga') ||
    l.includes('laliga') ||
    l.includes('serie a') ||
    l.includes('ligue 1')
  );
};

// Prioritas Urutan Murni Liga Top 5 Eropa
const getLeaguePriority = (leagueName: string, leagueCode?: string): { priority: number; label: string } => {
  const code = (leagueCode || '').toUpperCase();
  if (code === 'D1' || (!code && leagueName.toLowerCase().includes('bundes'))) return { priority: 1, label: 'Bundesliga' };
  if (code === 'E0' || (!code && !leagueName.toLowerCase().includes('scottish') && (leagueName.toLowerCase().includes('premier') || leagueName.toLowerCase().includes('epl')))) return { priority: 2, label: 'Premier League' };
  if (code === 'SP1' || (!code && (leagueName.toLowerCase().includes('la liga') || leagueName.toLowerCase().includes('laliga')))) return { priority: 3, label: 'La Liga' };
  if (code === 'F1' || (!code && leagueName.toLowerCase().includes('ligue 1'))) return { priority: 4, label: 'Ligue 1' };
  if (code === 'I1' || (!code && leagueName.toLowerCase().includes('serie a'))) return { priority: 5, label: 'Serie A' };
  return { priority: 99, label: leagueName };
};

// Fungsi utilitas menggeser key tanggal WITA 'YYYY-MM-DD'
const shiftWitaDate = (currentKey: string, days: number): string => {
  const parts = currentKey.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const temp = new Date(Date.UTC(y, m, d + days));
    const newY = temp.getUTCFullYear();
    const newM = (temp.getUTCMonth() + 1).toString().padStart(2, '0');
    const newD = temp.getUTCDate().toString().padStart(2, '0');
    return `${newY}-${newM}-${newD}`;
  }
  return currentKey;
};

interface FilterState {
  league: string; // 'ALL' | 'TOP5' | specific league name
  valueOnly: boolean;
  ouPick: 'ALL' | 'OVER' | 'UNDER';
  ftrPick: 'ALL' | 'H' | 'D' | 'A';
  highOddsOnly: boolean; // Odds >= 2.00
}

const INITIAL_FILTERS: FilterState = {
  league: 'ALL',
  valueOnly: false,
  ouPick: 'ALL',
  ftrPick: 'ALL',
  highOddsOnly: false,
};

interface FixturesScreenProps {
  initialTab?: 'upcoming' | 'history';
}

export const FixturesScreen: React.FC<FixturesScreenProps> = ({ initialTab = 'upcoming' }) => {
  const { colors, isDark } = useTheme();
  const [fixtureMode, setFixtureMode] = useState<'upcoming' | 'history'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setFixtureMode(initialTab);
    }
  }, [initialTab]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    getWitaDateKey(getTodayWitaDate())
  );
  const [expandedLeagues, setExpandedLeagues] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  // Filter state & modal
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // Animasi geser kartu horizontal & fade (mencegah glitch langsung pindah)
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Ref untuk menghindari stale closure pada PanResponder
  const selectedDateKeyRef = useRef(selectedDateKey);
  selectedDateKeyRef.current = selectedDateKey;

  const loadData = useCallback(async () => {
    try {
      const fixturesData = await fetchUpcomingFixtures();
      setFixtures(fixturesData);

      // Pastikan tanggal default mencerminkan hari ini di WITA
      const todayKey = getWitaDateKey(getTodayWitaDate());
      const hasToday = fixturesData.some((f) => getWitaDateKey(f.date) === todayKey);
      if (!hasToday && fixturesData.length > 0 && fixturesData[0].date) {
        // Cari match terdekat dari hari ini
        const nearestMatch = fixturesData.find((f) => getWitaDateKey(f.date) >= todayKey);
        if (nearestMatch && nearestMatch.date) {
          setSelectedDateKey(getWitaDateKey(nearestMatch.date));
        } else {
          setSelectedDateKey(getWitaDateKey(fixturesData[0].date));
        }
      }
    } catch (error) {
      console.error('Error loading fixtures:', error);
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

  // Transisi animasi halus saat tanggal berubah
  const animateDateTransition = useCallback(
    (direction: 1 | -1, nextKey: string) => {
      const slideOut = direction > 0 ? -45 : 45;
      const slideIn = direction > 0 ? 45 : -45;

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: slideOut,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.35,
          duration: 90,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSelectedDateKey(nextKey);
        slideAnim.setValue(slideIn);

        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 65,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 130,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [slideAnim, fadeAnim]
  );

  const handleDateShift = useCallback(
    (direction: 1 | -1) => {
      const nextKey = shiftWitaDate(selectedDateKeyRef.current, direction);
      animateDateTransition(direction, nextKey);
    },
    [animateDateTransition]
  );

  const handleDateShiftRef = useRef(handleDateShift);
  handleDateShiftRef.current = handleDateShift;

  // Gesture Swipe:
  // Swipe Kiri (dx < -40) -> Maju ke tanggal berikutnya (+1)
  // Swipe Kanan (dx > 40) -> Mundur ke tanggal sebelumnya (-1)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          handleDateShiftRef.current(1);
        } else if (gestureState.dx > 40) {
          handleDateShiftRef.current(-1);
        }
      },
    })
  ).current;

  // Toggle Dropdown Liga
  const toggleLeague = (leagueName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedLeagues((prev) => ({
      ...prev,
      [leagueName]: !prev[leagueName],
    }));
  };

  // Strip deretan tanggal horizontal ringkas (11 hari di sekitar tanggal terpilih)
  const dateStrip = useMemo(() => {
    const dates: Array<{
      key: string;
      dayName: string;
      dayNum: string;
      isSelected: boolean;
      isToday: boolean;
    }> = [];
    const todayKey = getWitaDateKey(getTodayWitaDate());

    for (let offset = -4; offset <= 6; offset++) {
      const key = shiftWitaDate(selectedDateKey, offset);
      const parts = key.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const tempDate = new Date(Date.UTC(y, m, d));

      const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      dates.push({
        key,
        dayName: DAY_NAMES[tempDate.getUTCDay()],
        dayNum: tempDate.getUTCDate().toString(),
        isSelected: key === selectedDateKey,
        isToday: key === todayKey,
      });
    }
    return dates;
  }, [selectedDateKey]);

  // Daftar nama liga yang tersedia untuk opsi filter
  const availableLeagues = useMemo(() => {
    const leagueSet = new Set<string>();
    fixtures.forEach((f) => {
      if (f.league_name) leagueSet.add(f.league_name);
    });
    return Array.from(leagueSet).sort();
  }, [fixtures]);

  // Jumlah filter aktif
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.league !== 'ALL') count++;
    if (filters.valueOnly) count++;
    if (filters.ouPick !== 'ALL') count++;
    if (filters.ftrPick !== 'ALL') count++;
    if (filters.highOddsOnly) count++;
    return count;
  }, [filters]);

  // Tanggal terdekat pertama yang memiliki match
  const firstAvailableDate = useMemo(() => {
    if (!fixtures || fixtures.length === 0) return null;
    return fixtures[0].date ? getWitaDateKey(fixtures[0].date) : null;
  }, [fixtures]);

  // 1. Filter match hanya pada tanggal terpilih (WITA) + kriteria filter
  const dateFixtures = useMemo(() => {
    return fixtures.filter((f) => {
      // 1. Tanggal sesuai zona waktu WITA
      const matchDate = getWitaDateKey(f.date);
      if (matchDate !== selectedDateKey) return false;

      // 2. Pencarian teks
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          f.home_team_name.toLowerCase().includes(q) ||
          f.away_team_name.toLowerCase().includes(q) ||
          f.league_name.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      // 3. Filter Liga (Hanya Bundesliga, EPL, La Liga, Ligue 1, Serie A via Kode Liga Resmi)
      if (filters.league === 'TOP5') {
        if (!isTop5League(f.league_code, f.league_name)) return false;
      } else if (filters.league !== 'ALL') {
        if (f.league_name !== filters.league && f.league_code !== filters.league) return false;
      }

      // 4. Filter Value Bet Only (Stake RL > 0)
      if (filters.valueOnly) {
        const hasFtrStake = typeof f.rl_stake_ftr === 'number' && f.rl_stake_ftr > 0;
        const hasOuStake = typeof f.rl_stake_ou === 'number' && f.rl_stake_ou > 0;
        const hasGeneralStake = typeof f.rl_stake === 'number' && f.rl_stake > 0;
        if (!hasFtrStake && !hasOuStake && !hasGeneralStake) return false;
      }

      // 5. Filter Pasaran O/U
      if (filters.ouPick === 'OVER') {
        const ou = (f.rl_pick_ou || '').toUpperCase();
        if (!ou.includes('OVER') && ou !== 'O') return false;
      } else if (filters.ouPick === 'UNDER') {
        const ou = (f.rl_pick_ou || '').toUpperCase();
        if (!ou.includes('UNDER') && ou !== 'U') return false;
      }

      // 6. Filter Pasaran 1X2
      if (filters.ftrPick !== 'ALL') {
        const rawFtr = (f.rl_pick_ftr || '').toUpperCase();
        if (rawFtr !== filters.ftrPick) return false;
      }

      // 7. Filter High Odds (Odds >= 2.00)
      if (filters.highOddsOnly) {
        const hasHigh =
          (f.avg_h && f.avg_h >= 2.0) ||
          (f.avg_d && f.avg_d >= 2.0) ||
          (f.avg_a && f.avg_a >= 2.0) ||
          (f.avg_over_25 && f.avg_over_25 >= 2.0) ||
          (f.avg_under_25 && f.avg_under_25 >= 2.0);
        if (!hasHigh) return false;
      }

      return true;
    });
  }, [fixtures, selectedDateKey, searchQuery, filters]);

  // 2. Kelompokkan per liga vertikal
  const groupedLeagues = useMemo(() => {
    const groups: Record<string, Fixture[]> = {};

    dateFixtures.forEach((f) => {
      const lName = f.league_name || 'Lainnya';
      if (!groups[lName]) {
        groups[lName] = [];
      }
      groups[lName].push(f);
    });

    const entries = Object.keys(groups).map((leagueName) => {
      const firstMatch = groups[leagueName][0];
      const info = getLeaguePriority(leagueName, firstMatch?.league_code);
      return {
        leagueName,
        leagueCode: firstMatch?.league_code,
        leagueLogo: firstMatch?.league_logo,
        priority: info.priority,
        matches: groups[leagueName],
      };
    });

    // Urutan: Top 5 Eropa terlebih dahulu (Bundesliga, EPL, La Liga, Ligue 1, Serie A), lalu sisanya alfabetis
    entries.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.leagueName.localeCompare(b.leagueName);
    });

    return entries;
  }, [dateFixtures]);

  const relativeLabel = getWitaRelativeLabel(selectedDateKey);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ================= TOP SEGMENT SWITCHER: JADWAL MENDATANG | RIWAYAT LAGA ================= */}
      <View style={[styles.topSegmentContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.segmentPillWrapper, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              fixtureMode === 'upcoming' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setFixtureMode('upcoming')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar"
              size={13}
              color={fixtureMode === 'upcoming' ? '#FFFFFF' : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: fixtureMode === 'upcoming' ? '#FFFFFF' : colors.textMuted },
                fixtureMode === 'upcoming' && styles.segmentBtnTextActive,
              ]}
            >
              Jadwal Mendatang
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              fixtureMode === 'history' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setFixtureMode('history')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="time"
              size={13}
              color={fixtureMode === 'history' ? '#FFFFFF' : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: fixtureMode === 'history' ? '#FFFFFF' : colors.textMuted },
                fixtureMode === 'history' && styles.segmentBtnTextActive,
              ]}
            >
              Riwayat Laga
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Jika Tab Riwayat Laga Terpilih */}
      {fixtureMode === 'history' ? (
        <HistoryScreen />
      ) : (
        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
          {/* ================= COMPACT CONTROL BAR: KIRI FILTER, KANAN TANGGAL ================= */}
          <View style={[styles.topControlCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.controlRow}>
              {/* Sisi Kiri: Tombol Fitur Filter */}
              <TouchableOpacity
                style={[
                  styles.filterTriggerBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  activeFilterCount > 0 && styles.filterTriggerBtnActive,
                ]}
                onPress={() => setFilterModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="options-outline"
                  size={15}
                  color={activeFilterCount > 0 ? '#10B981' : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.filterTriggerText,
                    { color: activeFilterCount > 0 ? '#10B981' : colors.textPrimary },
                    activeFilterCount > 0 && styles.filterTriggerTextActive,
                  ]}
                >
                  Filter
                </Text>
                {activeFilterCount > 0 ? (
                  <View style={styles.filterCountBadge}>
                    <Text style={styles.filterCountBadgeText}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              {/* Sisi Kanan: Ringkasan Tanggal dengan Panah Kiri-Kanan */}
              <View style={styles.dateNavigatorRight}>
                <TouchableOpacity
                  style={[styles.dateNavArrow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleDateShift(-1)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={17} color={colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateCenterBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    const todayKey = getWitaDateKey(getTodayWitaDate());
                    if (selectedDateKey !== todayKey) {
                      animateDateTransition(selectedDateKey < todayKey ? 1 : -1, todayKey);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="calendar" size={13} color={colors.primary} />
                  <Text style={[styles.dateCenterText, { color: colors.textPrimary }]}>{formatWitaShortDate(selectedDateKey)}</Text>
                  {relativeLabel ? (
                    <View style={styles.relativePill}>
                      <Text style={styles.relativePillText}>{relativeLabel}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateNavArrow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleDateShift(1)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-forward" size={17} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ================= SEARCH BAR ================= */}
          <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={15} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Cari klub atau liga di tanggal ini..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* ================= ACTIVE FILTER CHIPS (JIKA ADA FILTER AKTIF) ================= */}
          {activeFilterCount > 0 && (
            <View style={[styles.activeFiltersRow, { backgroundColor: colors.background }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFilterChipsScroll}>
                {filters.league !== 'ALL' && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>
                      Liga: {filters.league === 'TOP5' ? 'Top 5 Eropa' : filters.league}
                    </Text>
                    <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, league: 'ALL' }))}>
                      <Ionicons name="close" size={12} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.valueOnly && (
                  <View style={styles.activeFilterChip}>
                    <Ionicons name="sparkles" size={10} color="#10B981" />
                    <Text style={styles.activeFilterChipText}>Value Bet Only</Text>
                    <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, valueOnly: false }))}>
                      <Ionicons name="close" size={12} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.ouPick !== 'ALL' && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>O/U: {filters.ouPick}</Text>
                    <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, ouPick: 'ALL' }))}>
                      <Ionicons name="close" size={12} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.ftrPick !== 'ALL' && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>1X2: Pick {filters.ftrPick}</Text>
                    <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, ftrPick: 'ALL' }))}>
                      <Ionicons name="close" size={12} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.highOddsOnly && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>Odds ≥ 2.00</Text>
                    <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, highOddsOnly: false }))}>
                      <Ionicons name="close" size={12} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.resetFilterChip, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                  onPress={() => setFilters(INITIAL_FILTERS)}
                >
                  <Text style={[styles.resetFilterChipText, { color: colors.textMuted }]}>Reset Semua</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* ================= DAFTAR LIGA VERTIKAL DENGAN EFEK GESER ANIMASI ================= */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat jadwal pertandingan (WITA)...</Text>
            </View>
          ) : (
            <Animated.View
              style={[
                styles.animatedContainer,
                {
                  transform: [{ translateX: slideAnim }],
                  opacity: fadeAnim,
                },
              ]}
            >
              <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.listContent}
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
                {/* Header Summary Laga di Tanggal Tersebut */}
                <View style={styles.summaryBar}>
                  <Text style={[styles.summaryText, { color: colors.textMuted }]}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
                      {dateFixtures.length}
                    </Text>{' '}
                    Pertandingan • {groupedLeagues.length} Liga
                  </Text>
                  {selectedDateKey !== getWitaDateKey(getTodayWitaDate()) && (
                    <TouchableOpacity
                      onPress={() => {
                        const todayKey = getWitaDateKey(getTodayWitaDate());
                        animateDateTransition(selectedDateKey < todayKey ? 1 : -1, todayKey);
                      }}
                      style={[styles.todayJumpBtn, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="today-outline" size={12} color={colors.primary} />
                      <Text style={[styles.todayJumpText, { color: colors.primary }]}>Ke Hari Ini</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {groupedLeagues.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Tidak Ada Pertandingan</Text>
                    <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                      Tidak ada pertandingan pada {formatWitaFullDate(selectedDateKey)}.
                      {activeFilterCount > 0
                        ? ' Coba longgarkan kriteria filter Anda.'
                        : ' Geser ke kanan / kiri atau pilih tanggal lain di atas.'}
                    </Text>
                    {activeFilterCount > 0 ? (
                      <TouchableOpacity
                        style={styles.jumpDateBtn}
                        onPress={() => setFilters(INITIAL_FILTERS)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.jumpDateBtnText}>Reset Filter</Text>
                      </TouchableOpacity>
                    ) : firstAvailableDate && firstAvailableDate !== selectedDateKey ? (
                      <TouchableOpacity
                        style={styles.jumpDateBtn}
                        onPress={() => {
                          animateDateTransition(
                            firstAvailableDate > selectedDateKey ? 1 : -1,
                            firstAvailableDate
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.jumpDateBtnText}>
                          Buka Jadwal Terdekat ({formatWitaShortDate(firstAvailableDate)})
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : (
                  groupedLeagues.map((group) => {
                    const isExpanded = Boolean(
                      expandedLeagues[group.leagueName] || searchQuery.trim().length > 0 || activeFilterCount > 0
                    );
                    const leagueLogo = getLeagueLogoUrl(group.leagueCode, group.leagueName, group.leagueLogo);

                    return (
                      <View key={group.leagueName} style={[styles.leagueCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {/* Vertical League Header Card (Tekan untuk Dropdown) */}
                        <TouchableOpacity
                          style={[
                            styles.leagueAccordionHeader,
                            { backgroundColor: colors.surface },
                            isExpanded && [styles.leagueAccordionHeaderActive, { borderBottomColor: colors.border }],
                          ]}
                          onPress={() => toggleLeague(group.leagueName)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.leagueHeaderLeft}>
                            {leagueLogo ? (
                              <Image
                                source={{ uri: leagueLogo }}
                                style={styles.leagueLogoMini}
                                resizeMode="contain"
                              />
                            ) : (
                              <Ionicons
                                name="trophy"
                                size={15}
                                color={group.priority <= 5 ? '#F59E0B' : colors.primaryLight}
                              />
                            )}
                            <Text style={[styles.leagueAccordionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                              {group.leagueName}
                            </Text>
                            {group.priority <= 5 ? (
                              <View style={styles.topLeagueBadge}>
                                <Text style={styles.topLeagueBadgeText}>TOP 5</Text>
                              </View>
                            ) : null}
                          </View>

                          <View style={styles.leagueHeaderRight}>
                            <View style={[styles.matchCountPill, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', borderColor: colors.border }]}>
                              <Text style={[styles.matchCountPillText, { color: colors.textSecondary }]}>{group.matches.length} Laga</Text>
                            </View>
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={17}
                              color={colors.textSecondary}
                            />
                          </View>
                        </TouchableOpacity>

                        {/* Dropdown Match List ketika Liga Ditekan */}
                        {isExpanded && (
                          <View style={[styles.dropdownMatchesContainer, { backgroundColor: colors.background }]}>
                            {group.matches.map((fixture) => (
                              <CompactMatchCard
                                key={fixture.id}
                                fixture={fixture}
                                onPress={() => setSelectedFixture(fixture)}
                                showLeagueBadge={false}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </Animated.View>
          )}
        </View>
      )}

      {/* ================= MODAL FILTER LENGKAP ================= */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalCard}>
            {/* Header Modal */}
            <View style={styles.filterModalHeader}>
              <View style={styles.filterModalHeaderLeft}>
                <Ionicons name="options" size={18} color="#10B981" />
                <Text style={styles.filterModalTitle}>Filter Jadwal Pertandingan</Text>
              </View>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterModalBody}
              contentContainerStyle={styles.filterModalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Filter Liga */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>PILIH LIGA</Text>
                <View style={styles.chipRowWrap}>
                  <TouchableOpacity
                    style={[styles.filterChip, filters.league === 'ALL' && styles.filterChipSelected]}
                    onPress={() => setFilters((p) => ({ ...p, league: 'ALL' }))}
                  >
                    <Text style={[styles.filterChipText, filters.league === 'ALL' && styles.filterChipTextSelected]}>
                      Semua Liga
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, filters.league === 'TOP5' && styles.filterChipSelected]}
                    onPress={() => setFilters((p) => ({ ...p, league: 'TOP5' }))}
                  >
                    <Ionicons
                      name="star"
                      size={11}
                      color={filters.league === 'TOP5' ? '#FFFFFF' : '#F59E0B'}
                    />
                    <Text style={[styles.filterChipText, filters.league === 'TOP5' && styles.filterChipTextSelected]}>
                      Top 5 Eropa
                    </Text>
                  </TouchableOpacity>

                  {availableLeagues.map((lg) => (
                    <TouchableOpacity
                      key={lg}
                      style={[styles.filterChip, filters.league === lg && styles.filterChipSelected]}
                      onPress={() => setFilters((p) => ({ ...p, league: lg }))}
                    >
                      <Text style={[styles.filterChipText, filters.league === lg && styles.filterChipTextSelected]}>
                        {lg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 2. Filter Rekomendasi Value Bet */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>VALUE BET (MARKET EDGE)</Text>
                <TouchableOpacity
                  style={[styles.valueToggleCard, filters.valueOnly && styles.valueToggleCardActive]}
                  onPress={() => setFilters((p) => ({ ...p, valueOnly: !p.valueOnly }))}
                  activeOpacity={0.8}
                >
                  <View style={styles.valueToggleLeft}>
                    <View
                      style={[
                        styles.valueToggleIconBox,
                        filters.valueOnly && { backgroundColor: '#10B981' },
                      ]}
                    >
                      <Ionicons
                        name="sparkles"
                        size={15}
                        color={filters.valueOnly ? '#FFFFFF' : '#34D399'}
                      />
                    </View>
                    <View style={styles.valueToggleTextCol}>
                      <Text style={styles.valueToggleTitle}>Hanya Tampilkan Value Bet</Text>
                      <Text style={styles.valueToggleSubtitle}>
                        Laga dengan keunggulan matematis atas odds pasar
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={filters.valueOnly ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={filters.valueOnly ? '#10B981' : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* 3. Filter Pasaran Over / Under 2.5 */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>REKOMENDASI PASARAN O/U 2.5</Text>
                <View style={styles.chipRowWrap}>
                  <TouchableOpacity
                    style={[styles.filterChip, filters.ouPick === 'ALL' && styles.filterChipSelected]}
                    onPress={() => setFilters((p) => ({ ...p, ouPick: 'ALL' }))}
                  >
                    <Text style={[styles.filterChipText, filters.ouPick === 'ALL' && styles.filterChipTextSelected]}>
                      Semua O/U
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, filters.ouPick === 'OVER' && styles.filterChipSelected]}
                    onPress={() => setFilters((p) => ({ ...p, ouPick: 'OVER' }))}
                  >
                    <Ionicons
                      name="arrow-up-circle"
                      size={12}
                      color={filters.ouPick === 'OVER' ? '#FFFFFF' : '#10B981'}
                    />
                    <Text style={[styles.filterChipText, filters.ouPick === 'OVER' && styles.filterChipTextSelected]}>
                      Bet Over 2.5
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, filters.ouPick === 'UNDER' && styles.filterChipSelected]}
                    onPress={() => setFilters((p) => ({ ...p, ouPick: 'UNDER' }))}
                  >
                    <Ionicons
                      name="arrow-down-circle"
                      size={12}
                      color={filters.ouPick === 'UNDER' ? '#FFFFFF' : '#38BDF8'}
                    />
                    <Text style={[styles.filterChipText, filters.ouPick === 'UNDER' && styles.filterChipTextSelected]}>
                      Bet Under 2.5
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4. Filter Pasaran 1X2 */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>REKOMENDASI 1X2 (HASIL AKHIR)</Text>
                <View style={styles.chipRowWrap}>
                  <TouchableOpacity
                    style={[styles.filterChip, filters.ftrPick === 'ALL' && styles.filterChipSelected]}
                    onPress={() => setFilters((p) => ({ ...p, ftrPick: 'ALL' }))}
                  >
                    <Text style={[styles.filterChipText, filters.ftrPick === 'ALL' && styles.filterChipTextSelected]}>
                      Semua
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, filters.ftrPick === 'H' && styles.filterChipSelected]}
                    onPress={() => setFilters((p) => ({ ...p, ftrPick: 'H' }))}
                  >
                    <Text style={[styles.filterChipText, filters.ftrPick === 'H' && styles.filterChipTextSelected]}>
                      Pick Home (1)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, filters.ftrPick === 'D' && styles.filterChipSelected]}
                    onPress={() => setFilters((p) => ({ ...p, ftrPick: 'D' }))}
                  >
                    <Text style={[styles.filterChipText, filters.ftrPick === 'D' && styles.filterChipTextSelected]}>
                      Pick Seri (X)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, filters.ftrPick === 'A' && styles.filterChipSelected]}
                    onPress={() => setFilters((p) => ({ ...p, ftrPick: 'A' }))}
                  >
                    <Text style={[styles.filterChipText, filters.ftrPick === 'A' && styles.filterChipTextSelected]}>
                      Pick Away (2)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 5. Filter Cerdas Tambahan: High Odds */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>FITUR CERDAS TAMBAHAN</Text>
                <TouchableOpacity
                  style={[styles.valueToggleCard, filters.highOddsOnly && styles.valueToggleCardActive]}
                  onPress={() => setFilters((p) => ({ ...p, highOddsOnly: !p.highOddsOnly }))}
                  activeOpacity={0.8}
                >
                  <View style={styles.valueToggleLeft}>
                    <View
                      style={[
                        styles.valueToggleIconBox,
                        filters.highOddsOnly && { backgroundColor: '#F59E0B' },
                      ]}
                    >
                      <Ionicons
                        name="trending-up"
                        size={15}
                        color={filters.highOddsOnly ? '#FFFFFF' : '#F59E0B'}
                      />
                    </View>
                    <View style={styles.valueToggleTextCol}>
                      <Text style={styles.valueToggleTitle}>Odds Menarik (Odds ≥ 2.00)</Text>
                      <Text style={styles.valueToggleSubtitle}>
                        Pilihan taruhan dengan imbalan return tinggi
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={filters.highOddsOnly ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={filters.highOddsOnly ? '#10B981' : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterResetBtn}
                onPress={() => setFilters(INITIAL_FILTERS)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterResetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterApplyBtn}
                onPress={() => setFilterModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.filterApplyBtnText}>
                  Terapkan ({dateFixtures.length} Laga)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Detail Pertandingan Ketika Card Ditekan */}
      <MatchDetailModal
        visible={!!selectedFixture}
        fixture={selectedFixture}
        onClose={() => setSelectedFixture(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSegmentContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  segmentPillWrapper: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
  },
  segmentBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  segmentBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    fontWeight: '800',
  },
  leagueLogoCircle: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  leagueLogoMini: {
    width: 26,
    height: 26,
    marginRight: 8,
  },
  topControlCard: {
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterTriggerBtnActive: {
    backgroundColor: '#064E3B40',
    borderColor: '#059669',
  },
  filterTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  filterTriggerTextActive: {
    color: '#34D399',
  },
  filterCountBadge: {
    backgroundColor: '#10B981',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  dateNavigatorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateNavArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateCenterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateCenterText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  relativePill: {
    backgroundColor: '#064E3B60',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#10B98150',
  },
  relativePillText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#34D399',
  },
  datePillsScroll: {
    paddingHorizontal: 12,
    gap: 7,
    paddingTop: 2,
    alignItems: 'center',
  },
  datePill: {
    minWidth: 44,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    gap: 1.5,
  },
  datePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  datePillDay: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  datePillDaySelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  datePillNum: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  datePillNumSelected: {
    color: '#FFFFFF',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    position: 'absolute',
    bottom: 2,
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 11.5,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  activeFiltersRow: {
    paddingVertical: 4,
    backgroundColor: colors.background,
  },
  activeFilterChipsScroll: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#064E3B30',
    borderWidth: 0.8,
    borderColor: '#05966980',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  activeFilterChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },
  resetFilterChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  resetFilterChipText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  animatedContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 10,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  summaryText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  todayJumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayJumpText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  leagueCardContainer: {
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  leagueAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
  },
  leagueAccordionHeaderActive: {
    backgroundColor: '#1E293B60',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  leagueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  leagueAccordionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  topLeagueBadge: {
    backgroundColor: '#F59E0B20',
    borderWidth: 1,
    borderColor: '#F59E0B60',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  topLeagueBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#F59E0B',
  },
  leagueHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchCountPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  matchCountPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dropdownMatchesContainer: {
    padding: 8,
    gap: 8,
    backgroundColor: '#0A0F1D',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  jumpDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    marginTop: 6,
  },
  jumpDateBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Filter Modal Styles */
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  filterModalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: '#334155',
    maxHeight: '82%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  filterModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  filterModalBody: {
    flexGrow: 0,
  },
  filterModalContent: {
    padding: 16,
    gap: 16,
  },
  filterSection: {
    gap: 8,
  },
  filterSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  valueToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  valueToggleCardActive: {
    backgroundColor: '#064E3B30',
    borderColor: '#059669',
  },
  valueToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  valueToggleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueToggleTextCol: {
    flex: 1,
  },
  valueToggleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  valueToggleSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  filterModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#090D1A',
  },
  filterResetBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterResetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterApplyBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterApplyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
