import React from 'react';
import { useNetworkDetection } from '../hooks/useNetworkDetection';
import { NetworkRefreshButton } from './NetworkRefreshButton';
import { useLanguage } from '../contexts/LanguageContext';

export const NetworkStatusDisplay: React.FC = () => {
  const { t } = useLanguage();
  const { networkInfo, isCorrectNetwork, refreshNetwork, isRefreshing, lastRefresh } = useNetworkDetection('Celo');

  if (!networkInfo) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="text-center text-gray-500">
          🔍 {t.network?.detecting || 'Detectando red...'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900 font-medium">
          {t.network?.status || 'Estado de la Red'}
        </h3>
        <NetworkRefreshButton
          onRefresh={refreshNetwork}
          isRefreshing={isRefreshing}
          lastRefresh={lastRefresh}
          className="text-sm"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className={`w-3 h-3 rounded-full ${isCorrectNetwork ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm text-gray-600">
            {isCorrectNetwork ? '✅ Conectado' : '❌ Desconectado'}
          </span>
        </div>
        
        <div className="text-xs text-gray-500 space-y-1">
          <div>Red actual: {networkInfo.name} (ID: {networkInfo.chainId})</div>
          <div>Red esperada: {networkInfo.expectedName} (ID: {networkInfo.expectedChainId})</div>
          <div>Estado: {networkInfo.isCorrect ? 'Correcto' : 'Incorrecto'}</div>
          <div>Soportada: {networkInfo.isSupported ? 'Sí' : 'No'}</div>
        </div>
      </div>
    </div>
  );
};
