import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { ParlayTicket, fetchParlayTickets } from '../services/api';
import { shareParlayTicket } from '../services/shareService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRESET_STAKES = [10000, 25000, 50000, 100000];

export const ParlayScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [tickets, setTickets] = useState<ParlayTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stake, setStake] = useState<number>(25000);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const isHistorical = activeTab === 'history';
      const data = await fetchParlayTickets({
        is_historical: isHistorical,
        search: searchQuery.trim() || undefined,
      });
      setTickets(data);
    } catch (err) {
      console.error('Error fetching parlays:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

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

  return (
    <View style={styles.container}>
      {/* Header Info & Tab Switcher */}
      <View style={styles.topBar}>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'upcoming' && styles.activeTabButton]}
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
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
              Tiket Mendatang
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
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
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              Riwayat Selesai
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stake Calculator Quick Controls (for Upcoming) */}
        {activeTab === 'upcoming' && (
          <View style={styles.stakeBar}>
            <View style={styles.stakeBarLeft}>
              <Ionicons name="calculator-outline" size={15} color={colors.primaryLight} />
              <Text style={styles.stakeLabel}>Simulasi Stake:</Text>
            </View>
            <View style={styles.presetChips}>
              {PRESET_STAKES.map((amt) => {
                const isSelected = stake === amt;
                return (
                  <TouchableOpacity
                    key={amt}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
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

        {/* Search Input */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari tim atau laga dalam parlay..."
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
      ) : tickets.length === 0 ? (
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
              : 'Belum ada tiket parlay yang selesai dievaluasi.'}
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
          {tickets.map((ticket) => {
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
              <View key={ticket.id} style={styles.ticketCard}>
                {/* Header Ticket */}
                <TouchableOpacity
                  style={styles.ticketHeader}
                  onPress={() => toggleExpand(ticket.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.ticketHeaderLeft}>
                    <View style={styles.ticketIdRow}>
                      <Ionicons name="ticket" size={18} color={colors.primary} />
                      <Text style={styles.ticketIdText}>
                        #{ticket.ticket_id || `PARLAY-${ticket.id}`}
                      </Text>
                      <View style={styles.legCountBadge}>
                        <Text style={styles.legCountText}>{legs.length || 3}-Fold</Text>
                      </View>
                    </View>
                    <Text style={styles.ticketDateText}>{formatDate(ticket.date)}</Text>
                  </View>

                  <View style={styles.ticketHeaderRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusBadge.bg, borderColor: statusBadge.border },
                      ]}
                    >
                      <Ionicons name={statusBadge.icon} size={12} color={statusBadge.color} />
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
                <View style={styles.metricsStrip}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Total Odds</Text>
                    <Text style={styles.metricValueOdds}>@{totalOdds.toFixed(2)}</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Probabilitas AI</Text>
                    <Text style={styles.metricValueProb}>{(totalProb * 100).toFixed(1)}%</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Estimasi Return</Text>
                    <Text style={styles.metricValueWin}>{formatCurrency(potentialWin)}</Text>
                  </View>
                </View>

                {/* Accordion Legs Details */}
                {isExpanded && (
                  <View style={styles.legsContainer}>
                    <View style={styles.legsHeaderRow}>
                      <Text style={styles.legsHeaderTitle}>KOMBINASI PERTANDINGAN ({legs.length})</Text>
                      <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={() => shareParlayTicket(ticket)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="share-social-outline" size={14} color={colors.primaryLight} />
                        <Text style={styles.shareBtnText}>Bagikan</Text>
                      </TouchableOpacity>
                    </View>

                    {legs.length === 0 ? (
                      <Text style={styles.emptyLegsText}>Rincian laga tidak tersedia.</Text>
                    ) : (
                      legs.map((leg, idx) => {
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
                          <View key={idx} style={styles.legCard}>
                            <View style={styles.legIndexCircle}>
                              <Text style={styles.legIndexText}>{idx + 1}</Text>
                            </View>
                            <View style={styles.legContent}>
                              <Text style={styles.legMatchName}>{leg.match}</Text>
                              <View style={styles.legMetaRow}>
                                <View style={styles.pickBadge}>
                                  <Text style={styles.pickBadgeText}>
                                    Pilihan: {leg.pick.toUpperCase()}
                                  </Text>
                                </View>
                                <Text style={styles.legOddsText}>@{Number(leg.odds).toFixed(2)}</Text>
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
    gap: 4,
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  legCountBadge: {
    backgroundColor: '#2563EB25',
    borderWidth: 1,
    borderColor: '#3B82F650',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
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
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
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
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  legIndexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  legContent: {
    flex: 1,
    gap: 4,
  },
  legMatchName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
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
});
