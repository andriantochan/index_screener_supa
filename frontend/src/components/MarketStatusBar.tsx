import { MarketStatus } from '../types/stock';

interface Props {
  marketStatus: MarketStatus | null;
}

export function MarketStatusBar({ marketStatus }: Props) {
  if (!marketStatus) {
    return (
      <div className="px-4 py-2 bg-gray-700 rounded-lg text-gray-400">
        Loading market status...
      </div>
    );
  }

  const getStatusColor = () => {
    switch (marketStatus.status) {
      case 'open':
        return 'bg-green-600';
      case 'pre_opening':
      case 'pre_closing':
        return 'bg-yellow-600';
      case 'break':
        return 'bg-orange-600';
      case 'closing':
        return 'bg-blue-600';
      default:
        return 'bg-red-600';
    }
  };

  const getStatusIcon = () => {
    switch (marketStatus.status) {
      case 'open':
        return '🟢';
      case 'pre_opening':
      case 'pre_closing':
        return '🟡';
      case 'break':
        return '🟠';
      case 'closing':
        return '🔵';
      default:
        return '🔴';
    }
  };

  return (
    <div className={`px-4 py-2 ${getStatusColor()} rounded-lg flex items-center gap-2`}>
      <span>{getStatusIcon()}</span>
      <span className="font-medium">{marketStatus.message}</span>
      {marketStatus.can_trade && (
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded">TRADING</span>
      )}
    </div>
  );
}
