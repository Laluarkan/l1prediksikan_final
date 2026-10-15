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
import {
  League,
  MatchHistory,
  fetchLeagues,
  fetchMatchHistory,
} from '../services/api';

export const HistoryScreen: React.FC = () => {
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [filterResult, setFilterResult] = useState<string>('ALL'); // 'ALL' | 'WIN' | 'LOSE'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);

  // 1. Muat daftar liga untuk filter
  useEffect(() => {
    fetchLeagues().then((data) => {
      setLeagues(data);
    });
  }, []);

  // 2. Muat data riwayat pertandingan
  const loadData = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      if (pageNum === 1) {
        if (!isRefresh) setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetchMatchHistory({
          page: pageNum,
          page_size: 15,
          league: selectedLeague || undefined,
          search: searchQuery.trim() || undefined,
          filter_result: filterResult !== 'ALL' ? filterResult : undefined,
        });

        if (pageNum === 1) {
          setHistory(response.results);
        } else {
          setHistory((prev) => [...prev, ...response.results]);
        }
        setTotalCount(response.count);
        setPage(pageNum);
      } catch (error) {
        console.error('Error fetching match history:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [selectedLeague, searchQuery, filterResult]
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && history.length < totalCount) {
      loadData(page + 1);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedMatchId(expandedMatchId === id ? null : id);
  };

  const formatMatchTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB'
      );
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* ================= SEARCH BAR ================= */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari tim sepak bola di riwayat..."
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
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ================= FILTER STRIP ================= */}
      <View style={styles.filtersWrapper}>
        {/* League Selector Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.chip, selectedLeague === '' ? styles.chipActive : null]}
            onPress={() => setSelectedLeague('')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                selectedLeague === '' ? styles.chipTextActive : null,
              ]}
            >
              Semua Liga
            </Text>
          </TouchableOpacity>

          {leagues.map((l) => {
            const isSelected = selectedLeague === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                style={[styles.chip, isSelected ? styles.chipActive : null]}
                onPress={() => setSelectedLeague(isSelected ? '' : l.code)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected ? styles.chipTextActive : null,
                  ]}
                >
                  {l.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Status Evaluasi Chips (Semua, Menang, Kalah) */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Hasil:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {[
              { id: 'ALL', label: 'Semua Laga' },
              { id: 'WIN', label: 'Prediksi Menang' },
              { id: 'LOSE', label: 'Prediksi Kalah' },
            ].map((st) => {
              const isSelected = filterResult === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.statusChip,
                    isSelected ? styles.statusChipActive : null,
                    isSelected && st.id === 'WIN' ? styles.statusChipWin : null,
                    isSelected && st.id === 'LOSE' ? styles.statusChipLose : null,
                  ]}
                  onPress={() => setFilterResult(st.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      isSelected ? styles.statusChipTextActive : null,
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ================= MATCH HISTORY LIST ================= */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat riwayat pertandingan...</Text>
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
          {/* Summary Count Header */}
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              Menampilkan{' '}
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {history.length}
              </Text>{' '}
              dari{' '}
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {totalCount.toLocaleString('id-ID')}
              </Text>{' '}
              pertandingan
            </Text>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Tidak ada riwayat ditemukan</Text>
              <Text style={styles.emptyDesc}>
                Coba sesuaikan filter liga, status hasil, atau kata kunci pencarian tim.
              </Text>
            </View>
          ) : (
            history.map((match) => {
              const isExpanded = expandedMatchId === match.id;
              const probH = Math.round((match.prob_ftr_h || 0.33) * 100);
              const probD = Math.round((match.prob_ftr_d || 0.33) * 100);
              const probA = Math.max(0, 100 - probH - probD);

              // Saran Pilihan 1X2
              const ftrPickLabel =
                match.rl_pick_ftr === 'H'
                  ? `${match.home_team_name} Menang`
                  : match.rl_pick_ftr === 'D'
                  ? 'Seri (Draw)'
                  : match.rl_pick_ftr === 'A'
                  ? `${match.away_team_name} Menang`
                  : match.prob_ftr_h >= match.prob_ftr_a
                  ? `${match.home_team_name} Menang`
                  : `${match.away_team_name} Menang`;

              const ftrOdds =
                match.rl_pick_ftr === 'H'
                  ? match.avg_h
                  : match.rl_pick_ftr === 'D'
                  ? match.avg_d
                  : match.avg_a;

              // Evaluasi O/U
              const isOuPredicted = Boolean(match.rl_pick_ou);
              const ouLabel = match.rl_pick_ou || 'O/U 2.5';
              const ouOdds =
                match.rl_pick_ou === 'Under 2.5' ? match.avg_under_25 : match.avg_over_25;

              return (
                <TouchableOpacity
                  key={match.id}
                  style={styles.card}
                  onPress={() => toggleExpand(match.id)}
                  activeOpacity={0.9}
                >
                  {/* Top Bar: League & Date */}
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.leagueName}>{match.league_name}</Text>
                      {Boolean(match.has_value_bet || match.has_value_bet_ou) ? (
                        <View style={styles.valueBadgePill}>
                          <Text style={styles.valueBadgePillText}>VALUE</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.matchDate}>{formatMatchTime(match.date)}</Text>
                  </View>

                  {/* Teams Row & Final Score */}
                  <View style={styles.teamsRow}>
                    {/* Home Team */}
                    <View style={styles.teamBox}>
                      {match.home_team_logo ? (
                        <Image
                          source={{ uri: match.home_team_logo }}
                          style={styles.teamLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.teamLogoFallback}>
                          <Ionicons name="shield-outline" size={20} color={colors.textPrimary} />
                        </View>
                      )}
                      <Text style={styles.teamName} numberOfLines={2}>
                        {match.home_team_name}
                      </Text>
                    </View>

                    {/* Final Score Center Display */}
                    <View style={styles.scoreContainer}>
                      <View style={styles.scoreBox}>
                        <Text style={styles.scoreNumber}>
                          {typeof match.fthg === 'number' ? match.fthg : '-'}
                        </Text>
                        <Text style={styles.scoreDivider}>-</Text>
                        <Text style={styles.scoreNumber}>
                          {typeof match.ftag === 'number' ? match.ftag : '-'}
                        </Text>
                      </View>
                      <View style={styles.ftBadge}>
                        <Text style={styles.ftBadgeText}>FT</Text>
                      </View>
                    </View>

                    {/* Away Team */}
                    <View style={styles.teamBox}>
                      {match.away_team_logo ? (
                        <Image
                          source={{ uri: match.away_team_logo }}
                          style={styles.teamLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.teamLogoFallback}>
                          <Ionicons name="shield-outline" size={20} color={colors.textPrimary} />
                        </View>
                      )}
                      <Text style={styles.teamName} numberOfLines={2}>
                        {match.away_team_name}
                      </Text>
                    </View>
                  </View>

                  {/* Evaluasi Prediksi Model & Hasil */}
                  <View style={styles.evalContainer}>
                    {/* Prediksi 1X2 */}
                    <View style={styles.evalRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.evalLabel}>Saran Pilihan (1X2)</Text>
                        <Text style={styles.evalValue} numberOfLines={1}>
                          {`${ftrPickLabel} `}
                          <Text style={styles.evalOdds}>
                            @{ftrOdds ? ftrOdds.toFixed(2) : '-'}
                          </Text>
                        </Text>
                      </View>

                      {/* Status Badge: Menang / Kalah / Netral */}
                      {match.is_won_ftr === true ? (
                        <View style={[styles.badgeBase, styles.badgeWin]}>
                          <Ionicons name="checkmark-circle" size={13} color={colors.primaryLight} />
                          <Text style={[styles.badgeText, styles.badgeTextWin]}>MENANG</Text>
                        </View>
                      ) : match.is_won_ftr === false ? (
                        <View style={[styles.badgeBase, styles.badgeLose]}>
                          <Ionicons name="close-circle" size={13} color="#EF4444" />
                          <Text style={[styles.badgeText, styles.badgeTextLose]}>KALAH</Text>
                        </View>
                      ) : (
                        <View style={[styles.badgeBase, styles.badgeNeutral]}>
                          <Text style={[styles.badgeText, styles.badgeTextNeutral]}>
                            {probH}% H / {probA}% A
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Prediksi O/U 2.5 jika ada */}
                    {isOuPredicted ? (
                      <View style={[styles.evalRow, styles.evalRowBorder]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.evalLabel}>Saran Gol (O/U 2.5)</Text>
                          <Text style={styles.evalValue} numberOfLines={1}>
                            {`${ouLabel} `}
                            <Text style={styles.evalOdds}>
                              @{ouOdds ? ouOdds.toFixed(2) : '-'}
                            </Text>
                          </Text>
                        </View>

                        {match.is_won_ou === true ? (
                          <View style={[styles.badgeBase, styles.badgeWin]}>
                            <Ionicons name="checkmark-circle" size={13} color={colors.primaryLight} />
                            <Text style={[styles.badgeText, styles.badgeTextWin]}>MENANG</Text>
                          </View>
                        ) : match.is_won_ou === false ? (
                          <View style={[styles.badgeBase, styles.badgeLose]}>
                            <Ionicons name="close-circle" size={13} color="#EF4444" />
                            <Text style={[styles.badgeText, styles.badgeTextLose]}>KALAH</Text>
                          </View>
                        ) : (
                          <View style={[styles.badgeBase, styles.badgeNeutral]}>
                            <Text style={[styles.badgeText, styles.badgeTextNeutral]}>
                              {ouLabel}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : null}
                  </View>

                  {/* Expand toggle */}
                  <View style={styles.expandFooter}>
                    <Text style={styles.expandText}>
                      {isExpanded ? 'Tutup Detail Riwayat' : 'Lihat Detail Riwayat'}
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
                      {/* Odds Pasar 1X2 */}
                      <View style={styles.detailOddsRow}>
                        <View style={styles.detailOddsCol}>
                          <Text style={styles.detailOddsLabel}>Odds 1</Text>
                          <Text style={styles.detailOddsNum}>
                            {match.avg_h ? match.avg_h.toFixed(2) : '-'}
                          </Text>
                        </View>
                        <View style={styles.detailOddsCol}>
                          <Text style={styles.detailOddsLabel}>Odds X</Text>
                          <Text style={styles.detailOddsNum}>
                            {match.avg_d ? match.avg_d.toFixed(2) : '-'}
                          </Text>
                        </View>
                        <View style={styles.detailOddsCol}>
                          <Text style={styles.detailOddsLabel}>Odds 2</Text>
                          <Text style={styles.detailOddsNum}>
                            {match.avg_a ? match.avg_a.toFixed(2) : '-'}
                          </Text>
                        </View>
                        <View style={styles.detailOddsCol}>
                          <Text style={styles.detailOddsLabel}>Over 2.5</Text>
                          <Text style={styles.detailOddsNum}>
                            {match.avg_over_25 ? match.avg_over_25.toFixed(2) : '-'}
                          </Text>
                        </View>
                        <View style={styles.detailOddsCol}>
                          <Text style={styles.detailOddsLabel}>Under 2.5</Text>
                          <Text style={styles.detailOddsNum}>
                            {match.avg_under_25 ? match.avg_under_25.toFixed(2) : '-'}
                          </Text>
                        </View>
                      </View>

                      {/* Extended Features */}
                      {match.extended_features ? (
                        <View style={styles.metaBox}>
                          <Text style={styles.metaTitle}>Catatan Parameter Pertandingan:</Text>
                          {typeof match.extended_features.h2h_avg_goals === 'number' ? (
                            <View style={styles.metaRow}>
                              <Text style={styles.metaName}>Rata-rata Gol H2H:</Text>
                              <Text style={styles.metaVal}>
                                {match.extended_features.h2h_avg_goals} Gol
                              </Text>
                            </View>
                          ) : null}
                          {typeof match.extended_features.elo_diff === 'number' ? (
                            <View style={styles.metaRow}>
                              <Text style={styles.metaName}>Selisih Rating Elo:</Text>
                              <Text style={styles.metaVal}>
                                {Math.round(match.extended_features.elo_diff)} Poin
                              </Text>
                            </View>
                          ) : null}
                          {match.extended_features.parlay_ticket_info ? (
                            <View style={styles.metaRow}>
                              <Text style={styles.metaName}>Tiket Parlay:</Text>
                              <Text style={[styles.metaVal, { color: '#38BDF8' }]}>
                                {match.extended_features.parlay_ticket_info}
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

          {/* Load More Button */}
          {history.length < totalCount && !loading ? (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={handleLoadMore}
              disabled={loadingMore}
              activeOpacity={0.8}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.loadMoreText}>Muat Lebih Banyak Laga</Text>
                  <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          ) : null}
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
  filtersWrapper: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: '#064E3B',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: '#1E293B',
    borderColor: colors.borderLight,
  },
  statusChipWin: {
    backgroundColor: '#064E3B40',
    borderColor: colors.primary,
  },
  statusChipLose: {
    backgroundColor: '#7F1D1D30',
    borderColor: '#EF4444',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusChipTextActive: {
    color: colors.textPrimary,
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
  matchDate: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },

  /* Teams & Score Row */
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
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  scoreDivider: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
  },
  ftBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ftBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },

  /* Evaluasi Prediksi */
  evalContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 8,
  },
  evalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  evalRowBorder: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  evalLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  evalValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  evalOdds: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryLight,
  },

  /* Badge Styles */
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeWin: {
    backgroundColor: '#064E3B50',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  badgeLose: {
    backgroundColor: '#7F1D1D40',
    borderColor: '#EF444480',
    borderWidth: 1,
  },
  badgeNeutral: {
    backgroundColor: '#1E293B',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextWin: {
    color: colors.primaryLight,
  },
  badgeTextLose: {
    color: '#EF4444',
  },
  badgeTextNeutral: {
    color: colors.textMuted,
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
  detailOddsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  detailOddsCol: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailOddsLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
  },
  detailOddsNum: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaBox: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  metaTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaName: {
    fontSize: 11,
    color: colors.textMuted,
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  /* Load More */
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginTop: 6,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
