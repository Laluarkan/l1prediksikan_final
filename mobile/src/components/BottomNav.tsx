import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export type TabType = 'home' | 'fixtures' | 'standings' | 'history';

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
    id: 'standings',
    label: 'Klasemen',
    iconActive: 'trophy',
    iconInactive: 'trophy-outline',
  },
  {
    id: 'history',
    label: 'Riwayat',
    iconActive: 'time',
    iconInactive: 'time-outline',
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.tabButton}
            onPress={() => onSelectTab(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
              <Ionicons
                name={isActive ? item.iconActive : item.iconInactive}
                size={20}
                color={isActive ? colors.primary : colors.textMuted}
              />
            </View>
            <Text style={[styles.label, isActive ? styles.activeLabel : styles.inactiveLabel]}>
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
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  iconWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 4,
  },
  activeIconWrapper: {
    backgroundColor: '#064E3B40',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  inactiveLabel: {
    color: colors.textMuted,
  },
});
