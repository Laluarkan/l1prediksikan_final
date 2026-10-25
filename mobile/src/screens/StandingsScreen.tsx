import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { useTheme } from '../theme/ThemeContext';
import { League, TeamStanding, fetchLeagues, fetchStandings } from '../services/api';
import { getTeamLogoUrl, getLeagueLogoUrl } from '../utils/logo';

const AVAILABLE_SEASONS = ['26/27', '25/26', '24/25', '23/24', '22/23', '21/22'];

interface ZoneRule {
  ranks: number[];
  name: string;
  shortName: string;
  colorBorder: string;
  badgeBg: string;
  badgeText: string;
}

// Konfigurasi Zona Kualifikasi & Degradasi Resmi untuk 11 Liga Top Eropa
const LEAGUE_RULES: Record<string, ZoneRule[]> = {
  E0: [
    { ranks: [1, 2, 3, 4], name: 'UEFA Champions League', shortName: 'UCL', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [5], name: 'UEFA Europa League', shortName: 'UEL', colorBorder: '#F59E0B', badgeBg: '#F59E0B20', badgeText: '#D97706' },
    { ranks: [18, 19, 20], name: 'Zona Degradasi ke Championship', shortName: 'Degradasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  SP1: [
    { ranks: [1, 2, 3, 4], name: 'UEFA Champions League', shortName: 'UCL', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [5], name: 'UEFA Europa League', shortName: 'UEL', colorBorder: '#F59E0B', badgeBg: '#F59E0B20', badgeText: '#D97706' },
    { ranks: [6], name: 'UEFA Conference League', shortName: 'UECL', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [18, 19, 20], name: 'Zona Degradasi ke Segunda', shortName: 'Degradasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  I1: [
    { ranks: [1, 2, 3, 4], name: 'UEFA Champions League', shortName: 'UCL', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [5], name: 'UEFA Europa League', shortName: 'UEL', colorBorder: '#F59E0B', badgeBg: '#F59E0B20', badgeText: '#D97706' },
    { ranks: [6], name: 'UEFA Conference League', shortName: 'UECL', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [18, 19, 20], name: 'Zona Degradasi ke Serie B', shortName: 'Degradasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  D1: [
    { ranks: [1, 2, 3, 4], name: 'UEFA Champions League', shortName: 'UCL', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [5], name: 'UEFA Europa League', shortName: 'UEL', colorBorder: '#F59E0B', badgeBg: '#F59E0B20', badgeText: '#D97706' },
    { ranks: [6], name: 'UEFA Conference League', shortName: 'UECL', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [16], name: 'Play-off Degradasi', shortName: 'PO Deg.', colorBorder: '#D946EF', badgeBg: '#D946EF20', badgeText: '#C026D3' },
    { ranks: [17, 18], name: 'Zona Degradasi ke 2. Bundesliga', shortName: 'Degradasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  F1: [
    { ranks: [1, 2, 3], name: 'UEFA Champions League', shortName: 'UCL', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [4], name: 'Kualifikasi UCL', shortName: 'Kual. UCL', colorBorder: '#22D3EE', badgeBg: '#22D3EE20', badgeText: '#0891B2' },
    { ranks: [5], name: 'UEFA Europa League', shortName: 'UEL', colorBorder: '#F59E0B', badgeBg: '#F59E0B20', badgeText: '#D97706' },
    { ranks: [6], name: 'UEFA Conference League', shortName: 'UECL', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [16], name: 'Play-off Degradasi Ligue 1', shortName: 'PO Deg.', colorBorder: '#D946EF', badgeBg: '#D946EF20', badgeText: '#C026D3' },
    { ranks: [17, 18], name: 'Zona Degradasi ke Ligue 2', shortName: 'Degradasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  N1: [
    { ranks: [1, 2], name: 'UEFA Champions League', shortName: 'UCL', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [3], name: 'Kualifikasi UCL', shortName: 'Kual. UCL', colorBorder: '#22D3EE', badgeBg: '#22D3EE20', badgeText: '#0891B2' },
    { ranks: [4], name: 'Kualifikasi UEL', shortName: 'Kual. UEL', colorBorder: '#F59E0B', badgeBg: '#F59E0B20', badgeText: '#D97706' },
    { ranks: [5, 6, 7, 8], name: 'Play-off Tiket Eropa', shortName: 'PO Eropa', colorBorder: '#D946EF', badgeBg: '#D946EF20', badgeText: '#C026D3' },
    { ranks: [16], name: 'Play-off Degradasi', shortName: 'PO Deg.', colorBorder: '#D946EF', badgeBg: '#D946EF20', badgeText: '#C026D3' },
    { ranks: [17, 18], name: 'Zona Degradasi ke Eerste Divisie', shortName: 'Degradasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  P1: [
    { ranks: [1, 2], name: 'UEFA Champions League', shortName: 'UCL', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [3], name: 'Kualifikasi UCL', shortName: 'Kual. UCL', colorBorder: '#22D3EE', badgeBg: '#22D3EE20', badgeText: '#0891B2' },
    { ranks: [4], name: 'UEFA Europa League', shortName: 'UEL', colorBorder: '#F59E0B', badgeBg: '#F59E0B20', badgeText: '#D97706' },
    { ranks: [5], name: 'UEFA Conference League', shortName: 'UECL', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [16], name: 'Play-off Degradasi Primeira Liga', shortName: 'PO Deg.', colorBorder: '#D946EF', badgeBg: '#D946EF20', badgeText: '#C026D3' },
    { ranks: [17, 18], name: 'Zona Degradasi ke Liga Portugal 2', shortName: 'Degradasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  B1: [
    { ranks: [1, 2, 3, 4, 5, 6], name: 'Champions\' Play-offs', shortName: 'Champ PO', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [7, 8, 9, 10, 11, 12], name: 'Europe Play-offs', shortName: 'Europe PO', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [13, 14, 15, 16], name: 'Relegation Play-offs', shortName: 'Relegation', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  T1: [
    { ranks: [1, 2], name: 'UEFA Champions League', shortName: 'UCL', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [3], name: 'UEFA Europa League', shortName: 'UEL', colorBorder: '#F59E0B', badgeBg: '#F59E0B20', badgeText: '#D97706' },
    { ranks: [4], name: 'UEFA Conference League', shortName: 'UECL', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [16, 17, 18, 19], name: 'Zona Degradasi ke TFF 1. Lig', shortName: 'Degradasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  G1: [
    { ranks: [1, 2, 3, 4], name: 'Championship Play-offs', shortName: 'Champ PO', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [5, 6, 7, 8], name: 'Europe Play-offs', shortName: 'Europe PO', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [9, 10, 11, 12, 13, 14], name: 'Relegation Round', shortName: 'Relegation', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  SC0: [
    { ranks: [1, 2, 3, 4, 5, 6], name: 'Championship Group', shortName: 'Champ', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [7, 8, 9, 10], name: 'Relegation Group (Aman)', shortName: 'Aman', colorBorder: '#64748B', badgeBg: '#64748B20', badgeText: '#475569' },
    { ranks: [11], name: 'Play-off Degradasi Premiership', shortName: 'PO Deg.', colorBorder: '#D946EF', badgeBg: '#D946EF20', badgeText: '#C026D3' },
    { ranks: [12], name: 'Zona Degradasi', shortName: 'Degradasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
};

export const StandingsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

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

  // Ambil aturan zona kualifikasi untuk liga yang aktif
  const currentRules = useMemo(() => {
    if (!selectedLeague) return [];
    return LEAGUE_RULES[selectedLeague.code] || [];
  }, [selectedLeague]);

  // Hitung jumlah tim resmi maksimum berdasarkan zona aturan liga untuk mencegah tim liar / ekstra
  const maxOfficialRank = useMemo(() => {
    if (!currentRules || currentRules.length === 0) return undefined;
    return Math.max(...currentRules.flatMap((r) => r.ranks));
  }, [currentRules]);

  const displayedStandings = useMemo(() => {
    if (maxOfficialRank && standings.length > maxOfficialRank) {
      return standings.slice(0, maxOfficialRank);
    }
    return standings;
  }, [standings, maxOfficialRank]);

  const getRankZone = useCallback(
    (rank: number): ZoneRule | undefined => {
      return currentRules.find((rule) => rule.ranks.includes(rank));
    },
    [currentRules]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ================= LEAGUE SELECTOR CHIPS ================= */}
      <View style={[styles.selectorWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leaguesScroll}
        >
          {leagues.map((l) => {
            const isSelected = selectedLeague?.code === l.code;
            const logoUrl = getLeagueLogoUrl(l.code, l.name, l.logo_url);
            return (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.leagueChip,
                  { backgroundColor: isSelected ? colors.primary : (isDark ? '#1E293B' : '#F1F5F9'), borderColor: isSelected ? colors.primary : colors.border },
                ]}
                onPress={() => setSelectedLeague(l)}
                activeOpacity={0.7}
              >
                <View style={[styles.chipLogoBox, { backgroundColor: colors.logoBackdrop }]}>
                  <Image source={{ uri: logoUrl }} style={styles.chipLogo} resizeMode="contain" />
                </View>
                <Text
                  style={[
                    styles.leagueChipText,
                    { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {l.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Season Selector Chips */}
        <View style={styles.seasonRow}>
          <Text style={[styles.seasonLabel, { color: colors.textMuted }]}>Musim:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {AVAILABLE_SEASONS.map((season) => {
              const isSelected = selectedSeason === season;
              return (
                <TouchableOpacity
                  key={season}
                  style={[
                    styles.seasonChip,
                    { backgroundColor: isSelected ? colors.primary : (isDark ? '#1E293B' : '#F1F5F9'), borderColor: isSelected ? colors.primary : colors.border },
                  ]}
                  onPress={() => setSelectedSeason(season)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.seasonChipText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
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
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Memuat tabel klasemen {selectedLeague?.name}...
          </Text>
        </View>
      ) : standings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="trophy-outline" size={44} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Data Klasemen Belum Tersedia</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
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
          <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Table Header */}
            <View style={[styles.tableHeaderRow, { backgroundColor: isDark ? '#090D1A' : '#F1F5F9', borderBottomColor: colors.border }]}>
              <Text style={[styles.thText, styles.colRank, { color: colors.textMuted }]}>#</Text>
              <Text style={[styles.thText, styles.colTeam, { color: colors.textPrimary }]}>KLUB</Text>
              <Text style={[styles.thText, styles.colStat, { color: colors.textMuted }]}>MN</Text>
              <Text style={[styles.thText, styles.colStat, { color: colors.textMuted }]}>M</Text>
              <Text style={[styles.thText, styles.colStat, { color: colors.textMuted }]}>S</Text>
              <Text style={[styles.thText, styles.colStat, { color: colors.textMuted }]}>K</Text>
              <Text style={[styles.thText, styles.colStat, { color: colors.textMuted }]}>SG</Text>
              <Text style={[styles.thText, styles.colPts, { color: colors.primary }]}>PTS</Text>
            </View>

            {/* Table Body Rows */}
            {displayedStandings.map((team, idx) => {
              const zone = getRankZone(team.rank);
              const isEven = idx % 2 === 0;
              const teamLogoUrl = getTeamLogoUrl(team.team, team.logo);

              return (
                <View
                  key={team.team}
                  style={[
                    styles.tableRow,
                    {
                      borderTopColor: colors.borderLight,
                      backgroundColor: isEven ? (isDark ? '#111827' : '#FFFFFF') : (isDark ? '#0F172A' : '#F8FAFC'),
                      borderLeftColor: zone ? zone.colorBorder : 'transparent',
                      borderLeftWidth: zone ? 4 : 4,
                    },
                  ]}
                >
                  {/* Rank with Zone Pill */}
                  <View style={styles.colRank}>
                    <View
                      style={[
                        styles.rankPill,
                        {
                          backgroundColor: zone ? zone.badgeBg : (isDark ? '#1E293B' : '#E2E8F0'),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankText,
                          {
                            color: zone ? zone.badgeText : colors.textSecondary,
                            fontWeight: zone ? '900' : '700',
                          },
                        ]}
                      >
                        {team.rank}
                      </Text>
                    </View>
                  </View>

                  {/* Club (Logo + Name + Honor Badge) */}
                  <View style={styles.colTeam}>
                    <View style={styles.teamInfoRow}>
                      <View style={[styles.teamLogoBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
                        <Image source={{ uri: teamLogoUrl }} style={styles.teamLogo} resizeMode="contain" />
                      </View>
                      <View style={styles.teamNameCol}>
                        <Text style={[styles.teamNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                          {team.team}
                        </Text>
                        {/* Status Tim: Juara Bertahan / Top 3 Musim Lalu / Promosi */}
                        {team.honor && (
                          <Text
                            style={[
                              styles.honorText,
                              team.honor === 'Juara Bertahan'
                                ? styles.honorChamp
                                : team.honor === 'Top 3 Musim Lalu'
                                  ? styles.honorTop3
                                  : styles.honorPromoted,
                            ]}
                            numberOfLines={1}
                          >
                            {team.honor}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Matches Played (P) */}
                  <View style={styles.colStat}>
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{team.p}</Text>
                  </View>

                  {/* Won (W) */}
                  <View style={styles.colStat}>
                    <Text style={[styles.statText, { color: colors.primary, fontWeight: '700' }]}>{team.w}</Text>
                  </View>

                  {/* Draw (D) */}
                  <View style={styles.colStat}>
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{team.d}</Text>
                  </View>

                  {/* Lost (L) */}
                  <View style={styles.colStat}>
                    <Text style={[styles.statText, { color: colors.danger }]}>{team.l}</Text>
                  </View>

                  {/* Goal Difference (GD) */}
                  <View style={styles.colStat}>
                    <Text
                      style={[
                        styles.statText,
                        team.gd > 0 ? { color: colors.primary } : team.gd < 0 ? { color: colors.danger } : { color: colors.textMuted },
                      ]}
                    >
                      {team.gd > 0 ? `+${team.gd}` : team.gd}
                    </Text>
                  </View>

                  {/* Total Points (PTS) */}
                  <View style={styles.colPts}>
                    <Text style={[styles.ptsText, { color: colors.primary }]}>{team.pts}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ================= ZONA KETERANGAN (LEGEND) ================= */}
          {currentRules.length > 0 && (
            <View style={[styles.legendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.legendHeaderRow}>
                <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
                <Text style={[styles.legendTitle, { color: colors.textPrimary }]}>Keterangan Zona Kualifikasi & Degradasi</Text>
              </View>
              <View style={styles.legendList}>
                {currentRules.map((r, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendIndicator, { backgroundColor: r.colorBorder }]} />
                    <Text style={[styles.legendDesc, { color: colors.textSecondary }]}>
                      Pos {r.ranks[0]}{r.ranks.length > 1 ? ` - ${r.ranks[r.ranks.length - 1]}` : ''}: {r.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectorWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  leaguesScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  leagueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipLogoBox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLogo: {
    width: '100%',
    height: '100%',
  },
  leagueChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 8,
  },
  seasonLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  seasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  seasonChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  tableScroll: {
    flex: 1,
  },
  tableContent: {
    padding: 10,
    gap: 12,
  },
  tableCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  thText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderTopWidth: 1,
  },
  colRank: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankPill: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 10,
  },
  colTeam: {
    flex: 1,
    paddingHorizontal: 4,
  },
  teamInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamLogoBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1.5,
  },
  teamLogo: {
    width: '100%',
    height: '100%',
  },
  teamNameCol: {
    flex: 1,
  },
  teamNameText: {
    fontSize: 11,
    fontWeight: '800',
  },
  honorText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  honorChamp: {
    color: '#D97706',
  },
  honorTop3: {
    color: '#0284C7',
  },
  honorPromoted: {
    color: '#059669',
  },
  colStat: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    fontSize: 11,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  colPts: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptsText: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  legendCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  legendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  legendList: {
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendDesc: {
    fontSize: 10,
    fontWeight: '600',
  },
});
