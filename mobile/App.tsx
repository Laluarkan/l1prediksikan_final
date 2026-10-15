import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { colors } from './src/theme/colors';
import { Header } from './src/components/Header';
import { BottomNav, TabType } from './src/components/BottomNav';
import { Sidebar } from './src/components/Sidebar';
import { HomeScreen } from './src/screens/HomeScreen';
import { FixturesScreen } from './src/screens/FixturesScreen';
import { StandingsScreen } from './src/screens/StandingsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
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
            {/* Top App Header with Sidebar Hamburger Toggle */}
            <Header onOpenSidebar={() => setSidebarVisible(true)} />

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
            />
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
