import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, Car, User, Phone, FileText } from 'lucide-react';
import type { DriverProfile } from '../types';

interface DriverQueueProps {
  drivers: DriverProfile[];
  onApprove: (driverId: number) => Promise<void>;
  isLoading?: boolean;
}

export const DriverQueue: React.FC<DriverQueueProps> = ({
  drivers,
  onApprove,
  isLoading = false,
}) => {
  // Local state to track which specific driver button is currently in-flight
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const handleApprove = async (driverId: number) => {
    try {
      setApprovingId(driverId);
      await onApprove(driverId);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Driver Verification Queue
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review government license and vehicle RC details before granting platform dispatch access
          </p>
        </div>
        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-3 py-1 rounded-full font-semibold">
          {drivers.length} Pending
        </span>
      </div>

      {/* Conditional: Empty State vs. Table */}
      {drivers.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-semibold text-slate-200">No Pending Verifications</h3>
          <p className="text-xs text-slate-500 mt-1">
            All registered driver partners have been reviewed and approved.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Driver Partner</th>
                <th className="px-6 py-4">Vehicle Category</th>
                <th className="px-6 py-4">Plate Number</th>
                <th className="px-6 py-4">License Number</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Driver Name & Contact */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{driver.user.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {driver.user.phone}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Vehicle Type */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                      <Car className="w-3.5 h-3.5 text-emerald-400" />
                      {driver.vehicleType}
                    </span>
                  </td>

                  {/* Vehicle Plate */}
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-200">
                    {driver.vehicleNumber}
                  </td>

                  {/* License */}
                  <td className="px-6 py-4 font-mono text-xs text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    {driver.licenseNumber}
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4">
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-1 rounded-full font-semibold">
                      Under Review
                    </span>
                  </td>

                  {/* Approve Button */}
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleApprove(driver.id)}
                      disabled={isLoading || approvingId === driver.id}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-1.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {approvingId === driver.id ? 'Approving...' : 'Approve Partner'}
                    </button>
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