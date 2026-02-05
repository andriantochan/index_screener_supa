import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Stock, MarketStatus } from '../types/stock';

interface UseStocksReturn {
  stocks: Stock[];
  screenedStocks: Stock[];
  marketStatus: MarketStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStocks(): UseStocksReturn {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStocks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all stocks
      const { data: stocksData, error: stocksError } = await supabase
        .from('stocks')
        .select('*')
        .order('score', { ascending: false });

      if (stocksError) throw stocksError;

      // Fetch market status
      const { data: statusData, error: statusError } = await supabase
        .from('market_status')
        .select('*')
        .eq('id', 1)
        .single();

      if (statusError && statusError.code !== 'PGRST116') {
        console.warn('Market status error:', statusError);
      }

      setStocks(stocksData || []);
      setMarketStatus(statusData || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Realtime subscription for stocks
  useEffect(() => {
    const stocksChannel = supabase
      .channel('stocks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stocks',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newStock = payload.new as Stock;
            setStocks((prev) => {
              const index = prev.findIndex((s) => s.symbol === newStock.symbol);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = newStock;
                return updated.sort((a, b) => b.score - a.score);
              }
              return [...prev, newStock].sort((a, b) => b.score - a.score);
            });
          } else if (payload.eventType === 'DELETE') {
            const oldStock = payload.old as { symbol: string };
            setStocks((prev) => prev.filter((s) => s.symbol !== oldStock.symbol));
          }
        }
      )
      .subscribe();

    // Realtime subscription for market status
    const statusChannel = supabase
      .channel('market-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_status',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setMarketStatus(payload.new as MarketStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stocksChannel);
      supabase.removeChannel(statusChannel);
    };
  }, []);

  // Sort by recommendation: score + accumulation bonus + foreign flow bonus
  const sortByRecommendation = (a: Stock, b: Stock) => {
    const getRecommendationScore = (s: Stock) => {
      let recScore = s.score;
      if (s.acc_dist_status === 'accumulation') recScore += 50;
      if (s.net_foreign > 0) recScore += 30;
      if (s.change_percent > 0) recScore += 20;
      return recScore;
    };
    return getRecommendationScore(b) - getRecommendationScore(a);
  };

  const screenedStocks = stocks
    .filter((s) => s.passed_screen)
    .sort(sortByRecommendation);

  return {
    stocks: [...stocks].sort(sortByRecommendation),
    screenedStocks,
    marketStatus,
    loading,
    error,
    refresh: fetchStocks,
  };
}
