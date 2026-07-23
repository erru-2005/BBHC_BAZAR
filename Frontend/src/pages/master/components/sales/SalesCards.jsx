import React from 'react';
import {
  TrendingUp,
  ShoppingCart,
  PackageCheck,
  Clock,
  XCircle,
  RefreshCcw,
  DollarSign,
  Activity,
} from 'lucide-react';

const fmt = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);

const SalesCards = ({ summary }) => {
  // Show skeleton placeholders while summary is null
  if (!summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-7 w-16 bg-gray-300 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Revenue',
      value: fmt(summary.total_revenue),
      icon: <TrendingUp size={22} className="text-green-600" />,
      bg: 'bg-green-50',
      border: 'border-green-100',
    },
    {
      title: 'Total Orders',
      value: summary.total_orders ?? 0,
      icon: <ShoppingCart size={22} className="text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      title: 'Delivered',
      value: summary.delivered_orders ?? 0,
      icon: <PackageCheck size={22} className="text-emerald-600" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      title: 'Pending',
      value: summary.pending_orders ?? 0,
      icon: <Clock size={22} className="text-yellow-600" />,
      bg: 'bg-yellow-50',
      border: 'border-yellow-100',
    },
    {
      title: 'Cancelled',
      value: summary.cancelled_orders ?? 0,
      icon: <XCircle size={22} className="text-red-600" />,
      bg: 'bg-red-50',
      border: 'border-red-100',
    },
    {
      title: 'Returned',
      value: summary.returned_orders ?? 0,
      icon: <RefreshCcw size={22} className="text-orange-600" />,
      bg: 'bg-orange-50',
      border: 'border-orange-100',
    },
    {
      title: 'Net Revenue',
      value: fmt(summary.net_revenue),
      icon: <DollarSign size={22} className="text-indigo-600" />,
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      title: 'Avg Order Value',
      value: fmt(summary.average_order_value),
      icon: <Activity size={22} className="text-purple-600" />,
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`bg-white rounded-xl shadow-sm border ${card.border} p-5 flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-md`}
        >
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {card.title}
            </p>
            <h3 className="text-xl font-bold text-gray-900">{card.value}</h3>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.bg} shrink-0`}>
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SalesCards;
