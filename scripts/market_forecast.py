#!/usr/bin/env python3
"""
Market Price Forecaster using Prophet
Predicts where RI real estate prices are heading.
"""

import json
import gzip
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Try to import Prophet
try:
    from prophet import Prophet
    HAS_PROPHET = True
except ImportError:
    print("Prophet not installed. Install with: pip install prophet")
    HAS_PROPHET = False

def load_data():
    """Load property data from gzipped JSON"""
    data_path = Path(__file__).parent.parent / 'ri-sales.json.gz'
    with gzip.open(data_path, 'rt', encoding='utf-8') as f:
        data = json.load(f)
    return data['properties']

def parse_date(date_str):
    """Parse date string like 'August-14-2024' to datetime"""
    if not date_str:
        return None
    try:
        months = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4,
            'May': 5, 'June': 6, 'July': 7, 'August': 8,
            'September': 9, 'October': 10, 'November': 11, 'December': 12
        }
        parts = date_str.split('-')
        if len(parts) == 3:
            month = months.get(parts[0])
            day = int(parts[1])
            year = int(parts[2])
            if month:
                return datetime(year, month, day)
    except:
        pass
    return None

def prepare_time_series(properties):
    """Aggregate monthly median prices"""
    # Parse dates and filter valid sales
    sales = []
    for p in properties:
        if not p.get('soldDate') or not p.get('price'):
            continue
        if p['price'] < 50000 or p['price'] > 5000000:
            continue
        
        dt = parse_date(p['soldDate'])
        if dt:
            sales.append({
                'date': dt,
                'price': p['price'],
                'city': p.get('city', 'Unknown')
            })
    
    if not sales:
        return None
    
    df = pd.DataFrame(sales)
    df['month'] = df['date'].dt.to_period('M').dt.to_timestamp()
    
    # Calculate monthly median
    monthly = df.groupby('month').agg({
        'price': ['median', 'mean', 'count']
    }).reset_index()
    monthly.columns = ['ds', 'median_price', 'mean_price', 'count']
    monthly['y'] = monthly['median_price']
    
    # Filter to months with enough data
    monthly = monthly[monthly['count'] >= 10]
    
    return monthly[['ds', 'y', 'count']]

def forecast_prices(df, periods=12):
    """Use Prophet to forecast prices"""
    if not HAS_PROPHET:
        return None
    
    # Initialize Prophet with reasonable settings for housing data
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,  # Less flexible = smoother trend
        seasonality_prior_scale=10
    )
    
    model.fit(df[['ds', 'y']])
    
    # Create future dataframe
    future = model.make_future_dataframe(periods=periods, freq='MS')
    forecast = model.predict(future)
    
    return forecast, model

def main():
    print("=" * 50)
    print("RI Real Estate Market Forecaster")
    print("=" * 50)
    
    # Load and prepare data
    properties = load_data()
    print(f"Loaded {len(properties)} properties")
    
    df = prepare_time_series(properties)
    if df is None or len(df) < 12:
        print("Not enough time series data!")
        return
    
    print(f"Prepared {len(df)} months of data")
    print(f"Date range: {df['ds'].min().strftime('%Y-%m')} to {df['ds'].max().strftime('%Y-%m')}")
    print(f"Current median: ${df['y'].iloc[-1]:,.0f}")
    
    if not HAS_PROPHET:
        print("\nProphet not installed - showing historical analysis only")
        
        # Calculate simple trend
        recent = df.tail(12)['y'].values
        older = df.tail(24).head(12)['y'].values if len(df) >= 24 else None
        
        if older is not None and len(older) > 0:
            yoy_change = (recent.mean() - older.mean()) / older.mean() * 100
            print(f"Year-over-year change: {yoy_change:+.1f}%")
        
        # Monthly changes
        df['change'] = df['y'].pct_change() * 100
        print(f"\nRecent monthly changes:")
        for _, row in df.tail(6).iterrows():
            print(f"  {row['ds'].strftime('%Y-%m')}: ${row['y']:,.0f} ({row['change']:+.1f}%)")
        
        return
    
    # Generate forecast
    print("\nGenerating 12-month forecast...")
    forecast, model = forecast_prices(df, periods=12)
    
    # Show forecast
    future_rows = forecast[forecast['ds'] > df['ds'].max()]
    
    print(f"\n{'=' * 50}")
    print("PRICE FORECAST (Next 12 Months)")
    print("=" * 50)
    
    for _, row in future_rows.iterrows():
        print(f"  {row['ds'].strftime('%Y-%m')}: ${row['yhat']:,.0f} (${row['yhat_lower']:,.0f} - ${row['yhat_upper']:,.0f})")
    
    # Calculate expected change
    current = df['y'].iloc[-1]
    forecast_12m = future_rows.iloc[-1]['yhat']
    change_pct = (forecast_12m - current) / current * 100
    
    print(f"\n📈 12-Month Forecast: {change_pct:+.1f}%")
    print(f"   Current: ${current:,.0f}")
    print(f"   Predicted: ${forecast_12m:,.0f}")
    
    # Save forecast
    output = {
        'historical': df.to_dict('records'),
        'forecast': forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_dict('records'),
        'summary': {
            'current_median': int(current),
            'forecast_12m': int(forecast_12m),
            'change_pct': round(change_pct, 1)
        }
    }
    
    # Convert timestamps to strings
    for row in output['historical']:
        row['ds'] = row['ds'].strftime('%Y-%m-%d')
    for row in output['forecast']:
        row['ds'] = row['ds'].strftime('%Y-%m-%d')
    
    output_path = Path(__file__).parent.parent / 'ri-market-forecast.json'
    with open(output_path, 'w') as f:
        json.dump(output, f)
    
    print(f"\nSaved forecast to {output_path}")

if __name__ == '__main__':
    main()
