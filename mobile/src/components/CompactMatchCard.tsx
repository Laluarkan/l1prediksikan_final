import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Fixture } from '../services/api';
import { formatWitaKickoff } from '../utils/dateUtils';
import { getTeamLogoUrl, getLeagueLogoUrl } from '../utils/logo';

interface CompactMatchCardProps {
  fixture: Fixture;
  onPress: () => void;
  showLeagueBadge?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const CompactMatchCard: React.FC<CompactMatchCardProps> = ({
  fixture,
  onPress,
  showLeagueBadge = true,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const { colors, isDark } = useTheme();
  const kickoffLabel = formatWitaKickoff(fixture.date);

  // 1. Rekomendasi Utama 1X2 (Berdasarkan Probabilitas ML Tertinggi)
  const pH = fixture.prob_ftr_h || 0;
  const pD = fixture.prob_ftr_d || 0;
  const pA = fixture.prob_ftr_a || 0;
  let hdaPick: 'H' | 'D' | 'A' = 'H';
  if (pH >= pD && pH >= pA) {
    hdaPick = 'H';
  } else if (pA >= pH && pA >= pD) {
    hdaPick = 'A';
  } else {
    hdaPick = 'D';
  }

  let rawHdaOdds = hdaPick === 'H' ? fixture.avg_h : hdaPick === 'A' ? fixture.avg_a : fixture.avg_d;
  if (!rawHdaOdds || isNaN(rawHdaOdds) || rawHdaOdds <= 1.0) {
    rawHdaOdds = hdaPick === 'H' ? 1.85 : hdaPick === 'A' ? 2.45 : 3.20;
  }
  const hdaOdds = Number(rawHdaOdds).toFixed(2);

  // 2. Rekomendasi Utama O/U 2.5
  const pOver = fixture.prob_ou25_over || 0.5;
  const ouPickShort: 'O 2.5' | 'U 2.5' = pOver >= 0.5 ? 'O 2.5' : 'U 2.5';
  let rawOuOdds = ouPickShort === 'O 2.5' ? fixture.avg_over_25 : fixture.avg_under_25;

  if (!rawOuOdds || isNaN(rawOuOdds) || rawOuOdds <= 1.0) {
    rawOuOdds = ouPickShort === 'O 2.5' ? 1.90 : 1.85;
  }
  const ouOdds = Number(rawOuOdds).toFixed(2);

  const hdaLabel = hdaPick === 'H' ? 'Home' : hdaPick === 'A' ? 'Away' : 'Draw';
  const ouLabel = ouPickShort === 'O 2.5' ? 'Over 2.5' : 'Under 2.5';

  // Perbaikan: Syarat tampilnya badge VALUE WAJIB mengacu pada rekomendasi RL aktif (rl_stake > 0)
  const hasValueFtr = typeof fixture.rl_stake_ftr === 'number' && fixture.rl_stake_ftr > 0;
  const hasValueOu = typeof fixture.rl_stake_ou === 'number' && fixture.rl_stake_ou > 0;
  const hasAnyValue = hasValueFtr || hasValueOu;

  // Resolusi logo resmi
  const homeLogoUrl = getTeamLogoUrl(fixture.home_team_name, fixture.home_team_logo);
  const awayLogoUrl = getTeamLogoUrl(fixture.away_team_name, fixture.away_team_logo);
  const leagueLogoUrl = getLeagueLogoUrl(
    fixture.league_code,
    fixture.league_name,
    fixture.league_logo,
    fixture.home_team_name
  );

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: hasAnyValue ? (isDark ? '#05966960' : '#10B98180') : colors.border,
        },
        hasAnyValue && (isDark ? styles.cardHighlightDark : styles.cardHighlightLight),
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Top Meta Bar */}
      <View style={[styles.topMetaBar, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.timeWrapper}>
          <Ionicons name="time-outline" size={11} color={colors.primary} />
          <Text style={[styles.timeText, { color: colors.primary }]}>{kickoffLabel}</Text>
        </View>

        <View style={styles.topRightControls}>
          {showLeagueBadge ? (
            <View style={[styles.leagueBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.borderLight }]}>
              <View style={[styles.leagueLogoMiniBox, { backgroundColor: colors.logoBackdrop }]}>
                <Image source={{ uri: leagueLogoUrl }} style={styles.leagueLogoMini} resizeMode="contain" />
              </View>
              <Text style={[styles.leagueText, { color: colors.textSecondary }]} numberOfLines={1}>
                {fixture.league_name}
              </Text>
            </View>
          ) : null}

          {onToggleFavorite && (
            <TouchableOpacity
              onPress={onToggleFavorite}
              style={styles.starBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={14}
                color={isFavorite ? '#F59E0B' : colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Row: Left (Teams) | Right (Predictions) */}
      <View style={styles.mainRow}>
        {/* Sisi Kiri: Tim Home & Away */}
        <View style={styles.teamsCol}>
          {/* Home Team */}
          <View style={styles.teamRow}>
            <View style={[styles.teamLogoBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
              <Image source={{ uri: homeLogoUrl }} style={styles.teamLogo} resizeMode="contain" />
            </View>
            <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={1}>
              {fixture.home_team_name}
            </Text>
          </View>

          {/* Away Team */}
          <View style={styles.teamRow}>
            <View style={[styles.teamLogoBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
              <Image source={{ uri: awayLogoUrl }} style={styles.teamLogo} resizeMode="contain" />
            </View>
            <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={1}>
              {fixture.away_team_name}
            </Text>
          </View>
        </View>

        {/* Separator Line */}
        <View style={[styles.colDivider, { backgroundColor: colors.borderLight }]} />

        {/* Sisi Kanan: Rekomendasi HDA & Rekomendasi O/U */}
        <View style={styles.picksCol}>
          {/* Atas: Rekomendasi HDA */}
          <View style={[styles.pickRow, hasValueFtr && styles.pickRowValue]}>
            <View style={styles.pickLabelRow}>
              <Text style={[styles.pickTag, { color: colors.textMuted }]}>1X2</Text>
              <Text style={[styles.pickText, { color: colors.textPrimary }]} numberOfLines={1}>
                {hdaLabel} <Text style={[styles.oddsText, { color: colors.primary }]}>@{hdaOdds || '-'}</Text>
              </Text>
            </View>
            {hasValueFtr ? (
              <View style={styles.valueBadge}>
                <Ionicons name="sparkles" size={8} color="#D97706" />
                <Text style={styles.valueBadgeText}>VALUE</Text>
              </View>
            ) : null}
          </View>

          {/* Bawah: Rekomendasi O/U */}
          <View style={[styles.pickRow, hasValueOu && styles.pickRowValue]}>
            <View style={styles.pickLabelRow}>
              <Text style={[styles.pickTag, { color: colors.textMuted }]}>O/U</Text>
              <Text style={[styles.pickText, { color: colors.textPrimary }]} numberOfLines={1}>
                {ouLabel} <Text style={[styles.oddsText, { color: colors.primary }]}>@{ouOdds || '-'}</Text>
              </Text>
            </View>
            {hasValueOu ? (
              <View style={styles.valueBadge}>
                <Ionicons name="sparkles" size={8} color="#D97706" />
                <Text style={styles.valueBadgeText}>VALUE</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHighlightDark: {
    backgroundColor: '#0F231D',
  },
  cardHighlightLight: {
    backgroundColor: '#F0FDF4',
  },
  topMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 5,
    borderBottomWidth: 1,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '65%',
  },
  leagueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    gap: 4,
  },
  leagueLogoMiniBox: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueLogoMini: {
    width: '100%',
    height: '100%',
  },
  leagueText: {
    fontSize: 9,
    fontWeight: '700',
    maxWidth: 120,
  },
  starBtn: {
    padding: 2,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamsCol: {
    flex: 1.15,
    gap: 6,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
  teamName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  colDivider: {
    width: 1,
    height: '80%',
    marginHorizontal: 8,
  },
  picksCol: {
    flex: 0.95,
    gap: 5,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  pickRowValue: {
    backgroundColor: '#F59E0B15',
    borderWidth: 0.5,
    borderColor: '#F59E0B40',
  },
  pickLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  pickTag: {
    fontSize: 8,
    fontWeight: '800',
  },
  pickText: {
    fontSize: 10,
    fontWeight: '700',
  },
  oddsText: {
    fontWeight: '800',
  },
  valueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  valueBadgeText: {
    color: '#D97706',
    fontSize: 7.5,
    fontWeight: '900',
  },
});
