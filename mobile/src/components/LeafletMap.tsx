// mobile/src/components/LeafletMap.tsx
import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LeafletMapProps {
  pickupCoords?: Coordinates;
  dropoffCoords?: Coordinates;
  driverLocation?: Coordinates | null;
  pickupAddress?: string;
  dropoffAddress?: string;
  routeCoordinates?: [number, number][];
  rideStatus?: string;
  isDriverView?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  pickupCoords = { latitude: 12.9716, longitude: 77.5946 },
  dropoffCoords = { latitude: 12.9352, longitude: 77.6245 },
  driverLocation,
  pickupAddress = 'Pickup Point',
  dropoffAddress = 'Destination',
  routeCoordinates,
  rideStatus,
  isDriverView = false,
}) => {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  const initialCenterLat = isDriverView && driverLocation
    ? driverLocation.latitude
    : pickupCoords.latitude;
  const initialCenterLng = isDriverView && driverLocation
    ? driverLocation.longitude
    : pickupCoords.longitude;

  // Generate the standalone HTML template with Leaflet & Esri World Street tiles
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { box-sizing: border-box; }
        body, html, #map {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background-color: #0f172a;
          overflow: hidden;
        }
        .pin-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        }
        .pickup-pin { background-color: #10b981; }
        .dropoff-pin { background-color: #f43f5e; }
        .driver-pin {
          background-color: #38bdf8;
          animation: pulse-ring 2s infinite;
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(56, 189, 248, 0); }
          100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
        }
        .leaflet-marker-icon {
          transition: transform 0.4s linear;
        }
        .leaflet-control-attribution {
          font-size: 8px !important;
          background: rgba(255,255,255,0.7) !important;
        }
        .driver-halo {
          width: 22px;
          height: 22px;
          background: #3b82f6;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.9);
        }
        .marker-pill {
          background: rgba(15, 23, 42, 0.92) !important;
          border: 1px solid rgba(255, 255, 255, 0.22) !important;
          color: #f8fafc !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          padding: 3px 8px !important;
          border-radius: 9999px !important;
          white-space: nowrap !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45) !important;
        }
        .marker-pill::before {
          border-top-color: rgba(15, 23, 42, 0.92) !important;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var isDriverView = ${isDriverView ? 'true' : 'false'};

        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${initialCenterLat}, ${initialCenterLng}], 15);

        // High-Definition World Street Map Layer (Clean, Free, Fast)
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: 'Esri, HERE, Garmin, OpenStreetMap'
        }).addTo(map);

        // Distinct Passenger Silhouette Icon
        var pickupIcon = L.divIcon({
          className: '',
          html: '<div class="pin-wrapper pickup-pin"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        // Destination Flag Icon
        var dropoffIcon = L.divIcon({
          className: '',
          html: '<div class="pin-wrapper dropoff-pin"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        // Driver Car Icon
        var driverIcon = L.divIcon({
          className: '',
          html: '<div class="pin-wrapper driver-pin"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        var pickupMarker = null;
        var dropoffMarker = null;
        var driverMarker = null;
        var routeLine = null;
        var approachingLine = null;

        if (!isDriverView) {
          pickupMarker = L.marker([${pickupCoords.latitude}, ${pickupCoords.longitude}], { icon: pickupIcon }).addTo(map);
          pickupMarker.bindTooltip('🧍 Your Pickup', { permanent: true, direction: 'top', offset: [0, -18], className: 'marker-pill' });

          dropoffMarker = L.marker([${dropoffCoords.latitude}, ${dropoffCoords.longitude}], { icon: dropoffIcon }).addTo(map);
          dropoffMarker.bindTooltip('🏁 Destination', { permanent: true, direction: 'top', offset: [0, -18], className: 'marker-pill' });

          var initialRoute = ${JSON.stringify(
            routeCoordinates && routeCoordinates.length > 1
              ? routeCoordinates
              : [
                  [pickupCoords.latitude, pickupCoords.longitude],
                  [dropoffCoords.latitude, dropoffCoords.longitude],
                ]
          )};

          routeLine = L.polyline(initialRoute, {
            color: '#10b981',
            weight: 5,
            opacity: 0.9,
            smoothFactor: 1.2
          }).addTo(map);

          map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        } else {
          // DRIVER VIEW INITIAL STATE
          ${driverLocation ? `driverMarker = L.marker([${driverLocation.latitude}, ${driverLocation.longitude}], { icon: driverIcon }).addTo(map);
          driverMarker.bindTooltip('🚗 Your Location', { permanent: true, direction: 'top', offset: [0, -20], className: 'marker-pill' });` : ''}
        }

        // Real-time update function called from React Native without reloading page
        window.updateCoordinates = function(data) {
          if (!data) return;

          if (isDriverView) {
            // ============================================
            // 🚕 DRIVER APP MAP VIEW LOGIC
            // ============================================
            if (data.driver && typeof data.driver.latitude === 'number' && typeof data.driver.longitude === 'number') {
              var dPos = [data.driver.latitude, data.driver.longitude];
              if (!driverMarker) {
                driverMarker = L.marker(dPos, { icon: driverIcon }).addTo(map);
                driverMarker.bindTooltip('🚗 Your Location', { permanent: true, direction: 'top', offset: [0, -20], className: 'marker-pill' });
              } else {
                driverMarker.setLatLng(dPos);
              }
            }

            var hasActiveRide = data.rideStatus === 'ACCEPTED' || data.rideStatus === 'ARRIVED' || data.rideStatus === 'IN_PROGRESS';

            if (!hasActiveRide) {
              // Idle / Waiting for rides
              if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker = null; }
              if (dropoffMarker) { map.removeLayer(dropoffMarker); dropoffMarker = null; }
              if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
              if (data.driver) {
                map.setView([data.driver.latitude, data.driver.longitude], 15);
              }
              return;
            }

            if (data.rideStatus === 'ACCEPTED' || data.rideStatus === 'ARRIVED') {
              // 1. Heading to Passenger Pickup
              if (data.pickup && typeof data.pickup.latitude === 'number') {
                var pPos = [data.pickup.latitude, data.pickup.longitude];
                if (!pickupMarker) {
                  pickupMarker = L.marker(pPos, { icon: pickupIcon }).addTo(map);
                  pickupMarker.bindTooltip('🧍 Passenger Pickup', { permanent: true, direction: 'top', offset: [0, -18], className: 'marker-pill' });
                } else {
                  pickupMarker.setLatLng(pPos);
                }
              }
              if (dropoffMarker) { map.removeLayer(dropoffMarker); dropoffMarker = null; }

              var navRoute = (data.routeCoordinates && data.routeCoordinates.length > 1)
                ? data.routeCoordinates
                : (data.driver && data.pickup ? [[data.driver.latitude, data.driver.longitude], [data.pickup.latitude, data.pickup.longitude]] : []);

              if (navRoute.length > 1) {
                if (!routeLine) {
                  routeLine = L.polyline(navRoute, { color: '#38bdf8', weight: 5, opacity: 0.95 }).addTo(map);
                } else {
                  routeLine.setLatLngs(navRoute);
                  routeLine.setStyle({ color: '#38bdf8' });
                }
                map.fitBounds(routeLine.getBounds(), { padding: [60, 60], maxZoom: 17 });
              }
            } else if (data.rideStatus === 'IN_PROGRESS') {
              // 2. Heading to Dropoff Destination
              if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker = null; }
              if (data.dropoff && typeof data.dropoff.latitude === 'number') {
                var dropPos = [data.dropoff.latitude, data.dropoff.longitude];
                if (!dropoffMarker) {
                  dropoffMarker = L.marker(dropPos, { icon: dropoffIcon }).addTo(map);
                  dropoffMarker.bindTooltip('🏁 Destination', { permanent: true, direction: 'top', offset: [0, -18], className: 'marker-pill' });
                } else {
                  dropoffMarker.setLatLng(dropPos);
                }
              }

              var tripRoute = (data.routeCoordinates && data.routeCoordinates.length > 1)
                ? data.routeCoordinates
                : (data.driver && data.dropoff ? [[data.driver.latitude, data.driver.longitude], [data.dropoff.latitude, data.dropoff.longitude]] : []);

              if (tripRoute.length > 1) {
                if (!routeLine) {
                  routeLine = L.polyline(tripRoute, { color: '#38bdf8', weight: 5, opacity: 0.95 }).addTo(map);
                } else {
                  routeLine.setLatLngs(tripRoute);
                  routeLine.setStyle({ color: '#38bdf8' });
                }
                map.fitBounds(routeLine.getBounds(), { padding: [60, 60], maxZoom: 17 });
              }
            }
          } else {
            // ============================================
            // 🧍 RIDER APP MAP VIEW LOGIC
            // ============================================
            if (data.pickup) {
              if (!pickupMarker) {
                pickupMarker = L.marker([data.pickup.latitude, data.pickup.longitude], { icon: pickupIcon }).addTo(map);
                pickupMarker.bindTooltip('🧍 Your Pickup', { permanent: true, direction: 'top', offset: [0, -18], className: 'marker-pill' });
              } else {
                pickupMarker.setLatLng([data.pickup.latitude, data.pickup.longitude]);
              }
            }
            if (data.dropoff) {
              if (!dropoffMarker) {
                dropoffMarker = L.marker([data.dropoff.latitude, data.dropoff.longitude], { icon: dropoffIcon }).addTo(map);
                dropoffMarker.bindTooltip('🏁 Destination', { permanent: true, direction: 'top', offset: [0, -18], className: 'marker-pill' });
              } else {
                dropoffMarker.setLatLng([data.dropoff.latitude, data.dropoff.longitude]);
              }
            }

            var hasDriverLocation = data.driver && typeof data.driver.latitude === 'number' && typeof data.driver.longitude === 'number';

            if (data.routeCoordinates && data.routeCoordinates.length > 1) {
              var rColor = data.rideStatus === 'IN_PROGRESS' ? '#38bdf8' : '#10b981';
              if (!routeLine) {
                routeLine = L.polyline(data.routeCoordinates, { color: rColor, weight: 5, opacity: 0.9 }).addTo(map);
              } else {
                routeLine.setLatLngs(data.routeCoordinates);
                routeLine.setStyle({ color: rColor });
              }
              if (!hasDriverLocation) {
                map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
              }
            } else if (data.pickup && data.dropoff && !hasDriverLocation) {
              var pLine = [
                [data.pickup.latitude, data.pickup.longitude],
                [data.dropoff.latitude, data.dropoff.longitude]
              ];
              if (!routeLine) {
                routeLine = L.polyline(pLine, { color: '#10b981', weight: 5, opacity: 0.9 }).addTo(map);
              } else {
                routeLine.setLatLngs(pLine);
              }
              map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
            }

            if (hasDriverLocation) {
              var dLoc = [data.driver.latitude, data.driver.longitude];
              if (!driverMarker) {
                driverMarker = L.marker(dLoc, { icon: driverIcon }).addTo(map);
                driverMarker.bindTooltip('🚗 Driver', { permanent: true, direction: 'top', offset: [0, -20], className: 'marker-pill' });
              } else {
                driverMarker.setLatLng(dLoc);
              }

              if (data.rideStatus === 'IN_PROGRESS') {
                if (data.dropoff) {
                  var dropLoc = [data.dropoff.latitude, data.dropoff.longitude];
                  if (!approachingLine) {
                    approachingLine = L.polyline([dLoc, dropLoc], {
                      color: '#38bdf8',
                      weight: 4,
                      dashArray: '5, 8',
                      opacity: 0.95
                    }).addTo(map);
                  } else {
                    approachingLine.setLatLngs([dLoc, dropLoc]);
                    approachingLine.setStyle({ color: '#38bdf8' });
                  }
                  if (routeLine) {
                    routeLine.setStyle({ color: '#38bdf8' });
                  }
                  var inRideBounds = L.latLngBounds([dLoc, dropLoc]);
                  map.fitBounds(inRideBounds, { padding: [60, 60], maxZoom: 16 });
                }
              } else if (data.pickup) {
                var pLoc = [data.pickup.latitude, data.pickup.longitude];
                if (!approachingLine) {
                  approachingLine = L.polyline([dLoc, pLoc], {
                    color: '#38bdf8',
                    weight: 3.5,
                    dashArray: '4, 6',
                    opacity: 0.95
                  }).addTo(map);
                } else {
                  approachingLine.setLatLngs([dLoc, pLoc]);
                }
                var approachBounds = L.latLngBounds([dLoc, pLoc]);
                map.fitBounds(approachBounds, { padding: [60, 60], maxZoom: 16 });
              }
            } else {
              if (driverMarker) {
                map.removeLayer(driverMarker);
                driverMarker = null;
              }
              if (approachingLine) {
                map.removeLayer(approachingLine);
                approachingLine = null;
              }
            }
          }
        };

        window.recenter = function() {
          if (isDriverView && driverMarker) {
            map.setView(driverMarker.getLatLng(), 16);
          } else if (routeLine) {
            map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });
          }
        };

        // Initial sync of coordinates on DOM mount
        try {
          window.updateCoordinates({
            pickup: ${JSON.stringify(pickupCoords)},
            dropoff: ${JSON.stringify(dropoffCoords)},
            driver: ${JSON.stringify(driverLocation || null)},
            routeCoordinates: ${JSON.stringify(routeCoordinates || null)},
            rideStatus: ${JSON.stringify(rideStatus || null)}
          });
        } catch (e) {
          console.error("Initial updateCoordinates error:", e);
        }
      </script>
    </body>
    </html>
  `;

  // Push updates to webview/iframe when coordinates change without re-rendering the whole map
  useEffect(() => {
    const payload = JSON.stringify({
      pickup: pickupCoords,
      dropoff: dropoffCoords,
      driver: driverLocation,
      routeCoordinates,
      rideStatus,
    });

    if (Platform.OS === 'web') {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow && (iframe.contentWindow as any).updateCoordinates) {
        (iframe.contentWindow as any).updateCoordinates(JSON.parse(payload));
      }
    } else {
      webViewRef.current?.injectJavaScript(`
        if (window.updateCoordinates) {
          window.updateCoordinates(${payload});
        }
        true;
      `);
    }
  }, [pickupCoords, dropoffCoords, driverLocation, routeCoordinates, rideStatus]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#0f172a' } as any}
          title="Leaflet Map"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webView}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});
