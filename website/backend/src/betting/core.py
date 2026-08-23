import numpy as np
import pandas as pd
from config import KELLY_FRACTION, MIN_EDGE_THRESHOLD, MIN_ODDS, MAX_ODDS

def implied_prob(odds: float) -> float:
    if odds <= 1.0:
        return np.nan
    return 1.0 / odds

def edge(model_prob: float, bookie_prob: float) -> float:
    if np.isnan(bookie_prob) or bookie_prob <= 0:
        return np.nan
    return model_prob - bookie_prob

def kelly(model_prob: float, odds: float, fraction: float = KELLY_FRACTION) -> float:
    if odds <= 1.0 or model_prob <= 0:
        return 0.0
    b = odds - 1.0
    q = 1.0 - model_prob
    f = (model_prob * b - q) / b
    return max(0.0, f * fraction)

def expected_value(model_prob: float, odds: float) -> float:
    return (model_prob * (odds - 1.0)) - (1.0 - model_prob)

def detect_value_bets(model_probs: np.ndarray, odds_dict: dict,
                      label_names: list = None,
                      min_edge: float = MIN_EDGE_THRESHOLD) -> list:
    bets = []
    if label_names:
        for i, label in enumerate(label_names):
            odds = odds_dict.get(label)
            if odds is None or np.isnan(odds) or not (MIN_ODDS <= odds <= MAX_ODDS):
                continue
            mp = float(model_probs[i])
            bp = implied_prob(odds)
            e  = edge(mp, bp)
            if np.isnan(e) or e < min_edge:
                continue
            bets.append({
                'outcome':      label,
                'model_prob':   round(mp, 4),
                'bookie_prob':  round(bp, 4),
                'bookie_odds':  round(odds, 2),
                'edge':         round(e, 4),
                'ev':           round(expected_value(mp, odds), 4),
                'kelly_frac':   round(kelly(mp, odds), 4),
            })
    else:
        for label, odds in odds_dict.items():
            if odds is None or np.isnan(odds) or not (MIN_ODDS <= odds <= MAX_ODDS):
                continue
            idx = 1 if label in ('over', 'yes', 1, '1') else 0
            mp  = float(model_probs[idx])
            bp  = implied_prob(odds)
            e   = edge(mp, bp)
            if np.isnan(e) or e < min_edge:
                continue
            bets.append({
                'outcome':     label,
                'model_prob':  round(mp, 4),
                'bookie_prob': round(bp, 4),
                'bookie_odds': round(odds, 2),
                'edge':        round(e, 4),
                'ev':          round(expected_value(mp, odds), 4),
                'kelly_frac':  round(kelly(mp, odds), 4),
            })
    return bets

def profitability_summary(bets: list, bankroll: float = 1000.0) -> dict:
    if not bets:
        return {'n_bets': 0, 'total_ev': 0.0, 'recommended_stake': 0.0}
    total_ev    = sum(b['ev'] for b in bets)
    total_kelly = sum(b['kelly_frac'] for b in bets)
    return {
        'n_bets':            len(bets),
        'total_ev':          round(total_ev, 4),
        'avg_edge':          round(np.mean([b['edge'] for b in bets]), 4),
        'recommended_stake': round(min(total_kelly, 0.20) * bankroll, 2),
        'is_profitable':     total_ev > 0,
    }