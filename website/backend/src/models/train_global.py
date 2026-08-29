import os
import sys
from pathlib import Path

# -- PATH INJECTION: Mencegah ModuleNotFoundError --
CURRENT_DIR = Path(__file__).resolve().parent
SRC_DIR = CURRENT_DIR.parent
BACKEND_DIR = SRC_DIR.parent

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
# --------------------------------------------------

import re
import pandas as pd
import numpy as np
import joblib
from lightgbm import LGBMClassifier
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score
import warnings

warnings.filterwarnings('ignore')

from config import MODELS_DIR, SPLIT_RATIOS, TARGETS, LEAGUES, FINETUNE_AUC_THRESHOLD

def prepare_data(df_path):
    df = pd.read_csv(df_path, low_memory=False)
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.sort_values('Date').dropna(subset=['Date', 'FTHG', 'FTAG', 'FTR']).reset_index(drop=True)
    
    df['target_FTR'] = df['FTR'].map({'A': 0, 'D': 1, 'H': 2})
    df['target_OU25'] = ((df['FTHG'] + df['FTAG']) > 2.5).astype(int)
    df['target_BTTS'] = ((df['FTHG'] > 0) & (df['FTAG'] > 0)).astype(int)
    
    drop_cols = [
        'Date', 'HomeTeam', 'AwayTeam', 'FTR', 'FTHG', 'FTAG', 'HTHG', 'HTAG', 'HTR', 'Referee', 'Season', 'Div',
        'HS', 'AS', 'HST', 'AST', 'HF', 'AF', 'HC', 'AC', 'HY', 'AY', 'HR', 'AR'
    ]
    raw_odds = [c for c in df.columns if c in ['B365H','B365D','B365A','BWH','BWD','BWA','PSH','PSD','PSA','MaxH','MaxD','MaxA','AvgH','AvgD','AvgA']]
    drop_cols.extend(raw_odds)
    
    def clean_col_name(col):
        c = str(col).replace('>', '_over_').replace('<', '_under_')
        c = re.sub(r'[^\w]', '_', c)
        return re.sub(r'_+', '_', c).strip('_')
        
    df = df.rename(columns=clean_col_name)
    df = df.loc[:, ~df.columns.duplicated()]
    drop_cols = [clean_col_name(c) for c in drop_cols]
    
    candidate_features = [c for c in df.columns if c not in drop_cols and not c.startswith('target_')]
    features = df[candidate_features].select_dtypes(include=['number', 'bool']).columns.tolist()
            
    train_idx = int(len(df) * SPLIT_RATIOS['train'])
    val_idx = int(len(df) * (SPLIT_RATIOS['train'] + SPLIT_RATIOS['val']))
    
    train = df.iloc[:train_idx]
    val = df.iloc[train_idx:val_idx]
    test = df.iloc[val_idx:]
    
    return train, val, test, features

def train_target(target_name, train, val, test, features):
    print(f"\n" + "="*50)
    print(f" TRAINING GLOBAL MODEL: {target_name} ".center(50, "="))
    print("="*50)
    
    X_train, y_train = train[features], train[f'target_{target_name}']
    X_val, y_val = val[features], val[f'target_{target_name}']
    X_test, y_test = test[features], test[f'target_{target_name}']
    
    if target_name == 'FTR':
        model = LGBMClassifier(n_estimators=300, learning_rate=0.05, objective='multiclass', random_state=42, n_jobs=-1, class_weight='balanced')
    else:
        model = LGBMClassifier(n_estimators=300, learning_rate=0.05, objective='binary', random_state=42, n_jobs=-1, scale_pos_weight=1.2)
        
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val), (X_train, y_train)],
        eval_metric='multi_logloss' if target_name == 'FTR' else 'binary_logloss',
    )
    
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    if target_name == 'FTR':
        auc = roc_auc_score(y_test, y_prob, multi_class='ovr')
    else:
        auc = roc_auc_score(y_test, y_prob[:, 1])
        
    print(f"\n[HASIL EVALUASI GLOBAL {target_name}]")
    print(f"Accuracy : {acc:.4f}")
    print(f"AUC      : {auc:.4f}")
    
    model_path = MODELS_DIR / "global" / f"lgbm_global_{target_name}.pkl"
    joblib.dump(model, model_path)
    print(f"-> Model Global disimpan di {model_path}")
    
    return model

def evaluate_and_finetune(train, val, test, features, target_name, global_model, threshold=FINETUNE_AUC_THRESHOLD):
    print(f"\n--- CEK PERFORMA PER-LIGA UNTUK {target_name} ---")
    
    leagues_to_finetune = []
    
    for league in LEAGUES:
        val_league = val[val['Div'] == league]
        if len(val_league) == 0:
            continue
            
        X_val_l = val_league[features]
        y_val_l = val_league[f'target_{target_name}']
        
        if len(y_val_l.unique()) < 2:
            continue
            
        y_prob_l = global_model.predict_proba(X_val_l)
        
        if target_name == 'FTR':
            auc = roc_auc_score(y_val_l, y_prob_l, multi_class='ovr')
        else:
            auc = roc_auc_score(y_val_l, y_prob_l[:, 1])
            
        indicator = "❌ Finetune" if auc < threshold else "✅ OK"
        print(f"Liga {league:4} - AUC Global: {auc:.4f} [{indicator}]")
        
        if auc < threshold:
            leagues_to_finetune.append(league)
            
    if not leagues_to_finetune:
        print(f"Semua liga di atas threshold ({threshold}). Tidak perlu fine-tuning.")
        return
        
    print(f"\n-> Memulai Fine-tuning untuk liga: {leagues_to_finetune}")
    
    for league in leagues_to_finetune:
        train_l = train[train['Div'] == league]
        val_l = val[val['Div'] == league]
        
        X_train_l, y_train_l = train_l[features], train_l[f'target_{target_name}']
        X_val_l, y_val_l = val_l[features], val_l[f'target_{target_name}']
        
        if target_name == 'FTR':
            model = LGBMClassifier(n_estimators=200, learning_rate=0.03, objective='multiclass', random_state=42, n_jobs=-1, class_weight='balanced')
            eval_metric = 'multi_logloss'
        else:
            model = LGBMClassifier(n_estimators=200, learning_rate=0.03, objective='binary', random_state=42, n_jobs=-1, scale_pos_weight=1.2)
            eval_metric = 'binary_logloss'
            
        model.fit(
            X_train_l, y_train_l,
            eval_set=[(X_val_l, y_val_l), (X_train_l, y_train_l)],
            eval_metric=eval_metric,
        )
        
        y_prob_val = model.predict_proba(X_val_l)
        if target_name == 'FTR':
            new_auc = roc_auc_score(y_val_l, y_prob_val, multi_class='ovr')
        else:
            new_auc = roc_auc_score(y_val_l, y_prob_val[:, 1])
            
        print(f"   [Selesai] {league} | AUC Baru: {new_auc:.4f}")
        
        model_path = MODELS_DIR / "finetuned" / f"lgbm_finetuned_{target_name}_{league}.pkl"
        joblib.dump(model, model_path)

def main():
    data_path = BACKEND_DIR / "data" / "enriched" / "final_training_dataset.csv"
    if not data_path.exists():
        print(f"Error: Dataset {data_path} tidak ditemukan.")
        return
        
    print("Memuat dan membagi dataset (Chronological Split)...")
    train, val, test, features = prepare_data(data_path)
    
    for target in TARGETS:
        global_model = train_target(target, train, val, test, features)
        evaluate_and_finetune(train, val, test, features, target, global_model, threshold=FINETUNE_AUC_THRESHOLD)

if __name__ == "__main__":
    main()