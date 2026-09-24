import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Navigation,
  UserCheck,
  CircleDollarSign,
} from 'lucide-react';

export type DashboardTab = 'overview' | 'map' | 'rides' | 'drivers' | 'revenue';

interface SidebarProps {
  currentTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  pendingApprovalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  pendingApprovalsCount = 0,
}) => {
  const navItems = [
    { id: 'overview' as DashboardTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'map' as DashboardTab, label: 'Live Fleet Map', icon: MapPin },
    { id: 'rides' as DashboardTab, label: 'Active Trips', icon: Navigation },
    {
      id: 'drivers' as DashboardTab,
      label: 'Driver Approvals',
      icon: UserCheck,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { id: 'revenue' as DashboardTab, label: 'Revenue Ledger', icon: CircleDollarSign },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-4 space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Fleet Operations
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-semibold border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500">
        <p>RideFlow Engine v1.0</p>
        <p className="text-slate-600">STOMP Broker: Active</p>
      </div>
    </aside>
  );
};