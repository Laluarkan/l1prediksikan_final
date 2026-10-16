import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Fixture } from '../../services/api';
import { shareMatchPrediction } from '../../services/shareService';

interface MatchDetailModalProps {
  visible: boolean;
  fixture: Fixture | null;
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  visible,
  fixture,
  onClose,
}) => {
  if (!fixture) return null;

  const formatFullDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m} WIB`;
    } catch {
      return '-';
    }
  };

  const probH = Math.round((fixture.prob_ftr_h || 0.33) * 100);
  const probD = Math.round((fixture.prob_ftr_d || 0.33) * 100);
  const probA = Math.max(0, 100 - probH - probD);

  const probOver = Math.round((fixture.prob_ou25_over || 0.5) * 100);
  const probUnder = Math.max(0, 100 - probOver);

  // 1. Sanitasi Rekomendasi 1X2
  const rawFtr = (fixture.rl_pick_ftr || '').trim().toUpperCase();
  let ftrPick: 'H' | 'D' | 'A';
  if (rawFtr === 'H' || rawFtr === 'D' || rawFtr === 'A') {
    ftrPick = rawFtr;
  } else {
    if (probH >= probD && probH >= probA) ftrPick = 'H';
    else if (probA >= probH && probA >= probD) ftrPick = 'A';
    else ftrPick = 'D';
  }

  let rawFtrOdds = ftrPick === 'H' ? fixture.avg_h : ftrPick === 'A' ? fixture.avg_a : fixture.avg_d;
  if (!rawFtrOdds || isNaN(rawFtrOdds) || rawFtrOdds <= 1.0) {
    rawFtrOdds = ftrPick === 'H' ? 1.85 : ftrPick === 'A' ? 2.45 : 3.20;
  }
  const ftrOdds = Number(rawFtrOdds).toFixed(2);

  // 2. Sanitasi Rekomendasi O/U
  const rawOu = (fixture.rl_pick_ou || '').trim().toUpperCase();
  let ouPickShort: 'O 2.5' | 'U 2.5';
  let ouPickLong: 'OVER 2.5' | 'UNDER 2.5';
  let rawOuOdds: number | undefined;

  if (rawOu.includes('UNDER') || rawOu === 'U') {
    ouPickShort = 'U 2.5';
    ouPickLong = 'UNDER 2.5';
    rawOuOdds = fixture.avg_under_25;
  } else if (rawOu.includes('OVER') || rawOu === 'O') {
    ouPickShort = 'O 2.5';
    ouPickLong = 'OVER 2.5';
    rawOuOdds = fixture.avg_over_25;
  } else {
    if (probOver >= 50) {
      ouPickShort = 'O 2.5';
      ouPickLong = 'OVER 2.5';
      rawOuOdds = fixture.avg_over_25;
    } else {
      ouPickShort = 'U 2.5';
      ouPickLong = 'UNDER 2.5';
      rawOuOdds = fixture.avg_under_25;
    }
  }

  if (!rawOuOdds || isNaN(rawOuOdds) || rawOuOdds <= 1.0) {
    rawOuOdds = ouPickShort === 'O 2.5' ? 1.90 : 1.85;
  }
  const ouOdds = Number(rawOuOdds).toFixed(2);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <Ionicons name="trophy-outline" size={16} color={colors.primaryLight} />
              <Text style={styles.leagueTitle} numberOfLines={1}>
                {fixture.league_name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Match Kickoff Banner */}
            <View style={styles.kickoffBanner}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.kickoffDate}>{formatFullDate(fixture.date)}</Text>
              <Text style={styles.kickoffBullet}>•</Text>
              <Ionicons name="time-outline" size={13} color={colors.primaryLight} />
              <Text style={styles.kickoffTime}>{formatTime(fixture.date)}</Text>
            </View>

            {/* Teams VS Section */}
            <View style={styles.teamsSection}>
              {/* Home Team */}
              <View style={styles.teamCol}>
                {fixture.home_team_logo ? (
                  <Image source={{ uri: fixture.home_team_logo }} style={styles.teamLogo} resizeMode="contain" />
                ) : (
                  <View style={styles.teamLogoFallback}>
                    <Ionicons name="shield-outline" size={24} color={colors.textPrimary} />
                  </View>
                )}
                <Text style={styles.teamName} numberOfLines={2}>{fixture.home_team_name}</Text>
                <View style={styles.homeBadge}>
                  <Text style={styles.homeBadgeText}>KANDANG</Text>
                </View>
              </View>

              {/* VS Center */}
              <View style={styles.vsCol}>
                <View style={styles.vsBadge}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
              </View>

              {/* Away Team */}
              <View style={styles.teamCol}>
                {fixture.away_team_logo ? (
                  <Image source={{ uri: fixture.away_team_logo }} style={styles.teamLogo} resizeMode="contain" />
                ) : (
                  <View style={styles.teamLogoFallback}>
                    <Ionicons name="shield-outline" size={24} color={colors.textPrimary} />
                  </View>
                )}
                <Text style={styles.teamName} numberOfLines={2}>{fixture.away_team_name}</Text>
                <View style={styles.awayBadge}>
                  <Text style={styles.awayBadgeText}>TANDANG</Text>
                </View>
              </View>
            </View>

            {/* AI Recommendation Highlight Box */}
            <View style={styles.aiBox}>
              <View style={styles.aiBoxHeader}>
                <Ionicons name="sparkles" size={16} color="#10B981" />
                <Text style={styles.aiBoxTitle}>Rekomendasi Utama AI (Reinforcement Learning)</Text>
              </View>

              <View style={styles.aiPicksRow}>
                {/* Pick 1X2 */}
                <View style={[styles.aiPickCard, fixture.has_value_bet && styles.aiPickCardValue]}>
                  <Text style={styles.aiPickLabel}>REKOMENDASI 1X2</Text>
                  <Text style={styles.aiPickMain}>{ftrPick}</Text>
                  <View style={styles.aiPickBadgeRow}>
                    <Text style={styles.aiPickOdds}>@{ftrOdds}</Text>
                    {fixture.has_value_bet && (
                      <View style={styles.valueTag}>
                        <Ionicons name="diamond" size={10} color="#F59E0B" />
                        <Text style={styles.valueTagText}>BEST VALUE</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Pick O/U */}
                <View style={[styles.aiPickCard, fixture.has_value_bet_ou && styles.aiPickCardValue]}>
                  <Text style={styles.aiPickLabel}>REKOMENDASI O/U 2.5</Text>
                  <Text style={styles.aiPickMain}>{ouPickLong}</Text>
                  <View style={styles.aiPickBadgeRow}>
                    <Text style={styles.aiPickOdds}>@{ouOdds}</Text>
                    {fixture.has_value_bet_ou && (
                      <View style={styles.valueTag}>
                        <Ionicons name="diamond" size={10} color="#F59E0B" />
                        <Text style={styles.valueTagText}>BEST VALUE</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {(fixture.has_value_bet || fixture.has_value_bet_ou) && (
                <View style={styles.valueNotice}>
                  <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
                  <Text style={styles.valueNoticeText}>
                    Peluang kalkulasi AI lebih tinggi dibanding probabilitas implisit bandar (Market Edge).
                  </Text>
                </View>
              )}
            </View>

            {/* Odds Pasar Lengkap */}
            <View style={styles.sectionBlock}>
              <Text style={styles.blockTitle}>ODDS PASAR RESMI</Text>

              {/* 1X2 */}
              <View style={styles.oddsGrid3}>
                <View style={styles.oddsTile}>
                  <Text style={styles.oddsTileLabel}>1 (Home)</Text>
                  <Text style={styles.oddsTileValue}>{fixture.avg_h?.toFixed(2) || '-'}</Text>
                  <Text style={styles.oddsTileProb}>{probH}% AI</Text>
                </View>
                <View style={styles.oddsTile}>
                  <Text style={styles.oddsTileLabel}>X (Seri)</Text>
                  <Text style={styles.oddsTileValue}>{fixture.avg_d?.toFixed(2) || '-'}</Text>
                  <Text style={styles.oddsTileProb}>{probD}% AI</Text>
                </View>
                <View style={styles.oddsTile}>
                  <Text style={styles.oddsTileLabel}>2 (Away)</Text>
                  <Text style={styles.oddsTileValue}>{fixture.avg_a?.toFixed(2) || '-'}</Text>
                  <Text style={styles.oddsTileProb}>{probA}% AI</Text>
                </View>
              </View>

              {/* Over / Under 2.5 */}
              <View style={[styles.oddsGrid2, { marginTop: 10 }]}>
                <View style={styles.oddsTile}>
                  <Text style={styles.oddsTileLabel}>Over 2.5 Gol</Text>
                  <Text style={styles.oddsTileValue}>{fixture.avg_over_25?.toFixed(2) || '-'}</Text>
                  <Text style={styles.oddsTileProb}>{probOver}% AI</Text>
                </View>
                <View style={styles.oddsTile}>
                  <Text style={styles.oddsTileLabel}>Under 2.5 Gol</Text>
                  <Text style={styles.oddsTileValue}>{fixture.avg_under_25?.toFixed(2) || '-'}</Text>
                  <Text style={styles.oddsTileProb}>{probUnder}% AI</Text>
                </View>
              </View>
            </View>

            {/* Probability Breakdown Bar */}
            <View style={styles.sectionBlock}>
              <Text style={styles.blockTitle}>PROBABILITAS HASIL PERTANDINGAN</Text>
              <View style={styles.probLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Home ({probH}%)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#64748B' }]} />
                  <Text style={styles.legendText}>Seri ({probD}%)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.legendText}>Away ({probA}%)</Text>
                </View>
              </View>

              <View style={styles.probBarContainer}>
                <View style={[styles.probBarSegment, { flex: Math.max(1, probH), backgroundColor: colors.primary }]} />
                <View style={[styles.probBarSegment, { flex: Math.max(1, probD), backgroundColor: '#64748B' }]} />
                <View style={[styles.probBarSegment, { flex: Math.max(1, probA), backgroundColor: '#3B82F6' }]} />
              </View>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={() => shareMatchPrediction(fixture)}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social" size={16} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>Bagikan Prediksi</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeActionBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeActionBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#090D1A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  leagueTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  kickoffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E293B50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  kickoffDate: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  kickoffBullet: {
    color: colors.textMuted,
    fontSize: 10,
  },
  kickoffTime: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '800',
  },
  teamsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#090D1A',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamLogo: {
    width: 48,
    height: 48,
  },
  teamLogoFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    minHeight: 32,
  },
  homeBadge: {
    backgroundColor: '#064E3B40',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  homeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  awayBadge: {
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  awayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#818CF8',
  },
  vsCol: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  vsBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  vsText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textMuted,
  },
  aiBox: {
    backgroundColor: '#064E3B15',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#05966950',
    gap: 10,
  },
  aiBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.3,
  },
  aiPicksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  aiPickCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  aiPickCardValue: {
    borderColor: '#F59E0B80',
    backgroundColor: '#F59E0B10',
  },
  aiPickLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  aiPickMain: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  aiPickBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  aiPickOdds: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
  },
  valueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F59E0B25',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  valueTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#F59E0B',
  },
  valueNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B15',
    padding: 8,
    borderRadius: 6,
  },
  valueNoticeText: {
    fontSize: 10,
    color: '#FDE68A',
    flex: 1,
    lineHeight: 14,
  },
  sectionBlock: {
    gap: 8,
  },
  blockTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  oddsGrid3: {
    flexDirection: 'row',
    gap: 8,
  },
  oddsGrid2: {
    flexDirection: 'row',
    gap: 8,
  },
  oddsTile: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  oddsTileLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  oddsTileValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  oddsTileProb: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  probLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  probBarContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  probBarSegment: {
    height: '100%',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: '#090D1A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  shareBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
