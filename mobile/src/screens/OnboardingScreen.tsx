import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { setHasSeenOnboarding } from '../services/auth';

const { width } = Dimensions.get('window');
const HERO_CARD_WIDTH = Math.min(width - 40, 340);

interface OnboardingSlide {
  id: number;
  image: ImageSourcePropType;
  cardBg: string;
  imageResizeMode: 'cover' | 'contain';
  title: string;
  subtitle: string;
  badgeColor: string;
}

export const SLIDES: OnboardingSlide[] = [
  {
    id: 1,
    image: require('../../assets/football.jpg'),
    cardBg: '#0F172A',
    imageResizeMode: 'cover',
    badgeColor: colors.primary,
    title: 'Prediksi Sepak Bola & Odds Real-Time',
    subtitle:
      'Pantau data odds pasar dan probabilitas statistik 11 liga top Eropa sebelum peluit sepak mula dibunyikan.',
  },
  {
    id: 2,
    image: require('../../assets/up.jpg'),
    cardBg: '#120A2B',
    imageResizeMode: 'contain',
    badgeColor: '#F59E0B',
    title: 'Identifikasi Best Value & Edge Pasar',
    subtitle:
      'Dapatkan rekomendasi pertandingan dengan nilai pasar terbaik secara objektif dan matematis.',
  },
  {
    id: 3,
    image: require('../../assets/tropy.jpg'),
    cardBg: '#0B1528',
    imageResizeMode: 'contain',
    badgeColor: '#818CF8',
    title: 'Klasemen Lengkap & Evaluasi Hasil',
    subtitle:
      'Lihat tabel klasemen terkini serta evaluasi riwayat akurasi tebakan laga yang transparan di setiap pekan.',
  },
];

interface OnboardingScreenProps {
  onFinish: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      await setHasSeenOnboarding();
      onFinish();
    }
  };

  const handleSkip = async () => {
    await setHasSeenOnboarding();
    onFinish();
  };

  const currentSlide = SLIDES[currentIndex];
  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {!isLastSlide ? (
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Lewati</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Main Slide Content */}
      <View style={styles.contentContainer}>
        {/* Hero Visual Card */}
        <View style={[styles.heroCard, { backgroundColor: currentSlide.cardBg }]}>
          <Image
            source={currentSlide.image}
            style={styles.heroImage}
            resizeMode={currentSlide.imageResizeMode}
          />
        </View>

        {/* Slide Title & Subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{currentSlide.title}</Text>
          <Text style={styles.subtitleText}>{currentSlide.subtitle}</Text>
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((slide, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={slide.id}
                style={[styles.dot, isActive ? styles.dotActive : null]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.button, isLastSlide ? styles.buttonLast : null]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? 'Mulai Sekarang' : 'Lanjutkan'}
          </Text>
          <Ionicons
            name={isLastSlide ? 'checkmark-circle' : 'arrow-forward'}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    height: 48,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  skipText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 10,
  },
  heroCard: {
    width: HERO_CARD_WIDTH,
    height: 230,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  badgeChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  textContainer: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
  },
  titleText: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitleText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  bottomControls: {
    gap: 20,
    paddingBottom: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  buttonLast: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});