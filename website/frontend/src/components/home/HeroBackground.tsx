// Motif garis lapangan sepak bola (setengah lapangan, dilihat dari atas) sebagai
// latar hero — menggantikan animasi partikel generik sebelumnya dengan sesuatu
// yang benar-benar berakar dari subjek situs ini (analitik pertandingan bola).
// Murni SVG statis, jadi tidak perlu client-side JS/canvas lagi seperti versi
// sebelumnya — bonus: lebih ringan untuk performa halaman.
export default function HeroBackground() {
  return (
    <svg
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="pitchGlow" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#134e2f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#pitchGlow)" />

      {/* Garis tengah lapangan */}
      <line x1="0" y1="470" x2="1200" y2="470" stroke="#3fa34d" strokeOpacity="0.25" strokeWidth="2" />
      {/* Lingkaran tengah */}
      <circle cx="600" cy="470" r="130" fill="none" stroke="#3fa34d" strokeOpacity="0.22" strokeWidth="2" />
      <circle cx="600" cy="470" r="4" fill="#3fa34d" fillOpacity="0.35" />
      {/* Kotak penalti kanan (terpotong di tepi) */}
      <rect x="980" y="330" width="260" height="280" fill="none" stroke="#3fa34d" strokeOpacity="0.18" strokeWidth="2" />
      <rect x="1080" y="400" width="160" height="140" fill="none" stroke="#3fa34d" strokeOpacity="0.18" strokeWidth="2" />
      {/* Kotak penalti kiri (terpotong di tepi) */}
      <rect x="-40" y="330" width="260" height="280" fill="none" stroke="#3fa34d" strokeOpacity="0.18" strokeWidth="2" />
      <rect x="-40" y="400" width="160" height="140" fill="none" stroke="#3fa34d" strokeOpacity="0.18" strokeWidth="2" />
    </svg>
  );
}