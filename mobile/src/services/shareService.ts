import * as Sharing from 'expo-sharing';
import { Share, Alert, Platform } from 'react-native';
import { Fixture, ParlayTicket } from './api';

/**
 * Service Berbagi Gambar & Prediksi Sepak Bola ke Media Sosial (WhatsApp, Telegram, dll)
 * Menggunakan expo-sharing untuk mengirimkan output berupa GAMBAR (Image/PNG).
 */

export const shareImageFile = async (imageUri: string, dialogTitle?: string): Promise<void> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Perangkat Tidak Mendukung', 'Fitur berbagi file gambar tidak tersedia pada perangkat ini.');
      return;
    }
    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: dialogTitle || 'Bagikan Gambar Tiket L1',
      UTI: 'public.png',
    });
  } catch (error: any) {
    if (error?.message && !error.message.includes('User did not share') && !error.message.includes('dismiss')) {
      console.warn('Share image error:', error);
    }
  }
};

export const shareMatchPrediction = async (match: Fixture): Promise<void> => {
  try {
    const pickText = match.rl_pick_ftr
      ? `🎯 AI Pick 1X2: ${match.rl_pick_ftr.toUpperCase()} (${(match.prob_ftr_h * 100).toFixed(0)}% / ${(match.prob_ftr_d * 100).toFixed(0)}% / ${(match.prob_ftr_a * 100).toFixed(0)}%)`
      : '';
    const ouText = match.rl_pick_ou
      ? `⚽ AI Pick O/U 2.5: ${match.rl_pick_ou.toUpperCase()}`
      : '';

    const message = [
      `🔥 PREDIKSI SEPAK BOLA AI - L1 PREDIKSI-KAN`,
      `🏆 Liga: ${match.league_name}`,
      `⚔️ Laga: ${match.home_team_name} vs ${match.away_team_name}`,
      pickText,
      ouText,
      match.has_value_bet ? `💎 STATUS: VALUE BET TERDETEKSI!` : '',
      ``,
      `Lihat analisis probabilitas lengkap dan data historis di:`,
      `👉 https://l1prediksikan.my.id`,
    ]
      .filter(Boolean)
      .join('\n');

    await Share.share({
      title: `Prediksi ${match.home_team_name} vs ${match.away_team_name}`,
      message,
    });
  } catch (error: any) {
    if (error.message !== 'User did not share') {
      Alert.alert('Gagal Membagikan', 'Tidak dapat membuka dialog berbagi.');
    }
  }
};

export const shareParlayTicket = async (ticket: ParlayTicket): Promise<void> => {
  try {
    const legsText = (ticket.legs_details || [])
      .map((leg, idx) => `  ${idx + 1}. ${leg.match} -> ${leg.pick.toUpperCase()} (@${Number(leg.odds).toFixed(2)})`)
      .join('\n');

    const message = [
      `🎟️ TIKET REKOMENDASI PARLAY AI - L1 PREDIKSI-KAN`,
      `ID Tiket: #${ticket.ticket_id || ticket.id}`,
      `⚡ Total Odds: @${Number(ticket.total_odds).toFixed(2)}`,
      `📊 Probabilitas Gabungan: ${(Number(ticket.total_prob) * 100).toFixed(1)}%`,
      ``,
      `Daftar Pertandingan:`,
      legsText,
      ``,
      `Buka analisis parlay lengkap di:`,
      `👉 https://l1prediksikan.my.id/parlays`,
    ]
      .filter(Boolean)
      .join('\n');

    await Share.share({
      title: `Tiket Parlay #${ticket.ticket_id || ticket.id}`,
      message,
    });
  } catch (error: any) {
    if (error.message !== 'User did not share') {
      Alert.alert('Gagal Membagikan', 'Tidak dapat membuka dialog berbagi.');
    }
  }
};
