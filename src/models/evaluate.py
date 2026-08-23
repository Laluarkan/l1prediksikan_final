import pandas as pd
import joblib
from pathlib import Path
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score
import warnings

warnings.filterwarnings('ignore')

from config import MODELS_DIR, REPORTS_DIR, TARGETS
from src.models.train_global import prepare_data

def evaluate_test_set():
    data_path = "./data/enriched/final_training_dataset.csv"
    if not Path(data_path).exists():
        print(f"Error: Dataset {data_path} tidak ditemukan.")
        return

    print("Memuat dataset testing...")
    _, _, test, features = prepare_data(data_path)
    
    results_df = test[['Date', 'HomeTeam', 'AwayTeam', 'Div', 'FTR', 'FTHG', 'FTAG']].copy()

    for target in TARGETS:
        model_path = MODELS_DIR / "global" / f"lgbm_global_{target}.pkl"
        if not model_path.exists():
            print(f"Model untuk {target} tidak ditemukan di {model_path}")
            continue

        print(f"\n" + "="*50)
        print(f" EVALUASI PREDIKSI: {target} ".center(50, "="))
        print("="*50)

        model = joblib.load(model_path)
        X_test = test[features]
        y_test = test[f'target_{target}']

        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)

        if target == 'FTR':
            results_df[f'prob_{target}_A'] = y_prob[:, 0].round(4)
            results_df[f'prob_{target}_D'] = y_prob[:, 1].round(4)
            results_df[f'prob_{target}_H'] = y_prob[:, 2].round(4)
            results_df[f'pred_{target}'] = pd.Series(y_pred, index=results_df.index).map({0: 'A', 1: 'D', 2: 'H'})
            auc = roc_auc_score(y_test, y_prob, multi_class='ovr')
        else:
            results_df[f'prob_{target}_Yes'] = y_prob[:, 1].round(4)
            results_df[f'pred_{target}'] = y_pred
            auc = roc_auc_score(y_test, y_prob[:, 1])

        acc = accuracy_score(y_test, y_pred)
        
        print(f"Accuracy : {acc:.4f}")
        print(f"AUC      : {auc:.4f}")
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred))

    output_file = REPORTS_DIR / "test_predictions.csv"
    results_df.to_csv(output_file, index=False)
    print(f"\n[SELESAI] Detail probabilitas prediksi disimpan di: {output_file}")

if __name__ == "__main__":
    evaluate_test_set()