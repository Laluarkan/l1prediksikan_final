import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface OfflineBannerProps {
  visible: boolean;
  onRetry?: () => void;
  message?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  visible,
  onRetry,
  message = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={18} color="#FBBF24" />
        <Text style={styles.messageText} numberOfLines={2}>
          {message}
        </Text>
      </View>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryBtnText}>Coba Lagi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#78350F',
    borderBottomWidth: 1,
    borderBottomColor: '#B45309',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  messageText: {
    fontSize: 12,
    color: '#FEF3C7',
    fontWeight: '500',
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
});
