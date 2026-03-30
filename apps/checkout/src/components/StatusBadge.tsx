import React from 'react';
import { CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface StatusBadgeProps {
  status: 'Pending' | 'Paid' | 'Refunded' | 'Expired';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useLanguage();

  const getStatusConfig = () => {
    switch (status) {
      case 'Pending':
        return {
          icon: Clock,
          text: t.status.pending,
          className: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        };
      case 'Paid':
        return {
          icon: CheckCircle,
          text: t.status.paid,
          className: 'bg-green-500/10 text-green-300 border-green-500/30',
        };
      case 'Refunded':
        return {
          icon: RefreshCw,
          text: t.status.refunded,
          className: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
        };
      case 'Expired':
        return {
          icon: XCircle,
          text: t.status.expired,
          className: 'bg-red-500/10 text-red-300 border-red-500/30',
        };
      default:
        return {
          icon: Clock,
          text: status,
          className: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
        };
    }
  };

  const { icon: Icon, text, className } = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {text}
    </span>
  );
};
