import { MarketStatus } from '../types/stock';

interface Props {
  totalStocks: number;
  screenedStocks: number;
  marketStatus: MarketStatus | null;
}

export function StatsCards({ totalStocks, screenedStocks, marketStatus }: Props) {
  const lastUpdate = marketStatus?.updated_at
    ? new Date(marketStatus.updated_at).toLocaleString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '-';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-sm text-gray-400">Total Saham</div>
        <div className="text-2xl font-bold text-white">{totalStocks}</div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-sm text-gray-400">Lolos Screening</div>
        <div className="text-2xl font-bold text-green-400">{screenedStocks}</div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-sm text-gray-400">Pass Rate</div>
        <div className="text-2xl font-bold text-blue-400">
          {totalStocks > 0 ? ((screenedStocks / totalStocks) * 100).toFixed(1) : 0}%
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-sm text-gray-400">Update Terakhir</div>
        <div className="text-xl font-bold text-yellow-400">{lastUpdate}</div>
      </div>
    </div>
  );
}
