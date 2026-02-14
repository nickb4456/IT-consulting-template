#!/usr/bin/env python3
"""
Deal Scorer using Isolation Forest Anomaly Detection
Finds properties that are priced unusually low for their features.
"""

import json
import gzip
import numpy as np
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

def load_data():
    """Load property data from gzipped JSON"""
    data_path = Path(__file__).parent.parent / 'ri-sales.json.gz'
    with gzip.open(data_path, 'rt', encoding='utf-8') as f:
        data = json.load(f)
    return data['properties']

def calculate_deal_score(properties):
    """
    Calculate deal scores using Isolation Forest.
    Properties with unusual price/feature ratios get flagged.
    """
    # Filter to valid properties
    valid = []
    for p in properties:
        if not all([p.get('sqft'), p.get('beds'), p.get('price')]):
            continue
        if p['sqft'] <= 0 or p['price'] <= 50000 or p['price'] > 5000000:
            continue
        if p['sqft'] > 10000:
            continue
        
        # Calculate price per sqft
        ppsf = p['price'] / p['sqft']
        
        valid.append({
            'property': p,
            'ppsf': ppsf,
            'features': [
                p['sqft'],
                p.get('beds', 0),
                p.get('baths', 0) or 0,
                p.get('yearBuilt', 1970) or 1970,
                ppsf
            ]
        })
    
    print(f"Analyzing {len(valid)} properties...")
    
    # Extract features
    X = np.array([v['features'] for v in valid])
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Fit Isolation Forest
    # contamination=0.1 means we expect ~10% to be anomalies
    clf = IsolationForest(
        contamination=0.1,
        random_state=42,
        n_estimators=100
    )
    
    # Get anomaly scores (-1 = anomaly, 1 = normal)
    predictions = clf.fit_predict(X_scaled)
    scores = clf.decision_function(X_scaled)  # Higher = more normal
    
    # Normalize scores to 0-100 (higher = better deal)
    # Invert because lower decision_function = more anomalous = potential deal
    min_score, max_score = scores.min(), scores.max()
    normalized = 100 - ((scores - min_score) / (max_score - min_score) * 100)
    
    # Add scores to properties
    for i, v in enumerate(valid):
        v['property']['dealScore'] = int(normalized[i])
        v['property']['isAnomaly'] = int(predictions[i] == -1)
        v['property']['pricePerSqft'] = int(v['ppsf'])
    
    return valid

def analyze_by_city(valid):
    """Group analysis by city"""
    cities = {}
    for v in valid:
        city = v['property'].get('city', 'Unknown')
        if city not in cities:
            cities[city] = {'count': 0, 'deals': 0, 'avg_ppsf': []}
        cities[city]['count'] += 1
        cities[city]['avg_ppsf'].append(v['ppsf'])
        if v['property']['isAnomaly']:
            cities[city]['deals'] += 1
    
    # Calculate averages
    for city in cities:
        cities[city]['avg_ppsf'] = int(np.mean(cities[city]['avg_ppsf']))
    
    return cities

def main():
    print("=" * 50)
    print("RI Real Estate Deal Scorer (Isolation Forest)")
    print("=" * 50)
    
    # Load and process data
    properties = load_data()
    print(f"Loaded {len(properties)} properties")
    
    valid = calculate_deal_score(properties)
    
    # Find top deals (high deal score + for sale)
    for_sale = [v for v in valid if not v['property'].get('soldDate')]
    for_sale.sort(key=lambda x: -x['property']['dealScore'])
    
    print(f"\n{'=' * 50}")
    print("TOP 15 POTENTIAL DEALS (For Sale, High Deal Score)")
    print("=" * 50)
    
    for v in for_sale[:15]:
        p = v['property']
        print(f"\n🔥 Deal Score: {p['dealScore']}/100")
        print(f"   {p.get('address', 'Unknown')}, {p.get('city', '')}")
        print(f"   ${p['price']:,} | {p['sqft']:,} sqft | ${p['pricePerSqft']}/sqft")
        print(f"   {p.get('beds', '?')}bd/{p.get('baths', '?')}ba | Built {p.get('yearBuilt', '?')}")
        if p.get('url'):
            print(f"   {p['url']}")
    
    # City analysis
    cities = analyze_by_city(valid)
    print(f"\n{'=' * 50}")
    print("DEALS BY CITY")
    print("=" * 50)
    
    for city, data in sorted(cities.items(), key=lambda x: -x[1]['deals']):
        if data['deals'] > 0:
            print(f"  {city}: {data['deals']} deals / {data['count']} properties (avg ${data['avg_ppsf']}/sqft)")
    
    # Save enhanced data
    output = [v['property'] for v in valid]
    output_path = Path(__file__).parent.parent / 'ri-sales-scored.json'
    with open(output_path, 'w') as f:
        json.dump({
            'properties': output,
            'summary': {
                'total': len(output),
                'deals_found': sum(1 for v in valid if v['property']['isAnomaly']),
                'cities': cities
            }
        }, f)
    
    print(f"\nSaved {len(output)} scored properties to {output_path}")

if __name__ == '__main__':
    main()
