import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export type TabType = 'home' | 'fixtures' | 'parlay' | 'standings' | 'user' | 'history';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Beranda',
    iconActive: 'home',
    iconInactive: 'home-outline',
  },
  {
    id: 'fixtures',
    label: 'Jadwal',
    iconActive: 'calendar',
    iconInactive: 'calendar-outline',
  },
  {
    id: 'parlay',
    label: 'Parlay',
    iconActive: 'ticket',
    iconInactive: 'ticket-outline',
  },
  {
    id: 'standings',
    label: 'Klasemen',
    iconActive: 'trophy',
    iconInactive: 'trophy-outline',
  },
  {
    id: 'user',
    label: 'Akun',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = currentTab === item.id || (item.id === 'fixtures' && currentTab === 'history');
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.tabButton}
            onPress={() => onSelectTab(item.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconWrapper,
                isActive && [
                  styles.activeIconWrapper,
                  { backgroundColor: isDark ? '#064E3B40' : '#DCFCE7' },
                ],
              ]}
            >
              <Ionicons
                name={isActive ? item.iconActive : item.iconInactive}
                size={20}
                color={isActive ? colors.primary : colors.textMuted}
              />
            </View>
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.primary : colors.textMuted },
                isActive ? styles.activeLabel : styles.inactiveLabel,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  iconWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 3,
  },
  activeIconWrapper: {},
  label: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  activeLabel: {
    fontWeight: '800',
  },
  inactiveLabel: {},
});
