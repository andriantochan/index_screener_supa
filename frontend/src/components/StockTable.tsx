import { useState } from 'react';
import { Stock } from '../types/stock';

interface Props {
  stocks: Stock[];
  loading: boolean;
}

export function StockTable({ stocks, loading }: Props) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const formatNumber = (num: number) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString('id-ID');
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('id-ID');
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getAccDistBadge = (status: string) => {
    switch (status) {
      case 'accumulation':
        return <span className="px-2 py-0.5 bg-green-600/30 text-green-400 rounded text-xs">ACC</span>;
      case 'distribution':
        return <span className="px-2 py-0.5 bg-red-600/30 text-red-400 rounded text-xs">DIST</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-600/30 text-gray-400 rounded text-xs">NEUTRAL</span>;
    }
  };

  if (loading && stocks.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto mb-4 text-blue-500" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-400">Loading stocks...</p>
        </div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-xl mb-2">Tidak ada saham ditemukan</p>
        <p className="text-sm">Coba ubah filter atau kata kunci pencarian</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-gray-800 rounded-lg border border-gray-700">
      <table className="w-full">
        <thead className="bg-gray-900">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Kode</th>
            <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Harga</th>
            <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Change</th>
            <th className="text-right px-4 py-3 text-sm font-medium text-gray-400 hidden md:table-cell">Volume</th>
            <th className="text-right px-4 py-3 text-sm font-medium text-gray-400 hidden lg:table-cell">Net Foreign</th>
            <th className="text-center px-4 py-3 text-sm font-medium text-gray-400 hidden lg:table-cell">Acc/Dist</th>
            <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {stocks.map((stock) => (
            <>
              <tr
                key={stock.symbol}
                onClick={() => setExpandedRow(expandedRow === stock.symbol ? null : stock.symbol)}
                className="hover:bg-gray-700/50 cursor-pointer transition"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{stock.symbol}</div>
                  <div className="text-xs text-gray-400 truncate max-w-[150px]">{stock.name}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  <div className="text-white">{formatPrice(stock.price)}</div>
                </td>
                <td className={`px-4 py-3 text-right font-mono ${getChangeColor(stock.change)}`}>
                  <div>{stock.change > 0 ? '+' : ''}{formatPrice(stock.change)}</div>
                  <div className="text-xs">
                    ({stock.change_percent > 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%)
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-300 hidden md:table-cell">
                  {formatNumber(stock.volume)}
                </td>
                <td className={`px-4 py-3 text-right font-mono hidden lg:table-cell ${getChangeColor(stock.net_foreign)}`}>
                  {formatNumber(stock.net_foreign)}
                </td>
                <td className="px-4 py-3 text-center hidden lg:table-cell">
                  {getAccDistBadge(stock.acc_dist_status)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`px-2 py-1 rounded font-medium ${
                    stock.score >= 60 ? 'bg-green-600/30 text-green-400' :
                    stock.score >= 40 ? 'bg-yellow-600/30 text-yellow-400' :
                    'bg-gray-600/30 text-gray-400'
                  }`}>
                    {stock.score}
                  </span>
                </td>
              </tr>
              
              {/* Expanded Row */}
              {expandedRow === stock.symbol && (
                <tr key={`${stock.symbol}-detail`} className="bg-gray-900/50">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Open</div>
                        <div className="text-white font-mono">{formatPrice(stock.open_price)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">High</div>
                        <div className="text-green-400 font-mono">{formatPrice(stock.high)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Low</div>
                        <div className="text-red-400 font-mono">{formatPrice(stock.low)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Prev Close</div>
                        <div className="text-white font-mono">{formatPrice(stock.prev_close)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Bid</div>
                        <div className="text-white font-mono">{formatPrice(stock.bid)} ({formatNumber(stock.bid_size)})</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Ask</div>
                        <div className="text-white font-mono">{formatPrice(stock.ask)} ({formatNumber(stock.ask_size)})</div>
                      </div>
                      <div>
                        <div className="text-gray-400">ARA</div>
                        <div className="text-green-400 font-mono">{formatPrice(stock.ara)} (+{stock.ara_pct}%)</div>
                      </div>
                      <div>
                        <div className="text-gray-400">ARB</div>
                        <div className="text-red-400 font-mono">{formatPrice(stock.arb)} ({stock.arb_pct}%)</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Foreign Buy</div>
                        <div className="text-green-400 font-mono">{formatNumber(stock.foreign_buy)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Foreign Sell</div>
                        <div className="text-red-400 font-mono">{formatNumber(stock.foreign_sell)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Volatility</div>
                        <div className="text-yellow-400 font-mono">{stock.volatility.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Spread</div>
                        <div className="text-white font-mono">{stock.spread.toFixed(2)}%</div>
                      </div>
                      {stock.iep > 0 && (
                        <>
                          <div>
                            <div className="text-gray-400">IEP</div>
                            <div className="text-blue-400 font-mono">{formatPrice(stock.iep)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">IEV</div>
                            <div className="text-blue-400 font-mono">{formatNumber(stock.iev)}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
