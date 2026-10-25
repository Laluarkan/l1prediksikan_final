import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { ParlayTicket, fetchParlayTickets, getCurrentSeason } from '../services/api';
import { shareImageFile } from '../services/shareService';
import { captureRef } from 'react-native-view-shot';
import { getTeamLogoUrl, getLeagueLogoUrl } from '../utils/logo';

// Helper pemilah tim & logo untuk kaki parlay
const parseLegMatch = (leg: any) => {
  const matchTitle = leg.match_name || leg.match || 'Pertandingan';
  const parts = matchTitle.split(/\s+(?:vs\.?|v|-)\s+/i);
  const homeTeam = parts[0]?.trim() || matchTitle;
  const awayTeam = parts[1]?.trim() || '';
  const homeLogo = getTeamLogoUrl(homeTeam);
  const awayLogo = awayTeam ? getTeamLogoUrl(awayTeam) : null;
  const leagueLogo = getLeagueLogoUrl(leg.league_code, leg.league_name, null, homeTeam);
  return { matchTitle, homeTeam, awayTeam, homeLogo, awayLogo, leagueLogo };
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRESET_STAKES = [10000, 25000, 50000, 100000];

export const ParlayScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const defaultSeason = getCurrentSeason(); // Musim saat ini (misal '26/27')

  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [tickets, setTickets] = useState<ParlayTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stake, setStake] = useState<number>(10000);
  const [ticketToShare, setTicketToShare] = useState<ParlayTicket | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const shareCardRef = useRef<any>(null);

  // Filter & Musim untuk Riwayat Parlay
  const [selectedSeason, setSelectedSeason] = useState<string>(defaultSeason);
  const [filterResult, setFilterResult] = useState<'ALL' | 'WON' | 'LOST'>('ALL');
  const [filterFold, setFilterFold] = useState<'ALL' | '3' | '4' | '5+'>('ALL');
  const [isSeasonModalVisible, setIsSeasonModalVisible] = useState<boolean>(false);

  // Generate daftar musim yang tersedia (dari musim terkini mundur sampai 2021/2022)
  const availableSeasons = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const startYear = 2021;
    const latestStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;

    const seasons: { id: string; label: string }[] = [];
    for (let y = latestStartYear; y >= startYear; y--) {
      const y1 = y.toString().slice(-2);
      const y2 = (y + 1).toString().slice(-2);
      const id = `${y1}/${y2}`;
      const isCurrent = id === defaultSeason;
      seasons.push({
        id,
        label: isCurrent ? `20${y1}/20${y2} (Musim Ini)` : `20${y1}/20${y2}`,
      });
    }
    seasons.push({ id: 'ALL', label: 'Semua Musim' });
    return seasons;
  }, [defaultSeason]);

  const seasonDisplayLabel = useMemo(() => {
    if (selectedSeason === 'ALL') return 'Semua Musim';
    const parts = selectedSeason.split('/');
    return parts.length === 2 ? `20${parts[0]}/20${parts[1]}` : selectedSeason;
  }, [selectedSeason]);

  const handleShareTicketAsImage = (ticket: ParlayTicket) => {
    setTicketToShare(ticket);
  };

  const captureAndShare = async () => {
    if (!shareCardRef.current || !ticketToShare) return;
    try {
      setIsCapturing(true);
      // Tunggu layout ter-render dengan sempurna
      await new Promise((resolve) => setTimeout(resolve, 250));
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      await shareImageFile(uri, `Tiket Parlay #${ticketToShare.ticket_id || ticketToShare.id}`);
    } catch (error) {
      console.error('Gagal mengambil snapshot tiket parlay:', error);
      Alert.alert('Gagal Membuat Gambar', 'Tidak dapat mengambil snapshot tiket parlay.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Otomatis memicu share dialog saat modal tiket parlay terbuka
  useEffect(() => {
    if (ticketToShare) {
      const timer = setTimeout(() => {
        captureAndShare();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [ticketToShare]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const isHistorical = activeTab === 'history';
      const data = await fetchParlayTickets({
        is_historical: isHistorical,
        season: isHistorical ? (selectedSeason !== 'ALL' ? selectedSeason : undefined) : undefined,
        filter_result: isHistorical && filterResult !== 'ALL' ? filterResult : undefined,
        search: searchQuery.trim() || undefined,
      });
      setTickets(data);
    } catch (err) {
      console.error('Error fetching parlays:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, selectedSeason, filterResult, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSearchSubmit = () => {
    loadData();
  };

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const formatCurrency = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatLegKickoff = (dateStr?: string, fallbackDateStr?: string) => {
    const target = dateStr || fallbackDateStr;
    if (!target) return '';
    try {
      const d = new Date(target);
      if (isNaN(d.getTime())) return '';
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      if (target.includes(':') || target.includes('T')) {
        return `${h}:${m} WIB`;
      }
      return `${d.getDate()} ${d.toLocaleDateString('id-ID', { month: 'short' })}`;
    } catch {
      return '';
    }
  };

  // Filter client-side untuk status hasil (Menang/Kalah), fold count, dan musim
  const displayedTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (activeTab === 'history') {
        // 1. Filter Status Hasil (Menang / Kalah)
        if (filterResult === 'WON' && ticket.is_won !== true) return false;
        if (filterResult === 'LOST' && ticket.is_won !== false) return false;

        // 2. Filter Fold Count
        if (filterFold !== 'ALL') {
          const count = (ticket.legs_details || []).length;
          if (filterFold === '3' && count !== 3) return false;
          if (filterFold === '4' && count !== 4) return false;
          if (filterFold === '5+' && count < 5) return false;
        }

        // 3. Filter Musim (client-side safety)
        if (selectedSeason !== 'ALL' && ticket.date) {
          const [y1, y2] = selectedSeason.split('/');
          if (y1 && y2) {
            const startYear = 2000 + parseInt(y1, 10);
            const endYear = 2000 + parseInt(y2, 10);
            const tDate = new Date(ticket.date);
            const start = new Date(startYear, 6, 1);
            const end = new Date(endYear, 5, 30, 23, 59, 59);
            if (tDate < start || tDate > end) return false;
          }
        }
      }
      return true;
    });
  }, [tickets, activeTab, filterResult, filterFold, selectedSeason]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Info & Tab Switcher */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.tabSwitcher, { backgroundColor: isDark ? '#1E293B' : colors.surfaceLight, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'upcoming' && [styles.activeTabButton, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: colors.border }],
            ]}
            onPress={() => {
              setActiveTab('upcoming');
              setExpandedId(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="sparkles"
              size={15}
              color={activeTab === 'upcoming' ? '#10B981' : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'upcoming' && [styles.activeTabText, { color: colors.textPrimary }]]}>
              Tiket Mendatang
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'history' && [styles.activeTabButton, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: colors.border }],
            ]}
            onPress={() => {
              setActiveTab('history');
              setExpandedId(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="time"
              size={15}
              color={activeTab === 'history' ? '#38BDF8' : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'history' && [styles.activeTabText, { color: colors.textPrimary }]]}>
              Riwayat Selesai
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stake Calculator Quick Controls (for Upcoming) */}
        {activeTab === 'upcoming' && (
          <View style={[styles.stakeBar, { backgroundColor: isDark ? '#1E293B70' : colors.surfaceLight, borderColor: colors.border }]}>
            <View style={styles.stakeBarLeft}>
              <Ionicons name="calculator-outline" size={15} color={colors.primaryLight} />
              <Text style={[styles.stakeLabel, { color: colors.textSecondary }]}>Simulasi Stake:</Text>
            </View>
            <View style={styles.presetChips}>
              {PRESET_STAKES.map((amt) => {
                const isSelected = stake === amt;
                return (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.presetChip,
                      { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: colors.border },
                      isSelected && styles.presetChipActive,
                    ]}
                    onPress={() => setStake(amt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                      {amt >= 1000 ? `${amt / 1000}k` : amt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Filter Controls (for History) */}
        {activeTab === 'history' && (
          <View style={styles.historyFilterBox}>
            {/* Baris 1: Status Hasil & Tombol Pilihan Musim */}
            <View style={styles.historyFilterRow}>
              {/* Status Hasil: Semua / Menang / Kalah */}
              <View style={[styles.statusFilterGroup, { backgroundColor: isDark ? '#1E293B' : colors.surfaceLight, borderColor: colors.border }]}>
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'WON', label: 'Menang' },
                  { id: 'LOST', label: 'Kalah' },
                ].map((st) => {
                  const isSelected = filterResult === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.statusFilterPill,
                        isSelected && [styles.statusFilterPillActive, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: colors.border }],
                        isSelected && st.id === 'WON' && styles.statusFilterPillWin,
                        isSelected && st.id === 'LOST' && styles.statusFilterPillLose,
                      ]}
                      onPress={() => setFilterResult(st.id as any)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.statusFilterText,
                          isSelected && [styles.statusFilterTextActive, { color: colors.textPrimary }],
                        ]}
                      >
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tombol Pilih Musim */}
              <TouchableOpacity
                style={[
                  styles.seasonPickerBtn,
                  {
                    backgroundColor: isDark ? '#1E293B' : colors.surfaceLight,
                    borderColor: isDark ? '#3B82F660' : '#BFDBFE',
                  },
                ]}
                onPress={() => setIsSeasonModalVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={13} color="#60A5FA" />
                <Text style={styles.seasonPickerText}>{seasonDisplayLabel}</Text>
                <Ionicons name="chevron-down" size={13} color="#60A5FA" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search Input */}
        <View style={[styles.searchRow, { backgroundColor: isDark ? '#1E293B' : colors.surfaceLight, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={activeTab === 'upcoming' ? "Cari tim atau laga dalam parlay..." : "Cari tim, ID parlay, atau laga..."}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                loadData();
              }}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Ticket List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat rekomendasi tiket parlay AI...</Text>
        </View>
      ) : displayedTickets.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <View style={styles.emptyIconCircle}>
            <Ionicons name="ticket-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'upcoming'
              ? 'Belum Ada Tiket Parlay Mendatang'
              : 'Tidak Ada Riwayat Parlay'}
          </Text>
          <Text style={styles.emptyDesc}>
            {activeTab === 'upcoming'
              ? 'Model AI sedang mengalkulasi probabilitas gabungan untuk pertandingan putaran berikutnya.'
              : `Belum ada riwayat tiket parlay untuk ${seasonDisplayLabel} dengan filter yang dipilih.`}
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.refreshBtnText}>Muat Ulang</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.ticketList}
          contentContainerStyle={styles.ticketListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {displayedTickets.map((ticket) => {
            const isExpanded = expandedId === ticket.id;
            const legs = ticket.legs_details || [];
            const totalOdds = Number(ticket.total_odds || 0);
            const totalProb = Number(ticket.total_prob || 0);
            const potentialWin = stake * totalOdds;

            let statusBadge: {
              text: string;
              bg: string;
              border: string;
              color: string;
              icon: keyof typeof Ionicons.glyphMap;
            } = {
              text: 'Mendatang',
              bg: '#064E3B40',
              border: '#05966950',
              color: '#10B981',
              icon: 'hourglass-outline',
            };

            if (ticket.is_won === true) {
              statusBadge = {
                text: 'PARLAY WON',
                bg: '#065F4640',
                border: '#10B981',
                color: '#34D399',
                icon: 'checkmark-circle',
              };
            } else if (ticket.is_won === false) {
              statusBadge = {
                text: 'PARLAY LOST',
                bg: '#7F1D1D30',
                border: '#EF444460',
                color: '#F87171',
                icon: 'close-circle',
              };
            }

            return (
              <View key={ticket.id} style={[styles.ticketCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Header Ticket */}
                <TouchableOpacity
                  style={[
                    styles.ticketHeader,
                    {
                      backgroundColor: isDark ? '#0F172A50' : colors.surfaceLight,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => toggleExpand(ticket.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.ticketHeaderLeft}>
                    <View style={styles.ticketIdRow}>
                      <Ionicons name="ticket" size={16} color={colors.primary} />
                      <Text style={[styles.ticketIdText, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                        #{ticket.ticket_id || `PARLAY-${ticket.id}`}
                      </Text>
                    </View>
                    <View style={styles.ticketMetaRow}>
                      <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                      <Text style={styles.ticketDateText}>{formatDate(ticket.date)}</Text>
                      <Text style={styles.metaBullet}>•</Text>
                      <Text style={styles.ticketDateText}>{legs.length || 3} Laga</Text>
                    </View>
                  </View>

                  <View style={styles.ticketHeaderRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusBadge.bg, borderColor: statusBadge.border },
                      ]}
                    >
                      <Ionicons name={statusBadge.icon} size={11} color={statusBadge.color} />
                      <Text style={[styles.statusText, { color: statusBadge.color }]}>
                        {statusBadge.text}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Metrics Summary Strip */}
                <View
                  style={[
                    styles.metricsStrip,
                    {
                      backgroundColor: isDark ? '#1E293B30' : (isDark ? '#1E293B' : '#F1F5F9'),
                    },
                  ]}
                >
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Total Odds</Text>
                    <Text style={styles.metricValueOdds}>@{totalOdds.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Probabilitas AI</Text>
                    <Text style={styles.metricValueProb}>
                      {((Number(totalProb) || 0) * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Estimasi Return</Text>
                    <Text style={styles.metricValueWin}>{formatCurrency(potentialWin)}</Text>
                  </View>
                </View>

                {/* Accordion Legs Details */}
                {isExpanded && (
                  <View
                    style={[
                      styles.legsContainer,
                      {
                        backgroundColor: isDark ? '#0F172A30' : colors.surfaceLight,
                        borderTopColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.legsHeaderRow}>
                      <Text style={styles.legsHeaderTitle}>KOMBINASI PERTANDINGAN ({legs.length})</Text>
                      <TouchableOpacity
                        style={[
                          styles.shareBtn,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => handleShareTicketAsImage(ticket)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="image-outline" size={13} color={colors.primaryLight} />
                        <Text style={styles.shareBtnText}>Bagikan Gambar</Text>
                      </TouchableOpacity>
                    </View>

                    {legs.length === 0 ? (
                      <Text style={styles.emptyLegsText}>Rincian laga tidak tersedia.</Text>
                    ) : (
                      legs.map((leg, idx) => {
                        const { homeTeam, awayTeam, homeLogo, awayLogo, leagueLogo } = parseLegMatch(leg);

                        let legStatusIcon = (
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                        );
                        if (leg.is_won === true) {
                          legStatusIcon = (
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                          );
                        } else if (leg.is_won === false) {
                          legStatusIcon = (
                            <Ionicons name="close-circle" size={14} color="#EF4444" />
                          );
                        }

                        return (
                          <View key={idx} style={[styles.legCard, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: colors.borderLight }]}>
                            {/* Index */}
                            <View style={[styles.legIndexCircle, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                              <Text style={[styles.legIndexText, { color: colors.textSecondary }]}>{idx + 1}</Text>
                            </View>

                            {/* Logo Liga di sebelah kiri */}
                            <View style={[styles.legLeagueBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
                              <Image source={{ uri: leagueLogo }} style={styles.legLeagueLogo} resizeMode="contain" />
                            </View>

                            {/* Batas pemisah vertikal */}
                            <View style={[styles.legVerticalDivider, { backgroundColor: colors.borderLight }]} />

                            {/* Detail Tim & Rekomendasi di sebelah kanan batas */}
                            <View style={styles.legContent}>
                              <View style={styles.legTeamsRow}>
                                <View style={styles.teamMiniItem}>
                                  <View style={[styles.teamMiniLogoBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
                                    <Image source={{ uri: homeLogo }} style={styles.teamMiniLogo} resizeMode="contain" />
                                  </View>
                                  <Text style={[styles.teamMiniName, { color: colors.textPrimary }]} numberOfLines={1}>
                                    {homeTeam}
                                  </Text>
                                </View>

                                <Text style={[styles.vsMiniText, { color: colors.textMuted }]}>vs</Text>

                                <View style={styles.teamMiniItem}>
                                  {awayLogo && (
                                    <View style={[styles.teamMiniLogoBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
                                      <Image source={{ uri: awayLogo }} style={styles.teamMiniLogo} resizeMode="contain" />
                                    </View>
                                  )}
                                  <Text style={[styles.teamMiniName, { color: colors.textPrimary }]} numberOfLines={1}>
                                    {awayTeam}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.legMetaRow}>
                                <View style={styles.pickBadge}>
                                  <Text style={styles.pickBadgeText}>
                                    Pilihan: {leg.pick.toUpperCase()}
                                  </Text>
                                </View>
                                <Text style={[styles.legOddsText, { color: colors.primary }]}>@{Number(leg.odds).toFixed(2)}</Text>
                                <View style={styles.legTimePill}>
                                  <Ionicons name="time-outline" size={10} color={colors.primary} />
                                  <Text style={styles.legTimeText}>{formatLegKickoff(leg.date, ticket.date)}</Text>
                                </View>
                              </View>
                            </View>

                            <View style={styles.legStatusWrapper}>{legStatusIcon}</View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* MODAL PREVIEW & SHARE GAMBAR SLIP PARLAY */}
      <Modal
        visible={!!ticketToShare}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isCapturing) setTicketToShare(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardWrapper}>
            {/* Action Bar Above Preview */}
            <View style={styles.modalTopBar}>
              <View style={styles.modalTopBarLeft}>
                <Ionicons name="image" size={18} color={colors.primaryLight} />
                <Text style={styles.modalTitle}>Preview Gambar Tiket</Text>
              </View>
              <TouchableOpacity
                onPress={() => setTicketToShare(null)}
                style={styles.modalCloseIconBtn}
                disabled={isCapturing}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Container containing the captured slip card */}
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {ticketToShare && (
                <View
                  ref={shareCardRef}
                  collapsable={false}
                  style={styles.slipCard}
                >
                  {/* Slip Header with Logo & Brand */}
                  <View style={styles.slipHeader}>
                    <Image
                      source={require('../../assets/logo.png')}
                      style={styles.slipLogo}
                      resizeMode="contain"
                    />
                    <View style={styles.slipBrandCol}>
                      <Text style={styles.slipBrandTitle}>PREDIKSIKAN</Text>
                      <Text style={styles.slipBrandSubtitle}>AI PARLAY RECOMMENDATION SLIP</Text>
                    </View>
                    <View
                      style={[
                        styles.slipStatusBadge,
                        ticketToShare.is_won === true
                          ? styles.slipStatusWon
                          : ticketToShare.is_won === false
                          ? styles.slipStatusLost
                          : styles.slipStatusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.slipStatusText,
                          ticketToShare.is_won === true
                            ? styles.slipStatusTextWon
                            : ticketToShare.is_won === false
                            ? styles.slipStatusTextLost
                            : styles.slipStatusTextPending,
                        ]}
                      >
                        {ticketToShare.is_won === true
                          ? 'PARLAY WON'
                          : ticketToShare.is_won === false
                          ? 'PARLAY LOST'
                          : 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  {/* Slip Ticket Meta (Tanpa badge 4-Fold agar tidak menimpa ID tiket) */}
                  <View style={styles.slipMetaRow}>
                    <View style={styles.slipMetaLeft}>
                      <Ionicons name="ticket" size={14} color={colors.primaryLight} />
                      <Text style={styles.slipTicketId} numberOfLines={1} ellipsizeMode="tail">
                        #{ticketToShare.ticket_id || `PARLAY-${ticketToShare.id}`}
                      </Text>
                    </View>
                    <View style={styles.slipMetaRight}>
                      <Text style={styles.slipDateText}>{formatDate(ticketToShare.date)}</Text>
                    </View>
                  </View>

                  {/* Slip Metrics Box (Probabilitas AI Rapi & Seimbang) */}
                  <View style={styles.slipMetricsBox}>
                    <View style={styles.slipMetricItem}>
                      <Text style={styles.slipMetricLabel} numberOfLines={1}>TOTAL ODDS</Text>
                      <Text style={styles.slipMetricOdds}>
                        @{Number(ticketToShare.total_odds || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.slipMetricDivider} />
                    <View style={styles.slipMetricItemMiddle}>
                      <Text style={styles.slipMetricLabel} numberOfLines={1}>PROBABILITAS AI</Text>
                      <Text style={styles.slipMetricProb}>
                        {((Number(ticketToShare.total_prob) || 0) * 100).toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.slipMetricDivider} />
                    <View style={styles.slipMetricItem}>
                      <Text style={styles.slipMetricLabel} numberOfLines={1}>TOTAL LAGA</Text>
                      <Text style={styles.slipMetricLegs}>
                        {(ticketToShare.legs_details || []).length} Match
                      </Text>
                    </View>
                  </View>

                  {/* Slip Matches List dengan Jam Bermain */}
                  <View style={styles.slipLegsContainer}>
                    <Text style={styles.slipLegsTitle}>DETAIL KOMBINASI PERTANDINGAN</Text>
                    {(ticketToShare.legs_details || []).map((leg, idx) => {
                      const { homeTeam, awayTeam, homeLogo, awayLogo, leagueLogo } = parseLegMatch(leg);
                      return (
                        <View key={idx} style={styles.slipLegRow}>
                          <View style={styles.slipLegIndex}>
                            <Text style={styles.slipLegIndexText}>{idx + 1}</Text>
                          </View>

                          {/* Logo Liga di sebelah kiri */}
                          <View style={[styles.legLeagueBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
                            <Image source={{ uri: leagueLogo }} style={styles.legLeagueLogo} resizeMode="contain" />
                          </View>

                          {/* Batas pemisah vertikal */}
                          <View style={[styles.legVerticalDivider, { backgroundColor: '#334155' }]} />

                          <View style={styles.slipLegMain}>
                            <View style={styles.legTeamsRow}>
                              <View style={styles.teamMiniItem}>
                                <View style={[styles.teamMiniLogoBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
                                  <Image source={{ uri: homeLogo }} style={styles.teamMiniLogo} resizeMode="contain" />
                                </View>
                                <Text style={styles.slipLegMatch} numberOfLines={1}>
                                  {homeTeam}
                                </Text>
                              </View>

                              <Text style={styles.vsMiniText}>vs</Text>

                              <View style={styles.teamMiniItem}>
                                {awayLogo && (
                                  <View style={[styles.teamMiniLogoBox, { backgroundColor: colors.logoBackdrop, borderColor: colors.logoBorder }]}>
                                    <Image source={{ uri: awayLogo }} style={styles.teamMiniLogo} resizeMode="contain" />
                                  </View>
                                )}
                                <Text style={styles.slipLegMatch} numberOfLines={1}>
                                  {awayTeam}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.slipLegMeta}>
                              <View style={styles.slipPickBadge}>
                                <Text style={styles.slipPickText}>
                                  {leg.pick.toUpperCase()}
                                </Text>
                              </View>
                              <Text style={styles.slipOddsText}>@{Number(leg.odds).toFixed(2)}</Text>
                              <View style={styles.slipTimeBadge}>
                                <Ionicons name="time-outline" size={10} color={colors.primaryLight} />
                                <Text style={styles.slipTimeText}>
                                  {formatLegKickoff(leg.date, ticketToShare.date)}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.slipLegResult}>
                            {leg.is_won === true ? (
                              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            ) : leg.is_won === false ? (
                              <Ionicons name="close-circle" size={16} color="#EF4444" />
                            ) : (
                              <Ionicons name="hourglass-outline" size={14} color="#10B981" />
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Slip Watermark Footer */}
                  <View style={styles.slipFooter}>
                    <View style={styles.slipFooterLeft}>
                      <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                      <Text style={styles.slipFooterBrand}>Dianalisis oleh AI Prediksikan</Text>
                    </View>
                    <Text style={styles.slipFooterUrl}>prediksikan.my.id</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Action Buttons */}
            <View style={styles.modalBottomBar}>
              <TouchableOpacity
                style={[styles.modalShareBtn, isCapturing && styles.modalShareBtnDisabled]}
                onPress={captureAndShare}
                disabled={isCapturing}
                activeOpacity={0.8}
              >
                {isCapturing ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.modalShareBtnText}>Memproses Gambar...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="share-social" size={16} color="#FFFFFF" />
                    <Text style={styles.modalShareBtnText}>Bagikan Gambar</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTicketToShare(null)}
                disabled={isCapturing}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Pilihan Musim Riwayat Parlay */}
      <Modal
        visible={isSeasonModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSeasonModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.seasonModalOverlay}
          activeOpacity={1}
          onPress={() => setIsSeasonModalVisible(false)}
        >
          <View
            style={[
              styles.seasonModalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.seasonModalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.seasonModalTitleRow}>
                <Ionicons name="calendar" size={18} color="#60A5FA" />
                <Text style={[styles.seasonModalTitle, { color: colors.textPrimary }]}>Pilih Musim Riwayat</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSeasonModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.seasonModalList} showsVerticalScrollIndicator={false}>
              {availableSeasons.map((s) => {
                const isSelected = selectedSeason === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.seasonModalItem,
                      { backgroundColor: isDark ? '#1E293B30' : colors.surfaceLight },
                      isSelected && styles.seasonModalItemActive,
                    ]}
                    onPress={() => {
                      setSelectedSeason(s.id);
                      setIsSeasonModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.seasonModalItemLeft}>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? '#3B82F6' : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.seasonModalItemText,
                          isSelected && styles.seasonModalItemTextActive,
                        ]}
                      >
                        {s.label}
                      </Text>
                    </View>
                    {s.id === defaultSeason && (
                      <View style={styles.currentSeasonBadge}>
                        <Text style={styles.currentSeasonBadgeText}>SAAT INI</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  historyFilterBox: {
    gap: 8,
  },
  historyFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusFilterGroup: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 7,
  },
  statusFilterPillActive: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusFilterPillWin: {
    backgroundColor: '#064E3B50',
    borderColor: '#10B981',
  },
  statusFilterPillLose: {
    backgroundColor: '#7F1D1D40',
    borderColor: '#EF4444',
  },
  statusFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusFilterTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  seasonPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B82F660',
  },
  seasonPickerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
  },
  horizontalChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 7,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPillActive: {
    backgroundColor: '#2563EB25',
    borderColor: '#3B82F6',
  },
  chipPillSeasonActive: {
    backgroundColor: '#064E3B30',
    borderColor: '#10B981',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  chipTextSeasonActive: {
    color: '#34D399',
    fontWeight: '700',
  },
  chipDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#334155',
    marginHorizontal: 2,
  },
  seasonModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  seasonModalCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '75%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    elevation: 10,
  },
  seasonModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 8,
  },
  seasonModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seasonModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  seasonModalList: {
    maxHeight: 280,
  },
  seasonModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#1E293B30',
  },
  seasonModalItemActive: {
    backgroundColor: '#2563EB20',
    borderWidth: 1,
    borderColor: '#3B82F660',
  },
  seasonModalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seasonModalItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  seasonModalItemTextActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  currentSeasonBadge: {
    backgroundColor: '#10B98125',
    borderWidth: 1,
    borderColor: '#10B98160',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  currentSeasonBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  stakeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B70',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stakeBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stakeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  presetChips: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  presetTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 7,
    fontSize: 13,
    color: colors.textPrimary,
  },
  clearBtn: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ticketList: {
    flex: 1,
  },
  ticketListContent: {
    padding: 14,
    gap: 14,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#0F172A50',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ticketHeaderLeft: {
    flex: 1,
    marginRight: 8,
    gap: 4,
    justifyContent: 'center',
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketIdText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaBullet: {
    fontSize: 10,
    color: colors.textMuted,
  },
  legCountBadge: {
    backgroundColor: '#2563EB25',
    borderWidth: 1,
    borderColor: '#3B82F650',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  legCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
  },
  ticketDateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ticketHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#1E293B30',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  metricValueOdds: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F59E0B',
  },
  metricValueProb: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  metricValueWin: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
  },
  legsContainer: {
    padding: 14,
    backgroundColor: '#0F172A30',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  legsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  legsHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  emptyLegsText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  legCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    gap: 8,
  },
  legIndexCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  legLeagueBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  legLeagueLogo: {
    width: '100%',
    height: '100%',
  },
  legVerticalDivider: {
    width: 1.5,
    height: 32,
    marginHorizontal: 2,
  },
  legContent: {
    flex: 1,
    gap: 4,
  },
  legTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  teamMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '45%',
  },
  teamMiniLogoBox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1.5,
  },
  teamMiniLogo: {
    width: '100%',
    height: '100%',
  },
  teamMiniName: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  vsMiniText: {
    fontSize: 10,
    fontWeight: '700',
  },
  legTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  legMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickBadge: {
    backgroundColor: '#064E3B40',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pickBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  legOddsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  legStatusWrapper: {
    marginLeft: 4,
  },

  // STYLES UNTUK MODAL & GAMBAR SLIP PARLAY
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCardWrapper: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  modalTopBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseIconBtn: {
    padding: 4,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  slipCard: {
    width: '100%',
    backgroundColor: '#090D1A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#10B98140',
    padding: 16,
    gap: 12,
  },
  slipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  slipLogo: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  slipBrandCol: {
    flex: 1,
    marginLeft: 10,
  },
  slipBrandTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  slipBrandSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  slipStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  slipStatusWon: {
    backgroundColor: '#065F4640',
    borderColor: '#10B981',
  },
  slipStatusLost: {
    backgroundColor: '#7F1D1D30',
    borderColor: '#EF444460',
  },
  slipStatusPending: {
    backgroundColor: '#064E3B40',
    borderColor: '#05966950',
  },
  slipStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  slipStatusTextWon: {
    color: '#34D399',
  },
  slipStatusTextLost: {
    color: '#F87171',
  },
  slipStatusTextPending: {
    color: '#10B981',
  },
  slipMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131D33',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  slipMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 10,
  },
  slipTicketId: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  slipMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slipDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  slipMetricsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B40',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  slipMetricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  slipMetricItemMiddle: {
    flex: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  slipMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  slipMetricLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  slipMetricOdds: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F59E0B',
  },
  slipMetricProb: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
  },
  slipMetricLegs: {
    fontSize: 14,
    fontWeight: '900',
    color: '#38BDF8',
  },
  slipLegsContainer: {
    gap: 8,
  },
  slipLegsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  slipLegRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 8,
  },
  slipLegIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slipLegIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  slipLegMain: {
    flex: 1,
    gap: 3,
  },
  slipLegTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  slipLegMatch: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  slipTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1E293B',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  slipTimeText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  slipLegMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slipPickBadge: {
    backgroundColor: '#064E3B40',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  slipPickText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  slipOddsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  slipLegResult: {
    marginLeft: 2,
  },
  slipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  slipFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slipFooterBrand: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  slipFooterUrl: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  modalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  modalShareBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalShareBtnDisabled: {
    opacity: 0.7,
  },
  modalShareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
