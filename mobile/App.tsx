import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { colors } from './src/theme/colors';
import { Header } from './src/components/Header';
import { BottomNav, TabType } from './src/components/BottomNav';
import { Sidebar } from './src/components/Sidebar';
import { HomeScreen } from './src/screens/HomeScreen';
import { FixturesScreen } from './src/screens/FixturesScreen';
import { ParlayScreen } from './src/screens/ParlayScreen';
import { StandingsScreen } from './src/screens/StandingsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ProfileModal } from './src/components/modals/ProfileModal';
import { NotificationsModal } from './src/components/modals/NotificationsModal';
import { OddsGuideModal } from './src/components/modals/OddsGuideModal';
import { AboutModal } from './src/components/modals/AboutModal';
import { checkServerHealth } from './src/services/api';
import {
  UserSession,
  getHasSeenOnboarding,
  getUserSession,
  clearUserSession,
} from './src/services/auth';

type AppFlow = 'checking' | 'onboarding' | 'auth' | 'main';

export default function App() {
  const [appFlow, setAppFlow] = useState<AppFlow>('checking');
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);

  // Modal States untuk Fitur Pengaturan & Lainnya
  const [profileVisible, setProfileVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Verifikasi konektivitas server secara berkala
  const verifyConnectivity = async () => {
    try {
      const isHealthy = await checkServerHealth();
      setIsOffline(!isHealthy);
    } catch {
      setIsOffline(true);
    }
  };

  useEffect(() => {
    verifyConnectivity();
    const interval = setInterval(verifyConnectivity, 30000);
    return () => clearInterval(interval);
  }, []);

  // Periksa status onboarding & sesi login saat aplikasi dibuka
  useEffect(() => {
    const initApp = async () => {
      try {
        const hasSeenOnboarding = await getHasSeenOnboarding();
        if (!hasSeenOnboarding) {
          setAppFlow('onboarding');
          return;
        }

        const session = await getUserSession();
        if (session) {
          setUser(session);
          setAppFlow('main');
        } else {
          setAppFlow('auth');
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setAppFlow('auth');
      }
    };

    initApp();
  }, []);

  // Handler saat onboarding selesai
  const handleOnboardingFinish = () => {
    if (user) {
      setAppFlow('main');
    } else {
      setAppFlow('auth');
    }
  };

  // Handler saat login berhasil
  const handleAuthSuccess = (session: UserSession) => {
    setUser(session);
    setAuthModalVisible(false);
    setAppFlow('main');
  };

  // Handler saat logout
  const handleLogout = async () => {
    await clearUserSession();
    setUser(null);
    setAppFlow('auth');
  };

  // Render konten layar aktif
  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigate={setActiveTab} />;
      case 'fixtures':
        return <FixturesScreen />;
      case 'parlay':
        return <ParlayScreen />;
      case 'standings':
        return <StandingsScreen />;
      case 'history':
        return <HistoryScreen />;
      default:
        return <HomeScreen onNavigate={setActiveTab} />;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />

        {/* 1. STATE INITIAL CHECKING / SPLASH */}
        {appFlow === 'checking' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}

        {/* 2. ONBOARDING SCREEN (PENGGUNA BARU) */}
        {appFlow === 'onboarding' ? (
          <OnboardingScreen onFinish={handleOnboardingFinish} />
        ) : null}

        {/* 3. AUTH SCREEN (LOGIN / REGISTER / GMAIL) */}
        {appFlow === 'auth' ? (
          <AuthScreen onSuccess={handleAuthSuccess} />
        ) : null}

        {/* 4. MAIN APP WITH HEADER, SIDEBAR, & BOTTOM NAV */}
        {appFlow === 'main' ? (
          <View style={styles.mainContainer}>
            {/* Top App Header with Modern Login or User Dropdown */}
            <Header
              onOpenSidebar={() => setSidebarVisible(true)}
              user={user}
              onOpenAuth={() => setAuthModalVisible(true)}
              onLogout={handleLogout}
              onOpenProfile={() => setProfileVisible(true)}
              onOpenNotifications={() => setNotificationsVisible(true)}
              onOpenGuide={() => setGuideVisible(true)}
              onOpenAbout={() => setAboutVisible(true)}
            />

            {/* Offline Alert Banner */}
            <OfflineBanner visible={isOffline} onRetry={verifyConnectivity} />

            {/* Dynamic Screen Content */}
            <View style={styles.contentContainer}>{renderScreen()}</View>

            {/* Bottom Navigation Tabs */}
            <BottomNav currentTab={activeTab} onSelectTab={setActiveTab} />

            {/* Left Sidebar Drawer */}
            <Sidebar
              visible={sidebarVisible}
              onClose={() => setSidebarVisible(false)}
              user={user}
              currentTab={activeTab}
              onNavigate={setActiveTab}
              onLogout={handleLogout}
              onShowOnboarding={() => setAppFlow('onboarding')}
              onOpenProfile={() => setProfileVisible(true)}
              onOpenNotifications={() => setNotificationsVisible(true)}
              onOpenGuide={() => setGuideVisible(true)}
              onOpenAbout={() => setAboutVisible(true)}
              onOpenAuth={() => setAuthModalVisible(true)}
            />

            {/* Modals Pengaturan & Lainnya */}
            <ProfileModal
              visible={profileVisible}
              onClose={() => setProfileVisible(false)}
              user={user}
              onLogout={handleLogout}
              onUpdateUser={(updated) => setUser(updated)}
              onOpenNotifications={() => {
                setProfileVisible(false);
                setNotificationsVisible(true);
              }}
              onOpenAuth={() => {
                setProfileVisible(false);
                setAuthModalVisible(true);
              }}
            />

            <NotificationsModal
              visible={notificationsVisible}
              onClose={() => setNotificationsVisible(false)}
            />

            <OddsGuideModal
              visible={guideVisible}
              onClose={() => setGuideVisible(false)}
            />

            <AboutModal
              visible={aboutVisible}
              onClose={() => setAboutVisible(false)}
            />

            {/* Modal Auth ketika dibuka dari dalam aplikasi utama */}
            <Modal
              visible={authModalVisible}
              animationType="slide"
              onRequestClose={() => setAuthModalVisible(false)}
            >
              <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <AuthScreen
                  onSuccess={handleAuthSuccess}
                  onClose={() => setAuthModalVisible(false)}
                />
              </SafeAreaView>
            </Modal>
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
