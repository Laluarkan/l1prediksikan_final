import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  getCurrentSeason,
} from '../services/api';
import { formatWitaKickoff } from '../utils/dateUtils';
import { MatchDetailModal } from '../components/modals/MatchDetailModal';

// Sanitasi rekomendasi 1X2 dan O/U (berdasarkan probabilitas model ML tertinggi)
const getSanitizedPicks = (match: MatchHistory) => {
  const pH = match.prob_ftr_h || 0;
  const pD = match.prob_ftr_d || 0;
  const pA = match.prob_ftr_a || 0;
  let hdaPick: 'H' | 'D' | 'A' = 'H';
  if (pH >= pD && pH >= pA) {
    hdaPick = 'H';
  } else if (pA >= pH && pA >= pD) {
    hdaPick = 'A';
  } else {
    hdaPick = 'D';
  }

  let rawHdaOdds = hdaPick === 'H' ? match.avg_h : hdaPick === 'A' ? match.avg_a : match.avg_d;
  if (!rawHdaOdds || isNaN(rawHdaOdds) || rawHdaOdds <= 1.0) {
    rawHdaOdds = hdaPick === 'H' ? 1.85 : hdaPick === 'A' ? 2.45 : 3.2;
  }
  const hdaOdds = Number(rawHdaOdds).toFixed(2);

  const pOver = match.prob_ou25_over || 0.5;
  const ouPickShort: 'O 2.5' | 'U 2.5' = pOver >= 0.5 ? 'O 2.5' : 'U 2.5';
  let rawOuOdds = ouPickShort === 'O 2.5' ? match.avg_over_25 : match.avg_under_25;

  if (!rawOuOdds || isNaN(rawOuOdds) || rawOuOdds <= 1.0) {
    rawOuOdds = ouPickShort === 'O 2.5' ? 1.9 : 1.85;
  }
  const ouOdds = Number(rawOuOdds).toFixed(2);

  return { hdaPick, hdaOdds, ouPickShort, ouOdds };
};

export const HistoryScreen: React.FC = () => {
  const defaultSeason = getCurrentSeason(); // Musim saat ini (misal '26/27')

  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>(defaultSeason);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [filterResult, setFilterResult] = useState<string>('ALL'); // 'ALL' | 'WIN' | 'LOSE'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedMatch, setSelectedMatch] = useState<MatchHistory | null>(null);

  // 1. Muat daftar liga
  useEffect(() => {
    fetchLeagues().then((data) => {
      setLeagues(data);
    });
  }, []);

  // 2. Muat data riwayat pertandingan (Mulai dari data terbaru dan musim saat ini saja)
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
          page_size: 20,
          season: selectedSeason !== 'ALL' ? selectedSeason : undefined,
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
    [selectedSeason, selectedLeague, searchQuery, filterResult]
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

  // Label format musim: e.g. "2026/2027"
  const seasonLabel = useMemo(() => {
    if (selectedSeason === 'ALL') return 'Semua Musim';
    const parts = selectedSeason.split('/');
    return parts.length === 2 ? `20${parts[0]}/${parts[1]}` : selectedSeason;
  }, [selectedSeason]);

  return (
    <View style={styles.container}>
      {/* ================= TOP SEARCH & FILTER BAR ================= */}
      <View style={styles.topControlCard}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari klub di riwayat..."
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

        {/* Filter Baris 1: Pilihan Musim & Status Hasil */}
        <View style={styles.filterRow}>
          {/* Status Hasil: Semua / Menang / Kalah */}
          <View style={styles.statusGroup}>
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'WIN', label: 'Menang' },
              { id: 'LOSE', label: 'Kalah' },
            ].map((st) => {
              const isSelected = filterResult === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.statusPill,
                    isSelected && styles.statusPillActive,
                    isSelected && st.id === 'WIN' && styles.statusPillWin,
                    isSelected && st.id === 'LOSE' && styles.statusPillLose,
                  ]}
                  onPress={() => setFilterResult(st.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isSelected && styles.statusPillTextActive,
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Badge Musim Aktif (Musim Saat Ini) */}
          <View style={styles.seasonBadge}>
            <Ionicons name="calendar-outline" size={11} color={colors.primaryLight} />
            <Text style={styles.seasonBadgeText}>{seasonLabel}</Text>
          </View>
        </View>

        {/* Filter Baris 2: Chips Liga Horisontal */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leagueScroll}
        >
          <TouchableOpacity
            style={[styles.leagueChip, selectedLeague === '' && styles.leagueChipActive]}
            onPress={() => setSelectedLeague('')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.leagueChipText,
                selectedLeague === '' && styles.leagueChipTextActive,
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
                style={[styles.leagueChip, isSelected && styles.leagueChipActive]}
                onPress={() => setSelectedLeague(isSelected ? '' : l.code)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.leagueChipText,
                    isSelected && styles.leagueChipTextActive,
                  ]}
                >
                  {l.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ================= DAFTAR RIWAYAT PERTANDINGAN (DESAIN IDENTIK DENGAN BERANDA & JADWAL) ================= */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat riwayat pertandingan terbaru...</Text>
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
          {/* Summary Bar */}
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              Menampilkan <Text style={styles.summaryBold}>{history.length}</Text> dari{' '}
              <Text style={styles.summaryBold}>{totalCount.toLocaleString('id-ID')}</Text> laga
              {' • '}Musim {seasonLabel}
            </Text>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Tidak Ada Riwayat Pertandingan</Text>
              <Text style={styles.emptyDesc}>
                Tidak ada data pertandingan untuk filter musim {seasonLabel} atau kriteria pencarian ini.
              </Text>
              {selectedSeason !== 'ALL' && (
                <TouchableOpacity
                  style={styles.resetSeasonBtn}
                  onPress={() => setSelectedSeason('ALL')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.resetSeasonBtnText}>Tampilkan Semua Musim</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            history.map((match) => {
              const { hdaPick, hdaOdds, ouPickShort, ouOdds } = getSanitizedPicks(match);
              const hdaLabel = hdaPick === 'H' ? 'Home' : hdaPick === 'A' ? 'Away' : 'Draw';
              const ouLabel = ouPickShort === 'O 2.5' ? 'Over 2.5' : 'Under 2.5';
              const kickoffLabel = formatWitaKickoff(match.date);
              const isHomeWin = (match.fthg ?? 0) > (match.ftag ?? 0);
              const isAwayWin = (match.ftag ?? 0) > (match.fthg ?? 0);

              // Evaluasi kemenangan 1X2 secara presisi terhadap hasil nyata pertandingan
              const isFtrWin = match.ftr ? hdaPick === match.ftr : match.is_won_ftr;

              // Evaluasi kemenangan O/U 2.5 secara presisi terhadap jumlah gol nyata
              const totalGoals =
                typeof match.fthg === 'number' && typeof match.ftag === 'number'
                  ? match.fthg + match.ftag
                  : null;
              const actualOu = totalGoals !== null ? (totalGoals > 2.5 ? 'O 2.5' : 'U 2.5') : null;
              const isOuWin = actualOu !== null ? ouPickShort === actualOu : match.is_won_ou;

              return (
                <TouchableOpacity
                  key={match.id}
                  style={styles.card}
                  onPress={() => setSelectedMatch(match)}
                  activeOpacity={0.75}
                >
                  {/* Top Meta Bar */}
                  <View style={styles.topMetaBar}>
                    <View style={styles.timeWrapper}>
                      <Ionicons name="time-outline" size={11} color={colors.primaryLight} />
                      <Text style={styles.timeText}>{kickoffLabel}</Text>
                    </View>

                    <View style={styles.topMetaRight}>
                      <View style={styles.leagueBadge}>
                        <Text style={styles.leagueText} numberOfLines={1}>
                          {match.league_name}
                        </Text>
                      </View>
                      <View style={styles.ftBadge}>
                        <Text style={styles.ftBadgeText}>FT</Text>
                      </View>
                    </View>
                  </View>

                  {/* Main Row: Left (Teams + Score) | Divider | Right (Picks + Labels Menang/Kalah) */}
                  <View style={styles.mainRow}>
                    {/* Sisi Kiri: Tim Home & Away dan Skor Akhir */}
                    <View style={styles.teamsCol}>
                      {/* Home Team */}
                      <View style={styles.teamRow}>
                        {match.home_team_logo ? (
                          <Image
                            source={{ uri: match.home_team_logo }}
                            style={styles.teamLogo}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.teamLogoFallback}>
                            <Ionicons name="shield-outline" size={11} color={colors.textPrimary} />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.teamName,
                            isHomeWin && styles.teamNameWinner,
                          ]}
                          numberOfLines={1}
                        >
                          {match.home_team_name}
                        </Text>
                        <Text style={[styles.scoreText, isHomeWin && styles.scoreTextWinner]}>
                          {typeof match.fthg === 'number' ? match.fthg : '-'}
                        </Text>
                      </View>

                      {/* Away Team */}
                      <View style={styles.teamRow}>
                        {match.away_team_logo ? (
                          <Image
                            source={{ uri: match.away_team_logo }}
                            style={styles.teamLogo}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.teamLogoFallback}>
                            <Ionicons name="shield-outline" size={11} color={colors.textPrimary} />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.teamName,
                            isAwayWin && styles.teamNameWinner,
                          ]}
                          numberOfLines={1}
                        >
                          {match.away_team_name}
                        </Text>
                        <Text style={[styles.scoreText, isAwayWin && styles.scoreTextWinner]}>
                          {typeof match.ftag === 'number' ? match.ftag : '-'}
                        </Text>
                      </View>
                    </View>

                    {/* Separator Line */}
                    <View style={styles.colDivider} />

                    {/* Sisi Kanan: Rekomendasi 1X2 & O/U dengan label Menang / Kalah */}
                    <View style={styles.picksCol}>
                      {/* Baris Atas: Rekomendasi 1X2 */}
                      <View
                        style={[
                          styles.pickRow,
                          isFtrWin === true && styles.pickRowWin,
                          isFtrWin === false && styles.pickRowLose,
                        ]}
                      >
                        <View style={styles.pickLabelRow}>
                          <Text style={styles.pickTag}>1X2</Text>
                          <Text style={styles.pickText} numberOfLines={1}>
                            {hdaLabel} <Text style={styles.oddsText}>@{hdaOdds || '-'}</Text>
                          </Text>
                        </View>
                        {isFtrWin === true ? (
                          <View style={styles.badgeWin}>
                            <Ionicons name="checkmark-circle" size={9} color="#10B981" />
                            <Text style={styles.badgeWinText}>MENANG</Text>
                          </View>
                        ) : isFtrWin === false ? (
                          <View style={styles.badgeLose}>
                            <Ionicons name="close-circle" size={9} color="#EF4444" />
                            <Text style={styles.badgeLoseText}>KALAH</Text>
                          </View>
                        ) : (
                          <View style={styles.badgeNeutral}>
                            <Text style={styles.badgeNeutralText}>-</Text>
                          </View>
                        )}
                      </View>

                      {/* Baris Bawah: Rekomendasi O/U */}
                      <View
                        style={[
                          styles.pickRow,
                          isOuWin === true && styles.pickRowWin,
                          isOuWin === false && styles.pickRowLose,
                        ]}
                      >
                        <View style={styles.pickLabelRow}>
                          <Text style={styles.pickTag}>O/U</Text>
                          <Text style={styles.pickText} numberOfLines={1}>
                            {ouLabel} <Text style={styles.oddsText}>@{ouOdds || '-'}</Text>
                          </Text>
                        </View>
                        {isOuWin === true ? (
                          <View style={styles.badgeWin}>
                            <Ionicons name="checkmark-circle" size={9} color="#10B981" />
                            <Text style={styles.badgeWinText}>MENANG</Text>
                          </View>
                        ) : isOuWin === false ? (
                          <View style={styles.badgeLose}>
                            <Ionicons name="close-circle" size={9} color="#EF4444" />
                            <Text style={styles.badgeLoseText}>KALAH</Text>
                          </View>
                        ) : (
                          <View style={styles.badgeNeutral}>
                            <Text style={styles.badgeNeutralText}>-</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Tombol Muat Lebih Banyak (Load More) */}
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
                  <Ionicons name="chevron-down" size={15} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

      {/* Modal Detail Pertandingan Ketika Card Ditekan */}
      <MatchDetailModal
        visible={!!selectedMatch}
        fixture={selectedMatch}
        onClose={() => setSelectedMatch(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topControlCard: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
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
    marginHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 11.5,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 8,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: '#0F172A',
  },
  statusPillWin: {
    backgroundColor: '#064E3B',
  },
  statusPillLose: {
    backgroundColor: '#7F1D1D',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  seasonBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  leagueScroll: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  leagueChip: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  leagueChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  leagueChipText: {
    fontSize: 10,
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
    gap: 8,
  },
  summaryBar: {
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  summaryText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  summaryBold: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
  resetSeasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    marginTop: 6,
  },
  resetSeasonBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Card Match History (Sesuai dengan CompactMatchCard) */
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 10,
    gap: 6,
  },
  topMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  topMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  leagueBadge: {
    backgroundColor: '#1E293B70',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    maxWidth: 140,
  },
  leagueText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
  },
  ftBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#334155',
  },
  ftBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamsCol: {
    flex: 1,
    gap: 6,
    paddingRight: 6,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamLogo: {
    width: 18,
    height: 18,
  },
  teamLogoFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  teamNameWinner: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    minWidth: 14,
    textAlign: 'right',
  },
  scoreTextWinner: {
    color: '#34D399',
    fontWeight: '900',
  },
  colDivider: {
    width: 1,
    height: '75%',
    backgroundColor: '#1E293B',
    marginHorizontal: 3,
  },
  picksCol: {
    flex: 1.25,
    gap: 4,
    paddingLeft: 3,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131D33',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pickRowWin: {
    backgroundColor: '#064E3B30',
    borderWidth: 0.5,
    borderColor: '#05966950',
  },
  pickRowLose: {
    backgroundColor: '#7F1D1D20',
    borderWidth: 0.5,
    borderColor: '#EF444440',
  },
  pickLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 4,
  },
  pickTag: {
    fontSize: 8.5,
    fontWeight: '800',
    color: colors.textMuted,
  },
  pickText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  oddsText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#F59E0B',
  },
  badgeWin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#065F46',
    borderWidth: 0.5,
    borderColor: '#10B981',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    flexShrink: 0,
  },
  badgeWinText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#34D399',
    letterSpacing: 0.2,
  },
  badgeLose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#7F1D1D50',
    borderWidth: 0.5,
    borderColor: '#EF444480',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    flexShrink: 0,
  },
  badgeLoseText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#F87171',
    letterSpacing: 0.2,
  },
  badgeNeutral: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeNeutralText: {
    fontSize: 8,
    color: colors.textMuted,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginTop: 4,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
