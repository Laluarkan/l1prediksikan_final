from pathlib import Path

ROOT        = Path(__file__).parent
DATA_RAW    = ROOT / "data" / "raw"
DATA_CACHE  = ROOT / "data" / "cache"
DATA_ENRICH = ROOT / "data" / "enriched"
MODELS_DIR  = ROOT / "models"
REPORTS_DIR = ROOT / "reports"
LOGS_DIR    = ROOT / "logs"

for d in [DATA_RAW, DATA_CACHE, DATA_ENRICH,
          MODELS_DIR / "global", MODELS_DIR / "finetuned",
          REPORTS_DIR / "charts", REPORTS_DIR / "metrics", LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

LEAGUES = ["E0", "SP1", "I1", "D1", "F1", "N1", "B1", "P1", "T1", "G1", "SC0"]
SEASONS = ["2122", "2223", "2324", "2425", "2526"]
TARGETS = ["FTR", "OU25", "BTTS"]

LEAGUE_NAMES = {
    "E0": "EPL", "SP1": "La Liga", "I1": "Serie A", "D1": "Bundesliga",
    "F1": "Ligue 1", "N1": "Eredivisie", "B1": "Jupiler Pro League",
    "P1": "Primeira Liga", "T1": "Süper Lig", "G1": "Super League",
    "SC0": "Scottish Premiership",
}

STADIUM_COORDS = {
    "E0":  (51.509865, -0.118092),
    "SP1": (40.416775, -3.703790),
    "I1":  (45.464664,  9.188540),
    "D1":  (52.520008, 13.404954),
    "F1":  (48.856613,  2.352222),
    "N1":  (52.370216,  4.895168),
    "B1":  (50.850346,  4.351721),
    "P1":  (38.716671, -9.139470),
    "T1":  (41.015137, 28.979530),
    "G1":  (37.983810, 23.727539),
    "SC0": (55.953251, -3.188267),
}

SPLIT_RATIOS = {
    "train": 0.70,
    "val":   0.15,
    "test":  0.15,
}

ELO_K          = 20.0
ELO_HOME_ADV   = 100.0
ELO_INIT       = 1500.0
ELO_DECAY      = 0.70

FINETUNE_AUC_THRESHOLD = 0.62

LEAGUE_GROUPS = {
    "low_scoring":  ["I1", "F1", "SP1"],
    "high_scoring": ["D1", "N1", "B1"],
    "mid_tier":     ["E0", "SC0", "P1", "G1", "T1"],
}

MIN_FINETUNE_IMPROVEMENT = 0.005
N_OPTUNA_TRIALS_GLOBAL   = 50
N_OPTUNA_TRIALS_FINETUNE = 40

# --- UBAH BAGIAN BAWAH config.py MENJADI INI ---
KELLY_FRACTION     = 0.50  # Diubah dari 0.25 (Lebih agresif dalam mengelola modal)
MIN_EDGE_THRESHOLD = 0.02  # Diubah dari 0.03 (Menerima Edge 2% sebagai Value Bet)
MIN_ODDS           = 1.20  # Diubah dari 1.30 (Menerima tim favorit yang sangat kuat)
MAX_ODDS           = 15.0  # Diubah dari 10.0 (Membuka ruang untuk odds tinggi jika Edge sangat bagus)