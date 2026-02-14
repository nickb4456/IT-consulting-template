#!/usr/bin/env python3
"""
Price Prediction Model for RI Real Estate
Uses Gradient Boosting to predict property prices based on features.
Outputs predictions to be merged with property data.
"""

import json
import gzip
import numpy as np
from pathlib import Path
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

def load_data():
    """Load property data from gzipped JSON"""
    data_path = Path(__file__).parent.parent / 'ri-sales.json.gz'
    with gzip.open(data_path, 'rt', encoding='utf-8') as f:
        data = json.load(f)
    return data['properties']

def prepare_features(properties):
    """Extract features for ML model"""
    features = []
    prices = []
    indices = []
    
    for i, p in enumerate(properties):
        # Skip if missing key features
        if not all([p.get('sqft'), p.get('beds'), p.get('price')]):
            continue
        if p['sqft'] <= 0 or p['price'] <= 50000 or p['price'] > 5000000:
            continue
        if p['sqft'] > 10000:  # Filter outliers
            continue
            
        features.append([
            p.get('sqft', 0),
            p.get('beds', 0),
            p.get('baths', 0) or 0,
            p.get('yearBuilt', 1970) or 1970,
            p.get('lotSize', 0) or 0,
            1 if p.get('soldDate') else 0,  # Is sold
        ])
        prices.append(p['price'])
        indices.append(i)
    
    return np.array(features), np.array(prices), indices

def train_model(X, y):
    """Train Gradient Boosting model"""
    print(f"Training on {len(X)} properties...")
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train model
    model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
    
    # Cross-validation score
    scores = cross_val_score(model, X_scaled, y, cv=5, scoring='r2')
    print(f"Cross-validation R² scores: {scores}")
    print(f"Mean R²: {scores.mean():.3f} (+/- {scores.std() * 2:.3f})")
    
    # Fit final model
    model.fit(X_scaled, y)
    
    return model, scaler

def predict_prices(model, scaler, X):
    """Generate predictions"""
    X_scaled = scaler.transform(X)
    predictions = model.predict(X_scaled)
    return predictions

def main():
    print("=" * 50)
    print("RI Real Estate Price Predictor")
    print("=" * 50)
    
    # Load data
    properties = load_data()
    print(f"Loaded {len(properties)} properties")
    
    # Prepare features
    X, y, indices = prepare_features(properties)
    print(f"Prepared {len(X)} properties with valid features")
    
    # Train model
    model, scaler = train_model(X, y)
    
    # Generate predictions
    predictions = predict_prices(model, scaler, X)
    
    # Calculate prediction accuracy metrics
    errors = np.abs(predictions - y)
    pct_errors = errors / y * 100
    
    print(f"\nPrediction Accuracy:")
    print(f"  Mean Absolute Error: ${errors.mean():,.0f}")
    print(f"  Median Absolute Error: ${np.median(errors):,.0f}")
    print(f"  Mean % Error: {pct_errors.mean():.1f}%")
    print(f"  Within 10%: {(pct_errors < 10).sum() / len(pct_errors) * 100:.1f}%")
    print(f"  Within 20%: {(pct_errors < 20).sum() / len(pct_errors) * 100:.1f}%")
    
    # Feature importance
    print(f"\nFeature Importance:")
    feature_names = ['sqft', 'beds', 'baths', 'yearBuilt', 'lotSize', 'isSold']
    for name, imp in sorted(zip(feature_names, model.feature_importances_), key=lambda x: -x[1]):
        print(f"  {name}: {imp:.3f}")
    
    # Add predictions to properties
    output = []
    for i, (idx, pred, actual) in enumerate(zip(indices, predictions, y)):
        p = properties[idx].copy()
        p['predictedPrice'] = int(pred)
        p['priceError'] = int(pred - actual)
        p['priceErrorPct'] = round((pred - actual) / actual * 100, 1)
        output.append(p)
    
    # Save enhanced data
    output_path = Path(__file__).parent.parent / 'ri-sales-predicted.json'
    with open(output_path, 'w') as f:
        json.dump({'properties': output, 'model_r2': float(scores.mean())}, f)
    
    print(f"\nSaved {len(output)} properties with predictions to {output_path}")
    
    # Show some interesting findings
    print("\n" + "=" * 50)
    print("POTENTIAL DEALS (Priced 20%+ below prediction):")
    print("=" * 50)
    
    deals = [(p, p['priceErrorPct']) for p in output if p['priceErrorPct'] < -20]
    deals.sort(key=lambda x: x[1])
    
    for p, err in deals[:10]:
        print(f"  {p.get('address', 'Unknown')}, {p.get('city', '')}")
        print(f"    Listed: ${p['price']:,} | Predicted: ${p['predictedPrice']:,} | {err:.1f}% below")
        print()

if __name__ == '__main__':
    main()
