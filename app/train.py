"""Train on data/Housing.csv and serialize the pipeline to model/model.pkl.

Usage: python train.py [--data data/Housing.csv]
"""
import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Separate features by data type
NUMERIC_FEATURES = ["area", "bedrooms", "bathrooms", "stories", "parking"]
CATEGORICAL_FEATURES = [
    "mainroad", "guestroom", "basement", 
    "hotwaterheating", "airconditioning", 
    "prefarea", "furnishingstatus"
]

# Combined list for schema validation
FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "price"


def load_data(path: str) -> pd.DataFrame:
    path_obj = Path(path)
    if not path_obj.exists():
        raise FileNotFoundError(f"Dataset not found at: {path}")
        
    df = pd.read_csv(path_obj)
    missing = set(FEATURES + [TARGET]) - set(df.columns)
    if missing:
        raise ValueError(f"CSV is missing columns: {sorted(missing)}")
        
    before = len(df)
    df = df.drop_duplicates().dropna(subset=[TARGET])
    print(f"Loaded {before} rows, using {len(df)} after dropping duplicates/no-price rows")
    print("Missing values per feature:\n", df[FEATURES].isna().sum().to_string())
    return df


def main(data_path: str):
    df = load_data(data_path)
    X, y = df[FEATURES], df[TARGET]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

    # 1. Numerical pipeline: Median Imputer + Standard Scaler
    numeric_transformer = Pipeline([
        ("impute", SimpleImputer(strategy="median")), 
        ("scale", StandardScaler())
    ])
    
    # 2. Categorical pipeline: Constant Imputer + One-Hot Encoder
    categorical_transformer = Pipeline([
        ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    # 3. Combine both into a ColumnTransformer inside the main Pipeline
    pipe = Pipeline([
        ("prep", ColumnTransformer([
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES)
        ])),
        ("model", GradientBoostingRegressor(n_estimators=300, max_depth=3, random_state=42)),
    ])

    cv = cross_val_score(pipe, X_tr, y_tr, cv=5, scoring="r2")
    print(f"5-fold CV R2: {cv.mean():.4f} (+/- {cv.std():.4f})")

    pipe.fit(X_tr, y_tr)
    pred = pipe.predict(X_te)
    
    metrics = {
        "r2": round(r2_score(y_te, pred), 4),
        "mae": round(mean_absolute_error(y_te, pred), 0),
        "rows": len(df), 
        "data_file": Path(data_path).name
    }
    print("Test metrics:", metrics)

    Path("model").mkdir(exist_ok=True)
    joblib.dump(pipe, "model/model.pkl")
    json.dump({"features": FEATURES, **metrics}, open("model/metadata.json", "w"), indent=2)
    print("Saved model/model.pkl")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/Housing.csv")
    main(ap.parse_args().data)