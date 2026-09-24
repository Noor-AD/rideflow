import React from 'react';
import { Car, ShieldCheck, Wifi, WifiOff, LogOut } from 'lucide-react';
import type { ConnectionStatus } from '../api/websocket';

interface NavbarProps {
  connectionStatus: ConnectionStatus;
  adminName?: string;
  adminEmail?: string;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  connectionStatus,
  adminName = 'Fleet Operations Lead',
  adminEmail = 'admin@rideflow.test',
  onLogout,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
          <Car className="w-6 h-6 font-bold" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">RideFlow</h1>
            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium border border-emerald-500/20">
              Ops Fleet
            </span>
          </div>
          <p className="text-xs text-slate-400">Real-Time Dispatch & Fleet Console</p>
        </div>
      </div>

      {/* Center/Right Status Indicators */}
      <div className="flex items-center gap-4">
        {/* Live WebSocket Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            connectionStatus === 'CONNECTED'
              ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
              : connectionStatus === 'CONNECTING'
              ? 'bg-amber-950/60 border-amber-500/30 text-amber-400'
              : 'bg-rose-950/60 border-rose-500/30 text-rose-400'
          }`}
        >
          {connectionStatus === 'CONNECTED' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3.5 h-3.5" />
              <span>LIVE TELEMETRY</span>
            </>
          ) : connectionStatus === 'CONNECTING' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>CONNECTING...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>DISCONNECTED</span>
            </>
          )}
        </div>

        {/* Admin Profile Badge */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-tight">{adminName}</p>
            <p className="text-[10px] text-slate-400">{adminEmail}</p>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign out of Admin Operations"
              className="ml-2 p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/30 transition-all flex items-center gap-1 text-xs cursor-pointer group"
            >
              <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden md:inline font-medium">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};