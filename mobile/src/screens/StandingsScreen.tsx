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
  UCL: [
    { ranks: [1, 2, 3, 4, 5, 6, 7, 8], name: 'Lolos Otomatis Babak 16 Besar', shortName: '16 Besar', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], name: 'Play-off Babak Gugur (Knockout Play-offs)', shortName: 'Play-off', colorBorder: '#38BDF8', badgeBg: '#38BDF820', badgeText: '#0284C7' },
    { ranks: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36], name: 'Tereliminasi dari Kompetisi Eropa', shortName: 'Eliminasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  UEL: [
    { ranks: [1, 2, 3, 4, 5, 6, 7, 8], name: 'Lolos Otomatis Babak 16 Besar', shortName: '16 Besar', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], name: 'Play-off Babak Gugur (Knockout Play-offs)', shortName: 'Play-off', colorBorder: '#F59E0B', badgeBg: '#F59E0B20', badgeText: '#D97706' },
    { ranks: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36], name: 'Tereliminasi dari Kompetisi Eropa', shortName: 'Eliminasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
  UECL: [
    { ranks: [1, 2, 3, 4, 5, 6, 7, 8], name: 'Lolos Otomatis Babak 16 Besar', shortName: '16 Besar', colorBorder: '#10B981', badgeBg: '#10B98120', badgeText: '#059669' },
    { ranks: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], name: 'Play-off Babak Gugur (Knockout Play-offs)', shortName: 'Play-off', colorBorder: '#14B8A6', badgeBg: '#14B8A620', badgeText: '#0D9488' },
    { ranks: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36], name: 'Tereliminasi dari Kompetisi Eropa', shortName: 'Eliminasi', colorBorder: '#F43F5E', badgeBg: '#F43F5E20', badgeText: '#E11D48' },
  ],
};

const UEFA_CODES = new Set(['UCL', 'UEL', 'UECL']);

export const StandingsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('26/27');
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [uefaViewMode, setUefaViewMode] = useState<'table' | 'bracket'>('table');

  const isUefaLeague = Boolean(selectedLeague && UEFA_CODES.has(selectedLeague.code));

  useEffect(() => {
    if (!selectedLeague || !UEFA_CODES.has(selectedLeague.code)) {
      setUefaViewMode('table');
    }
  }, [selectedLeague]);

  const knockoutBracket = useMemo(() => {
    if (!isUefaLeague || standings.length < 24) return null;
    const byRank: Record<number, TeamStanding> = {};
    standings.forEach((t) => {
      byRank[t.rank] = t;
    });

    const playoffPairs = [
      { id: 'PO-1', label: 'Play-off 1', seedA: 9, seedB: 24, teamA: byRank[9], teamB: byRank[24] },
      { id: 'PO-2', label: 'Play-off 2', seedA: 10, seedB: 23, teamA: byRank[10], teamB: byRank[23] },
      { id: 'PO-3', label: 'Play-off 3', seedA: 11, seedB: 22, teamA: byRank[11], teamB: byRank[22] },
      { id: 'PO-4', label: 'Play-off 4', seedA: 12, seedB: 21, teamA: byRank[12], teamB: byRank[21] },
      { id: 'PO-5', label: 'Play-off 5', seedA: 13, seedB: 20, teamA: byRank[13], teamB: byRank[20] },
      { id: 'PO-6', label: 'Play-off 6', seedA: 14, seedB: 19, teamA: byRank[14], teamB: byRank[19] },
      { id: 'PO-7', label: 'Play-off 7', seedA: 15, seedB: 18, teamA: byRank[15], teamB: byRank[18] },
      { id: 'PO-8', label: 'Play-off 8', seedA: 16, seedB: 17, teamA: byRank[16], teamB: byRank[17] },
    ];

    const r16Pairs = [
      { id: 'R16-1', label: '16 Besar 1', seedTop: 1, topTeam: byRank[1], challenger: byRank[16], challengerAlt: byRank[17], poLabel: 'Pemenang PO-8 (#16/#17)' },
      { id: 'R16-2', label: '16 Besar 2', seedTop: 8, topTeam: byRank[8], challenger: byRank[9], challengerAlt: byRank[24], poLabel: 'Pemenang PO-1 (#9/#24)' },
      { id: 'R16-3', label: '16 Besar 3', seedTop: 4, topTeam: byRank[4], challenger: byRank[13], challengerAlt: byRank[20], poLabel: 'Pemenang PO-5 (#13/#20)' },
      { id: 'R16-4', label: '16 Besar 4', seedTop: 5, topTeam: byRank[5], challenger: byRank[12], challengerAlt: byRank[21], poLabel: 'Pemenang PO-4 (#12/#21)' },
      { id: 'R16-5', label: '16 Besar 5', seedTop: 2, topTeam: byRank[2], challenger: byRank[15], challengerAlt: byRank[18], poLabel: 'Pemenang PO-7 (#15/#18)' },
      { id: 'R16-6', label: '16 Besar 6', seedTop: 7, topTeam: byRank[7], challenger: byRank[10], challengerAlt: byRank[23], poLabel: 'Pemenang PO-2 (#10/#23)' },
      { id: 'R16-7', label: '16 Besar 7', seedTop: 3, topTeam: byRank[3], challenger: byRank[14], challengerAlt: byRank[19], poLabel: 'Pemenang PO-6 (#14/#19)' },
      { id: 'R16-8', label: '16 Besar 8', seedTop: 6, topTeam: byRank[6], challenger: byRank[11], challengerAlt: byRank[22], poLabel: 'Pemenang PO-3 (#11/#22)' },
    ];

    const qfPairs = [
      { id: 'QF-1', label: 'Perempat Final 1', side: 'Jalur Kiri Atas', teamA: byRank[1], teamB: byRank[8], descA: 'Unggulan #1', descB: 'Unggulan #8' },
      { id: 'QF-2', label: 'Perempat Final 2', side: 'Jalur Kiri Bawah', teamA: byRank[4], teamB: byRank[5], descA: 'Unggulan #4', descB: 'Unggulan #5' },
      { id: 'QF-3', label: 'Perempat Final 3', side: 'Jalur Kanan Atas', teamA: byRank[2], teamB: byRank[7], descA: 'Unggulan #2', descB: 'Unggulan #7' },
      { id: 'QF-4', label: 'Perempat Final 4', side: 'Jalur Kanan Bawah', teamA: byRank[3], teamB: byRank[6], descA: 'Unggulan #3', descB: 'Unggulan #6' },
    ];

    const sfPairs = [
      { id: 'SF-1', label: 'Semifinal 1 (Blok Kiri)', teamA: byRank[1], teamB: byRank[4], descA: 'Pemenang QF-1', descB: 'Pemenang QF-2' },
      { id: 'SF-2', label: 'Semifinal 2 (Blok Kanan)', teamA: byRank[2], teamB: byRank[3], descA: 'Pemenang QF-3', descB: 'Pemenang QF-4' },
    ];

    const finalMatch = {
      id: 'FINAL',
      label: `Grand Final ${selectedLeague?.name || 'UEFA'}`,
      teamA: byRank[1],
      teamB: byRank[2],
    };

    return { playoffPairs, r16Pairs, qfPairs, sfPairs, finalMatch };
  }, [isUefaLeague, standings, selectedLeague]);

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
                <Image source={{ uri: logoUrl }} style={styles.chipLogo} resizeMode="contain" />
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

        {/* Tab Pemilih Fase Liga (36 Tim) vs Bagan Babak Gugur (Khusus UCL / UEL / UECL) */}
        {isUefaLeague && (
          <View
            style={[
              styles.uefaTabWrapper,
              {
                backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                borderColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.uefaTabBtn,
                uefaViewMode === 'table' && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => setUefaViewMode('table')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="list"
                size={13}
                color={uefaViewMode === 'table' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.uefaTabText,
                  { color: uefaViewMode === 'table' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Fase Liga (36 Tim)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.uefaTabBtn,
                uefaViewMode === 'bracket' && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => setUefaViewMode('bracket')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="git-network-outline"
                size={13}
                color={uefaViewMode === 'bracket' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.uefaTabText,
                  { color: uefaViewMode === 'bracket' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Bagan Babak Gugur
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ================= STANDINGS TABLE ATAU BAGAN BABAK GUGUR ================= */}
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
      ) : isUefaLeague && uefaViewMode === 'bracket' && knockoutBracket ? (
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
          {/* 1. GRAND FINAL PREVIEW CARD */}
          <View
            style={[
              styles.bracketSectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={[styles.bracketSectionHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.bracketHeaderLeft}>
                <Ionicons name="trophy" size={16} color="#F59E0B" />
                <Text style={[styles.bracketSectionTitle, { color: colors.textPrimary }]}>
                  Proyeksi {knockoutBracket.finalMatch.label}
                </Text>
              </View>
              <Text style={[styles.bracketBadgeText, { color: colors.primary }]}>Swiss Seeding</Text>
            </View>

            <View style={styles.finalPreviewRow}>
              {[knockoutBracket.finalMatch.teamA, knockoutBracket.finalMatch.teamB].map((ft, idx) => (
                <React.Fragment key={idx}>
                  {idx === 1 && (
                    <View
                      style={[
                        styles.vsCircle,
                        { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
                    </View>
                  )}
                  <View style={styles.finalTeamBox}>
                    <Image
                      source={{ uri: getTeamLogoUrl(ft?.team, ft?.logo) }}
                      style={styles.finalTeamLogo}
                      resizeMode="contain"
                    />
                    <Text style={[styles.finalTeamName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {ft?.team}
                    </Text>
                    <Text style={[styles.finalTeamSub, { color: colors.primary }]}>
                      Unggulan #{ft?.rank} ({ft?.pts} Pts)
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* 2. BABAK PLAY-OFF FASE GUGUR (POS 9 - 24) */}
          <View style={[styles.bracketSectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.bracketSectionHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.bracketHeaderLeft}>
                <Ionicons name="git-branch-outline" size={15} color="#38BDF8" />
                <Text style={[styles.bracketSectionTitle, { color: colors.textPrimary }]}>
                  Play-off Babak Gugur (Pos 9 – 24)
                </Text>
              </View>
              <Text style={[styles.bracketSubInfo, { color: colors.textMuted }]}>8 Partai (2 Leg)</Text>
            </View>

            <View style={styles.bracketGrid}>
              {knockoutBracket.playoffPairs.map((po) => (
                <View
                  key={po.id}
                  style={[
                    styles.matchupCard,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.matchupCardHeader, { borderBottomColor: colors.borderLight }]}>
                    <Text style={[styles.matchupLabel, { color: '#0284C7' }]}>{po.label}</Text>
                    <Text style={[styles.matchupSeedInfo, { color: colors.textMuted }]}>
                      #{po.seedA} vs #{po.seedB}
                    </Text>
                  </View>

                  {[
                    { t: po.teamA, seed: po.seedA },
                    { t: po.teamB, seed: po.seedB },
                  ].map((item, i) => (
                    <View key={i} style={styles.matchupTeamRow}>
                      <View style={styles.matchupTeamLeft}>
                        <View
                          style={[
                            styles.seedMiniBadge,
                            { backgroundColor: i === 0 ? '#38BDF820' : (isDark ? '#1E293B' : '#E2E8F0') },
                          ]}
                        >
                          <Text
                            style={[
                              styles.seedMiniText,
                              { color: i === 0 ? '#0284C7' : colors.textSecondary },
                            ]}
                          >
                            {item.seed}
                          </Text>
                        </View>
                        <Image
                          source={{ uri: getTeamLogoUrl(item.t?.team, item.t?.logo) }}
                          style={styles.matchupLogo}
                          resizeMode="contain"
                        />
                        <Text style={[styles.matchupTeamName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.t?.team}
                        </Text>
                      </View>
                      <Text style={[styles.matchupPtsText, { color: colors.textMuted }]}>{item.t?.pts} pts</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* 3. BABAK 16 BESAR (ROUND OF 16) */}
          <View style={[styles.bracketSectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.bracketSectionHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.bracketHeaderLeft}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#10B981" />
                <Text style={[styles.bracketSectionTitle, { color: colors.textPrimary }]}>
                  Babak 16 Besar (Unggulan #1–#8)
                </Text>
              </View>
              <Text style={[styles.bracketSubInfo, { color: colors.textMuted }]}>Round of 16</Text>
            </View>

            <View style={styles.bracketGrid}>
              {knockoutBracket.r16Pairs.map((r16) => (
                <View
                  key={r16.id}
                  style={[
                    styles.matchupCard,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.matchupCardHeader, { borderBottomColor: colors.borderLight }]}>
                    <Text style={[styles.matchupLabel, { color: '#059669' }]}>{r16.label}</Text>
                    <Text style={[styles.matchupSeedInfo, { color: colors.textMuted }]}>
                      Unggulan #{r16.seedTop}
                    </Text>
                  </View>

                  <View style={styles.matchupTeamRow}>
                    <View style={styles.matchupTeamLeft}>
                      <View style={[styles.seedMiniBadge, { backgroundColor: '#10B98120' }]}>
                        <Text style={[styles.seedMiniText, { color: '#059669' }]}>{r16.seedTop}</Text>
                      </View>
                      <Image
                        source={{ uri: getTeamLogoUrl(r16.topTeam?.team, r16.topTeam?.logo) }}
                        style={styles.matchupLogo}
                        resizeMode="contain"
                      />
                      <Text style={[styles.matchupTeamName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {r16.topTeam?.team}
                      </Text>
                    </View>
                    <Text style={[styles.matchupPtsText, { color: colors.primary, fontWeight: '800' }]}>
                      {r16.topTeam?.pts} pts
                    </Text>
                  </View>

                  <View style={styles.matchupTeamRow}>
                    <View style={styles.matchupTeamLeft}>
                      <View style={[styles.seedMiniBadge, { backgroundColor: '#38BDF820' }]}>
                        <Text style={[styles.seedMiniText, { color: '#0284C7' }]}>PO</Text>
                      </View>
                      <Image
                        source={{ uri: getTeamLogoUrl(r16.challenger?.team, r16.challenger?.logo) }}
                        style={styles.matchupLogo}
                        resizeMode="contain"
                      />
                      <Text style={[styles.matchupTeamName, { color: colors.textSecondary }]} numberOfLines={1}>
                        {r16.challenger?.team} / {r16.challengerAlt?.team}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 4. PEREMPAT FINAL & SEMIFINAL */}
          <View style={[styles.bracketSectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.bracketSectionHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.bracketHeaderLeft}>
                <Ionicons name="flame-outline" size={15} color="#F59E0B" />
                <Text style={[styles.bracketSectionTitle, { color: colors.textPrimary }]}>
                  Proyeksi Perempat Final & Semifinal
                </Text>
              </View>
              <Text style={[styles.bracketSubInfo, { color: colors.textMuted }]}>8 Besar & 4 Besar</Text>
            </View>

            <View style={styles.bracketGrid}>
              {knockoutBracket.qfPairs.map((qf) => (
                <View
                  key={qf.id}
                  style={[
                    styles.matchupCard,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.matchupCardHeader, { borderBottomColor: colors.borderLight }]}>
                    <Text style={[styles.matchupLabel, { color: '#D97706' }]}>{qf.label}</Text>
                    <Text style={[styles.matchupSeedInfo, { color: colors.textMuted }]}>{qf.side}</Text>
                  </View>
                  {[
                    { t: qf.teamA, desc: qf.descA },
                    { t: qf.teamB, desc: qf.descB },
                  ].map((item, idx) => (
                    <View key={idx} style={styles.matchupTeamRow}>
                      <View style={styles.matchupTeamLeft}>
                        <Image
                          source={{ uri: getTeamLogoUrl(item.t?.team, item.t?.logo) }}
                          style={styles.matchupLogo}
                          resizeMode="contain"
                        />
                        <Text style={[styles.matchupTeamName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.t?.team}
                        </Text>
                      </View>
                      <Text style={[styles.matchupPtsText, { color: colors.textMuted }]}>{item.desc}</Text>
                    </View>
                  ))}
                </View>
              ))}

              {knockoutBracket.sfPairs.map((sf) => (
                <View
                  key={sf.id}
                  style={[
                    styles.matchupCard,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <View style={[styles.matchupCardHeader, { borderBottomColor: colors.borderLight }]}>
                    <Text style={[styles.matchupLabel, { color: colors.primary }]}>{sf.label}</Text>
                  </View>
                  {[
                    { t: sf.teamA, desc: sf.descA },
                    { t: sf.teamB, desc: sf.descB },
                  ].map((item, idx) => (
                    <View key={idx} style={styles.matchupTeamRow}>
                      <View style={styles.matchupTeamLeft}>
                        <Image
                          source={{ uri: getTeamLogoUrl(item.t?.team, item.t?.logo) }}
                          style={styles.matchupLogo}
                          resizeMode="contain"
                        />
                        <Text style={[styles.matchupTeamName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.t?.team}
                        </Text>
                      </View>
                      <Text style={[styles.matchupPtsText, { color: colors.textMuted }]}>{item.desc}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
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
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLogo: {
    width: 20,
    height: 20,
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
  uefaTabWrapper: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 10,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  uefaTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 7,
    gap: 6,
  },
  uefaTabText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  bracketSectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  bracketSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  bracketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bracketSectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  bracketBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  bracketSubInfo: {
    fontSize: 10,
    fontWeight: '600',
  },
  finalPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  finalTeamBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  finalTeamLogo: {
    width: 38,
    height: 38,
  },
  finalTeamName: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  finalTeamSub: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  vsCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  vsText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  bracketGrid: {
    gap: 8,
  },
  matchupCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 9,
    gap: 6,
  },
  matchupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: 0.8,
  },
  matchupLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  matchupSeedInfo: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  matchupTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  matchupTeamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  seedMiniBadge: {
    width: 20,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedMiniText: {
    fontSize: 9,
    fontWeight: '800',
  },
  matchupLogo: {
    width: 16,
    height: 16,
  },
  matchupTeamName: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  matchupPtsText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
