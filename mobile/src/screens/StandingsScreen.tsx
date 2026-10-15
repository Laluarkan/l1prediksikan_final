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
import { League, TeamStanding, fetchLeagues, fetchStandings } from '../services/api';

const AVAILABLE_SEASONS = ['26/27', '25/26', '24/25', '23/24', '22/23', '21/22'];

export const StandingsScreen: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('26/27');
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 1. Muat daftar liga
  useEffect(() => {
    fetchLeagues().then((data) => {
      setLeagues(data);
      if (data.length > 0) {
        // Default ke EPL (E0) jika ada, atau liga pertama
        const epl = data.find((l) => l.code === 'E0') || data[0];
        setSelectedLeague(epl);
      }
    });
  }, []);

  // 2. Muat data klasemen berdasarkan liga dan musim terpilih
  const loadStandingsData = useCallback(async () => {
    if (!selectedLeague) return;
    setLoading(true);
    try {
      const data = await fetchStandings(selectedLeague.code, selectedSeason);
      setStandings(data);
    } catch (err) {
      console.error('Error fetching standings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLeague, selectedSeason]);

  useEffect(() => {
    loadStandingsData();
  }, [loadStandingsData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStandingsData();
  };

  // Penentu warna zona kualifikasi kompetisi eropa / degradasi
  const getRankZoneStyle = (rank: number, totalTeams: number) => {
    if (rank <= 4) {
      return { borderLeftColor: '#3B82F6', borderLeftWidth: 3 }; // Champions League
    }
    if (rank === 5) {
      return { borderLeftColor: '#F59E0B', borderLeftWidth: 3 }; // Europa League
    }
    if (rank > totalTeams - 3 && totalTeams > 10) {
      return { borderLeftColor: '#EF4444', borderLeftWidth: 3 }; // Degradasi
    }
    return { borderLeftColor: 'transparent', borderLeftWidth: 3 };
  };

  return (
    <View style={styles.container}>
      {/* ================= LEAGUE SELECTOR CHIPS ================= */}
      <View style={styles.selectorWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leaguesScroll}
        >
          {leagues.map((l) => {
            const isSelected = selectedLeague?.code === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                style={[styles.leagueChip, isSelected && styles.leagueChipActive]}
                onPress={() => setSelectedLeague(l)}
                activeOpacity={0.7}
              >
                <Text style={[styles.leagueChipText, isSelected && styles.leagueChipTextActive]}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Season Selector Chips */}
        <View style={styles.seasonRow}>
          <Text style={styles.seasonLabel}>Musim:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {AVAILABLE_SEASONS.map((season) => {
              const isSelected = selectedSeason === season;
              return (
                <TouchableOpacity
                  key={season}
                  style={[styles.seasonChip, isSelected && styles.seasonChipActive]}
                  onPress={() => setSelectedSeason(season)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.seasonChipText, isSelected && styles.seasonChipTextActive]}>
                    {season}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ================= STANDINGS TABLE ================= */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat tabel klasemen {selectedLeague?.name}...</Text>
        </View>
      ) : standings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="trophy-outline" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Data Klasemen Belum Tersedia</Text>
          <Text style={styles.emptyDesc}>
            Belum ada catatan laga untuk {selectedLeague?.name} musim {selectedSeason} di database.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.tableScroll}
          contentContainerStyle={styles.tableContent}
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
          {/* Table Container Card */}
          <View style={styles.tableCard}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thText, styles.colRank]}>#</Text>
              <Text style={[styles.thText, styles.colTeam]}>KLUB</Text>
              <Text style={[styles.thText, styles.colStat]}>MN</Text>
              <Text style={[styles.thText, styles.colStat]}>M</Text>
              <Text style={[styles.thText, styles.colStat]}>S</Text>
              <Text style={[styles.thText, styles.colStat]}>K</Text>
              <Text style={[styles.thText, styles.colStat]}>SG</Text>
              <Text style={[styles.thText, styles.colPts]}>PTS</Text>
            </View>

            {/* Table Body Rows */}
            {standings.map((team, idx) => {
              const zoneStyle = getRankZoneStyle(team.rank, standings.length);
              const isEven = idx % 2 === 0;

              return (
                <View
                  key={team.team}
                  style={[
                    styles.tableRow,
                    isEven && styles.tableRowEven,
                    zoneStyle,
                  ]}
                >
                  {/* Rank */}
                  <View style={styles.colRank}>
                    <Text style={styles.rankText}>{team.rank}</Text>
                  </View>

                  {/* Club (Logo + Name) */}
                  <View style={styles.colTeam}>
                    <View style={styles.teamInfoRow}>
                      {team.logo ? (
                        <Image
                          source={{ uri: team.logo }}
                          style={styles.teamLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.logoFallback}>
                          <Ionicons name="shield-outline" size={14} color={colors.textMuted} />
                        </View>
                      )}
                      <Text style={styles.teamNameText} numberOfLines={1}>
                        {team.team}
                      </Text>
                    </View>
                  </View>

                  {/* Matches Played (P) */}
                  <View style={styles.colStat}>
                    <Text style={styles.statText}>{team.p}</Text>
                  </View>

                  {/* Won (W) */}
                  <View style={styles.colStat}>
                    <Text style={styles.statText}>{team.w}</Text>
                  </View>

                  {/* Draw (D) */}
                  <View style={styles.colStat}>
                    <Text style={styles.statText}>{team.d}</Text>
                  </View>

                  {/* Lost (L) */}
                  <View style={styles.colStat}>
                    <Text style={styles.statText}>{team.l}</Text>
                  </View>

                  {/* Goal Difference (GD) */}
                  <View style={styles.colStat}>
                    <Text
                      style={[
                        styles.statText,
                        team.gd > 0 ? { color: colors.primaryLight } : team.gd < 0 ? { color: '#EF4444' } : null,
                      ]}
                    >
                      {team.gd > 0 ? `+${team.gd}` : team.gd}
                    </Text>
                  </View>

                  {/* Total Points (PTS) */}
                  <View style={styles.colPts}>
                    <Text style={styles.ptsText}>{team.pts}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ================= ZONA KETERANGAN ================= */}
          <View style={styles.legendCard}>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Liga Champions (Top 4)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Liga Europa (Peringkat 5)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Zona Degradasi (3 Terbawah)</Text>
            </View>
          </View>

          <View style={styles.captionRow}>
            <Text style={styles.captionText}>
              Keterangan: MN = Main, M = Menang, S = Seri, K = Kalah, SG = Selisih Gol, PTS = Poin
            </Text>
          </View>
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
  selectorWrapper: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  leaguesScroll: {
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
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  seasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  seasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonChipActive: {
    backgroundColor: '#1E293B',
    borderColor: colors.primaryLight,
  },
  seasonChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  seasonChipTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
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

  /* Table */
  tableScroll: {
    flex: 1,
  },
  tableContent: {
    padding: 16,
    paddingBottom: 30,
    gap: 14,
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B50',
  },
  tableRowEven: {
    backgroundColor: '#151F32',
  },

  /* Column Widths & Alignments */
  colRank: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
  },
  colTeam: {
    flex: 1,
    paddingRight: 6,
  },
  teamInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamLogo: {
    width: 22,
    height: 22,
  },
  logoFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  colStat: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  colPts: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptsText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  /* Legend */
  legendCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  captionRow: {
    paddingHorizontal: 4,
  },
  captionText: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 14,
  },
});
