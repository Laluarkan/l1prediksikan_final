import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface HeaderProps {
  onOpenSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  return (
    <View style={styles.container}>
      {/* Menu Drawer Toggle */}
      <TouchableOpacity
        onPress={onOpenSidebar}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.menuButton}
        activeOpacity={0.7}
      >
        <Ionicons name="menu-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* Brand Logo */}
      <View style={styles.logoWrapper}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Balanced Right Spacer */}
      <View style={styles.rightSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  rightSpacer: {
    width: 36,
  },
});
