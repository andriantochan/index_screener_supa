export interface Stock {
  symbol: string;
  name: string;
  price: number;
  open_price: number;
  high: number;
  low: number;
  prev_close: number;
  volume: number;
  avg_volume: number;
  change: number;
  change_percent: number;

  // Order Book
  bid: number;
  ask: number;
  bid_size: number;
  ask_size: number;

  // IEP/IEV
  iep: number;
  iev: number;

  // ARA/ARB
  ara: number;
  arb: number;
  ara_pct: number;
  arb_pct: number;

  // Market Data
  market_cap: number;
  frequency: number;
  value: number;

  // Foreign Flow
  foreign_buy: number;
  foreign_sell: number;
  net_foreign: number;

  // Accumulation/Distribution
  acc_dist_status: 'accumulation' | 'distribution' | 'neutral';
  acc_dist_score: number;

  // Calculated
  volatility: number;
  spread: number;
  volume_spike: number;
  rsi: number;
  score: number;
  passed_screen: boolean;

  updated_at: string;
  created_at: string;
}

export interface MarketStatus {
  id: number;
  status: string;
  session: string;
  message: string;
  can_trade: boolean;
  should_update: boolean;
  updated_at: string;
}
