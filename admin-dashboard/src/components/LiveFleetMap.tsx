import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { DriverProfile, Ride } from '../types';

// 1. Custom SVG Marker for Drivers / Taxis
const createDriverIcon = (isAvailable: boolean) => {
  return L.divIcon({
    className: 'custom-driver-marker',
    html: `
      <div style="
        background-color: ${isAvailable ? '#10b981' : '#3b82f6'};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px ${isAvailable ? 'rgba(16, 185, 129, 0.6)' : 'rgba(59, 130, 246, 0.6)'};
        border: 2px solid #ffffff;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

interface LiveFleetMapProps {
  drivers: DriverProfile[];
  activeRides?: Ride[];
}

export const LiveFleetMap: React.FC<LiveFleetMapProps> = ({
  drivers,
  activeRides = [],
}) => {
  // Default Map Center: Bengaluru, India (or your city)
  const defaultCenter: [number, number] = [12.9716, 77.5946];

  // If there are drivers with coordinates, center on the first driver
  const firstDriverWithCoords = drivers.find((d) => d.currentLat && d.currentLng);
  const centerPosition: [number, number] = firstDriverWithCoords
    ? [firstDriverWithCoords.currentLat!, firstDriverWithCoords.currentLng!]
    : defaultCenter;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[650px]">
      {/* Map Header Status Bar */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <h2 className="text-sm font-bold text-white tracking-wide">
            Live Telemetry Grid
          </h2>
          <span className="text-xs text-slate-400">
            ({drivers.filter((d) => d.currentLat).length} Taxis Active On Map)
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300">Available Driver</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-slate-300">On Trip</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-300">{activeRides.length} Active Trips</span>
          </div>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="flex-1 w-full relative z-0">
        <MapContainer
          center={centerPosition}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* OpenStreetMap Standard Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Driver Markers */}
          {drivers
            .filter((d) => d.currentLat && d.currentLng)
            .map((driver) => (
              <Marker
                key={driver.id}
                position={[driver.currentLat!, driver.currentLng!]}
                icon={createDriverIcon(driver.isAvailable)}
              >
                <Popup className="custom-popup">
                  <div className="p-2 text-slate-800">
                    <p className="font-bold text-sm">{driver.user.name}</p>
                    <p className="text-xs text-slate-600">
                      Vehicle: <span className="font-semibold">{driver.vehicleType}</span> ({driver.vehicleNumber})
                    </p>
                    <p className="text-xs text-slate-600">
                      Phone: <span className="font-semibold">{driver.user.phone}</span>
                    </p>
                    <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-emerald-700 font-semibold">
                        ⭐ {driver.rating.toFixed(1)}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          driver.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {driver.isAvailable ? 'AVAILABLE' : 'BUSY'}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
};