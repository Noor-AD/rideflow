import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  drivers = [],
  activeRides = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: number]: L.Marker }>({});

  // Default Map Center: Bengaluru, India
  const defaultCenter: [number, number] = [12.9716, 77.5946];

  const getDriverLat = (d: DriverProfile) => d.latitude ?? d.currentLat;
  const getDriverLng = (d: DriverProfile) => d.longitude ?? d.currentLng;
  const isDriverAvailable = (d: DriverProfile) => d.online ?? d.isAvailable ?? true;

  const validDrivers = drivers.filter(
    (d) => getDriverLat(d) != null && getDriverLng(d) != null
  );

  // 1. Initialize Leaflet Map Instance Once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Reset container if previously initialized (prevents Leaflet container error)
    const container = mapContainerRef.current as HTMLElement & { _leaflet_id?: number };
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    try {
      const map = L.map(container, {
        center: defaultCenter,
        zoom: 13,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapRef.current = map;

      // Force layout invalidation so tiles render cleanly
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    } catch (err) {
      console.error('Leaflet Map initialization error:', err);
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('Leaflet cleanup notice:', e);
        }
        mapRef.current = null;
        markersRef.current = {};
      }
    };
  }, []);

  // 2. Synchronize Driver Markers dynamically on updates
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const currentDriverIds = new Set<number>();

    validDrivers.forEach((driver) => {
      const lat = getDriverLat(driver)!;
      const lng = getDriverLng(driver)!;
      currentDriverIds.add(driver.id);

      const available = isDriverAvailable(driver);
      const name = driver.driverName || driver.user?.name || `Driver #${driver.id}`;
      const phone = driver.driverPhone || driver.user?.phone || 'No phone';
      const plate = driver.vehiclePlate || driver.vehicleNumber || 'N/A';
      const model = driver.vehicleModel || driver.vehicleType || 'Vehicle';
      const rating = Number(driver.rating ?? 5.0).toFixed(1);

      const popupHtml = `
        <div style="font-family: sans-serif; padding: 4px; color: #1e293b; min-width: 160px;">
          <p style="font-weight: 700; font-size: 13px; margin: 0 0 3px 0;">${name}</p>
          <p style="font-size: 11px; margin: 2px 0; color: #475569;">Vehicle: <b>${model}</b> (${plate})</p>
          <p style="font-size: 11px; margin: 2px 0; color: #475569;">Phone: <b>${phone}</b></p>
          <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
            <span style="color: #047857; font-weight: 600;">⭐ ${rating}</span>
            <span style="font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${
              available ? '#d1fae5' : '#dbeafe'
            }; color: ${available ? '#065f46' : '#1e40af'};">
              ${available ? 'AVAILABLE' : 'ON TRIP'}
            </span>
          </div>
        </div>
      `;

      if (markersRef.current[driver.id]) {
        // Update existing marker position & icon
        const existingMarker = markersRef.current[driver.id];
        existingMarker.setLatLng([lat, lng]);
        existingMarker.setIcon(createDriverIcon(available));
        existingMarker.setPopupContent(popupHtml);
      } else {
        // Instantiate new marker
        const newMarker = L.marker([lat, lng], {
          icon: createDriverIcon(available),
        }).addTo(map);
        newMarker.bindPopup(popupHtml);
        markersRef.current[driver.id] = newMarker;
      }
    });

    // Remove any markers that are no longer active
    Object.keys(markersRef.current).forEach((idStr) => {
      const id = Number(idStr);
      if (!currentDriverIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Auto-center map on first driver if position is valid
    if (validDrivers.length > 0) {
      const firstLat = getDriverLat(validDrivers[0])!;
      const firstLng = getDriverLng(validDrivers[0])!;
      map.setView([firstLat, firstLng], map.getZoom());
    }
  }, [drivers]);

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
            ({validDrivers.length} Taxis Active On Map)
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

      {/* Leaflet Native Canvas Container */}
      <div className="flex-1 w-full relative z-0">
        <div
          ref={mapContainerRef}
          className="h-full w-full bg-slate-950"
          style={{ minHeight: '550px' }}
        />
      </div>
    </div>
  );
};