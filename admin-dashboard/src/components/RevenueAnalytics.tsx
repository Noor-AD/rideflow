import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { CircleDollarSign, TrendingUp, Wallet } from 'lucide-react';
import type { DashboardStats } from '../types';

interface RevenueAnalyticsProps {
  stats: DashboardStats;
}

export const RevenueAnalytics: React.FC<RevenueAnalyticsProps> = ({ stats }) => {
  // Weekly simulation data based on current platform stats
  const weeklyData = [
    { day: 'Mon', gross: 24000, driverPayout: 19200, commission: 4800 },
    { day: 'Tue', gross: 31000, driverPayout: 24800, commission: 6200 },
    { day: 'Wed', gross: 28500, driverPayout: 22800, commission: 5700 },
    { day: 'Thu', gross: 36000, driverPayout: 28800, commission: 7200 },
    { day: 'Fri', gross: 45000, driverPayout: 36000, commission: 9000 },
    { day: 'Sat', gross: 58000, driverPayout: 46400, commission: 11600 },
    { day: 'Sun', gross: 52000, driverPayout: 41600, commission: 10400 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Ledger Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Fares Processed
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-2">
            ₹{stats.totalRevenue.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 mt-1">100% Gross Passenger Payments</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Driver Partner Payouts (80%)
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-2">
            ₹{(stats.totalRevenue * 0.8).toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Direct Driver Wallet Settlements</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Platform Fee Cut (20%)
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-2">
            ₹{stats.platformCommission.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Net RideFlow Retained Revenue</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Area Chart: Revenue Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Weekly Gross Volume Trend</h3>
          <p className="text-xs text-slate-400 mb-4">Daily gross passenger bookings</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val) => [`₹${Number(val || 0).toLocaleString()}`, 'Gross Fare']}
                />
                <Area type="monotone" dataKey="gross" stroke="#10b981" strokeWidth={2} fill="url(#grossGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Bar Chart: Revenue Split (Driver vs Platform) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Commission Split Ledger</h3>
          <p className="text-xs text-slate-400 mb-4">80% Driver Earning vs 20% Platform Fee</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val) => [`₹${Number(val || 0).toLocaleString()}`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="driverPayout" name="Driver (80%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commission" name="Platform (20%)" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};