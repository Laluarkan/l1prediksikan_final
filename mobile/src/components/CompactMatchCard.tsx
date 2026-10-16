import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Fixture } from '../services/api';

interface CompactMatchCardProps {
  fixture: Fixture;
  onPress: () => void;
  showLeagueBadge?: boolean;
}

export const CompactMatchCard: React.FC<CompactMatchCardProps> = ({
  fixture,
  onPress,
  showLeagueBadge = true,
}) => {
  const formatKickoff = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const day = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${day} • ${h}:${m} WIB`;
    } catch {
      return dateStr;
    }
  };

  // 1. Sanitasi Rekomendasi 1X2 (HDA)
  const rawFtr = (fixture.rl_pick_ftr || '').trim().toUpperCase();
  let hdaPick: 'H' | 'D' | 'A';
  if (rawFtr === 'H' || rawFtr === 'D' || rawFtr === 'A') {
    hdaPick = rawFtr;
  } else {
    // Jika null, undefined, 'NAN', kalkulasi dari probabilitas tertinggi
    const pH = fixture.prob_ftr_h || 0;
    const pD = fixture.prob_ftr_d || 0;
    const pA = fixture.prob_ftr_a || 0;
    if (pH >= pD && pH >= pA) {
      hdaPick = 'H';
    } else if (pA >= pH && pA >= pD) {
      hdaPick = 'A';
    } else {
      hdaPick = 'D';
    }
  }

  let rawHdaOdds = hdaPick === 'H' ? fixture.avg_h : hdaPick === 'A' ? fixture.avg_a : fixture.avg_d;
  if (!rawHdaOdds || isNaN(rawHdaOdds) || rawHdaOdds <= 1.0) {
    rawHdaOdds = hdaPick === 'H' ? 1.85 : hdaPick === 'A' ? 2.45 : 3.20;
  }
  const hdaOdds = Number(rawHdaOdds).toFixed(2);

  // 2. Sanitasi Rekomendasi O/U
  const rawOu = (fixture.rl_pick_ou || '').trim().toUpperCase();
  let ouPickShort: 'O 2.5' | 'U 2.5';
  let rawOuOdds: number | undefined;

  if (rawOu.includes('UNDER') || rawOu === 'U') {
    ouPickShort = 'U 2.5';
    rawOuOdds = fixture.avg_under_25;
  } else if (rawOu.includes('OVER') || rawOu === 'O') {
    ouPickShort = 'O 2.5';
    rawOuOdds = fixture.avg_over_25;
  } else {
    const pOver = fixture.prob_ou25_over || 0.5;
    if (pOver >= 0.5) {
      ouPickShort = 'O 2.5';
      rawOuOdds = fixture.avg_over_25;
    } else {
      ouPickShort = 'U 2.5';
      rawOuOdds = fixture.avg_under_25;
    }
  }

  if (!rawOuOdds || isNaN(rawOuOdds) || rawOuOdds <= 1.0) {
    rawOuOdds = ouPickShort === 'O 2.5' ? 1.90 : 1.85;
  }
  const ouOdds = Number(rawOuOdds).toFixed(2);

  const hasAnyValue = Boolean(fixture.has_value_bet || fixture.has_value_bet_ou);

  return (
    <TouchableOpacity
      style={[styles.card, hasAnyValue && styles.cardHighlight]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Top Meta Bar */}
      <View style={styles.topMetaBar}>
        <View style={styles.timeWrapper}>
          <Ionicons name="time-outline" size={11} color={colors.primaryLight} />
          <Text style={styles.timeText}>{formatKickoff(fixture.date)}</Text>
        </View>

        {showLeagueBadge ? (
          <View style={styles.leagueBadge}>
            <Text style={styles.leagueText} numberOfLines={1}>
              {fixture.league_name}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Main Row: Left (Teams) | Right (Predictions) */}
      <View style={styles.mainRow}>
        {/* Sisi Kiri: Tim Home & Away */}
        <View style={styles.teamsCol}>
          {/* Home Team */}
          <View style={styles.teamRow}>
            {fixture.home_team_logo ? (
              <Image source={{ uri: fixture.home_team_logo }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <View style={styles.teamLogoFallback}>
                <Ionicons name="shield-outline" size={11} color={colors.textPrimary} />
              </View>
            )}
            <Text style={styles.teamName} numberOfLines={1}>
              {fixture.home_team_name}
            </Text>
          </View>

          {/* Away Team */}
          <View style={styles.teamRow}>
            {fixture.away_team_logo ? (
              <Image source={{ uri: fixture.away_team_logo }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <View style={styles.teamLogoFallback}>
                <Ionicons name="shield-outline" size={11} color={colors.textPrimary} />
              </View>
            )}
            <Text style={styles.teamName} numberOfLines={1}>
              {fixture.away_team_name}
            </Text>
          </View>
        </View>

        {/* Separator Line */}
        <View style={styles.colDivider} />

        {/* Sisi Kanan: Rekomendasi HDA & Rekomendasi O/U */}
        <View style={styles.picksCol}>
          {/* Atas: Rekomendasi HDA */}
          <View style={[styles.pickRow, fixture.has_value_bet && styles.pickRowValue]}>
            <View style={styles.pickLabelRow}>
              <Text style={styles.pickTag}>1X2</Text>
              <Text style={styles.pickText}>
                {hdaPick} <Text style={styles.oddsText}>@{hdaOdds || '-'}</Text>
              </Text>
            </View>
            {fixture.has_value_bet ? (
              <View style={styles.valueBadge}>
                <Ionicons name="diamond" size={8} color="#F59E0B" />
                <Text style={styles.valueBadgeText}>VALUE</Text>
              </View>
            ) : null}
          </View>

          {/* Bawah: Rekomendasi O/U */}
          <View style={[styles.pickRow, fixture.has_value_bet_ou && styles.pickRowValue]}>
            <View style={styles.pickLabelRow}>
              <Text style={styles.pickTag}>O/U</Text>
              <Text style={styles.pickText}>
                {ouPickShort} <Text style={styles.oddsText}>@{ouOdds || '-'}</Text>
              </Text>
            </View>
            {fixture.has_value_bet_ou ? (
              <View style={styles.valueBadge}>
                <Ionicons name="diamond" size={8} color="#F59E0B" />
                <Text style={styles.valueBadgeText}>VALUE</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Small Chevron indicator */}
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 10,
    gap: 6,
  },
  cardHighlight: {
    borderColor: '#10B98140',
    backgroundColor: '#0B132B',
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
  leagueBadge: {
    backgroundColor: '#1E293B70',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    maxWidth: '50%',
  },
  leagueText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamsCol: {
    flex: 1.25,
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  colDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#1E293B',
    marginHorizontal: 4,
  },
  picksCol: {
    flex: 1.05,
    gap: 5,
    paddingLeft: 4,
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
  pickRowValue: {
    backgroundColor: '#064E3B40',
    borderWidth: 0.5,
    borderColor: '#05966960',
  },
  pickLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  pickText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  oddsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  valueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F59E0B25',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  valueBadgeText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#F59E0B',
  },
  chevron: {
    marginLeft: 4,
  },
});
