import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface NetworkRefreshButtonProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  lastRefresh?: Date | null;
  className?: string;
}

export const NetworkRefreshButton: React.FC<NetworkRefreshButtonProps> = ({
  onRefresh,
  isRefreshing = false,
  lastRefresh,
  className = ''
}) => {
  const { t } = useLanguage();

  const formatLastRefresh = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    return `${Math.floor(diffSecs / 3600)}h ago`;
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors
          ${isRefreshing 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
        `}
        title={t.network?.refreshNetwork || 'Refresh Network'}
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>{isRefreshing ? (t.network?.refreshing || 'Refreshing...') : (t.network?.refresh || 'Refresh')}</span>
      </button>
      
      {lastRefresh && (
        <div className="text-sm text-gray-400">
          {t.network?.lastRefresh || 'Last refresh'}: {formatLastRefresh(lastRefresh)}
        </div>
      )}
    </div>
  );
};
