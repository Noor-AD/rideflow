import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  User,
  Car,
  Filter,
} from 'lucide-react';
import type { Ride, RideStatus } from '../types';

interface ActiveRidesTableProps {
  rides: Ride[];
  isLoading?: boolean;
}

export const ActiveRidesTable: React.FC<ActiveRidesTableProps> = ({
  rides,
  isLoading = false,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Filter rides based on dropdown selection
  const filteredRides = rides.filter((ride) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTIVE') {
      return ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(ride.status);
    }
    return ride.status === filterStatus;
  });

  // Helper for color-coded status badges
  const getStatusBadge = (status: RideStatus) => {
    switch (status) {
      case 'REQUESTED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ACCEPTED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ARRIVED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'IN_PROGRESS':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <Clock className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-300">Loading live trip feed...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Header & Filter Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-400" />
            Live Dispatch & Ride Feed
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time trip lifecycle state machine updates
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Trips ({rides.length})</option>
            <option value="ACTIVE">Active Only</option>
            <option value="REQUESTED">Requested</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      {filteredRides.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No rides found</p>
          <p className="text-xs text-slate-500 mt-0.5">
            No trips match the current filter selection.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Ride ID</th>
                <th className="px-6 py-4">Passenger</th>
                <th className="px-6 py-4">Assigned Driver</th>
                <th className="px-6 py-4">Route (Pickup → Dropoff)</th>
                <th className="px-6 py-4">Fare</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRides.map((ride) => (
                <tr key={ride.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* ID */}
                  <td className="px-6 py-4 font-mono font-bold text-xs text-slate-200">
                    #{ride.id}
                  </td>

                  {/* Rider */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-xs">{ride.rider.name}</p>
                        <p className="text-[11px] text-slate-500">{ride.rider.phone}</p>
                      </div>
                    </div>
                  </td>

                  {/* Driver */}
                  <td className="px-6 py-4">
                    {ride.driver ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs text-emerald-400">
                          <Car className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-xs">{ride.driver.user.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {ride.driver.vehicleType} ({ride.driver.vehicleNumber})
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-400/80 italic">Searching driver...</span>
                    )}
                  </td>

                  {/* Route */}
                  <td className="px-6 py-4 max-w-xs">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-300 truncate">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{ride.pickupAddress || `${ride.pickupLat.toFixed(4)}, ${ride.pickupLng.toFixed(4)}`}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 truncate">
                        <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                        <span className="truncate">{ride.dropoffAddress || `${ride.dropoffLat.toFixed(4)}, ${ride.dropoffLng.toFixed(4)}`}</span>
                      </div>
                    </div>
                  </td>

                  {/* Fare */}
                  <td className="px-6 py-4 font-semibold text-emerald-400 text-xs">
                    ₹{ride.fare.toFixed(2)}
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                        ride.status
                      )}`}
                    >
                      {ride.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};