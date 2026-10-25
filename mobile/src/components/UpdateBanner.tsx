import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppVersionInfo } from '../services/api';

interface UpdateBannerProps {
  visible: boolean;
  updateInfo: AppVersionInfo | null;
  onDismiss?: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  visible,
  updateInfo,
  onDismiss,
}) => {
  if (!visible || !updateInfo) return null;

  const handleUpdate = () => {
    if (updateInfo.update_url) {
      Linking.openURL(updateInfo.update_url).catch((err) => {
        console.error('Gagal membuka link pembaruan:', err);
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View style={styles.iconWrapper}>
          <Ionicons name="sparkles" size={16} color="#34D399" />
        </View>
        <View style={styles.textWrapper}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>Update Tersedia</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{updateInfo.latest_version}</Text>
            </View>
          </View>
          <Text style={styles.notesText} numberOfLines={1}>
            {updateInfo.release_notes || 'Fitur baru dan peningkatan performa tersedia.'}
          </Text>
        </View>
      </View>

      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.updateBtn}
          onPress={handleUpdate}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-download-outline" size={14} color="#064E3B" style={{ marginRight: 4 }} />
          <Text style={styles.updateBtnText}>Update</Text>
        </TouchableOpacity>

        {!updateInfo.is_critical && onDismiss && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#064E3B', // Emerald dark container
    borderBottomWidth: 1,
    borderBottomColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ECFDF5',
  },
  versionBadge: {
    backgroundColor: '#047857',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A7F3D0',
  },
  notesText: {
    fontSize: 11,
    color: '#A7F3D0',
    fontWeight: '400',
    marginTop: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34D399',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  updateBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#064E3B',
  },
  closeBtn: {
    padding: 2,
  },
});
