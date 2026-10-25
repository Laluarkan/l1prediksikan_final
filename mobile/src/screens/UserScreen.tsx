import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import {
  Fixture,
  SavedMatchItem,
  FeatureSuggestionItem,
  fetchSavedMatches,
  toggleSavedMatch,
  fetchFeatureSuggestions,
  voteFeatureSuggestion,
  createFeatureSuggestion,
} from '../services/api';
import { getUserSession, UserSession } from '../services/auth';
import { CompactMatchCard } from '../components/CompactMatchCard';
import { MatchDetailModal } from '../components/modals/MatchDetailModal';

const LOCAL_SAVED_KEY = '@prediksikan_local_saved_fixtures';

interface UserScreenProps {
  onNavigate?: (tab: any) => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenGuide?: () => void;
  onOpenAbout?: () => void;
}

type SubTab = 'saved' | 'features' | 'settings';

export const UserScreen: React.FC<UserScreenProps> = ({
  onNavigate,
  onOpenAuth,
  onLogout,
  onOpenGuide,
  onOpenAbout,
}) => {
  const { mode, setTheme, colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<SubTab>('saved');
  const [user, setUser] = useState<UserSession | null>(null);

  // States untuk Tab Tersimpan
  const [savedMatches, setSavedMatches] = useState<Fixture[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(true);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  // States untuk Tab Saran Fitur
  const [features, setFeatures] = useState<FeatureSuggestionItem[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState<boolean>(false);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [modalSubmitVisible, setModalSubmitVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('AI Model');
  const [submittingFeature, setSubmittingFeature] = useState<boolean>(false);

  // General refreshing
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 1. Muat info user
  useEffect(() => {
    getUserSession().then((session) => setUser(session));
  }, []);

  // 2. Muat data match favorit tersimpan
  const loadSavedMatches = useCallback(async () => {
    setLoadingSaved(true);
    try {
      // Ambil dari API
      const remoteSaved = await fetchSavedMatches();
      if (remoteSaved && remoteSaved.length > 0) {
        const fixturesList = remoteSaved.map((item) => item.fixture).filter(Boolean);
        setSavedMatches(fixturesList);
        // Simpan cache lokal
        await AsyncStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(fixturesList));
      } else {
        // Fallback baca cache lokal jika user guest / offline
        const localRaw = await AsyncStorage.getItem(LOCAL_SAVED_KEY);
        if (localRaw) {
          setSavedMatches(JSON.parse(localRaw));
        } else {
          setSavedMatches([]);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat saved matches remote, gunakan lokal:', err);
      const localRaw = await AsyncStorage.getItem(LOCAL_SAVED_KEY);
      if (localRaw) {
        setSavedMatches(JSON.parse(localRaw));
      }
    } finally {
      setLoadingSaved(false);
      setRefreshing(false);
    }
  }, []);

  // 3. Muat saran fitur
  const loadFeatures = useCallback(async () => {
    setLoadingFeatures(true);
    try {
      const data = await fetchFeatureSuggestions();
      setFeatures(data);
    } catch (err) {
      console.error('Gagal memuat roadmap saran fitur:', err);
    } finally {
      setLoadingFeatures(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'saved') {
      loadSavedMatches();
    } else if (activeTab === 'features') {
      loadFeatures();
    }
  }, [activeTab, loadSavedMatches, loadFeatures]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'saved') {
      loadSavedMatches();
    } else if (activeTab === 'features') {
      loadFeatures();
    } else {
      getUserSession().then((session) => setUser(session));
      setRefreshing(false);
    }
  };

  // Handler Hapus dari Favorit
  const handleRemoveFavorite = async (fixtureId: number) => {
    try {
      const nextList = savedMatches.filter((m) => m.id !== fixtureId);
      setSavedMatches(nextList);
      await AsyncStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(nextList));
      await toggleSavedMatch(fixtureId).catch(() => {});
    } catch (err) {
      console.warn('Gagal menghapus favorit:', err);
    }
  };

  // Handler Vote Saran Fitur
  const handleVote = async (featureId: number) => {
    if (votingId) return;
    setVotingId(featureId);

    // Optimistic UI Update
    setFeatures((prev) =>
      prev.map((item) => {
        if (item.id === featureId) {
          const nextVoted = !item.has_voted;
          return {
            ...item,
            has_voted: nextVoted,
            votes_count: nextVoted ? item.votes_count + 1 : Math.max(0, item.votes_count - 1),
          };
        }
        return item;
      })
    );

    try {
      const res = await voteFeatureSuggestion(featureId);
      setFeatures((prev) =>
        prev.map((item) => {
          if (item.id === featureId) {
            return {
              ...item,
              votes_count: res.votes_count,
              has_voted: res.has_voted,
            };
          }
          return item;
        })
      );
    } catch (err: any) {
      Alert.alert('Gagal Vote', err.message || 'Terjadi kesalahan saat voting.');
      // Revert if failed
      loadFeatures();
    } finally {
      setVotingId(null);
    }
  };

  // Handler Kirim Saran Fitur Baru
  const handleSubmitFeature = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Form Belum Lengkap', 'Silakan masukkan judul usulan fitur.');
      return;
    }
    if (!newDescription.trim()) {
      Alert.alert('Form Belum Lengkap', 'Silakan tulis penjelasan detail fitur.');
      return;
    }

    setSubmittingFeature(true);
    try {
      await createFeatureSuggestion({
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
      });

      Alert.alert('Berhasil', 'Terima kasih! Ide fitur Anda telah dikirim untuk ditinjau dan divoting komunitas.');
      setNewTitle('');
      setNewDescription('');
      setModalSubmitVisible(false);
      loadFeatures();
    } catch (err: any) {
      Alert.alert('Gagal Mengirim Ide', err.message || 'Terjadi kesalahan pada server.');
    } finally {
      setSubmittingFeature(false);
    }
  };

  // User Display Info
  const isMember = user && !user.isGuest;
  const displayName = user?.name || user?.username || 'Pengguna Tamu';
  const displayEmail = user?.email || 'Mode Tamu • Akses Publik';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ================= USER HEADER CARD ================= */}
      <View style={[styles.userProfileCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.userProfileRow}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>

          <View style={styles.userInfoCol}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                {displayName}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isMember ? '#064E3B40' : '#1E293B', borderColor: isMember ? '#059669' : colors.border },
                ]}
              >
                <Ionicons
                  name={isMember ? 'shield-checkmark' : 'person'}
                  size={10}
                  color={isMember ? '#34D399' : colors.textMuted}
                />
                <Text style={[styles.statusBadgeText, { color: isMember ? '#34D399' : colors.textMuted }]}>
                  {isMember ? 'Member VIP' : 'Tamu'}
                </Text>
              </View>
            </View>
            <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
              {displayEmail}
            </Text>
          </View>
        </View>

        {/* ================= 3-WAY SEGMENT SWITCHER ================= */}
        <View style={[styles.segmentWrapper, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'saved' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('saved')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'saved' ? 'star' : 'star-outline'}
              size={13}
              color={activeTab === 'saved' ? '#FFFFFF' : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeTab === 'saved' ? '#FFFFFF' : colors.textMuted },
                activeTab === 'saved' && styles.segmentBtnTextActive,
              ]}
            >
              Tersimpan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'features' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('features')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'features' ? 'bulb' : 'bulb-outline'}
              size={13}
              color={activeTab === 'features' ? '#FFFFFF' : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeTab === 'features' ? '#FFFFFF' : colors.textMuted },
                activeTab === 'features' && styles.segmentBtnTextActive,
              ]}
            >
              Saran Fitur
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'settings' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
              size={13}
              color={activeTab === 'settings' ? '#FFFFFF' : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeTab === 'settings' ? '#FFFFFF' : colors.textMuted },
                activeTab === 'settings' && styles.segmentBtnTextActive,
              ]}
            >
              Pengaturan
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= TAB 1: MATCH TERSIMPAN (FAVORIT) ================= */}
      {activeTab === 'saved' && (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
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
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pertandingan Favorit</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                {savedMatches.length} pertandingan tersimpan di pantauan Anda
              </Text>
            </View>
            <TouchableOpacity
              onPress={loadSavedMatches}
              style={[styles.syncBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {loadingSaved ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat match tersimpan...</Text>
            </View>
          ) : savedMatches.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                <Ionicons name="star-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Belum Ada Pertandingan Tersimpan</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Tandai bintang pada kartu laga di Beranda atau Jadwal untuk menyimpannya di sini agar mudah dipantau.
              </Text>
              {onNavigate && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => onNavigate('fixtures')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Jelajahi Jadwal Laga</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            savedMatches.map((fixture) => (
              <CompactMatchCard
                key={fixture.id}
                fixture={fixture}
                onPress={() => setSelectedFixture(fixture)}
                isFavorite={true}
                onToggleFavorite={() => handleRemoveFavorite(fixture.id)}
                showLeagueBadge={true}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ================= TAB 2: SARAN FITUR & ROADMAP ================= */}
      {activeTab === 'features' && (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
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
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Roadmap & Saran Fitur</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Beri suara untuk fitur yang Anda sukai atau usulkan ide baru
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.addFeatureBtn, { backgroundColor: colors.primary }]}
              onPress={() => setModalSubmitVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addFeatureBtnText}>Ide Baru</Text>
            </TouchableOpacity>
          </View>

          {loadingFeatures ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat roadmap fitur...</Text>
            </View>
          ) : features.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="bulb-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Belum Ada Saran Fitur</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Jadilah orang pertama yang mengusulkan fitur keren untuk Prediksikan!
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => setModalSubmitVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={15} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Ajukan Ide Fitur</Text>
              </TouchableOpacity>
            </View>
          ) : (
            features.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.featureCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  item.has_voted && { borderColor: '#10B98180' },
                ]}
              >
                <View style={styles.featureTopRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                    <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>{item.category || 'Ide Fitur'}</Text>
                  </View>
                  <Text style={[styles.featureAuthor, { color: colors.textMuted }]}>
                    @{item.created_by_username || 'user'}
                  </Text>
                </View>

                <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{item.description}</Text>

                <View style={[styles.featureFooter, { borderTopColor: colors.borderLight }]}>
                  <TouchableOpacity
                    style={[
                      styles.voteBtn,
                      { backgroundColor: item.has_voted ? '#065F46' : (isDark ? '#1E293B' : '#E2E8F0') },
                      item.has_voted && styles.voteBtnActive,
                    ]}
                    onPress={() => handleVote(item.id)}
                    activeOpacity={0.75}
                    disabled={votingId === item.id}
                  >
                    <Ionicons
                      name={item.has_voted ? 'thumbs-up' : 'thumbs-up-outline'}
                      size={14}
                      color={item.has_voted ? '#34D399' : colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.voteBtnText,
                        { color: item.has_voted ? '#FFFFFF' : colors.textPrimary },
                      ]}
                    >
                      {item.votes_count} Dukungan
                    </Text>
                  </TouchableOpacity>

                  {item.has_voted && (
                    <View style={styles.votedNotice}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      <Text style={styles.votedNoticeText}>Anda mendukung ini</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ================= TAB 3: PENGATURAN & TEMA ================= */}
      {activeTab === 'settings' && (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. SELEKTOR TEMA APLIKASI (TERANG / GELAP) */}
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingsCardHeader}>
              <Ionicons name="color-palette-outline" size={17} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsCardTitle, { color: colors.textPrimary }]}>Tema Tampilan</Text>
                <Text style={[styles.settingsCardSubtitle, { color: colors.textMuted }]}>
                  Pilih tema tampilan yang nyaman untuk mata Anda
                </Text>
              </View>
            </View>

            <View style={styles.themeOptionsGrid}>
              {/* Pilihan 1: Tema Terang (Default Rekomendasi Logo) */}
              <TouchableOpacity
                style={[
                  styles.themeSelectCard,
                  { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border },
                  mode === 'light' && [styles.themeSelectCardActive, { borderColor: colors.primary }],
                ]}
                onPress={() => setTheme('light')}
                activeOpacity={0.8}
              >
                <View style={styles.themeSelectTop}>
                  <View style={[styles.themeIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="sunny" size={18} color="#D97706" />
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      mode === 'light' && { borderColor: colors.primary, backgroundColor: colors.primary },
                    ]}
                  >
                    {mode === 'light' && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                  </View>
                </View>

                <Text style={[styles.themeCardTitle, { color: colors.textPrimary }]}>Tema Terang</Text>
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Rekomendasi Logo</Text>
                </View>
                <Text style={[styles.themeCardDesc, { color: colors.textMuted }]}>
                  Kontras tinggi & maksimal untuk logo klub dan liga berwarna hitam
                </Text>
              </TouchableOpacity>

              {/* Pilihan 2: Tema Gelap */}
              <TouchableOpacity
                style={[
                  styles.themeSelectCard,
                  { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border },
                  mode === 'dark' && [styles.themeSelectCardActive, { borderColor: colors.primary }],
                ]}
                onPress={() => setTheme('dark')}
                activeOpacity={0.8}
              >
                <View style={styles.themeSelectTop}>
                  <View style={[styles.themeIconBox, { backgroundColor: '#1E293B' }]}>
                    <Ionicons name="moon" size={18} color="#38BDF8" />
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      mode === 'dark' && { borderColor: colors.primary, backgroundColor: colors.primary },
                    ]}
                  >
                    {mode === 'dark' && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                  </View>
                </View>

                <Text style={[styles.themeCardTitle, { color: colors.textPrimary }]}>Tema Gelap</Text>
                <View style={[styles.defaultBadge, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                  <Text style={[styles.defaultBadgeText, { color: colors.textMuted }]}>Mode Malam</Text>
                </View>
                <Text style={[styles.themeCardDesc, { color: colors.textMuted }]}>
                  Elegan & nyaman di ruangan redup dengan backdrop logo berdaya kontras
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. PREFERENSI BANKROLL & STAKING */}
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingsCardHeader}>
              <Ionicons name="wallet-outline" size={17} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsCardTitle, { color: colors.textPrimary }]}>Metode Staking & Bankroll</Text>
                <Text style={[styles.settingsCardSubtitle, { color: colors.textMuted }]}>
                  Model matematika money management mesin prediksi
                </Text>
              </View>
            </View>

            <View style={styles.settingItemRow}>
              <View style={styles.settingItemLeft}>
                <Text style={[styles.settingItemName, { color: colors.textPrimary }]}>Model Algoritma Staking</Text>
                <Text style={[styles.settingItemSub, { color: colors.textMuted }]}>
                  Fractional Kelly Criterion & Reinforcement Learning Agent
                </Text>
              </View>
              <View style={[styles.settingPill, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                <Text style={[styles.settingPillText, { color: colors.primary }]}>Kelly 25%</Text>
              </View>
            </View>

            <View style={styles.settingItemRow}>
              <View style={styles.settingItemLeft}>
                <Text style={[styles.settingItemName, { color: colors.textPrimary }]}>Zona Waktu Penjadwalan</Text>
                <Text style={[styles.settingItemSub, { color: colors.textMuted }]}>
                  WITA (Waktu Indonesia Tengah / UTC+8)
                </Text>
              </View>
              <View style={[styles.settingPill, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                <Text style={[styles.settingPillText, { color: colors.primary }]}>UTC+8 WITA</Text>
              </View>
            </View>
          </View>

          {/* 3. TAUTAN BANTUAN & PANDUAN */}
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingsCardHeader}>
              <Ionicons name="information-circle-outline" size={17} color="#38BDF8" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsCardTitle, { color: colors.textPrimary }]}>Informasi & Bantuan</Text>
                <Text style={[styles.settingsCardSubtitle, { color: colors.textMuted }]}>
                  Panduan membaca probabilitas dan info lisensi
                </Text>
              </View>
            </View>

            {onOpenGuide && (
              <TouchableOpacity
                style={[styles.menuRow, { borderBottomColor: colors.borderLight }]}
                onPress={onOpenGuide}
                activeOpacity={0.7}
              >
                <View style={styles.menuRowLeft}>
                  <Ionicons name="book-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.menuRowText, { color: colors.textPrimary }]}>Panduan Odds & Value Bet</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {onOpenAbout && (
              <TouchableOpacity style={styles.menuRow} onPress={onOpenAbout} activeOpacity={0.7}>
                <View style={styles.menuRowLeft}>
                  <Ionicons name="help-circle-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.menuRowText, { color: colors.textPrimary }]}>Tentang Aplikasi & Disclaimer</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* 4. AKUN (MASUK / KELUAR) */}
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {isMember ? (
              <TouchableOpacity
                style={[styles.logoutBtn, { borderColor: '#EF444450' }]}
                onPress={() => {
                  Alert.alert('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari akun?', [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Keluar', style: 'destructive', onPress: onLogout },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={17} color="#EF4444" />
                <Text style={styles.logoutBtnText}>Keluar dari Akun</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.loginCardBtn, { backgroundColor: colors.primary }]}
                onPress={onOpenAuth}
                activeOpacity={0.8}
              >
                <Ionicons name="log-in-outline" size={17} color="#FFFFFF" />
                <Text style={styles.loginCardBtnText}>Masuk / Daftar Akun</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer App Version */}
          <View style={styles.appFooter}>
            <Text style={[styles.appVersionText, { color: colors.textMuted }]}>
              Prediksikan App • Versi 1.4.0 (Build 7)
            </Text>
            <Text style={[styles.appCopyrightText, { color: colors.textMuted }]}>
              Didukung oleh Model ML & 11 Liga Utama Eropa
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ================= MODAL AJUKAN FITUR BARU ================= */}
      <Modal
        visible={modalSubmitVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalSubmitVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="bulb" size={18} color="#F59E0B" />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Ajukan Ide Fitur</Text>
              </View>
              <TouchableOpacity onPress={() => setModalSubmitVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Kategori */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Kategori</Text>
              <View style={styles.categoryWrap}>
                {['AI Model', 'Statistik & H2H', 'UI/UX', 'Notifikasi', 'Lainnya'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', borderColor: colors.border },
                      newCategory === cat && [styles.categoryChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                    ]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: newCategory === cat ? '#FFFFFF' : colors.textMuted },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Judul Usulan */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Judul Ide</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Contoh: Grafik Tren Performa 5 Laga Terakhir"
                placeholderTextColor={colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Deskripsi */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Detail & Penjelasan</Text>
              <TextInput
                style={[
                  styles.inputField,
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary },
                ]}
                placeholder="Jelaskan bagaimana fitur ini akan berguna bagi pengguna..."
                placeholderTextColor={colors.textMuted}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmitFeature}
                disabled={submittingFeature}
                activeOpacity={0.8}
              >
                {submittingFeature ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Kirim Usulan Fitur</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Detail Match Ketika Kartu Ditekan */}
      <MatchDetailModal
        visible={!!selectedFixture}
        fixture={selectedFixture}
        onClose={() => setSelectedFixture(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userProfileCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  userInfoCol: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 11.5,
  },
  segmentWrapper: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 5,
  },
  segmentBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    fontWeight: '800',
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: 14,
    paddingBottom: 40,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  syncBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addFeatureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addFeatureBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  featureCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  featureTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  featureAuthor: {
    fontSize: 10,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  featureDesc: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  featureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 2,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  voteBtnActive: {
    borderWidth: 0.8,
    borderColor: '#10B981',
  },
  voteBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  votedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  votedNoticeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#10B981',
  },
  settingsCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  settingsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  settingsCardSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  themeOptionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  themeSelectCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  themeSelectCardActive: {
    borderWidth: 1.5,
  },
  themeSelectTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCardTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#05966925',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#10B981',
  },
  themeCardDesc: {
    fontSize: 9.5,
    lineHeight: 13,
  },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  settingItemLeft: {
    flex: 1,
    gap: 2,
  },
  settingItemName: {
    fontSize: 12,
    fontWeight: '700',
  },
  settingItemSub: {
    fontSize: 10.5,
  },
  settingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  settingPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuRowText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#EF444415',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '800',
  },
  loginCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loginCardBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  appFooter: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
  },
  appVersionText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  appCopyrightText: {
    fontSize: 9.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 16,
    maxHeight: '85%',
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryChipActive: {},
  categoryChipText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  inputField: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 14,
    marginBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
