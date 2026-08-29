import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from config import MODELS_DIR, KELLY_FRACTION

class BettingState:
    N_EDGE_BINS    = 5
    N_EV_BINS      = 4
    N_KELLY_BINS   = 4
    N_BANKROLL_BINS= 4

    EDGE_BINS    = [0.03, 0.06, 0.10, 0.15]
    EV_BINS      = [0.0,  0.05, 0.10, 0.20]
    KELLY_BINS   = [0.02, 0.05, 0.10, 0.20]
    BANKROLL_BINS= [0.5,  0.75, 1.0,  1.5 ]

    @staticmethod
    def discretize(edge, ev, kelly, bankroll_ratio):
        e_bin = int(np.digitize(edge,    BettingState.EDGE_BINS))
        v_bin = int(np.digitize(ev,      BettingState.EV_BINS))
        k_bin = int(np.digitize(kelly,   BettingState.KELLY_BINS))
        b_bin = int(np.digitize(bankroll_ratio, BettingState.BANKROLL_BINS))
        return (e_bin, v_bin, k_bin, b_bin)

    @staticmethod
    def n_states():
        return (BettingState.N_EDGE_BINS * BettingState.N_EV_BINS *
                BettingState.N_KELLY_BINS * BettingState.N_BANKROLL_BINS)

# --- REVISI KELAS AKSI ---
# Membatasi keserakahan. 100% Kelly sangat berbahaya, maksimal 80%.
ACTIONS = {
    0: 0.00,  # Skip
    1: 0.10,  # 10% Kelly (Sangat Aman)
    2: 0.25,  # 25% Kelly (Aman)
    3: 0.50,  # Half Kelly (Agresif Terukur)
    4: 0.80,  # 80% Kelly (Maksimal)
}

class QLearningAgent:
    def __init__(self, alpha=0.1, gamma=0.95, epsilon=0.3,
                 epsilon_decay=0.995, epsilon_min=0.05):
        self.alpha         = alpha
        self.gamma         = gamma
        self.epsilon       = epsilon
        self.epsilon_decay = epsilon_decay
        self.epsilon_min   = epsilon_min
        self.q_table: dict = {}

    def _key(self, state):
        return state

    def get_q(self, state, action):
        # Optimisme ringan agar berani mencoba, tapi tidak over-pede
        return self.q_table.get((self._key(state), action), 0.01)

    def best_action(self, state):
        qs = {a: self.get_q(state, a) for a in ACTIONS}
        return max(qs, key=qs.get)

    def choose_action(self, state):
        if np.random.random() < self.epsilon:
            return np.random.choice(list(ACTIONS.keys()))
        return self.best_action(state)

    def update(self, state, action, reward, next_state):
        curr_q   = self.get_q(state, action)
        max_next = max(self.get_q(next_state, a) for a in ACTIONS)
        new_q    = curr_q + self.alpha * (reward + self.gamma * max_next - curr_q)
        self.q_table[(self._key(state), action)] = new_q

    def decay_epsilon(self):
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)

def _build_bet_sequence(df_bets: pd.DataFrame, init_bankroll: float = 50000.0) -> list:
    sequence = []
    for _, row in df_bets.iterrows():
        sequence.append({
            'edge':       float(row.get('edge', 0)),
            'ev':         float(row.get('ev', 0)),
            'kelly':      float(row.get('kelly_frac', 0)),
            'odds':       float(row.get('bookie_odds', 2.0)),
            'won':        bool(row.get('won', False)),
        })
    return sequence

def train_rl_agent(df_bets: pd.DataFrame, n_episodes: int = 2000,
                   init_bankroll: float = 50000.0) -> QLearningAgent:
    agent    = QLearningAgent()
    sequence = _build_bet_sequence(df_bets, init_bankroll)
    if not sequence:
        print("Tidak ada data bet untuk training RL agent")
        return agent

    for episode in range(n_episodes):
        bankroll = init_bankroll
        for bet in sequence:
            edge    = bet['edge']
            ev      = bet['ev']
            kelly_f = bet['kelly']
            br_ratio= bankroll / init_bankroll

            state  = BettingState.discretize(edge, ev, kelly_f, br_ratio)
            action = agent.choose_action(state)
            frac   = ACTIONS[action] * kelly_f

            # --- BALANCED REWARD SYSTEM ---
            if action == 0:
                profit = 0.0
                if bet['won']:
                    # Hukuman ringan karena melewatkan tiket profit
                    reward = -0.01 
                else:
                    # Penghargaan kecil karena berhasil menghindari kekalahan
                    reward = 0.01 
            else:
                stake = bankroll * frac
                if bet['won']:
                    profit  = stake * (bet['odds'] - 1.0)
                    reward  = profit / init_bankroll  # Proporsional murni dengan profit
                else:
                    profit  = -stake
                    reward  = profit / init_bankroll  # Proporsional murni dengan loss (minus)

            bankroll = max(1.0, bankroll + profit)
            new_ratio= bankroll / init_bankroll
            new_state= BettingState.discretize(edge, ev, kelly_f, new_ratio)
            agent.update(state, action, reward, new_state)

        agent.decay_epsilon()
        if (episode + 1) % 200 == 0:
            print(f"  Episode {episode+1}/{n_episodes}  ε={agent.epsilon:.3f}")

    return agent

def rl_recommend(agent: QLearningAgent, bets: list,
                 bankroll: float, init_bankroll: float = 50000.0) -> list:
    recommendations = []
    for bet in bets:
        state  = BettingState.discretize(
            bet['edge'], bet['ev'], bet['kelly_frac'], bankroll / init_bankroll)
        action = agent.best_action(state)
        frac   = ACTIONS[action] * bet['kelly_frac']
        stake  = bankroll * frac
        recommendations.append({
            **bet,
            'rl_action':      action,
            'rl_kelly_frac':  round(frac, 4),
            'rl_stake':       round(stake, 2),
            'rl_description': f"Bet {int(ACTIONS[action]*100)}% of Kelly = Rp {stake:,.2f}",
        })
    return recommendations

def save_agent(agent: QLearningAgent, name: str = 'rl_agent'):
    path = MODELS_DIR / "global" / f"{name}.pkl"
    joblib.dump(agent, path)
    print(f"RL agent saved: {path}")

def load_agent(name: str = 'rl_agent') -> QLearningAgent:
    path = MODELS_DIR / "global" / f"{name}.pkl"
    if not path.exists():
        raise FileNotFoundError(f"RL agent tidak ditemukan: {path}")
    return joblib.load(path)