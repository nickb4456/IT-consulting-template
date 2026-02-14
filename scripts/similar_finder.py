#!/usr/bin/env python3
"""
Similar Property Finder using K-Nearest Neighbors
For any property, find the most similar sold properties as comps.
"""

import json
import gzip
import numpy as np
from pathlib import Path
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

def load_data():
    """Load property data from gzipped JSON"""
    data_path = Path(__file__).parent.parent / 'ri-sales.json.gz'
    with gzip.open(data_path, 'rt', encoding='utf-8') as f:
        data = json.load(f)
    return data['properties']

def prepare_data(properties):
    """Prepare features for KNN"""
    valid = []
    
    for p in properties:
        if not all([p.get('sqft'), p.get('beds'), p.get('price')]):
            continue
        if p['sqft'] <= 0 or p['price'] <= 50000 or p['price'] > 5000000:
            continue
        if p['sqft'] > 10000:
            continue
        
        valid.append({
            'property': p,
            'features': [
                p['sqft'] / 1000,  # Normalize sqft
                p.get('beds', 0),
                p.get('baths', 0) or 0,
                (p.get('yearBuilt', 1970) or 1970) / 100,  # Normalize year
                p.get('lotSize', 0) / 10000 if p.get('lotSize') else 0,
            ],
            'is_sold': bool(p.get('soldDate'))
        })
    
    return valid

def build_knn_model(valid):
    """Build KNN model on sold properties only"""
    # Use only sold properties for the model
    sold = [v for v in valid if v['is_sold']]
    
    if len(sold) < 10:
        print("Not enough sold properties!")
        return None, None, None
    
    X = np.array([v['features'] for v in sold])
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Build KNN model
    knn = NearestNeighbors(n_neighbors=min(10, len(sold)), metric='euclidean')
    knn.fit(X_scaled)
    
    return knn, scaler, sold

def find_similar(knn, scaler, sold, target_features, k=5):
    """Find k most similar sold properties"""
    target_scaled = scaler.transform([target_features])
    distances, indices = knn.kneighbors(target_scaled, n_neighbors=k)
    
    similar = []
    for i, (dist, idx) in enumerate(zip(distances[0], indices[0])):
        s = sold[idx]['property'].copy()
        s['similarity_rank'] = i + 1
        s['similarity_distance'] = round(float(dist), 3)
        similar.append(s)
    
    return similar

def analyze_active_listings(valid, knn, scaler, sold):
    """For each active listing, find similar comps and estimate value"""
    active = [v for v in valid if not v['is_sold']]
    
    print(f"Analyzing {len(active)} active listings...")
    
    results = []
    for v in active:
        p = v['property']
        similar = find_similar(knn, scaler, sold, v['features'], k=5)
        
        # Calculate estimated value from comps
        comp_prices = [s['price'] for s in similar]
        comp_ppsf = [s['price'] / s['sqft'] for s in similar]
        
        estimated_value = int(np.mean(comp_prices))
        estimated_ppsf = int(np.mean(comp_ppsf))
        suggested_price = int(estimated_ppsf * p['sqft'])
        
        p['similarComps'] = similar
        p['estimatedValue'] = estimated_value
        p['suggestedPrice'] = suggested_price
        p['compAvgPpsf'] = estimated_ppsf
        p['priceDiff'] = p['price'] - suggested_price
        p['priceDiffPct'] = round((p['price'] - suggested_price) / suggested_price * 100, 1)
        
        results.append(p)
    
    return results

def main():
    print("=" * 50)
    print("RI Real Estate Similar Property Finder (KNN)")
    print("=" * 50)
    
    # Load and prepare data
    properties = load_data()
    print(f"Loaded {len(properties)} properties")
    
    valid = prepare_data(properties)
    print(f"Prepared {len(valid)} valid properties")
    
    sold_count = sum(1 for v in valid if v['is_sold'])
    active_count = len(valid) - sold_count
    print(f"  Sold: {sold_count}")
    print(f"  Active: {active_count}")
    
    # Build KNN model
    knn, scaler, sold = build_knn_model(valid)
    if not knn:
        return
    
    print(f"Built KNN model on {len(sold)} sold properties")
    
    # Analyze active listings
    results = analyze_active_listings(valid, knn, scaler, sold)
    
    # Find best deals (priced below comps)
    deals = [r for r in results if r['priceDiffPct'] < -10]
    deals.sort(key=lambda x: x['priceDiffPct'])
    
    print(f"\n{'=' * 50}")
    print("BEST DEALS (Priced 10%+ Below Similar Comps)")
    print("=" * 50)
    
    for p in deals[:10]:
        print(f"\n💰 {p['priceDiffPct']:.1f}% below comps")
        print(f"   {p.get('address', 'Unknown')}, {p.get('city', '')}")
        print(f"   Listed: ${p['price']:,} | Comp Avg: ${p['estimatedValue']:,}")
        print(f"   {p['sqft']:,} sqft | {p.get('beds', '?')}bd/{p.get('baths', '?')}ba")
        print(f"   Similar sold properties:")
        for comp in p['similarComps'][:3]:
            print(f"      - ${comp['price']:,} | {comp['sqft']:,} sqft | {comp.get('address', '')[:40]}")
    
    # Find overpriced
    overpriced = [r for r in results if r['priceDiffPct'] > 20]
    overpriced.sort(key=lambda x: -x['priceDiffPct'])
    
    print(f"\n{'=' * 50}")
    print("POTENTIALLY OVERPRICED (20%+ Above Comps)")
    print("=" * 50)
    
    for p in overpriced[:5]:
        print(f"\n⚠️  {p['priceDiffPct']:.1f}% above comps")
        print(f"   {p.get('address', 'Unknown')}, {p.get('city', '')}")
        print(f"   Listed: ${p['price']:,} | Comp Avg: ${p['estimatedValue']:,}")
    
    # Save results
    output_path = Path(__file__).parent.parent / 'ri-sales-comps.json'
    with open(output_path, 'w') as f:
        json.dump({
            'properties': results,
            'summary': {
                'analyzed': len(results),
                'deals': len(deals),
                'overpriced': len(overpriced)
            }
        }, f)
    
    print(f"\nSaved {len(results)} properties with comp analysis to {output_path}")

if __name__ == '__main__':
    main()
