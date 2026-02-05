import { useState } from 'react';
import { useStocks } from './hooks/useStocks';
import { StockTable } from './components/StockTable';
import { MarketStatusBar } from './components/MarketStatusBar';
import { StatsCards } from './components/StatsCards';

function App() {
  const { stocks, screenedStocks, marketStatus, loading, error, refresh } = useStocks();
  const [showScreenedOnly, setShowScreenedOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const displayStocks = showScreenedOnly ? screenedStocks : stocks;
  const filteredStocks = displayStocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-blue-400">
                BEI Stock Screener
              </h1>
              <p className="text-sm text-gray-400">
                Powered by Supabase Realtime
              </p>
            </div>

            <MarketStatusBar marketStatus={marketStatus} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <StatsCards
          totalStocks={stocks.length}
          screenedStocks={screenedStocks.length}
          marketStatus={marketStatus}
        />

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cari saham (kode atau nama)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowScreenedOnly(true)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                showScreenedOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Screened ({screenedStocks.length})
            </button>
            <button
              onClick={() => setShowScreenedOnly(false)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                !showScreenedOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              All ({stocks.length})
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium transition flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                Loading...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Stock Table */}
        <StockTable stocks={filteredStocks} loading={loading} />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>Data dari Yahoo Finance & IDX. Update realtime via Supabase.</p>
          <p className="mt-1">
            Disclaimer: Bukan rekomendasi investasi. DYOR!
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
