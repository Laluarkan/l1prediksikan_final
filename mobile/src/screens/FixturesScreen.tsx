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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Fixture, League, fetchLeagues, fetchUpcomingFixtures } from '../services/api';
import { CompactMatchCard } from '../components/CompactMatchCard';
import { MatchDetailModal } from '../components/modals/MatchDetailModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Prioritas Urutan Liga Top 5 Eropa (Bundesliga, EPL, La Liga, Ligue 1, Serie A)
const getLeaguePriority = (leagueName: string): { priority: number; label: string } => {
  const l = leagueName.toLowerCase();
  if (l.includes('bundes')) return { priority: 1, label: 'Bundesliga' };
  if (l.includes('premier') || l.includes('epl')) return { priority: 2, label: 'Premier League' };
  if (l.includes('la liga') || l.includes('laliga') || l.includes('primera')) return { priority: 3, label: 'La Liga' };
  if (l.includes('ligue 1') || l.includes('ligue1')) return { priority: 4, label: 'Ligue 1' };
  if (l.includes('serie a')) return { priority: 5, label: 'Serie A' };
  return { priority: 99, label: leagueName };
};

const formatDateToKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDateKey = (dateKey: string): Date => {
  const parts = dateKey.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date();
};

const formatDisplayDate = (dateKey: string): string => {
  try {
    const d = parseDateKey(dateKey);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateKey;
  }
};

const getRelativeDateLabel = (dateKey: string): string | null => {
  const todayKey = formatDateToKey(new Date());
  if (dateKey === todayKey) return 'Hari Ini';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateKey === formatDateToKey(tomorrow)) return 'Besok';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === formatDateToKey(yesterday)) return 'Kemarin';

  return null;
};

export const FixturesScreen: React.FC = () => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [, setLeagues] = useState<League[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(formatDateToKey(new Date()));
  const [expandedLeagues, setExpandedLeagues] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [leaguesData, fixturesData] = await Promise.all([
        fetchLeagues(),
        fetchUpcomingFixtures(),
      ]);
      setLeagues(leaguesData);
      setFixtures(fixturesData);

      // Jika tanggal hari ini belum ada match, namun ada jadwal terdekat di masa depan,
      // otomatis arahkan ke tanggal jadwal terdekat tersebut
      const today = formatDateToKey(new Date());
      const hasToday = fixturesData.some((f) => (f.date || '').startsWith(today));
      if (!hasToday && fixturesData.length > 0 && fixturesData[0].date) {
        const firstDate = fixturesData[0].date.split('T')[0];
        if (firstDate) {
          setSelectedDateKey(firstDate);
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

  // Navigasi Tanggal (Maju / Mundur)
  const shiftDate = useCallback((days: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDateKey((prev) => {
      const d = parseDateKey(prev);
      d.setDate(d.getDate() + days);
      return formatDateToKey(d);
    });
  }, []);

  // Gesture Swipe Kiri (Mundur) dan Kanan (Maju)
  // "ketika di geser ke kiri akan menggeser mundur tanggal begitupun jika di geser ke kanan akan menggeser maju tanggal"
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          // Geser ke kiri -> mundur tanggal
          shiftDate(-1);
        } else if (gestureState.dx > 50) {
          // Geser ke kanan -> maju tanggal
          shiftDate(1);
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

  // Strip 11 tanggal di sekitar tanggal aktif
  const dateStrip = useMemo(() => {
    const center = parseDateKey(selectedDateKey);
    const dates: Array<{ key: string; dayName: string; dayNum: string; isSelected: boolean; isToday: boolean }> = [];
    const todayKey = formatDateToKey(new Date());

    for (let offset = -3; offset <= 7; offset++) {
      const d = new Date(center);
      d.setDate(d.getDate() + offset);
      const key = formatDateToKey(d);
      dates.push({
        key,
        dayName: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        dayNum: d.getDate().toString(),
        isSelected: key === selectedDateKey,
        isToday: key === todayKey,
      });
    }
    return dates;
  }, [selectedDateKey]);

  // Tanggal terdekat pertama yang memiliki match
  const firstAvailableDate = useMemo(() => {
    if (!fixtures || fixtures.length === 0) return null;
    return fixtures[0].date ? fixtures[0].date.split('T')[0] : null;
  }, [fixtures]);

  // 1. Filter match hanya pada tanggal terpilih
  const dateFixtures = useMemo(() => {
    return fixtures.filter((f) => {
      const matchDate = (f.date || '').split('T')[0];
      if (matchDate !== selectedDateKey) return false;

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          f.home_team_name.toLowerCase().includes(q) ||
          f.away_team_name.toLowerCase().includes(q) ||
          f.league_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [fixtures, selectedDateKey, searchQuery]);

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
      const info = getLeaguePriority(leagueName);
      return {
        leagueName,
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

  const relativeLabel = getRelativeDateLabel(selectedDateKey);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* ================= DATE FILTER HEADER & NAVIGATION ================= */}
      <View style={styles.dateControlCard}>
        {/* Row 1: Navigasi Panah & Judul Tanggal */}
        <View style={styles.dateNavRow}>
          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={() => shiftDate(-1)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.dateTitleCol}>
            <View style={styles.dateMainRow}>
              <Ionicons name="calendar" size={15} color={colors.primaryLight} />
              <Text style={styles.dateMainText}>{formatDisplayDate(selectedDateKey)}</Text>
            </View>
            <View style={styles.dateMetaRow}>
              {relativeLabel ? (
                <View style={styles.relativeBadge}>
                  <Text style={styles.relativeBadgeText}>{relativeLabel}</Text>
                </View>
              ) : null}
              <Text style={styles.dateHintText}>Geser kanan / kiri untuk ubah tanggal</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={() => shiftDate(1)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Row 2: Strip Tanggal Cepat (Horizontal Pills) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datePillsScroll}
        >
          {dateStrip.map((item) => {
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.datePill, item.isSelected && styles.datePillSelected]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSelectedDateKey(item.key);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.datePillDay, item.isSelected && styles.datePillDaySelected]}>
                  {item.dayName}
                </Text>
                <Text style={[styles.datePillNum, item.isSelected && styles.datePillNumSelected]}>
                  {item.dayNum}
                </Text>
                {item.isToday && !item.isSelected ? <View style={styles.todayDot} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ================= SEARCH BAR ================= */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari klub di tanggal ini..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ================= DAFTAR LIGA VERTIKAL DENGAN DROPDOWN ================= */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat jadwal pertandingan...</Text>
        </View>
      ) : (
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
            <Text style={styles.summaryText}>
              <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{dateFixtures.length}</Text> Pertandingan
              {' • '}{groupedLeagues.length} Liga
            </Text>
            {selectedDateKey !== formatDateToKey(new Date()) && (
              <TouchableOpacity
                onPress={() => setSelectedDateKey(formatDateToKey(new Date()))}
                style={styles.todayJumpBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="today-outline" size={12} color={colors.primaryLight} />
                <Text style={styles.todayJumpText}>Ke Hari Ini</Text>
              </TouchableOpacity>
            )}
          </View>

          {groupedLeagues.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Tidak Ada Pertandingan</Text>
              <Text style={styles.emptyDesc}>
                Tidak ada pertandingan pada {formatDisplayDate(selectedDateKey)}.
                Geser ke kanan / kiri atau pilih tanggal lain di atas.
              </Text>
              {firstAvailableDate && firstAvailableDate !== selectedDateKey && (
                <TouchableOpacity
                  style={styles.jumpDateBtn}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedDateKey(firstAvailableDate);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.jumpDateBtnText}>
                    Buka Jadwal Terdekat ({formatDisplayDate(firstAvailableDate)})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            groupedLeagues.map((group) => {
              const isExpanded = Boolean(expandedLeagues[group.leagueName] || searchQuery.trim().length > 0);

              return (
                <View key={group.leagueName} style={styles.leagueCardContainer}>
                  {/* Vertical League Header Card (Tekan untuk Dropdown) */}
                  <TouchableOpacity
                    style={[styles.leagueAccordionHeader, isExpanded && styles.leagueAccordionHeaderActive]}
                    onPress={() => toggleLeague(group.leagueName)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.leagueHeaderLeft}>
                      <Ionicons
                        name="trophy"
                        size={16}
                        color={group.priority <= 5 ? '#F59E0B' : colors.primaryLight}
                      />
                      <Text style={styles.leagueAccordionTitle} numberOfLines={1}>
                        {group.leagueName}
                      </Text>
                      {group.priority <= 5 ? (
                        <View style={styles.topLeagueBadge}>
                          <Text style={styles.topLeagueBadgeText}>TOP 5</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.leagueHeaderRight}>
                      <View style={styles.matchCountPill}>
                        <Text style={styles.matchCountPillText}>{group.matches.length} Laga</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Dropdown Match List ketika Liga Ditekan */}
                  {isExpanded && (
                    <View style={styles.dropdownMatchesContainer}>
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
      )}

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
    backgroundColor: colors.background,
  },
  dateControlCard: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingVertical: 10,
    gap: 8,
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  dateArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateTitleCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dateMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  relativeBadge: {
    backgroundColor: '#064E3B40',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#05966950',
  },
  relativeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  dateHintText: {
    fontSize: 9.5,
    color: colors.textMuted,
  },
  datePillsScroll: {
    paddingHorizontal: 12,
    gap: 8,
    paddingTop: 4,
    alignItems: 'center',
  },
  datePill: {
    minWidth: 46,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    gap: 2,
  },
  datePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  datePillDay: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  datePillDaySelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  datePillNum: {
    fontSize: 13,
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
    bottom: 3,
  },
  searchContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    paddingVertical: 0,
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
    padding: 14,
    paddingBottom: 36,
    gap: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
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
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  leagueAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    fontSize: 13,
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
    fontSize: 8,
    fontWeight: '900',
    color: '#F59E0B',
  },
  leagueHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchCountPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  matchCountPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dropdownMatchesContainer: {
    padding: 10,
    gap: 8,
    backgroundColor: '#0A0F1D',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  jumpDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  jumpDateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
