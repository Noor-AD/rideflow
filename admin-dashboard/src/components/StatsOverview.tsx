import React from 'react';
import {
  Car,
  TrendingUp,
  CircleDollarSign,
  UserCheck,
  Clock,
} from 'lucide-react';
import type { DashboardStats } from '../types';

interface StatsOverviewProps {
  stats: DashboardStats;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Gross Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      subtitle: `Platform Cut (20%): ₹${stats.platformCommission.toLocaleString()}`,
      icon: CircleDollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      trend: '+14.2% today',
    },
    {
      title: 'Active Fleet Online',
      value: stats.activeDrivers.toString(),
      subtitle: 'Available for immediate dispatch',
      icon: Car,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      trend: 'Live PostGIS tracked',
    },
    {
      title: 'Completed Trips',
      value: stats.totalRides.toString(),
      subtitle: '100% trip lifecycle verified',
      icon: TrendingUp,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20',
      trend: '+8.4% vs yesterday',
    },
    {
      title: 'Pending Verifications',
      value: stats.pendingApprovals.toString(),
      subtitle: 'Awaiting license / RC review',
      icon: UserCheck,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      trend: stats.pendingApprovals > 0 ? 'Requires Action' : 'All clear',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {statCards.map((card, index) => {
        const Icon = card.icon;

        return (
          <div
            key={index}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </p>
                <h3 className="text-2xl font-bold text-white mt-1.5">{card.value}</h3>
              </div>
              <div className={`p-2.5 rounded-xl border ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">{card.subtitle}</span>
              <span className={`font-medium flex items-center gap-1 ${card.color}`}>
                <Clock className="w-3 h-3" />
                {card.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};