#!/usr/bin/env python3
"""
IDX Stock Scraper - Supabase Version
- Fetches stock data from Yahoo Finance & IDX
- Pushes directly to Supabase database
- Supports realtime updates via Supabase
"""

import json
import sys
import time
import os
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from curl_cffi import requests as curl_requests
    USE_CURL_CFFI = True
except ImportError:
    import requests as std_requests
    USE_CURL_CFFI = False
    print("⚠️ curl_cffi not available, using standard requests", file=sys.stderr)

try:
    from supabase import create_client, Client
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("❌ supabase package not installed. Run: pip install supabase python-dotenv", file=sys.stderr)
    sys.exit(1)


# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for write access

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required", file=sys.stderr)
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Jakarta timezone (WIB = UTC+7)
WIB = timezone(timedelta(hours=7))

# Headers
YAHOO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
}

IDX_HEADERS = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Host': 'www.idx.co.id',
    'Referer': 'https://www.idx.co.id/id/data-pasar/ringkasan-perdagangan/ringkasan-saham/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
}


def get_market_status():
    """Get current market status based on IDX trading hours (WIB)"""
    now = datetime.now(WIB)
    weekday = now.weekday()
    hour = now.hour
    minute = now.minute
    time_val = hour * 100 + minute

    if weekday >= 5:
        return {
            "status": "closed",
            "session": "weekend",
            "message": "Market tutup (Weekend)",
            "can_trade": False,
            "should_update": False,
        }

    if 845 <= time_val < 900:
        return {
            "status": "pre_opening",
            "session": "pre_open",
            "message": "Pre-Opening (08:45-09:00) - IEP/IEV",
            "can_trade": False,
            "should_update": True,
        }

    if 900 <= time_val < 1130:
        return {
            "status": "open",
            "session": "session_1",
            "message": "Sesi 1 (09:00-11:30)",
            "can_trade": True,
            "should_update": True,
        }

    if 1130 <= time_val < 1330:
        return {
            "status": "break",
            "session": "lunch",
            "message": "Istirahat Siang (11:30-13:30)",
            "can_trade": False,
            "should_update": False,
        }

    if 1330 <= time_val < 1450:
        return {
            "status": "open",
            "session": "session_2",
            "message": "Sesi 2 (13:30-14:50)",
            "can_trade": True,
            "should_update": True,
        }

    if 1450 <= time_val < 1500:
        return {
            "status": "pre_closing",
            "session": "pre_close",
            "message": "Pre-Closing (14:50-15:00) - IEP/IEV",
            "can_trade": False,
            "should_update": True,
        }

    if 1500 <= time_val < 1515:
        return {
            "status": "closing",
            "session": "closing",
            "message": "Random Closing (15:00-15:15)",
            "can_trade": True,
            "should_update": True,
        }

    return {
        "status": "closed",
        "session": "after_hours",
        "message": "Market Tutup",
        "can_trade": False,
        "should_update": False,
    }


def make_request(url, params=None, headers=None, timeout=30):
    """Make HTTP request with curl_cffi or standard requests"""
    try:
        if USE_CURL_CFFI:
            response = curl_requests.get(
                url,
                params=params,
                headers=headers,
                impersonate="chrome120",
                timeout=timeout
            )
        else:
            response = std_requests.get(
                url,
                params=params,
                headers=headers,
                timeout=timeout
            )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return None


def fetch_idx_summary():
    """Fetch trading summary from IDX API"""
    print("📊 Fetching IDX trading summary...", file=sys.stderr)
    
    url = "https://www.idx.co.id/primary/TradingSummary/GetStockSummary"
    params = {"length": 9999, "start": 0}
    
    data = make_request(url, params, IDX_HEADERS)
    
    if data and "data" in data:
        print(f"   ✅ Got {len(data['data'])} stocks from IDX", file=sys.stderr)
        return {item["StockCode"]: item for item in data["data"]}
    
    print("   ⚠️ IDX API failed", file=sys.stderr)
    return {}


def fetch_idx_preopening():
    """Fetch IEP/IEV data from IDX"""
    print("📊 Fetching IEP/IEV data...", file=sys.stderr)
    
    endpoints = [
        "https://www.idx.co.id/primary/TradingSummary/GetPreOpeningSummary",
        "https://www.idx.co.id/primary/TradingSummary/GetPreClosingSummary",
    ]
    
    for url in endpoints:
        data = make_request(url, {}, IDX_HEADERS)
        if data and "data" in data:
            print(f"   ✅ Got IEP/IEV: {len(data['data'])} stocks", file=sys.stderr)
            return {item.get("StockCode", ""): item for item in data["data"] if item.get("StockCode")}
    
    return {}


def fetch_yahoo_single(symbol):
    """Fetch single stock from Yahoo Finance"""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}.JK"
    params = {'interval': '1m', 'range': '1d'}
    
    try:
        data = make_request(url, params, YAHOO_HEADERS, timeout=10)
        
        if data and 'chart' in data and 'result' in data['chart']:
            result = data['chart']['result']
            if result and len(result) > 0:
                meta = result[0].get('meta', {})
                indicators = result[0].get('indicators', {}).get('quote', [{}])[0]
                
                open_price = None
                if indicators and indicators.get('open'):
                    opens = [o for o in indicators.get('open', []) if o is not None]
                    if opens:
                        open_price = opens[0]
                
                prev_close = meta.get('previousClose') or meta.get('chartPreviousClose')
                
                return {
                    'symbol': symbol,
                    'price': meta.get('regularMarketPrice'),
                    'previousClose': prev_close,
                    'open': open_price or meta.get('regularMarketOpen'),
                    'high': meta.get('regularMarketDayHigh'),
                    'low': meta.get('regularMarketDayLow'),
                    'volume': meta.get('regularMarketVolume'),
                    'name': meta.get('shortName') or meta.get('longName'),
                }
    except:
        pass
    
    return None


def fetch_yahoo_prices_parallel(symbols, max_workers=20):
    """Fetch prices from Yahoo Finance in parallel"""
    yahoo_data = {}
    total = len(symbols)
    completed = 0
    
    print(f"📈 Fetching Yahoo prices ({total} stocks)...", file=sys.stderr)
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_symbol = {
            executor.submit(fetch_yahoo_single, symbol): symbol 
            for symbol in symbols
        }
        
        for future in as_completed(future_to_symbol):
            symbol = future_to_symbol[future]
            try:
                result = future.result()
                if result and result.get('price'):
                    yahoo_data[symbol] = result
            except:
                pass
            
            completed += 1
            if completed % 100 == 0 or completed == total:
                print(f"   Progress: {completed}/{total} ({len(yahoo_data)} success)", file=sys.stderr)
    
    return yahoo_data


def calculate_ara_arb(prev_close):
    """Calculate ARA/ARB based on IDX rules"""
    if prev_close <= 0:
        return 0, 0, 0, 0
    
    if prev_close < 200:
        pct = 35
    elif prev_close <= 5000:
        pct = 25
    else:
        pct = 20
    
    ara = round(prev_close * (1 + pct / 100))
    arb = max(round(prev_close * (1 - pct / 100)), 1)
    
    return ara, arb, pct, -pct


def calculate_accumulation_distribution(idx_data, yahoo_data):
    """Calculate accumulation/distribution status"""
    foreign_buy = idx_data.get("ForeignBuy", 0) or 0
    foreign_sell = idx_data.get("ForeignSell", 0) or 0
    bid_volume = idx_data.get("BidVolume", 0) or 0
    ask_volume = idx_data.get("OfferVolume", 0) or 0
    
    current_price = yahoo_data.get("price", 0) or 0
    open_price = yahoo_data.get("open", 0) or idx_data.get("OpenPrice", 0) or 0
    
    score = 0
    
    if foreign_buy > 0 or foreign_sell > 0:
        net_foreign = foreign_buy - foreign_sell
        if net_foreign > 0:
            score += 40
        elif net_foreign < 0:
            score -= 40
    
    if bid_volume > 0 or ask_volume > 0:
        if bid_volume > ask_volume * 1.2:
            score += 35
        elif ask_volume > bid_volume * 1.2:
            score -= 35
    
    if current_price > 0 and open_price > 0:
        if current_price > open_price:
            score += 25
        elif current_price < open_price:
            score -= 25
    
    if score >= 30:
        return "accumulation", score
    elif score <= -30:
        return "distribution", score
    else:
        return "neutral", score


def calculate_rsi(change_percent, volatility):
    """
    Estimate RSI based on price change and volatility.
    True RSI needs 14 periods, this is a simplified daily estimate.
    RSI = 50 + (change_percent / volatility * 25) clamped to 0-100
    """
    if volatility <= 0:
        return 50  # Neutral if no volatility
    
    # Normalize change relative to volatility
    normalized = (change_percent / volatility) * 25
    rsi = 50 + normalized
    
    # Clamp to 0-100
    return max(0, min(100, rsi))


def calculate_screening_score(stock):
    """
    Calculate screening score based on scalping criteria:
    - Volume > 1 juta (20%)
    - Volatilitas > 2% (20%)
    - Harga Rp 100-10.000 (15%)
    - RSI 30-70 (15%)
    - Price Change > 0.5% (15%)
    - Spread < 2% (15%)
    """
    score = 0
    passed = True
    
    price = stock.get("price", 0)
    volume = stock.get("volume", 0)
    volatility = stock.get("volatility", 0)
    change_percent = stock.get("change_percent", 0)
    spread = stock.get("spread", 0)
    net_foreign = stock.get("net_foreign", 0)
    acc_dist_status = stock.get("acc_dist_status", "neutral")
    
    # Calculate RSI estimate
    rsi = calculate_rsi(change_percent, volatility)
    stock["rsi"] = round(rsi, 2)  # Update stock's RSI value
    
    # === SCREENING CRITERIA (Total base: 100 points) ===
    
    # 1. Volume > 1 juta lembar/hari (20 points)
    if volume >= 1000000:
        score += 20
    elif volume >= 500000:
        score += 10
    else:
        passed = False
    
    # 2. Volatilitas > 2% (20 points)
    if volatility >= 2:
        score += 20
    elif volatility >= 1:
        score += 10
    else:
        passed = False
    
    # 3. Harga Rp 100 - Rp 10.000 (15 points)
    if 100 <= price <= 10000:
        score += 15
    else:
        passed = False
    
    # 4. RSI 30-70 - avoid extreme overbought/oversold (15 points)
    if 30 <= rsi <= 70:
        score += 15
    elif 20 <= rsi <= 80:
        score += 8  # Partial score for near-range
    # RSI extreme (<20 or >80) might indicate reversal risk
    
    # 5. Price Change > 0.5% (15 points)
    if abs(change_percent) >= 0.5:
        score += 15
        if change_percent > 0:
            score += 5  # Small bonus for uptrend
    
    # 6. Spread < 2% (15 points)
    if 0 < spread < 2:
        score += 15
    elif spread >= 2:
        score -= 5  # Penalty for wide spread
    
    # === BUY RECOMMENDATION BONUS (Extra points) ===
    
    # Foreign flow positive (asing beli)
    if net_foreign > 0:
        score += 15
        if net_foreign > 1000000:
            score += 10
    
    # Accumulation status
    if acc_dist_status == "accumulation":
        score += 20
    
    return score, passed


def process_and_save_to_supabase(idx_data, yahoo_data, iep_data, market_status):
    """Process stock data and save to Supabase"""
    
    if idx_data:
        all_symbols = set(idx_data.keys())
    else:
        all_symbols = set(yahoo_data.keys())
    
    print(f"🔄 Processing {len(all_symbols)} stocks...", file=sys.stderr)
    
    stocks_to_upsert = []
    
    for symbol in sorted(all_symbols):
        try:
            idx = idx_data.get(symbol, {})
            yahoo = yahoo_data.get(symbol, {})
            iep = iep_data.get(symbol, {})
            
            if not idx and not yahoo:
                continue
            
            price = yahoo.get("price") or idx.get("Close", 0) or 0
            if price <= 0:
                continue
            
            prev_close = yahoo.get("previousClose") or idx.get("Previous", 0) or 0
            open_price = yahoo.get("open") or idx.get("OpenPrice", 0) or 0
            high = yahoo.get("high") or idx.get("High", 0) or 0
            low = yahoo.get("low") or idx.get("Low", 0) or 0
            volume = yahoo.get("volume") or int(idx.get("Volume", 0) or 0)
            
            change = price - prev_close if prev_close > 0 else idx.get("Change", 0) or 0
            change_percent = ((price - prev_close) / prev_close * 100) if prev_close > 0 else 0
            
            bid = float(idx.get("Bid", 0) or 0)
            ask = float(idx.get("Offer", 0) or 0)
            bid_size = int(idx.get("BidVolume", 0) or 0)
            ask_size = int(idx.get("OfferVolume", 0) or 0)
            
            foreign_buy = int(idx.get("ForeignBuy", 0) or 0)
            foreign_sell = int(idx.get("ForeignSell", 0) or 0)
            net_foreign = foreign_buy - foreign_sell
            
            iep_price = float(iep.get("IEP", 0) or iep.get("TheoreticalPrice", 0) or 0)
            iev_volume = int(iep.get("IEV", 0) or iep.get("TheoreticalVolume", 0) or 0)
            
            acc_dist_status, acc_dist_score = calculate_accumulation_distribution(idx, yahoo)
            ara, arb, ara_pct, arb_pct = calculate_ara_arb(prev_close)
            
            volatility = 0
            if price > 0 and high > 0 and low > 0:
                volatility = ((high - low) / price) * 100
            
            spread = 0
            if price > 0 and bid > 0 and ask > 0:
                spread = ((ask - bid) / price) * 100
            
            name = yahoo.get("name") or idx.get("StockName", "") or symbol
            
            stock_data = {
                "symbol": symbol,
                "name": name.strip() if name else symbol,
                "price": round(price, 2),
                "open_price": round(open_price, 2),
                "high": round(high, 2),
                "low": round(low, 2),
                "prev_close": round(prev_close, 2),
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "volume": volume,
                "avg_volume": volume,
                "frequency": int(idx.get("Frequency", 0) or 0),
                "value": float(idx.get("Value", 0) or 0),
                "bid": round(bid, 2),
                "ask": round(ask, 2),
                "bid_size": bid_size,
                "ask_size": ask_size,
                "iep": round(iep_price, 2),
                "iev": iev_volume,
                "ara": round(ara, 2),
                "arb": round(arb, 2),
                "ara_pct": ara_pct,
                "arb_pct": arb_pct,
                "foreign_buy": foreign_buy,
                "foreign_sell": foreign_sell,
                "net_foreign": net_foreign,
                "acc_dist_status": acc_dist_status,
                "acc_dist_score": acc_dist_score,
                "market_cap": int(float(idx.get("ListedShares", 0) or 0) * price),
                "volatility": round(volatility, 2),
                "spread": round(spread, 2),
                "volume_spike": 100,
                "rsi": 50,
            }
            
            # Calculate screening score
            score, passed = calculate_screening_score(stock_data)
            stock_data["score"] = score
            stock_data["passed_screen"] = passed
            
            stocks_to_upsert.append(stock_data)
            
        except Exception as e:
            print(f"   ⚠️ Error processing {symbol}: {e}", file=sys.stderr)
            continue
    
    # Upsert to Supabase in batches
    print(f"📤 Uploading {len(stocks_to_upsert)} stocks to Supabase...", file=sys.stderr)
    
    batch_size = 100
    for i in range(0, len(stocks_to_upsert), batch_size):
        batch = stocks_to_upsert[i:i + batch_size]
        try:
            supabase.table("stocks").upsert(batch, on_conflict="symbol").execute()
            print(f"   Uploaded batch {i // batch_size + 1}/{(len(stocks_to_upsert) + batch_size - 1) // batch_size}", file=sys.stderr)
        except Exception as e:
            print(f"   ❌ Error uploading batch: {e}", file=sys.stderr)
    
    # Update market status
    try:
        supabase.table("market_status").upsert({
            "id": 1,
            **market_status,
            "updated_at": datetime.now().isoformat()
        }, on_conflict="id").execute()
        print("   ✅ Market status updated", file=sys.stderr)
    except Exception as e:
        print(f"   ⚠️ Error updating market status: {e}", file=sys.stderr)
    
    return len(stocks_to_upsert)


def main():
    start_time = time.time()
    
    market_status = get_market_status()
    
    print("🚀 Starting Supabase stock scraper...", file=sys.stderr)
    print(f"   Time: {datetime.now(WIB).strftime('%Y-%m-%d %H:%M:%S')} WIB", file=sys.stderr)
    print(f"   Market: {market_status['message']} ({market_status['status']})", file=sys.stderr)
    
    # Fetch data
    idx_data = fetch_idx_summary()
    
    if not idx_data:
        symbols = [
            "BBCA", "BBRI", "BMRI", "BBNI", "BRIS", "ARTO", "BNGA",
            "TLKM", "EXCL", "ISAT", "FREN", "TOWR",
            "ASII", "UNTR", "AUTO", "SMSM",
            "UNVR", "HMSP", "ICBP", "INDF", "MYOR",
            "GOTO", "BREN", "AMMN", "CUAN", "BRPT",
            "MDKA", "EMTK", "MINA", "PANI", "BUKA", "ACES", "ERAA",
            "ANTM", "INCO", "PTBA", "ADRO", "MEDC",
            "CPIN", "JPFA", "MAIN",
            "SMGR", "INTP", "WIKA", "WSKT", "PTPP",
        ]
    else:
        symbols = list(idx_data.keys())
    
    yahoo_data = fetch_yahoo_prices_parallel(symbols)
    
    iep_data = {}
    if market_status["session"] in ["pre_open", "pre_close"]:
        iep_data = fetch_idx_preopening()
    
    if not yahoo_data and not idx_data:
        print(json.dumps({"success": False, "error": "Failed to fetch data"}))
        return False
    
    # Process and save to Supabase
    total = process_and_save_to_supabase(idx_data, yahoo_data, iep_data, market_status)
    
    elapsed = time.time() - start_time
    print(f"✅ Done! {total} stocks in {elapsed:.1f}s", file=sys.stderr)
    
    print(json.dumps({
        "success": True,
        "total": total,
        "market_status": market_status,
        "elapsed_seconds": round(elapsed, 2)
    }))
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
