import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Fixture, League, fetchLeagues, fetchUpcomingFixtures } from '../services/api';
import { CompactMatchCard } from '../components/CompactMatchCard';
import { MatchDetailModal } from '../components/modals/MatchDetailModal';

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

export const FixturesScreen: React.FC = () => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
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

  // 1. Filter awal berdasarkan pencarian nama tim & filter chip liga
  const filteredFixtures = useMemo(() => {
    return fixtures.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.home_team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.away_team_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLeague =
        !selectedLeague || item.league_name.toLowerCase() === selectedLeague.toLowerCase();

      return matchesSearch && matchesLeague;
    });
  }, [fixtures, searchQuery, selectedLeague]);

  // 2. Kelompokkan jadwal per Liga dan urutkan: Top 5 Liga Eropa di paling atas, sisanya berdasarkan abjad
  const groupedLeagues = useMemo(() => {
    const groups: Record<string, Fixture[]> = {};

    filteredFixtures.forEach((f) => {
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

    // Urutkan: prioritas 1-5 terlebih dahulu, lalu sisanya (99) diurutkan alfabetis
    entries.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.leagueName.localeCompare(b.leagueName);
    });

    return entries;
  }, [filteredFixtures]);

  return (
    <View style={styles.container}>
      {/* ================= SEARCH BAR ================= */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari klub atau pertandingan..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ================= LEAGUE SELECTOR CHIPS ================= */}
      <View style={styles.leagueSelectorWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leaguesScrollContent}
        >
          <TouchableOpacity
            style={[styles.leagueChip, selectedLeague === '' && styles.leagueChipActive]}
            onPress={() => setSelectedLeague('')}
            activeOpacity={0.7}
          >
            <Text style={[styles.leagueChipText, selectedLeague === '' && styles.leagueChipTextActive]}>
              Semua Liga
            </Text>
          </TouchableOpacity>

          {leagues.map((l) => {
            const isSelected = selectedLeague.toLowerCase() === l.name.toLowerCase();
            return (
              <TouchableOpacity
                key={l.id}
                style={[styles.leagueChip, isSelected && styles.leagueChipActive]}
                onPress={() => setSelectedLeague(isSelected ? '' : l.name)}
                activeOpacity={0.7}
              >
                <Text style={[styles.leagueChipText, isSelected && styles.leagueChipTextActive]}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ================= FIXTURES LIST (GROUPED BY LEAGUE) ================= */}
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
          {/* Summary Count */}
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              Total <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{filteredFixtures.length}</Text> pertandingan dalam {groupedLeagues.length} liga
            </Text>
          </View>

          {groupedLeagues.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="football-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Tidak ada pertandingan ditemukan</Text>
              <Text style={styles.emptyDesc}>Coba ubah kata kunci pencarian atau filter liga.</Text>
            </View>
          ) : (
            groupedLeagues.map((group) => (
              <View key={group.leagueName} style={styles.leagueSection}>
                {/* League Section Header */}
                <View style={styles.leagueHeaderRow}>
                  <View style={styles.leagueTitleLeft}>
                    <Ionicons
                      name="trophy"
                      size={14}
                      color={group.priority <= 5 ? '#F59E0B' : colors.primaryLight}
                    />
                    <Text style={styles.leagueSectionTitle}>{group.leagueName}</Text>
                    {group.priority <= 5 ? (
                      <View style={styles.topLeagueBadge}>
                        <Text style={styles.topLeagueBadgeText}>TOP 5</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.matchCountPill}>
                    <Text style={styles.matchCountPillText}>{group.matches.length} Laga</Text>
                  </View>
                </View>

                {/* Compact Match Cards under this League */}
                <View style={styles.matchesCol}>
                  {group.matches.map((fixture) => (
                    <CompactMatchCard
                      key={fixture.id}
                      fixture={fixture}
                      onPress={() => setSelectedFixture(fixture)}
                      showLeagueBadge={false}
                    />
                  ))}
                </View>
              </View>
            ))
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    paddingVertical: 0,
  },
  leagueSelectorWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    backgroundColor: colors.background,
  },
  leaguesScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  leagueChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: colors.border,
  },
  leagueChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  leagueChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  leagueChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  countRow: {
    paddingBottom: 2,
  },
  countText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  leagueSection: {
    gap: 8,
  },
  leagueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B50',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  leagueTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  leagueSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  topLeagueBadge: {
    backgroundColor: '#F59E0B25',
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
  matchCountPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchCountPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  matchesCol: {
    gap: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
  },
});
