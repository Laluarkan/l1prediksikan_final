import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Fixture, League, fetchLeagues, fetchUpcomingFixtures } from '../services/api';

export const FixturesScreen: React.FC = () => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);

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

  const toggleExpand = (id: number) => {
    setExpandedMatchId(expandedMatchId === id ? null : id);
  };

  const formatMatchTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB'
      );
    } catch {
      return dateStr;
    }
  };

  // Filter jadwal berdasarkan pencarian nama tim & filter liga yang dipilih
  const filteredFixtures = fixtures.filter((item) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.home_team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.away_team_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLeague =
      !selectedLeague || item.league_name.toLowerCase() === selectedLeague.toLowerCase();

    return matchesSearch && matchesLeague;
  });

  return (
    <View style={styles.container}>
      {/* ================= SEARCH BAR ================= */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari tim sepak bola..."
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

      {/* ================= FIXTURES LIST ================= */}
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
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              Menampilkan <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{filteredFixtures.length}</Text> pertandingan
            </Text>
          </View>

          {filteredFixtures.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="football-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Tidak ada pertandingan ditemukan</Text>
              <Text style={styles.emptyDesc}>Coba ganti filter liga atau kata kunci pencarian tim.</Text>
            </View>
          ) : (
            filteredFixtures.map((fixture) => {
              const isExpanded = expandedMatchId === fixture.id;
              const probH = Math.round((fixture.prob_ftr_h || 0.33) * 100);
              const probD = Math.round((fixture.prob_ftr_d || 0.33) * 100);
              const probA = Math.max(0, 100 - probH - probD);

              return (
                <TouchableOpacity
                  key={fixture.id}
                  style={styles.card}
                  onPress={() => toggleExpand(fixture.id)}
                  activeOpacity={0.9}
                >
                  {/* Top Bar: League & Kickoff Time */}
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.leagueName}>{fixture.league_name}</Text>
                      {Boolean(fixture.has_value_bet || fixture.has_value_bet_ou) ? (
                        <View style={styles.valueBadgePill}>
                          <Text style={styles.valueBadgePillText}>VALUE</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.kickoffTime}>{formatMatchTime(fixture.date)}</Text>
                  </View>

                  {/* Match Teams & Logos */}
                  <View style={styles.teamsRow}>
                    <View style={styles.teamBox}>
                      {fixture.home_team_logo ? (
                        <Image
                          source={{ uri: fixture.home_team_logo }}
                          style={styles.teamLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.teamLogoFallback}>
                          <Ionicons name="shield-outline" size={20} color={colors.textPrimary} />
                        </View>
                      )}
                      <Text style={styles.teamName} numberOfLines={2}>
                        {fixture.home_team_name}
                      </Text>
                    </View>

                    <View style={styles.vsBox}>
                      <Text style={styles.vsText}>VS</Text>
                    </View>

                    <View style={styles.teamBox}>
                      {fixture.away_team_logo ? (
                        <Image
                          source={{ uri: fixture.away_team_logo }}
                          style={styles.teamLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.teamLogoFallback}>
                          <Ionicons name="shield-outline" size={20} color={colors.textPrimary} />
                        </View>
                      )}
                      <Text style={styles.teamName} numberOfLines={2}>
                        {fixture.away_team_name}
                      </Text>
                    </View>
                  </View>

                  {/* Market Odds (1 X 2) */}
                  <View style={styles.oddsGrid}>
                    <View style={styles.oddsCol}>
                      <Text style={styles.oddsTag}>1 (Home)</Text>
                      <Text style={styles.oddsNum}>{fixture.avg_h ? fixture.avg_h.toFixed(2) : '-'}</Text>
                    </View>
                    <View style={styles.oddsCol}>
                      <Text style={styles.oddsTag}>X (Seri)</Text>
                      <Text style={styles.oddsNum}>{fixture.avg_d ? fixture.avg_d.toFixed(2) : '-'}</Text>
                    </View>
                    <View style={styles.oddsCol}>
                      <Text style={styles.oddsTag}>2 (Away)</Text>
                      <Text style={styles.oddsNum}>{fixture.avg_a ? fixture.avg_a.toFixed(2) : '-'}</Text>
                    </View>
                  </View>

                  {/* Probability distribution bar */}
                  <View style={styles.probSection}>
                    <View style={styles.probLabelRow}>
                      <Text style={styles.probLabel}>Home {probH}%</Text>
                      <Text style={styles.probLabel}>Seri {probD}%</Text>
                      <Text style={styles.probLabel}>Away {probA}%</Text>
                    </View>
                    <View style={styles.probTrack}>
                      <View style={[styles.probFill, { flex: probH, backgroundColor: colors.primary }]} />
                      <View style={[styles.probFill, { flex: probD, backgroundColor: '#64748B' }]} />
                      <View style={[styles.probFill, { flex: probA, backgroundColor: '#334155' }]} />
                    </View>
                  </View>

                  {/* ================= SARAN & BEST VALUE BOX ================= */}
                  {(() => {
                    const ftrChoices = [
                      { label: `${fixture.home_team_name} Menang`, odds: fixture.avg_h, prob: fixture.prob_ftr_h },
                      { label: 'Seri (Draw)', odds: fixture.avg_d, prob: fixture.prob_ftr_d },
                      { label: `${fixture.away_team_name} Menang`, odds: fixture.avg_a, prob: fixture.prob_ftr_a },
                    ];
                    const topFtrPick = ftrChoices.reduce((max, c) => (c.prob > max.prob ? c : max), ftrChoices[0]);

                    const isOver = (fixture.prob_ou25_over || 0) >= (fixture.prob_ou25_under || 0);
                    const ouPick = {
                      label: isOver ? 'Over 2.5 Gol' : 'Under 2.5 Gol',
                      odds: isOver ? fixture.avg_over_25 : fixture.avg_under_25,
                      prob: isOver ? fixture.prob_ou25_over : fixture.prob_ou25_under,
                    };

                    const hasFtrValue = Boolean(
                      fixture.has_value_bet ||
                      (typeof fixture.rl_stake_ftr === 'number' && fixture.rl_stake_ftr > 0)
                    );
                    const hasOuValue = Boolean(
                      fixture.has_value_bet_ou ||
                      (typeof fixture.rl_stake_ou === 'number' && fixture.rl_stake_ou > 0)
                    );
                    const edgeOu =
                      typeof fixture.extended_features?.edge_ou === 'number'
                        ? fixture.extended_features.edge_ou
                        : 0;
                    const bestEdge =
                      typeof fixture.extended_features?.best_edge === 'number'
                        ? fixture.extended_features.best_edge
                        : 0;
                    const hasBestValue = Boolean(hasFtrValue || hasOuValue || bestEdge > 0.05);

                    return (
                      <View style={styles.saranContainer}>
                        {/* Saran 1X2 */}
                        <View style={styles.saranRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.saranLabel}>Saran Pilihan (1X2)</Text>
                            <Text style={styles.saranValue} numberOfLines={1}>
                              {`${topFtrPick.label} `}
                              <Text style={styles.saranOdds}>
                                @{topFtrPick.odds ? topFtrPick.odds.toFixed(2) : '-'}
                              </Text>
                            </Text>
                          </View>
                          <View style={styles.saranBadge}>
                            <Text style={styles.saranBadgeText}>
                              {Math.round((topFtrPick.prob || 0) * 100)}% Peluang
                            </Text>
                          </View>
                        </View>

                        {/* Saran Over/Under 2.5 jika ada */}
                        {fixture.avg_over_25 ? (
                          <View style={[styles.saranRow, styles.saranRowBorder]}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.saranLabel}>Saran Gol (O/U 2.5)</Text>
                              <Text style={styles.saranValue} numberOfLines={1}>
                                {`${ouPick.label} `}
                                <Text style={styles.saranOdds}>
                                  @{ouPick.odds ? ouPick.odds.toFixed(2) : '-'}
                                </Text>
                              </Text>
                            </View>
                            <View style={[styles.saranBadge, { backgroundColor: '#1E1B4B' }]}>
                              <Text style={[styles.saranBadgeText, { color: '#818CF8' }]}>
                                {ouPick.prob ? Math.round(ouPick.prob * 100) + '%' : '-'}
                              </Text>
                            </View>
                          </View>
                        ) : null}

                        {/* Best Value Highlight jika ada edge nilai pasar */}
                        {hasBestValue ? (
                          <View style={styles.bestValueStrip}>
                            <Ionicons name="trending-up" size={14} color="#F59E0B" />
                            <Text style={styles.bestValueTitle}>Best Value:</Text>
                            <Text style={styles.bestValueDesc} numberOfLines={1}>
                              {hasOuValue
                                ? `${fixture.rl_pick_ou || ouPick.label} (+${((edgeOu || bestEdge || 0) * 100).toFixed(1)}% edge)`
                                : hasFtrValue
                                ? `${fixture.rl_pick_ftr === 'H' ? fixture.home_team_name : fixture.rl_pick_ftr === 'D' ? 'Seri' : fixture.away_team_name} Menang`
                                : `${ouPick.label}`}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })()}

                  {/* Expand toggle hint */}
                  <View style={styles.expandFooter}>
                    <Text style={styles.expandText}>
                      {isExpanded ? 'Tutup Detail Analisis' : 'Lihat Detail Analisis'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.textMuted}
                    />
                  </View>

                  {/* Detailed Analysis (When Expanded) */}
                  {isExpanded ? (
                    <View style={styles.expandedContent}>
                      {/* Over / Under Odds */}
                      <View style={styles.detailRow}>
                        <View style={styles.detailBox}>
                          <Text style={styles.detailLabel}>Odds Over 2.5</Text>
                          <Text style={styles.detailValue}>
                            {fixture.avg_over_25 ? fixture.avg_over_25.toFixed(2) : '-'}
                          </Text>
                        </View>
                        <View style={styles.detailBox}>
                          <Text style={styles.detailLabel}>Odds Under 2.5</Text>
                          <Text style={styles.detailValue}>
                            {fixture.avg_under_25 ? fixture.avg_under_25.toFixed(2) : '-'}
                          </Text>
                        </View>
                      </View>

                      {/* Extended Analysis Features from Backend */}
                      {fixture.extended_features ? (
                        <View style={styles.featuresBox}>
                          <Text style={styles.featuresTitle}>Parameter Tambahan:</Text>
                          <View style={styles.featureItemRow}>
                            <Text style={styles.featureName}>Peluang Over 2.5:</Text>
                            <Text style={styles.featureValue}>
                              {fixture.prob_ou25_over
                                ? (fixture.prob_ou25_over * 100).toFixed(1) + '%'
                                : '-'}
                            </Text>
                          </View>
                          {typeof fixture.extended_features.h2h_avg_goals === 'number' ? (
                            <View style={styles.featureItemRow}>
                              <Text style={styles.featureName}>Rata-rata Gol H2H:</Text>
                              <Text style={styles.featureValue}>
                                {fixture.extended_features.h2h_avg_goals} Gol
                              </Text>
                            </View>
                          ) : null}
                          {typeof fixture.extended_features.elo_diff === 'number' ? (
                            <View style={styles.featureItemRow}>
                              <Text style={styles.featureName}>Selisih Rating Elo:</Text>
                              <Text style={styles.featureValue}>
                                {Math.round(fixture.extended_features.elo_diff)} Poin
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
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
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },
  leagueSelectorWrapper: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leaguesScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  leagueChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leagueChipActive: {
    backgroundColor: '#064E3B',
    borderColor: colors.primary,
  },
  leagueChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  leagueChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 30,
    gap: 14,
  },
  countRow: {
    marginBottom: 2,
  },
  countText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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

  /* Card */
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leagueName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueBadgePill: {
    backgroundColor: '#78350F35',
    borderColor: '#B4530960',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  valueBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  kickoffTime: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  teamBox: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamLogo: {
    width: 44,
    height: 44,
  },
  teamLogoFallback: {
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
  vsBox: {
    paddingHorizontal: 12,
  },
  vsText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
  },

  /* Odds Grid */
  oddsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  oddsCol: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  oddsTag: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  oddsNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  /* Probability bar */
  probSection: {
    gap: 5,
  },
  probLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  probLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  probTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  probFill: {
    height: '100%',
  },

  /* Expand */
  expandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  expandedContent: {
    paddingTop: 8,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featuresBox: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  featuresTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: 2,
  },
  featureItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureName: {
    fontSize: 11,
    color: colors.textMuted,
  },
  featureValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  /* Saran & Best Value Styles */
  saranContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 8,
  },
  saranRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  saranRowBorder: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  saranLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  saranValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saranOdds: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  saranBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  saranBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  bestValueStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F25',
    borderWidth: 1,
    borderColor: '#B4530940',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
    marginTop: 2,
  },
  bestValueTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  bestValueDesc: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#FCD34D',
  },
});
