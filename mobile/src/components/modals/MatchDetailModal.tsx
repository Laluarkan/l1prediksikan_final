import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Fixture, MatchHistory } from '../../services/api';
import { shareImageFile } from '../../services/shareService';
import { formatWitaFullDate, formatWitaTime } from '../../utils/dateUtils';
import { getTeamLogoUrl, getLeagueLogoUrl } from '../../utils/logo';
import { captureRef } from 'react-native-view-shot';

interface MatchDetailModalProps {
  visible: boolean;
  fixture: Fixture | MatchHistory | null;
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  visible,
  fixture,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const shareCardRef = useRef<any>(null);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  if (!fixture) return null;

  const fullDateLabel = formatWitaFullDate(fixture.date);
  const timeLabel = formatWitaTime(fixture.date);

  const probH = Math.round((fixture.prob_ftr_h || 0.33) * 100);
  const probD = Math.round((fixture.prob_ftr_d || 0.33) * 100);
  const probA = Math.max(0, 100 - probH - probD);

  const probOver = Math.round((fixture.prob_ou25_over || 0.5) * 100);
  const probUnder = Math.max(0, 100 - probOver);

  // 1. Rekomendasi 1X2
  const rawFtr = (fixture.rl_pick_ftr || '').trim().toUpperCase();
  let ftrPick: 'H' | 'D' | 'A';
  if (probH >= probD && probH >= probA) ftrPick = 'H';
  else if (probA >= probH && probA >= probD) ftrPick = 'A';
  else ftrPick = 'D';

  const ftrPickLong = ftrPick === 'H' ? 'HOME WIN' : ftrPick === 'A' ? 'AWAY WIN' : 'DRAW';

  let rawFtrOdds = ftrPick === 'H' ? fixture.avg_h : ftrPick === 'A' ? fixture.avg_a : fixture.avg_d;
  if (!rawFtrOdds || isNaN(rawFtrOdds) || rawFtrOdds <= 1.0) {
    rawFtrOdds = ftrPick === 'H' ? 1.85 : ftrPick === 'A' ? 2.45 : 3.20;
  }
  const ftrOdds = Number(rawFtrOdds).toFixed(2);

  // 2. Rekomendasi O/U
  let ouPickShort: 'O 2.5' | 'U 2.5';
  let ouPickLong: 'OVER 2.5' | 'UNDER 2.5';
  let rawOuOdds: number | undefined;

  if (probOver >= 50) {
    ouPickShort = 'O 2.5';
    ouPickLong = 'OVER 2.5';
    rawOuOdds = fixture.avg_over_25;
  } else {
    ouPickShort = 'U 2.5';
    ouPickLong = 'UNDER 2.5';
    rawOuOdds = fixture.avg_under_25;
  }

  if (!rawOuOdds || isNaN(rawOuOdds) || rawOuOdds <= 1.0) {
    rawOuOdds = ouPickShort === 'O 2.5' ? 1.90 : 1.85;
  }
  const ouOdds = Number(rawOuOdds).toFixed(2);

  // Perbaikan bug Value Bet: hanya jika rl_stake > 0
  const hasValueFtr = typeof fixture.rl_stake_ftr === 'number' && fixture.rl_stake_ftr > 0;
  const hasValueOu = typeof fixture.rl_stake_ou === 'number' && fixture.rl_stake_ou > 0;

  // Resolusi logo resmi liga & tim
  const leagueLogoUrl = getLeagueLogoUrl(
    fixture.league_code,
    fixture.league_name,
    fixture.league_logo,
    fixture.home_team_name
  );
  const homeLogoUrl = getTeamLogoUrl(fixture.home_team_name, fixture.home_team_logo);
  const awayLogoUrl = getTeamLogoUrl(fixture.away_team_name, fixture.away_team_logo);

  // Extended Features (H2H & Statistik)
  const ext = (fixture as any).extended_features || {};
  const h2hHome = ext.h2h_home_wins != null ? Math.round(Number(ext.h2h_home_wins)) : null;
  const h2hDraw = ext.h2h_draws != null ? Math.round(Number(ext.h2h_draws)) : null;
  const h2hAway = ext.h2h_away_wins != null ? Math.round(Number(ext.h2h_away_wins)) : null;
  const hasH2H = h2hHome !== null || h2hDraw !== null || h2hAway !== null;

  const hasStats =
    ext.elo_home != null ||
    ext.home_ppg != null ||
    ext.home_league_pos != null ||
    ext.home_avg_scored != null;

  // Tangkap gambar & bagikan via expo-sharing
  const handleShareAsImage = async () => {
    if (!shareCardRef.current) return;
    try {
      setIsSharing(true);
      await new Promise((resolve) => setTimeout(resolve, 250));
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      await shareImageFile(
        uri,
        `Prediksi ${fixture.home_team_name} vs ${fixture.away_team_name}`
      );
    } catch (err) {
      console.error('Error sharing match prediction image:', err);
      Alert.alert('Gagal Membuat Gambar', 'Tidak dapat memproses snapshot gambar prediksi match.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {/* Header Bar */}
          <View style={[styles.headerBar, { backgroundColor: isDark ? '#090D1A' : '#F1F5F9', borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.leagueLogoWrapper, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
                <Image
                  source={{ uri: leagueLogoUrl }}
                  style={styles.headerLeagueLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.leagueTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {fixture.league_name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* AREA YANG DI-CAPTURE SEBAGAI GAMBAR TIKET PREDIKSI */}
            <View
              ref={shareCardRef}
              collapsable={false}
              style={[
                styles.captureContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {/* Watermark Brand Header (Tampak rapi saat dibagikan) */}
              <View style={[styles.shareBrandingHeader, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.brandRow}>
                  <Ionicons name="football" size={14} color={colors.primary} />
                  <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>PREDIKSIKAN AI</Text>
                  <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>• Analisis & Prediksi Resmi</Text>
                </View>
                <View style={[styles.leaguePill, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                  <Image source={{ uri: leagueLogoUrl }} style={styles.pillLeagueLogo} resizeMode="contain" />
                  <Text style={[styles.pillLeagueText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {fixture.league_name}
                  </Text>
                </View>
              </View>

              {/* Match Kickoff Banner */}
              <View style={[styles.kickoffBanner, { backgroundColor: isDark ? '#1E293B50' : '#F8FAFC', borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.kickoffDate, { color: colors.textSecondary }]}>{fullDateLabel}</Text>
                <Text style={[styles.kickoffBullet, { color: colors.textMuted }]}>•</Text>
                <Ionicons name="time-outline" size={13} color={colors.primary} />
                <Text style={[styles.kickoffTime, { color: colors.primary }]}>{timeLabel}</Text>
              </View>

              {/* Teams VS Section with Logos */}
              <View style={[styles.teamsSection, { backgroundColor: isDark ? '#090D1A' : '#F8FAFC', borderColor: colors.border }]}>
                {/* Home Team */}
                <View style={styles.teamCol}>
                  <View style={[styles.teamLogoBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
                    <Image source={{ uri: homeLogoUrl }} style={styles.teamLogo} resizeMode="contain" />
                  </View>
                  <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {fixture.home_team_name}
                  </Text>
                  <View style={styles.homeBadge}>
                    <Text style={styles.homeBadgeText}>KANDANG</Text>
                  </View>
                </View>

                {/* VS Center or Final Score */}
                <View style={styles.vsCol}>
                  {typeof fixture.fthg === 'number' && typeof fixture.ftag === 'number' ? (
                    <View style={styles.ftScoreBox}>
                      <Text style={styles.ftScoreText}>
                        {fixture.fthg} - {fixture.ftag}
                      </Text>
                      <View style={styles.ftPill}>
                        <Text style={styles.ftPillText}>FULL TIME</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.vsBadge}>
                      <Text style={styles.vsText}>VS</Text>
                    </View>
                  )}
                </View>

                {/* Away Team */}
                <View style={styles.teamCol}>
                  <View style={[styles.teamLogoBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
                    <Image source={{ uri: awayLogoUrl }} style={styles.teamLogo} resizeMode="contain" />
                  </View>
                  <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {fixture.away_team_name}
                  </Text>
                  <View style={styles.awayBadge}>
                    <Text style={styles.awayBadgeText}>TANDANG</Text>
                  </View>
                </View>
              </View>

              {/* AI Recommendation Highlight Box */}
              <View style={[styles.aiBox, { backgroundColor: isDark ? '#0F231D' : '#ECFDF5', borderColor: isDark ? '#05966950' : '#A7F3D0' }]}>
                <View style={styles.aiBoxHeader}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <Text style={[styles.aiBoxTitle, { color: colors.primary }]}>Rekomendasi Utama AI</Text>
                </View>

                <View style={styles.aiPicksRow}>
                  {/* Pick 1X2 */}
                  <View style={[styles.aiPickCard, { backgroundColor: colors.surface, borderColor: hasValueFtr ? '#F59E0B' : colors.border }]}>
                    <Text style={[styles.aiPickLabel, { color: colors.textMuted }]}>REKOMENDASI 1X2</Text>
                    <Text style={[styles.aiPickMain, { color: colors.textPrimary }]}>{ftrPickLong}</Text>
                    <View style={styles.aiPickBadgeRow}>
                      <Text style={[styles.aiPickOdds, { color: colors.primary }]}>@{ftrOdds}</Text>
                      {hasValueFtr && (
                        <View style={styles.valueTag}>
                          <Ionicons name="diamond" size={10} color="#F59E0B" />
                          <Text style={styles.valueTagText}>VALUE BET</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Pick O/U */}
                  <View style={[styles.aiPickCard, { backgroundColor: colors.surface, borderColor: hasValueOu ? '#F59E0B' : colors.border }]}>
                    <Text style={[styles.aiPickLabel, { color: colors.textMuted }]}>REKOMENDASI O/U 2.5</Text>
                    <Text style={[styles.aiPickMain, { color: colors.textPrimary }]}>{ouPickLong}</Text>
                    <View style={styles.aiPickBadgeRow}>
                      <Text style={[styles.aiPickOdds, { color: colors.primary }]}>@{ouOdds}</Text>
                      {hasValueOu && (
                        <View style={styles.valueTag}>
                          <Ionicons name="diamond" size={10} color="#F59E0B" />
                          <Text style={styles.valueTagText}>VALUE BET</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* ================= HEAD-TO-HEAD (H2H) SECTION ================= */}
              {hasH2H && (
                <View style={[styles.sectionBlock, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', borderColor: colors.border }]}>
                  <View style={styles.blockTitleRow}>
                    <Ionicons name="swap-horizontal" size={15} color="#38BDF8" />
                    <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>HEAD-TO-HEAD (H2H)</Text>
                  </View>

                  <View style={styles.h2hColumnsRow}>
                    <View style={styles.h2hCol}>
                      <Text style={[styles.h2hValText, { color: '#38BDF8' }]}>{h2hHome ?? 0}</Text>
                      <Text style={[styles.h2hLabelText, { color: colors.textMuted }]}>Home Wins</Text>
                    </View>
                    <View style={styles.h2hCol}>
                      <Text style={[styles.h2hValText, { color: colors.textSecondary }]}>{h2hDraw ?? 0}</Text>
                      <Text style={[styles.h2hLabelText, { color: colors.textMuted }]}>Draws</Text>
                    </View>
                    <View style={styles.h2hCol}>
                      <Text style={[styles.h2hValText, { color: '#A855F7' }]}>{h2hAway ?? 0}</Text>
                      <Text style={[styles.h2hLabelText, { color: colors.textMuted }]}>Away Wins</Text>
                    </View>
                  </View>

                  {/* Visual H2H Proportion Bar */}
                  {((h2hHome ?? 0) + (h2hDraw ?? 0) + (h2hAway ?? 0)) > 0 && (
                    <View style={styles.h2hBarContainer}>
                      <View style={[styles.h2hBarSegment, { flex: Math.max(1, h2hHome ?? 0), backgroundColor: '#38BDF8' }]} />
                      <View style={[styles.h2hBarSegment, { flex: Math.max(1, h2hDraw ?? 0), backgroundColor: '#94A3B8' }]} />
                      <View style={[styles.h2hBarSegment, { flex: Math.max(1, h2hAway ?? 0), backgroundColor: '#A855F7' }]} />
                    </View>
                  )}
                </View>
              )}

              {/* ================= STATISTIK PERFORMA KLUB ================= */}
              {hasStats && (
                <View style={[styles.sectionBlock, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', borderColor: colors.border }]}>
                  <View style={styles.blockTitleRow}>
                    <Ionicons name="bar-chart-outline" size={15} color={colors.primary} />
                    <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>STATISTIK & PERFORMA TIM</Text>
                  </View>

                  <View style={[styles.statsTable, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    {/* Header Row */}
                    <View style={[styles.statsTableRow, styles.statsTableHeader, { backgroundColor: isDark ? '#090D1A' : '#F1F5F9' }]}>
                      <Text style={[styles.statsTableTh, { color: colors.textPrimary }]} numberOfLines={1}>
                        {fixture.home_team_name}
                      </Text>
                      <Text style={[styles.statsTableParamTh, { color: colors.textMuted }]}>PARAMETER</Text>
                      <Text style={[styles.statsTableTh, { color: colors.textPrimary }]} numberOfLines={1}>
                        {fixture.away_team_name}
                      </Text>
                    </View>

                    {/* Elo Rating */}
                    {ext.elo_home != null && ext.elo_away != null && (
                      <View style={[styles.statsTableRow, { borderTopColor: colors.borderLight }]}>
                        <Text style={[styles.statsTableVal, { color: '#38BDF8' }]}>
                          {Math.round(Number(ext.elo_home))}
                        </Text>
                        <Text style={[styles.statsTableParam, { color: colors.textMuted }]}>Rating Elo</Text>
                        <Text style={[styles.statsTableVal, { color: '#38BDF8' }]}>
                          {Math.round(Number(ext.elo_away))}
                        </Text>
                      </View>
                    )}

                    {/* League Position */}
                    {ext.home_league_pos != null && ext.away_league_pos != null && (
                      <View style={[styles.statsTableRow, { borderTopColor: colors.borderLight }]}>
                        <Text style={[styles.statsTableVal, { color: colors.textPrimary }]}>
                          #{Math.round(Number(ext.home_league_pos))}
                        </Text>
                        <Text style={[styles.statsTableParam, { color: colors.textMuted }]}>Peringkat Klasemen</Text>
                        <Text style={[styles.statsTableVal, { color: colors.textPrimary }]}>
                          #{Math.round(Number(ext.away_league_pos))}
                        </Text>
                      </View>
                    )}

                    {/* Points Per Game (PPG) */}
                    {ext.home_ppg != null && ext.away_ppg != null && (
                      <View style={[styles.statsTableRow, { borderTopColor: colors.borderLight }]}>
                        <Text style={[styles.statsTableVal, { color: colors.primary }]}>
                          {Number(ext.home_ppg).toFixed(2)}
                        </Text>
                        <Text style={[styles.statsTableParam, { color: colors.textMuted }]}>Poin Per Laga (PPG)</Text>
                        <Text style={[styles.statsTableVal, { color: colors.primary }]}>
                          {Number(ext.away_ppg).toFixed(2)}
                        </Text>
                      </View>
                    )}

                    {/* Avg Goals Scored */}
                    {ext.home_avg_scored != null && ext.away_avg_scored != null && (
                      <View style={[styles.statsTableRow, { borderTopColor: colors.borderLight }]}>
                        <Text style={[styles.statsTableVal, { color: colors.textPrimary }]}>
                          {Number(ext.home_avg_scored).toFixed(2)}
                        </Text>
                        <Text style={[styles.statsTableParam, { color: colors.textMuted }]}>Rata-rata Gol Cetak</Text>
                        <Text style={[styles.statsTableVal, { color: colors.textPrimary }]}>
                          {Number(ext.away_avg_scored).toFixed(2)}
                        </Text>
                      </View>
                    )}

                    {/* Win Rate */}
                    {ext.home_win_rate != null && ext.away_win_rate != null && (
                      <View style={[styles.statsTableRow, { borderTopColor: colors.borderLight }]}>
                        <Text style={[styles.statsTableVal, { color: colors.primary }]}>
                          {(Number(ext.home_win_rate) * 100).toFixed(0)}%
                        </Text>
                        <Text style={[styles.statsTableParam, { color: colors.textMuted }]}>Win Rate</Text>
                        <Text style={[styles.statsTableVal, { color: colors.primary }]}>
                          {(Number(ext.away_win_rate) * 100).toFixed(0)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Odds Pasar Lengkap */}
              <View style={[styles.sectionBlock, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', borderColor: colors.border }]}>
                <View style={styles.blockTitleRow}>
                  <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
                  <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>ODDS PASAR RESMI</Text>
                </View>

                {/* 1X2 */}
                <View style={styles.oddsGrid3}>
                  <View style={[styles.oddsTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.oddsTileLabel, { color: colors.textMuted }]}>1 (Home)</Text>
                    <Text style={[styles.oddsTileValue, { color: colors.textPrimary }]}>{fixture.avg_h?.toFixed(2) || '-'}</Text>
                    <Text style={[styles.oddsTileProb, { color: colors.primary }]}>{probH}% AI</Text>
                  </View>
                  <View style={[styles.oddsTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.oddsTileLabel, { color: colors.textMuted }]}>X (Seri)</Text>
                    <Text style={[styles.oddsTileValue, { color: colors.textPrimary }]}>{fixture.avg_d?.toFixed(2) || '-'}</Text>
                    <Text style={[styles.oddsTileProb, { color: colors.textSecondary }]}>{probD}% AI</Text>
                  </View>
                  <View style={[styles.oddsTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.oddsTileLabel, { color: colors.textMuted }]}>2 (Away)</Text>
                    <Text style={[styles.oddsTileValue, { color: colors.textPrimary }]}>{fixture.avg_a?.toFixed(2) || '-'}</Text>
                    <Text style={[styles.oddsTileProb, { color: '#38BDF8' }]}>{probA}% AI</Text>
                  </View>
                </View>

                {/* Over / Under 2.5 */}
                <View style={[styles.oddsGrid2, { marginTop: 8 }]}>
                  <View style={[styles.oddsTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.oddsTileLabel, { color: colors.textMuted }]}>Over 2.5 Gol</Text>
                    <Text style={[styles.oddsTileValue, { color: colors.textPrimary }]}>{fixture.avg_over_25?.toFixed(2) || '-'}</Text>
                    <Text style={[styles.oddsTileProb, { color: colors.primary }]}>{probOver}% AI</Text>
                  </View>
                  <View style={[styles.oddsTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.oddsTileLabel, { color: colors.textMuted }]}>Under 2.5 Gol</Text>
                    <Text style={[styles.oddsTileValue, { color: colors.textPrimary }]}>{fixture.avg_under_25?.toFixed(2) || '-'}</Text>
                    <Text style={[styles.oddsTileProb, { color: colors.textSecondary }]}>{probUnder}% AI</Text>
                  </View>
                </View>
              </View>

              {/* Watermark Footer in Image */}
              <View style={[styles.shareCardFooter, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.watermarkText, { color: colors.textMuted }]}>
                  Dianalisis oleh Antigravity AI Engine • https://www.l1prediksikan.my.id
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Buttons */}
          <View style={[styles.bottomBar, { backgroundColor: isDark ? '#090D1A' : '#F1F5F9', borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.primary }]}
              onPress={handleShareAsImage}
              activeOpacity={0.8}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.shareBtnText}>Bagikan Gambar Prediksi</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeActionBtn, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={isSharing}
            >
              <Text style={[styles.closeActionBtnText, { color: colors.textSecondary }]}>Tutup</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  leagueLogoWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 2,
  },
  headerLeagueLogo: {
    width: '100%',
    height: '100%',
  },
  leagueTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 12,
  },
  captureContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  shareBrandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '500',
  },
  leaguePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillLeagueLogo: {
    width: 12,
    height: 12,
  },
  pillLeagueText: {
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 110,
  },
  kickoffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  kickoffDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  kickoffBullet: {
    fontSize: 10,
  },
  kickoffTime: {
    fontSize: 11,
    fontWeight: '800',
  },
  teamsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamLogoBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  teamLogo: {
    width: '100%',
    height: '100%',
  },
  teamName: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    minHeight: 30,
  },
  homeBadge: {
    backgroundColor: '#38BDF820',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#38BDF840',
  },
  homeBadgeText: {
    color: '#0284C7',
    fontSize: 9,
    fontWeight: '800',
  },
  awayBadge: {
    backgroundColor: '#A855F720',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A855F740',
  },
  awayBadgeText: {
    color: '#7E22CE',
    fontSize: 9,
    fontWeight: '800',
  },
  vsCol: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  vsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  ftScoreBox: {
    alignItems: 'center',
    gap: 4,
  },
  ftScoreText: {
    color: '#10B981',
    fontWeight: '900',
    fontSize: 18,
  },
  ftPill: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ftPillText: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: '800',
  },
  aiBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  aiBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  aiPicksRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aiPickCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  aiPickLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aiPickMain: {
    fontSize: 13,
    fontWeight: '900',
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
  },
  valueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  valueTagText: {
    color: '#F59E0B',
    fontSize: 8,
    fontWeight: '900',
  },
  sectionBlock: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  h2hColumnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
  },
  h2hCol: {
    alignItems: 'center',
    gap: 2,
  },
  h2hValText: {
    fontSize: 20,
    fontWeight: '900',
  },
  h2hLabelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  h2hBarContainer: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  h2hBarSegment: {
    height: '100%',
  },
  statsTable: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statsTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
  },
  statsTableHeader: {
    borderTopWidth: 0,
    paddingVertical: 6,
  },
  statsTableTh: {
    flex: 1.4,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  statsTableParamTh: {
    flex: 1.8,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statsTableVal: {
    flex: 1.4,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  statsTableParam: {
    flex: 1.8,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
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
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  oddsTileLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  oddsTileValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  oddsTileProb: {
    fontSize: 10,
    fontWeight: '700',
  },
  shareCardFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  watermarkText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  closeActionBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  closeActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
