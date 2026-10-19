const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const logoBase64 = fs.readFileSync(path.resolve(__dirname, '../assets/logo.png')).toString('base64');
const logoDataUri = `data:image/png;base64,${logoBase64}`;

// Helper SVG Icons
const icons = {
  menu: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F8FAFC" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
  bell: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
  search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  calendar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  ticket: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"></path></svg>`,
  trophy: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"></path><path d="M6 2h12v7a6 6 0 0 1-12 0V2z"></path></svg>`,
  time: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
  filter: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`,
  chevronRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
  chevronLeft: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F8FAFC" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
  chevronDown: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
  share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  wifi: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F8FAFC" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20" stroke-width="3"></line></svg>`,
  signal: `<svg width="18" height="18" viewBox="0 0 24 24" fill="#F8FAFC"><rect x="2" y="16" width="3" height="6" rx="1"></rect><rect x="8" y="12" width="3" height="10" rx="1"></rect><rect x="14" y="8" width="3" height="14" rx="1"></rect><rect x="20" y="4" width="3" height="18" rx="1"></rect></svg>`,
  battery: `<svg width="24" height="16" viewBox="0 0 28 16" fill="none" stroke="#F8FAFC" stroke-width="2"><rect x="1" y="1" width="22" height="14" rx="3"></rect><path d="M25 5v6" stroke-linecap="round"></path><rect x="3" y="3" width="16" height="10" rx="2" fill="#10B981"></rect></svg>`
};

// Club Crest Badges Generator (High fidelity stylized SVG badges for European clubs)
function getClubCrest(code, name, bg, stroke, text) {
  return `<div class="club-badge" style="background:${bg}; border: 1.5px solid ${stroke}; color:${text};">
    ${code}
  </div>`;
}

const clubs = {
  arsenal: getClubCrest('ARS', 'Arsenal', '#DC2626', '#FFFFFF', '#FFFFFF'),
  chelsea: getClubCrest('CHE', 'Chelsea', '#1D4ED8', '#FFFFFF', '#FFFFFF'),
  mancity: getClubCrest('MCI', 'Man City', '#38BDF8', '#0F172A', '#0F172A'),
  liverpool: getClubCrest('LIV', 'Liverpool', '#B91C1C', '#F59E0B', '#FFFFFF'),
  tottenham: getClubCrest('TOT', 'Tottenham', '#0F172A', '#FFFFFF', '#FFFFFF'),
  manutd: getClubCrest('MUN', 'Man Utd', '#DC2626', '#F59E0B', '#F59E0B'),
  realmadrid: getClubCrest('RMA', 'Real Madrid', '#FFFFFF', '#F59E0B', '#1E1B4B'),
  barcelona: getClubCrest('FCB', 'Barcelona', '#1E3A8A', '#DC2626', '#F59E0B'),
  bayern: getClubCrest('BAY', 'Bayern', '#DC2626', '#38BDF8', '#FFFFFF'),
  dortmund: getClubCrest('BVB', 'Dortmund', '#FACC15', '#0F172A', '#0F172A'),
  inter: getClubCrest('INT', 'Inter Milan', '#1E3A8A', '#F59E0B', '#FFFFFF'),
  milan: getClubCrest('ACM', 'AC Milan', '#DC2626', '#0F172A', '#FFFFFF'),
  juventus: getClubCrest('JUV', 'Juventus', '#0F172A', '#FFFFFF', '#FFFFFF'),
  psg: getClubCrest('PSG', 'Paris SG', '#1E3A8A', '#DC2626', '#FFFFFF'),
  marseille: getClubCrest('OM', 'Marseille', '#38BDF8', '#FFFFFF', '#FFFFFF'),
  astonvilla: getClubCrest('AVL', 'Aston Villa', '#701A75', '#38BDF8', '#38BDF8'),
  newcastle: getClubCrest('NEW', 'Newcastle', '#0F172A', '#FFFFFF', '#FFFFFF'),
  brighton: getClubCrest('BHA', 'Brighton', '#2563EB', '#F59E0B', '#FFFFFF')
};

// Common Header Component
function renderHeader() {
  return `
    <div class="status-bar">
      <div class="status-time">13:35</div>
      <div class="status-icons">
        ${icons.signal}
        ${icons.wifi}
        ${icons.battery}
      </div>
    </div>
    <header class="app-header">
      <div class="menu-btn">${icons.menu}</div>
      <div class="brand-row">
        <img src="${logoDataUri}" class="brand-logo" alt="Logo" />
        <span class="brand-name">Prediksikan</span>
      </div>
      <div class="header-right">
        <div class="notif-btn">${icons.bell}</div>
        <div class="avatar-circle">AL</div>
      </div>
    </header>
  `;
}

// Common Bottom Navigation Bar Component
function renderBottomNav(activeTab) {
  const tabs = [
    { id: 'beranda', label: 'Beranda', icon: icons.home },
    { id: 'jadwal', label: 'Jadwal', icon: icons.calendar },
    { id: 'parlay', label: 'Parlay', icon: icons.ticket },
    { id: 'klasemen', label: 'Klasemen', icon: icons.trophy },
    { id: 'riwayat', label: 'Riwayat', icon: icons.time },
  ];

  return `
    <nav class="bottom-nav">
      ${tabs.map(t => {
        const isActive = t.id === activeTab;
        return `
          <div class="nav-item ${isActive ? 'active' : ''}">
            <div class="nav-icon">${t.icon}</div>
            <div class="nav-label">${t.label}</div>
          </div>
        `;
      }).join('')}
    </nav>
  `;
}

// Global CSS Styles mimicking React Native App Styles
const globalStyles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
  }
  body {
    width: 1080px;
    height: 1920px;
    background-color: #0B1120;
    color: #F8FAFC;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  
  /* Status Bar */
  .status-bar {
    height: 54px;
    padding: 12px 36px 0 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #0B1120;
    font-weight: 700;
    font-size: 22px;
    color: #F8FAFC;
  }
  .status-icons {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  /* Header */
  .app-header {
    height: 90px;
    background-color: #0B1120;
    border-bottom: 1px solid #1E293B;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
  }
  .menu-btn {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .brand-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .brand-logo {
    width: 44px;
    height: 44px;
    object-fit: contain;
  }
  .brand-name {
    font-size: 32px;
    font-weight: 900;
    color: #F8FAFC;
    letter-spacing: -0.5px;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .notif-btn {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: #111827;
    border: 1px solid #1E293B;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .avatar-circle {
    width: 46px;
    height: 46px;
    border-radius: 23px;
    background: linear-gradient(135deg, #10B981, #059669);
    color: #FFFFFF;
    font-weight: 800;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
  }

  /* Content Body */
  .screen-content {
    flex: 1;
    overflow: hidden;
    padding: 24px 32px 140px 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Bottom Navigation */
  .bottom-nav {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 1080px;
    height: 125px;
    background-color: #0F172A;
    border-top: 2px solid #1E293B;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding-bottom: 18px;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.5);
    z-index: 999;
  }
  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #64748B;
    cursor: pointer;
    width: 180px;
  }
  .nav-item.active {
    color: #10B981;
  }
  .nav-item.active .nav-icon svg {
    stroke: #10B981;
  }
  .nav-label {
    font-size: 19px;
    font-weight: 700;
  }
  .nav-item.active .nav-label {
    color: #10B981;
  }

  /* Club Badge Circle */
  .club-badge {
    width: 44px;
    height: 44px;
    border-radius: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 900;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }

  /* Match Card */
  .match-card {
    background-color: #111827;
    border: 1.5px solid #1E293B;
    border-radius: 22px;
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
  }
  .match-card.has-value {
    border-color: rgba(16, 185, 129, 0.35);
    background: linear-gradient(180deg, #111827 0%, rgba(16, 185, 129, 0.05) 100%);
  }
  .card-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .match-time {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #34D399;
    font-size: 18px;
    font-weight: 700;
  }
  .league-pill {
    background: #1E293B;
    padding: 6px 14px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 800;
    color: #94A3B8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .card-main-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .teams-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1.2;
  }
  .team-line {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .team-title {
    font-size: 23px;
    font-weight: 800;
    color: #F8FAFC;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .col-divider {
    width: 1.5px;
    height: 80px;
    background: #1E293B;
    margin: 0 20px;
  }
  .picks-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pick-row {
    background: #1F2937;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 8px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pick-row.value-pick {
    background: rgba(16, 185, 129, 0.12);
    border-color: #10B981;
  }
  .pick-type-tag {
    font-size: 14px;
    font-weight: 800;
    color: #94A3B8;
  }
  .pick-target {
    font-size: 18px;
    font-weight: 800;
    color: #F8FAFC;
  }
  .pick-odds {
    color: #34D399;
    font-weight: 800;
  }
  .badge-value {
    background: #10B981;
    color: #022C22;
    font-size: 12px;
    font-weight: 900;
    padding: 3px 8px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }
`;

// ==========================================
// 1. SCREEN 1: BERANDA
// ==========================================
function renderHomeScreen() {
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      ${globalStyles}
      .live-banner {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: rgba(16, 185, 129, 0.12);
        border: 1.5px solid rgba(16, 185, 129, 0.3);
        padding: 8px 18px;
        border-radius: 20px;
        font-size: 18px;
        font-weight: 700;
        color: #34D399;
        width: fit-content;
      }
      .live-dot {
        width: 12px;
        height: 12px;
        border-radius: 6px;
        background: #10B981;
        box-shadow: 0 0 10px #10B981;
      }
      
      /* Performance Dual Cards */
      .perf-box {
        background: #0F172A;
        border: 1.5px solid #1E293B;
        border-radius: 24px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
      .perf-section-head {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .perf-tag-hda {
        background: rgba(99, 102, 241, 0.18);
        border: 1px solid #6366F1;
        color: #A5B4FC;
        padding: 5px 14px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 800;
      }
      .perf-tag-ou {
        background: rgba(16, 185, 129, 0.18);
        border: 1px solid #10B981;
        color: #6EE7B7;
        padding: 5px 14px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 800;
      }
      .perf-title-desc {
        font-size: 17px;
        color: #94A3B8;
        font-weight: 600;
      }
      .perf-stats-strip {
        background: #111827;
        border-radius: 16px;
        border: 1px solid #1E293B;
        display: flex;
        justify-content: space-around;
        align-items: center;
        padding: 16px 10px;
      }
      .perf-stat-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .stat-num {
        font-size: 30px;
        font-weight: 900;
        color: #F8FAFC;
        letter-spacing: -0.5px;
      }
      .stat-lbl {
        font-size: 15px;
        color: #64748B;
        font-weight: 700;
      }
      .stat-v-sep {
        width: 1px;
        height: 44px;
        background: #1E293B;
      }

      /* 2x2 Grid Menu */
      .menu-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .menu-card {
        background: #111827;
        border: 1.5px solid #1E293B;
        border-radius: 18px;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .menu-icon-box {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .menu-text-col {
        flex: 1;
      }
      .menu-title {
        font-size: 21px;
        font-weight: 800;
        color: #F8FAFC;
      }
      .menu-desc {
        font-size: 14px;
        color: #64748B;
        font-weight: 600;
      }

      /* Section Header */
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: 4px;
      }
      .section-title {
        font-size: 26px;
        font-weight: 900;
        color: #F8FAFC;
      }
      .section-sub {
        font-size: 16px;
        color: #64748B;
        font-weight: 600;
        margin-top: 3px;
      }
      .see-all-btn {
        color: #10B981;
        font-size: 17px;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    ${renderHeader()}
    <div class="screen-content">
      <div class="live-banner">
        <div class="live-dot"></div>
        <span>Performa Musim 2026/2027</span>
      </div>

      <!-- Performance Dual Box -->
      <div class="perf-box">
        <!-- HDA Row -->
        <div class="perf-section-head">
          <div class="perf-tag-hda">HDA (1X2)</div>
          <div class="perf-title-desc">Hasil Akhir Pertandingan</div>
        </div>
        <div class="perf-stats-strip">
          <div class="perf-stat-col">
            <div class="stat-num">1.420</div>
            <div class="stat-lbl">Total Laga</div>
          </div>
          <div class="stat-v-sep"></div>
          <div class="perf-stat-col">
            <div class="stat-num" style="color: #34D399;">1.196</div>
            <div class="stat-lbl">Menang</div>
          </div>
          <div class="stat-v-sep"></div>
          <div class="perf-stat-col">
            <div class="stat-num" style="color: #10B981;">84.2%</div>
            <div class="stat-lbl">Win Rate</div>
          </div>
        </div>

        <!-- OU Row -->
        <div class="perf-section-head" style="margin-top: 6px;">
          <div class="perf-tag-ou">O/U (Over/Under 2.5)</div>
          <div class="perf-title-desc">Total Gol Laga</div>
        </div>
        <div class="perf-stats-strip">
          <div class="perf-stat-col">
            <div class="stat-num">1.420</div>
            <div class="stat-lbl">Total Laga</div>
          </div>
          <div class="stat-v-sep"></div>
          <div class="perf-stat-col">
            <div class="stat-num" style="color: #34D399;">1.129</div>
            <div class="stat-lbl">Menang</div>
          </div>
          <div class="stat-v-sep"></div>
          <div class="perf-stat-col">
            <div class="stat-num" style="color: #10B981;">79.5%</div>
            <div class="stat-lbl">Win Rate</div>
          </div>
        </div>
      </div>

      <!-- Menu Grid -->
      <div class="menu-grid">
        <div class="menu-card">
          <div class="menu-icon-box" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">
            ${icons.calendar}
          </div>
          <div class="menu-text-col">
            <div class="menu-title">Jadwal</div>
            <div class="menu-desc">Odds & analisa</div>
          </div>
          ${icons.chevronRight}
        </div>
        <div class="menu-card">
          <div class="menu-icon-box" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">
            ${icons.ticket}
          </div>
          <div class="menu-text-col">
            <div class="menu-title">Parlay</div>
            <div class="menu-desc">Tiket multi-leg</div>
          </div>
          ${icons.chevronRight}
        </div>
        <div class="menu-card">
          <div class="menu-icon-box" style="background: rgba(99, 102, 241, 0.15); color: #818CF8;">
            ${icons.trophy}
          </div>
          <div class="menu-text-col">
            <div class="menu-title">Klasemen</div>
            <div class="menu-desc">Poin & klub</div>
          </div>
          ${icons.chevronRight}
        </div>
        <div class="menu-card">
          <div class="menu-icon-box" style="background: rgba(56, 189, 248, 0.15); color: #38BDF8;">
            ${icons.time}
          </div>
          <div class="menu-text-col">
            <div class="menu-title">Riwayat</div>
            <div class="menu-desc">Evaluasi skor</div>
          </div>
          ${icons.chevronRight}
        </div>
      </div>

      <!-- Section Top 5 Laga Pilihan -->
      <div class="section-header">
        <div>
          <div class="section-title">Pertandingan Mendatang</div>
          <div class="section-sub">Top 5 laga pilihan dari 5 liga top eropa</div>
        </div>
        <div class="see-all-btn">Lihat Semua</div>
      </div>

      <!-- Match Cards List -->
      <div class="match-card has-value">
        <div class="card-top-bar">
          <div class="match-time">${icons.time} 23:00 WITA</div>
          <div class="league-pill">Premier League</div>
        </div>
        <div class="card-main-row">
          <div class="teams-col">
            <div class="team-line">
              ${clubs.arsenal}
              <span class="team-title">Arsenal</span>
            </div>
            <div class="team-line">
              ${clubs.chelsea}
              <span class="team-title">Chelsea</span>
            </div>
          </div>
          <div class="col-divider"></div>
          <div class="picks-col">
            <div class="pick-row value-pick">
              <span class="pick-type-tag">1X2</span>
              <span class="pick-target">Home <span class="pick-odds">@1.85</span></span>
              <span class="badge-value">VALUE</span>
            </div>
            <div class="pick-row value-pick">
              <span class="pick-type-tag">O/U</span>
              <span class="pick-target">Over 2.5 <span class="pick-odds">@1.90</span></span>
              <span class="badge-value">VALUE</span>
            </div>
          </div>
        </div>
      </div>

      <div class="match-card has-value">
        <div class="card-top-bar">
          <div class="match-time">${icons.time} 21:30 WITA</div>
          <div class="league-pill">Bundesliga</div>
        </div>
        <div class="card-main-row">
          <div class="teams-col">
            <div class="team-line">
              ${clubs.dortmund}
              <span class="team-title">BVB Dortmund</span>
            </div>
            <div class="team-line">
              ${clubs.bayern}
              <span class="team-title">Bayern München</span>
            </div>
          </div>
          <div class="col-divider"></div>
          <div class="picks-col">
            <div class="pick-row value-pick">
              <span class="pick-type-tag">1X2</span>
              <span class="pick-target">Away <span class="pick-odds">@2.10</span></span>
              <span class="badge-value">VALUE</span>
            </div>
            <div class="pick-row value-pick">
              <span class="pick-type-tag">O/U</span>
              <span class="pick-target">Over 2.5 <span class="pick-odds">@1.55</span></span>
              <span class="badge-value">VALUE</span>
            </div>
          </div>
        </div>
      </div>

      <div class="match-card has-value">
        <div class="card-top-bar">
          <div class="match-time">${icons.time} 02:00 WITA</div>
          <div class="league-pill">La Liga</div>
        </div>
        <div class="card-main-row">
          <div class="teams-col">
            <div class="team-line">
              ${clubs.realmadrid}
              <span class="team-title">Real Madrid</span>
            </div>
            <div class="team-line">
              ${clubs.barcelona}
              <span class="team-title">Barcelona</span>
            </div>
          </div>
          <div class="col-divider"></div>
          <div class="picks-col">
            <div class="pick-row value-pick">
              <span class="pick-type-tag">1X2</span>
              <span class="pick-target">Home <span class="pick-odds">@2.05</span></span>
              <span class="badge-value">VALUE</span>
            </div>
            <div class="pick-row value-pick">
              <span class="pick-type-tag">O/U</span>
              <span class="pick-target">Over 2.5 <span class="pick-odds">@1.65</span></span>
              <span class="badge-value">VALUE</span>
            </div>
          </div>
        </div>
      </div>
      <div class="match-card has-value">
        <div class="card-top-bar">
          <div class="match-time">${icons.time} 02:45 WITA</div>
          <div class="league-pill">Serie A</div>
        </div>
        <div class="card-main-row">
          <div class="teams-col">
            <div class="team-line">
              ${clubs.inter}
              <span class="team-title">Inter Milan</span>
            </div>
            <div class="team-line">
              ${clubs.milan}
              <span class="team-title">AC Milan</span>
            </div>
          </div>
          <div class="col-divider"></div>
          <div class="picks-col">
            <div class="pick-row value-pick">
              <span class="pick-type-tag">1X2</span>
              <span class="pick-target">Home <span class="pick-odds">@2.15</span></span>
              <span class="badge-value">VALUE</span>
            </div>
            <div class="pick-row value-pick">
              <span class="pick-type-tag">O/U</span>
              <span class="pick-target">Under 2.5 <span class="pick-odds">@1.85</span></span>
              <span class="badge-value">VALUE</span>
            </div>
          </div>
        </div>
      </div>

      <div class="match-card has-value">
        <div class="card-top-bar">
          <div class="match-time">${icons.time} 03:00 WITA</div>
          <div class="league-pill">Ligue 1</div>
        </div>
        <div class="card-main-row">
          <div class="teams-col">
            <div class="team-line">
              ${clubs.psg}
              <span class="team-title">Paris SG</span>
            </div>
            <div class="team-line">
              ${clubs.marseille}
              <span class="team-title">Marseille</span>
            </div>
          </div>
          <div class="col-divider"></div>
          <div class="picks-col">
            <div class="pick-row value-pick">
              <span class="pick-type-tag">1X2</span>
              <span class="pick-target">Home <span class="pick-odds">@1.65</span></span>
              <span class="badge-value">VALUE</span>
            </div>
            <div class="pick-row value-pick">
              <span class="pick-type-tag">O/U</span>
              <span class="pick-target">Over 2.5 <span class="pick-odds">@1.60</span></span>
              <span class="badge-value">VALUE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderBottomNav('beranda')}
  </body>
  </html>`;
}

// ==========================================
// 2. SCREEN 2: JADWAL
// ==========================================
function renderFixturesScreen() {
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      ${globalStyles}
      /* Control Bar */
      .control-bar {
        background: #111827;
        border: 1.5px solid #1E293B;
        border-radius: 20px;
        padding: 14px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .filter-trigger {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(16, 185, 129, 0.15);
        border: 1.5px solid #10B981;
        color: #10B981;
        padding: 10px 18px;
        border-radius: 12px;
        font-weight: 800;
        font-size: 17px;
      }
      .filter-badge {
        background: #10B981;
        color: #064E3B;
        border-radius: 10px;
        padding: 2px 8px;
        font-size: 13px;
        font-weight: 900;
      }
      .date-nav {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .nav-arrow {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: #1E293B;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .date-center {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 19px;
        font-weight: 800;
        color: #F8FAFC;
      }
      .relative-pill {
        background: rgba(52, 211, 153, 0.18);
        color: #34D399;
        font-size: 13px;
        padding: 3px 10px;
        border-radius: 8px;
        font-weight: 800;
      }

      /* Search Bar */
      .search-box {
        background: #111827;
        border: 1.5px solid #1E293B;
        border-radius: 16px;
        padding: 14px 20px;
        display: flex;
        align-items: center;
        gap: 14px;
        color: #64748B;
        font-size: 18px;
        font-weight: 600;
      }

      /* Date Strip */
      .date-strip {
        display: flex;
        gap: 12px;
        overflow: hidden;
      }
      .date-chip {
        flex: 1;
        background: #111827;
        border: 1.5px solid #1E293B;
        border-radius: 16px;
        padding: 12px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .date-chip.active {
        background: #10B981;
        border-color: #34D399;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      }
      .day-name {
        font-size: 14px;
        font-weight: 700;
        color: #64748B;
      }
      .date-chip.active .day-name {
        color: #064E3B;
      }
      .day-num {
        font-size: 24px;
        font-weight: 900;
        color: #F8FAFC;
      }
      .date-chip.active .day-num {
        color: #022C22;
      }

      /* League Group Accordion */
      .league-section {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .league-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 4px;
      }
      .league-title-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .league-flag {
        font-size: 26px;
      }
      .league-group-name {
        font-size: 24px;
        font-weight: 900;
        color: #F8FAFC;
      }
      .league-match-count {
        background: #1E293B;
        color: #94A3B8;
        padding: 4px 12px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    ${renderHeader()}
    <div class="screen-content">
      <!-- Control Bar -->
      <div class="control-bar">
        <div class="filter-trigger">
          ${icons.filter}
          <span>Filter</span>
          <span class="filter-badge">3</span>
        </div>
        <div class="date-nav">
          <div class="nav-arrow">${icons.chevronLeft}</div>
          <div class="date-center">
            ${icons.calendar}
            <span>Sabtu, 17 Okt</span>
            <span class="relative-pill">Hari Ini</span>
          </div>
          <div class="nav-arrow" style="transform: rotate(180deg);">${icons.chevronLeft}</div>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="search-box">
        ${icons.search}
        <span>Cari klub atau liga di tanggal ini...</span>
      </div>

      <!-- Date Strip -->
      <div class="date-strip">
        <div class="date-chip">
          <div class="day-name">Rab</div>
          <div class="day-num">14</div>
        </div>
        <div class="date-chip">
          <div class="day-name">Kam</div>
          <div class="day-num">15</div>
        </div>
        <div class="date-chip">
          <div class="day-name">Jum</div>
          <div class="day-num">16</div>
        </div>
        <div class="date-chip active">
          <div class="day-name">Sab</div>
          <div class="day-num">17</div>
        </div>
        <div class="date-chip">
          <div class="day-name">Min</div>
          <div class="day-num">18</div>
        </div>
        <div class="date-chip">
          <div class="day-name">Sen</div>
          <div class="day-num">19</div>
        </div>
        <div class="date-chip">
          <div class="day-name">Sel</div>
          <div class="day-num">20</div>
        </div>
      </div>

      <!-- League Section: Premier League -->
      <div class="league-section">
        <div class="league-header">
          <div class="league-title-group">
            <span class="league-flag">🏴󠁧󠁢󠁥󠁮󠁧󠁿</span>
            <span class="league-group-name">Premier League</span>
            <span class="league-match-count">3 Laga</span>
          </div>
          ${icons.chevronDown}
        </div>

        <div class="match-card has-value">
          <div class="card-top-bar">
            <div class="match-time">${icons.time} 23:00 WITA</div>
            <div class="league-pill">Gameweek 9</div>
          </div>
          <div class="card-main-row">
            <div class="teams-col">
              <div class="team-line">
                ${clubs.arsenal}
                <span class="team-title">Arsenal</span>
              </div>
              <div class="team-line">
                ${clubs.chelsea}
                <span class="team-title">Chelsea</span>
              </div>
            </div>
            <div class="col-divider"></div>
            <div class="picks-col">
              <div class="pick-row value-pick">
                <span class="pick-type-tag">1X2</span>
                <span class="pick-target">Home <span class="pick-odds">@1.85</span></span>
                <span class="badge-value">VALUE</span>
              </div>
              <div class="pick-row value-pick">
                <span class="pick-type-tag">O/U</span>
                <span class="pick-target">Over 2.5 <span class="pick-odds">@1.90</span></span>
                <span class="badge-value">VALUE</span>
              </div>
            </div>
          </div>
        </div>

        <div class="match-card has-value">
          <div class="card-top-bar">
            <div class="match-time">${icons.time} 20:30 WITA</div>
            <div class="league-pill">Gameweek 9</div>
          </div>
          <div class="card-main-row">
            <div class="teams-col">
              <div class="team-line">
                ${clubs.mancity}
                <span class="team-title">Manchester City</span>
              </div>
              <div class="team-line">
                ${clubs.liverpool}
                <span class="team-title">Liverpool</span>
              </div>
            </div>
            <div class="col-divider"></div>
            <div class="picks-col">
              <div class="pick-row value-pick">
                <span class="pick-type-tag">1X2</span>
                <span class="pick-target">Home <span class="pick-odds">@2.00</span></span>
                <span class="badge-value">VALUE</span>
              </div>
              <div class="pick-row value-pick">
                <span class="pick-type-tag">O/U</span>
                <span class="pick-target">Over 2.5 <span class="pick-odds">@1.62</span></span>
                <span class="badge-value">VALUE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- League Section: La Liga -->
      <div class="league-section">
        <div class="league-header">
          <div class="league-title-group">
            <span class="league-flag">🇪🇸</span>
            <span class="league-group-name">La Liga</span>
            <span class="league-match-count">2 Laga</span>
          </div>
          ${icons.chevronDown}
        </div>

        <div class="match-card has-value">
          <div class="card-top-bar">
            <div class="match-time">${icons.time} 02:00 WITA</div>
            <div class="league-pill">El Clásico</div>
          </div>
          <div class="card-main-row">
            <div class="teams-col">
              <div class="team-line">
                ${clubs.realmadrid}
                <span class="team-title">Real Madrid</span>
              </div>
              <div class="team-line">
                ${clubs.barcelona}
                <span class="team-title">Barcelona</span>
              </div>
            </div>
            <div class="col-divider"></div>
            <div class="picks-col">
              <div class="pick-row value-pick">
                <span class="pick-type-tag">1X2</span>
                <span class="pick-target">Home <span class="pick-odds">@2.05</span></span>
                <span class="badge-value">VALUE</span>
              </div>
              <div class="pick-row value-pick">
                <span class="pick-type-tag">O/U</span>
                <span class="pick-target">Over 2.5 <span class="pick-odds">@1.65</span></span>
                <span class="badge-value">VALUE</span>
              </div>
            </div>
          </div>
        </div>

        <div class="match-card has-value">
          <div class="card-top-bar">
            <div class="match-time">${icons.time} 23:30 WITA</div>
            <div class="league-pill">La Liga</div>
          </div>
          <div class="card-main-row">
            <div class="teams-col">
              <div class="team-line">
                ${clubs.astonvilla}
                <span class="team-title">Atletico Madrid</span>
              </div>
              <div class="team-line">
                ${clubs.marseille}
                <span class="team-title">Sevilla</span>
              </div>
            </div>
            <div class="col-divider"></div>
            <div class="picks-col">
              <div class="pick-row value-pick">
                <span class="pick-type-tag">1X2</span>
                <span class="pick-target">Home <span class="pick-odds">@1.70</span></span>
                <span class="badge-value">VALUE</span>
              </div>
              <div class="pick-row value-pick">
                <span class="pick-type-tag">O/U</span>
                <span class="pick-target">Under 2.5 <span class="pick-odds">@1.80</span></span>
                <span class="badge-value">VALUE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- League Section: Serie A -->
      <div class="league-section">
        <div class="league-header">
          <div class="league-title-group">
            <span class="league-flag">🇮🇹</span>
            <span class="league-group-name">Serie A</span>
            <span class="league-match-count">2 Laga</span>
          </div>
          ${icons.chevronDown}
        </div>

        <div class="match-card has-value">
          <div class="card-top-bar">
            <div class="match-time">${icons.time} 02:45 WITA</div>
            <div class="league-pill">Derby della Madonnina</div>
          </div>
          <div class="card-main-row">
            <div class="teams-col">
              <div class="team-line">
                ${clubs.inter}
                <span class="team-title">Inter Milan</span>
              </div>
              <div class="team-line">
                ${clubs.milan}
                <span class="team-title">AC Milan</span>
              </div>
            </div>
            <div class="col-divider"></div>
            <div class="picks-col">
              <div class="pick-row value-pick">
                <span class="pick-type-tag">1X2</span>
                <span class="pick-target">Home <span class="pick-odds">@2.15</span></span>
                <span class="badge-value">VALUE</span>
              </div>
              <div class="pick-row value-pick">
                <span class="pick-type-tag">O/U</span>
                <span class="pick-target">Under 2.5 <span class="pick-odds">@1.85</span></span>
                <span class="badge-value">VALUE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderBottomNav('jadwal')}
  </body>
  </html>`;
}

// ==========================================
// 3. SCREEN 3: PARLAY
// ==========================================
function renderParlayScreen() {
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      ${globalStyles}
      /* Tabs Selector */
      .tabs-row {
        background: #111827;
        border: 1.5px solid #1E293B;
        border-radius: 18px;
        padding: 6px;
        display: flex;
        gap: 8px;
      }
      .tab-btn {
        flex: 1;
        padding: 14px 0;
        text-align: center;
        border-radius: 14px;
        font-size: 19px;
        font-weight: 800;
        color: #64748B;
      }
      .tab-btn.active {
        background: #10B981;
        color: #022C22;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
      }

      /* Stake Simulation Bar */
      .stake-bar {
        background: #0F172A;
        border: 1.5px solid #1E293B;
        border-radius: 20px;
        padding: 18px 24px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .stake-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .stake-label {
        font-size: 17px;
        color: #94A3B8;
        font-weight: 700;
      }
      .stake-value {
        font-size: 26px;
        font-weight: 900;
        color: #34D399;
      }
      .chips-row {
        display: flex;
        gap: 12px;
      }
      .stake-chip {
        flex: 1;
        background: #1E293B;
        border-radius: 12px;
        padding: 10px 0;
        text-align: center;
        font-size: 17px;
        font-weight: 800;
        color: #94A3B8;
      }
      .stake-chip.active {
        background: rgba(16, 185, 129, 0.2);
        border: 1.5px solid #10B981;
        color: #34D399;
      }

      /* Parlay Ticket Card */
      .ticket-box {
        background: #0F172A;
        border: 2px solid #10B981;
        border-radius: 24px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: 0 8px 30px rgba(16, 185, 129, 0.15);
      }
      .ticket-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1.5px dashed #334155;
        padding-bottom: 18px;
      }
      .ticket-id-tag {
        font-size: 22px;
        font-weight: 900;
        color: #F8FAFC;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .status-pill-green {
        background: rgba(16, 185, 129, 0.18);
        border: 1px solid #10B981;
        color: #34D399;
        font-size: 14px;
        font-weight: 800;
        padding: 4px 12px;
        border-radius: 8px;
      }
      .odds-big-badge {
        text-align: right;
      }
      .odds-x-val {
        font-size: 34px;
        font-weight: 900;
        color: #34D399;
        letter-spacing: -0.5px;
      }
      .odds-x-lbl {
        font-size: 14px;
        color: #94A3B8;
        font-weight: 700;
      }

      /* Legs Container */
      .legs-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .leg-item {
        background: #111827;
        border: 1.5px solid #1E293B;
        border-radius: 16px;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .leg-match-info {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .leg-league-badge {
        background: #1E293B;
        color: #94A3B8;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 800;
      }
      .leg-teams {
        font-size: 19px;
        font-weight: 800;
        color: #F8FAFC;
      }
      .leg-pick-badge {
        background: rgba(16, 185, 129, 0.15);
        border: 1.5px solid #10B981;
        border-radius: 10px;
        padding: 6px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .leg-pick-text {
        font-size: 16px;
        font-weight: 800;
        color: #34D399;
      }

      /* Est Win & Share */
      .est-win-row {
        background: #111827;
        border-radius: 16px;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid #1E293B;
      }
      .est-title {
        font-size: 16px;
        color: #94A3B8;
        font-weight: 700;
      }
      .est-amount {
        font-size: 28px;
        font-weight: 900;
        color: #10B981;
      }
      .share-ticket-btn {
        background: #10B981;
        color: #022C22;
        border-radius: 16px;
        padding: 18px 0;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        font-size: 20px;
        font-weight: 900;
        box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
      }
    </style>
  </head>
  <body>
    ${renderHeader()}
    <div class="screen-content">
      <!-- Tabs -->
      <div class="tabs-row">
        <div class="tab-btn active">Mendatang</div>
        <div class="tab-btn">Riwayat Parlay</div>
      </div>

      <!-- Stake Simulation Bar -->
      <div class="stake-bar">
        <div class="stake-head">
          <span class="stake-label">Simulasi Pasang Taruhan:</span>
          <span class="stake-value">Rp 25.000</span>
        </div>
        <div class="chips-row">
          <div class="stake-chip">10K</div>
          <div class="stake-chip active">25K</div>
          <div class="stake-chip">50K</div>
          <div class="stake-chip">100K</div>
        </div>
      </div>

      <!-- Parlay Ticket Box -->
      <div class="ticket-box">
        <div class="ticket-header">
          <div>
            <div class="ticket-id-tag">
              <span>Tiket Parlay AI #2601</span>
              <span class="status-pill-green">Mendatang</span>
            </div>
            <div style="font-size: 15px; color:#64748B; font-weight:600; margin-top:4px;">
              Probabilitas Gabungan: 68.4%
            </div>
          </div>
          <div class="odds-big-badge">
            <div class="odds-x-val">14.85x</div>
            <div class="odds-x-lbl">Total Multiplier</div>
          </div>
        </div>

        <!-- 4 Multi-Leg Items -->
        <div class="legs-list">
          <div class="leg-item">
            <div class="leg-match-info">
              ${clubs.arsenal}
              <div>
                <span class="leg-league-badge">Premier League</span>
                <div class="leg-teams">Arsenal vs Chelsea</div>
              </div>
            </div>
            <div class="leg-pick-badge">
              <span class="leg-pick-text">Home Win @1.85</span>
              <span class="badge-value">VALUE</span>
            </div>
          </div>

          <div class="leg-item">
            <div class="leg-match-info">
              ${clubs.dortmund}
              <div>
                <span class="leg-league-badge">Bundesliga</span>
                <div class="leg-teams">Dortmund vs Bayern</div>
              </div>
            </div>
            <div class="leg-pick-badge">
              <span class="leg-pick-text">Over 2.5 @1.55</span>
              <span class="badge-value">VALUE</span>
            </div>
          </div>

          <div class="leg-item">
            <div class="leg-match-info">
              ${clubs.realmadrid}
              <div>
                <span class="leg-league-badge">La Liga</span>
                <div class="leg-teams">Real Madrid vs Barca</div>
              </div>
            </div>
            <div class="leg-pick-badge">
              <span class="leg-pick-text">Over 2.5 @1.65</span>
              <span class="badge-value">VALUE</span>
            </div>
          </div>

          <div class="leg-item">
            <div class="leg-match-info">
              ${clubs.inter}
              <div>
                <span class="leg-league-badge">Serie A</span>
                <div class="leg-teams">Inter vs AC Milan</div>
              </div>
            </div>
            <div class="leg-pick-badge">
              <span class="leg-pick-text">Home Win @2.15</span>
              <span class="badge-value">VALUE</span>
            </div>
          </div>

          <div class="leg-item">
            <div class="leg-match-info">
              ${clubs.psg}
              <div>
                <span class="leg-league-badge">Ligue 1</span>
                <div class="leg-teams">Paris SG vs Marseille</div>
              </div>
            </div>
            <div class="leg-pick-badge">
              <span class="leg-pick-text">Home Win @1.65</span>
              <span class="badge-value">VALUE</span>
            </div>
          </div>
        </div>

        <!-- Est Win Row -->
        <div class="est-win-row">
          <div>
            <div class="est-title">Potensi Kemenangan Bersih</div>
            <div style="font-size:13px; color:#64748B; font-weight:700;">1.85 × 1.55 × 1.65 × 2.15 × 1.65</div>
          </div>
          <div class="est-amount">Rp 612.500</div>
        </div>

        <!-- Share Button -->
        <div class="share-ticket-btn">
          ${icons.share}
          <span>Bagikan Tiket Parlay</span>
        </div>
      </div>

      <!-- Secondary Ticket Preview -->
      <div style="background:#111827; border: 1.5px solid #1E293B; border-radius: 20px; padding: 18px 22px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size: 20px; font-weight: 800; color: #F8FAFC;">Tiket Parlay Konservatif #2602</div>
          <div style="font-size: 14px; color: #64748B; font-weight: 600; margin-top:2px;">3 Fold • Probabilitas 78.2%</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 26px; font-weight: 900; color: #34D399;">5.45x</div>
          <div style="font-size: 13px; color: #94A3B8; font-weight: 700;">Multiplier</div>
        </div>
      </div>
    </div>
    ${renderBottomNav('parlay')}
  </body>
  </html>`;
}

// ==========================================
// 4. SCREEN 4: KLASEMEN
// ==========================================
function renderStandingsScreen() {
  const standingsData = [
    { rank: 1, name: 'Arsenal', club: clubs.arsenal, p: 8, w: 6, d: 2, l: 0, gd: '+14', pts: 20, zone: 'ucl' },
    { rank: 2, name: 'Manchester City', club: clubs.mancity, p: 8, w: 6, d: 1, l: 1, gd: '+12', pts: 19, zone: 'ucl' },
    { rank: 3, name: 'Liverpool', club: clubs.liverpool, p: 8, w: 5, d: 2, l: 1, gd: '+10', pts: 17, zone: 'ucl' },
    { rank: 4, name: 'Chelsea', club: clubs.chelsea, p: 8, w: 4, d: 3, l: 1, gd: '+7', pts: 15, zone: 'ucl' },
    { rank: 5, name: 'Aston Villa', club: clubs.astonvilla, p: 8, w: 4, d: 2, l: 2, gd: '+4', pts: 14, zone: 'uel' },
    { rank: 6, name: 'Tottenham', club: clubs.tottenham, p: 8, w: 4, d: 1, l: 3, gd: '+5', pts: 13, zone: 'none' },
    { rank: 7, name: 'Newcastle United', club: clubs.newcastle, p: 8, w: 3, d: 3, l: 2, gd: '+2', pts: 12, zone: 'none' },
    { rank: 8, name: 'Brighton', club: clubs.brighton, p: 8, w: 3, d: 3, l: 2, gd: '+1', pts: 12, zone: 'none' },
    { rank: 9, name: 'Manchester United', club: clubs.manutd, p: 8, w: 3, d: 2, l: 3, gd: '-1', pts: 11, zone: 'none' },
    { rank: 10, name: 'Fulham', club: clubs.tottenham, p: 8, w: 3, d: 2, l: 3, gd: '0', pts: 11, zone: 'none' },
    { rank: 11, name: 'Brentford', club: clubs.arsenal, p: 8, w: 3, d: 1, l: 4, gd: '0', pts: 10, zone: 'none' },
    { rank: 12, name: 'West Ham', club: clubs.chelsea, p: 8, w: 2, d: 2, l: 4, gd: '-3', pts: 8, zone: 'none' },
    { rank: 13, name: 'Crystal Palace', club: clubs.tottenham, p: 8, w: 2, d: 2, l: 4, gd: '-4', pts: 8, zone: 'none' },
    { rank: 14, name: 'Everton', club: clubs.mancity, p: 8, w: 2, d: 2, l: 4, gd: '-5', pts: 8, zone: 'none' },
    { rank: 15, name: 'Leicester City', club: clubs.liverpool, p: 8, w: 1, d: 3, l: 4, gd: '-6', pts: 6, zone: 'none' },
    { rank: 16, name: 'Wolves', club: clubs.manutd, p: 8, w: 0, d: 2, l: 6, gd: '-12', pts: 2, zone: 'relegation' },
    { rank: 17, name: 'Southampton', club: clubs.arsenal, p: 8, w: 0, d: 1, l: 7, gd: '-13', pts: 1, zone: 'relegation' }
  ];

  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      ${globalStyles}
      /* League Chips Scroll */
      .leagues-chip-scroll {
        display: flex;
        gap: 12px;
        overflow: hidden;
      }
      .league-select-chip {
        background: #111827;
        border: 1.5px solid #1E293B;
        border-radius: 14px;
        padding: 12px 24px;
        font-size: 18px;
        font-weight: 800;
        color: #94A3B8;
        white-space: nowrap;
      }
      .league-select-chip.active {
        background: #10B981;
        border-color: #34D399;
        color: #022C22;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
      }

      /* Season Row */
      .season-select-row {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .season-title-lbl {
        font-size: 17px;
        font-weight: 800;
        color: #64748B;
      }
      .season-chips-box {
        display: flex;
        gap: 10px;
      }
      .season-chip-pill {
        background: #111827;
        border: 1px solid #1E293B;
        border-radius: 10px;
        padding: 8px 16px;
        font-size: 15px;
        font-weight: 800;
        color: #94A3B8;
      }
      .season-chip-pill.active {
        background: rgba(16, 185, 129, 0.2);
        border-color: #10B981;
        color: #34D399;
      }

      /* Standings Table Card */
      .table-card {
        background: #0F172A;
        border: 1.5px solid #1E293B;
        border-radius: 24px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      }
      .table-head-row {
        background: #111827;
        border-bottom: 2px solid #1E293B;
        display: flex;
        align-items: center;
        padding: 16px 20px;
        font-size: 15px;
        font-weight: 900;
        color: #64748B;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .table-data-row {
        display: flex;
        align-items: center;
        padding: 14px 20px;
        border-bottom: 1px solid #1E293B;
      }
      .table-data-row:nth-child(even) {
        background: rgba(30, 41, 59, 0.25);
      }
      .table-data-row.zone-ucl {
        border-left: 5px solid #3B82F6;
      }
      .table-data-row.zone-uel {
        border-left: 5px solid #F59E0B;
      }
      .table-data-row.zone-relegation {
        border-left: 5px solid #EF4444;
      }
      .table-data-row.zone-none {
        border-left: 5px solid transparent;
      }

      .col-r { width: 50px; font-size: 20px; font-weight: 900; color: #94A3B8; }
      .col-club { flex: 1; display: flex; align-items: center; gap: 14px; font-size: 20px; font-weight: 800; color: #F8FAFC; }
      .col-num { width: 65px; text-align: center; font-size: 19px; font-weight: 700; color: #94A3B8; }
      .col-pts { width: 85px; text-align: center; font-size: 23px; font-weight: 900; color: #34D399; }

      /* Legend Box */
      .legend-card {
        display: flex;
        gap: 24px;
        padding: 6px 10px;
        font-size: 15px;
        font-weight: 700;
        color: #94A3B8;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .legend-color-box {
        width: 12px;
        height: 12px;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    ${renderHeader()}
    <div class="screen-content">
      <!-- League Chips -->
      <div class="leagues-chip-scroll">
        <div class="league-select-chip active">Premier League</div>
        <div class="league-select-chip">La Liga</div>
        <div class="league-select-chip">Serie A</div>
        <div class="league-select-chip">Bundesliga</div>
        <div class="league-select-chip">Ligue 1</div>
        <div class="league-select-chip">Eredivisie</div>
      </div>

      <!-- Season Row -->
      <div class="season-select-row">
        <span class="season-title-lbl">Musim:</span>
        <div class="season-chips-box">
          <div class="season-chip-pill active">26/27 (Musim Ini)</div>
          <div class="season-chip-pill">25/26</div>
          <div class="season-chip-pill">24/25</div>
          <div class="season-chip-pill">23/24</div>
        </div>
      </div>

      <!-- Standings Table -->
      <div class="table-card">
        <div class="table-head-row">
          <div class="col-r">#</div>
          <div class="col-club">KLUB</div>
          <div class="col-num">MN</div>
          <div class="col-num">M</div>
          <div class="col-num">S</div>
          <div class="col-num">K</div>
          <div class="col-num">SG</div>
          <div class="col-pts">PTS</div>
        </div>

        ${standingsData.map(t => `
          <div class="table-data-row zone-${t.zone}">
            <div class="col-r">${t.rank}</div>
            <div class="col-club">
              ${t.club}
              <span>${t.name}</span>
            </div>
            <div class="col-num">${t.p}</div>
            <div class="col-num">${t.w}</div>
            <div class="col-num">${t.d}</div>
            <div class="col-num">${t.l}</div>
            <div class="col-num">${t.gd}</div>
            <div class="col-pts">${t.pts}</div>
          </div>
        `).join('')}
      </div>

      <!-- Legend -->
      <div class="legend-card">
        <div class="legend-item">
          <div class="legend-color-box" style="background:#3B82F6;"></div>
          <span>Zona UEFA Champions League (1-4)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color-box" style="background:#F59E0B;"></div>
          <span>Zona UEFA Europa League (5)</span>
        </div>
      </div>
    </div>
    ${renderBottomNav('klasemen')}
  </body>
  </html>`;
}

// ==========================================
// 5. SCREEN 5: RIWAYAT
// ==========================================
function renderHistoryScreen() {
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      ${globalStyles}
      /* Summary Box */
      .summary-card {
        background: #0F172A;
        border: 1.5px solid #1E293B;
        border-radius: 22px;
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 18px rgba(0,0,0,0.3);
      }
      .summary-col {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .sum-head {
        font-size: 15px;
        font-weight: 700;
        color: #64748B;
        text-transform: uppercase;
      }
      .sum-val {
        font-size: 32px;
        font-weight: 900;
        color: #F8FAFC;
        letter-spacing: -0.5px;
      }
      .sum-sep {
        width: 1.5px;
        height: 50px;
        background: #1E293B;
      }

      /* Filter & Season Control */
      .history-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
      }
      .result-filter-pills {
        display: flex;
        gap: 10px;
      }
      .res-pill {
        background: #111827;
        border: 1px solid #1E293B;
        border-radius: 12px;
        padding: 10px 18px;
        font-size: 16px;
        font-weight: 800;
        color: #94A3B8;
      }
      .res-pill.active {
        background: rgba(16, 185, 129, 0.18);
        border-color: #10B981;
        color: #34D399;
      }
      .season-dropdown-btn {
        background: #111827;
        border: 1px solid #1E293B;
        border-radius: 12px;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 800;
        color: #38BDF8;
      }

      /* Search Row */
      .search-box {
        background: #111827;
        border: 1.5px solid #1E293B;
        border-radius: 16px;
        padding: 14px 20px;
        display: flex;
        align-items: center;
        gap: 14px;
        color: #64748B;
        font-size: 18px;
        font-weight: 600;
      }

      /* History Match Card */
      .history-card {
        background: #111827;
        border: 1.5px solid #1E293B;
        border-radius: 22px;
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      }
      .history-top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ft-score-badge {
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid #10B981;
        color: #34D399;
        font-size: 18px;
        font-weight: 900;
        padding: 4px 14px;
        border-radius: 10px;
      }
      .eval-row {
        display: flex;
        gap: 12px;
      }
      .eval-box {
        flex: 1;
        background: #0F172A;
        border: 1.5px solid #1E293B;
        border-radius: 14px;
        padding: 10px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .eval-box.won {
        border-color: rgba(16, 185, 129, 0.4);
        background: rgba(16, 185, 129, 0.08);
      }
      .eval-title {
        font-size: 15px;
        font-weight: 800;
        color: #94A3B8;
      }
      .eval-target {
        font-size: 17px;
        font-weight: 900;
        color: #F8FAFC;
      }
      .status-tag-won {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #10B981;
        font-size: 14px;
        font-weight: 900;
      }
    </style>
  </head>
  <body>
    ${renderHeader()}
    <div class="screen-content">
      <!-- Summary Performance Box -->
      <div class="summary-card">
        <div class="summary-col">
          <span class="sum-head">Total Laga Teruji</span>
          <span class="sum-val">1.420</span>
        </div>
        <div class="sum-sep"></div>
        <div class="summary-col">
          <span class="sum-head">Akurasi Win Rate</span>
          <span class="sum-val" style="color: #10B981;">84.2%</span>
        </div>
        <div class="sum-sep"></div>
        <div class="summary-col">
          <span class="sum-head">Hasil Menang</span>
          <span class="sum-val" style="color: #34D399;">1.196</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="history-controls">
        <div class="result-filter-pills">
          <div class="res-pill active">Semua Laga</div>
          <div class="res-pill">Menang (1.196)</div>
          <div class="res-pill">Kalah (224)</div>
        </div>
        <div class="season-dropdown-btn">
          ${icons.calendar}
          <span>2026/27</span>
          ${icons.chevronDown}
        </div>
      </div>

      <!-- Search Box -->
      <div class="search-box">
        ${icons.search}
        <span>Cari tim atau laga di riwayat...</span>
      </div>

      <!-- History Card 1 -->
      <div class="history-card">
        <div class="history-top-row">
          <div class="match-time">${icons.time} Kemarin • 21:00 WITA</div>
          <div class="ft-score-badge">FT: 3 - 1</div>
        </div>
        <div class="card-main-row">
          <div class="teams-col">
            <div class="team-line">
              ${clubs.arsenal}
              <span class="team-title">Arsenal (3)</span>
            </div>
            <div class="team-line">
              ${clubs.chelsea}
              <span class="team-title">Chelsea (1)</span>
            </div>
          </div>
          <div class="col-divider"></div>
          <div class="picks-col">
            <div class="pick-row value-pick">
              <span class="pick-type-tag">1X2</span>
              <span class="pick-target">Home @1.85</span>
              <span class="status-tag-won">${icons.check} MENANG</span>
            </div>
            <div class="pick-row value-pick">
              <span class="pick-type-tag">O/U</span>
              <span class="pick-target">Over 2.5 @1.90</span>
              <span class="status-tag-won">${icons.check} MENANG</span>
            </div>
          </div>
        </div>
      </div>

      <!-- History Card 2 -->
      <div class="history-card">
        <div class="history-top-row">
          <div class="match-time">${icons.time} 15 Okt • 02:00 WITA</div>
          <div class="ft-score-badge">FT: 2 - 1</div>
        </div>
        <div class="card-main-row">
          <div class="teams-col">
            <div class="team-line">
              ${clubs.realmadrid}
              <span class="team-title">Real Madrid (2)</span>
            </div>
            <div class="team-line">
              ${clubs.barcelona}
              <span class="team-title">Barcelona (1)</span>
            </div>
          </div>
          <div class="col-divider"></div>
          <div class="picks-col">
            <div class="pick-row value-pick">
              <span class="pick-type-tag">1X2</span>
              <span class="pick-target">Home @2.05</span>
              <span class="status-tag-won">${icons.check} MENANG</span>
            </div>
            <div class="pick-row value-pick">
              <span class="pick-type-tag">O/U</span>
              <span class="pick-target">Over 2.5 @1.65</span>
              <span class="status-tag-won">${icons.check} MENANG</span>
            </div>
          </div>
        </div>
      </div>

      <!-- History Card 3 -->
      <div class="history-card">
        <div class="history-top-row">
          <div class="match-time">${icons.time} 14 Okt • 21:30 WITA</div>
          <div class="ft-score-badge">FT: 2 - 2</div>
        </div>
        <div class="card-main-row">
          <div class="teams-col">
            <div class="team-line">
              ${clubs.dortmund}
              <span class="team-title">BVB Dortmund (2)</span>
            </div>
            <div class="team-line">
              ${clubs.bayern}
              <span class="team-title">Bayern München (2)</span>
            </div>
          </div>
          <div class="col-divider"></div>
          <div class="picks-col">
            <div class="pick-row value-pick">
              <span class="pick-type-tag">1X2</span>
              <span class="pick-target">Draw @3.40</span>
              <span class="status-tag-won">${icons.check} MENANG</span>
            </div>
            <div class="pick-row value-pick">
              <span class="pick-type-tag">O/U</span>
              <span class="pick-target">Over 2.5 @1.50</span>
              <span class="status-tag-won">${icons.check} MENANG</span>
            </div>
          </div>
        </div>
      </div>

      <!-- History Card 4 -->
      <div class="history-card">
        <div class="history-top-row">
          <div class="match-time">${icons.time} 13 Okt • 02:45 WITA</div>
          <div class="ft-score-badge">FT: 1 - 0</div>
        </div>
        <div class="card-main-row">
          <div class="teams-col">
            <div class="team-line">
              ${clubs.inter}
              <span class="team-title">Inter Milan (1)</span>
            </div>
            <div class="team-line">
              ${clubs.juventus}
              <span class="team-title">Juventus (0)</span>
            </div>
          </div>
          <div class="col-divider"></div>
          <div class="picks-col">
            <div class="pick-row value-pick">
              <span class="pick-type-tag">1X2</span>
              <span class="pick-target">Home @2.10</span>
              <span class="status-tag-won">${icons.check} MENANG</span>
            </div>
            <div class="pick-row value-pick">
              <span class="pick-type-tag">O/U</span>
              <span class="pick-target">Under 2.5 @1.85</span>
              <span class="status-tag-won">${icons.check} MENANG</span>
            </div>
          </div>
        </div>
      </div>

      <!-- History Card 5 -->
      <div class="history-card">
        <div class="history-top-row">
          <div class="match-time">${icons.time} 12 Okt • 03:00 WITA</div>
          <div class="ft-score-badge">FT: 3 - 1</div>
        </div>
        <div class="card-main-row">
          <div class="teams-col">
            <div class="team-line">
              ${clubs.psg}
              <span class="team-title">Paris SG (3)</span>
            </div>
            <div class="team-line">
              ${clubs.marseille}
              <span class="team-title">Marseille (1)</span>
            </div>
          </div>
          <div class="col-divider"></div>
          <div class="picks-col">
            <div class="pick-row value-pick">
              <span class="pick-type-tag">1X2</span>
              <span class="pick-target">Home @1.65</span>
              <span class="status-tag-won">${icons.check} MENANG</span>
            </div>
            <div class="pick-row value-pick">
              <span class="pick-type-tag">O/U</span>
              <span class="pick-target">Over 2.5 @1.60</span>
              <span class="status-tag-won">${icons.check} MENANG</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderBottomNav('riwayat')}
  </body>
  </html>`;
}

// Main execution function
async function generateAllScreenshots() {
  const screens = [
    { name: 'screenshot_1_beranda', html: renderHomeScreen() },
    { name: 'screenshot_2_jadwal', html: renderFixturesScreen() },
    { name: 'screenshot_3_parlay', html: renderParlayScreen() },
    { name: 'screenshot_4_klasemen', html: renderStandingsScreen() },
    { name: 'screenshot_5_riwayat', html: renderHistoryScreen() },
  ];

  console.log('Launching browser to render 5 app screens...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

  for (let s of screens) {
    const htmlFile = path.resolve(__dirname, `${s.name}.html`);
    fs.writeFileSync(htmlFile, s.html, 'utf8');

    const fileUri = 'file:///' + htmlFile.replace(/\\/g, '/');
    await page.goto(fileUri, { waitUntil: 'networkidle0' });

    const pngFile = path.resolve(__dirname, `${s.name}.png`);
    const jpgFile = path.resolve(__dirname, `${s.name}.jpg`);

    // Capture standard 1080x1920 PNG
    await page.screenshot({ path: pngFile, fullPage: false, omitBackground: false });
    // Also capture JPEG as an alternative
    await page.screenshot({ path: jpgFile, type: 'jpeg', quality: 95, fullPage: false });

    console.log(`Generated: ${s.name}.png & ${s.name}.jpg (1080x1920)`);
  }

  await browser.close();
  console.log('All 5 screenshots generated successfully!');
}

generateAllScreenshots().catch(err => {
  console.error('Failed generating screenshots:', err);
  process.exit(1);
});
