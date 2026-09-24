// mobile/src/components/LeafletMap.tsx
import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LeafletMapProps {
  pickupCoords: Coordinates;
  dropoffCoords: Coordinates;
  driverLocation?: Coordinates | null;
  pickupAddress?: string;
  dropoffAddress?: string;
  routeCoordinates?: [number, number][];
  rideStatus?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  pickupCoords,
  dropoffCoords,
  driverLocation,
  pickupAddress = 'Pickup Point',
  dropoffAddress = 'Destination',
  routeCoordinates,
  rideStatus,
}) => {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  // Generate the standalone HTML template with Leaflet & CartoDB Voyager tiles
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
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${pickupCoords.latitude}, ${pickupCoords.longitude}], 14);

        // High-Definition World Street Map Layer (Clean, 100% Free, NO watermarks or API keys required)
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: 'Esri, HERE, Garmin, OpenStreetMap'
        }).addTo(map);

        var pickupIcon = L.divIcon({
          className: '',
          html: '<div class="pin-wrapper pickup-pin"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        var dropoffIcon = L.divIcon({
          className: '',
          html: '<div class="pin-wrapper dropoff-pin"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#f43f5e"/></svg></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        var driverIcon = L.divIcon({
          className: '',
          html: '<div class="pin-wrapper driver-pin"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        var pickupMarker = L.marker([${pickupCoords.latitude}, ${pickupCoords.longitude}], { icon: pickupIcon }).addTo(map);
        var dropoffMarker = L.marker([${dropoffCoords.latitude}, ${dropoffCoords.longitude}], { icon: dropoffIcon }).addTo(map);
        var driverMarker = null;
        var approachingLine = null;

        var initialRoute = ${JSON.stringify(
          routeCoordinates && routeCoordinates.length > 1
            ? routeCoordinates
            : [
                [pickupCoords.latitude, pickupCoords.longitude],
                [dropoffCoords.latitude, dropoffCoords.longitude],
              ]
        )};

        var routeLine = L.polyline(initialRoute, {
          color: '#10b981',
          weight: 5,
          opacity: 0.9,
          smoothFactor: 1.2
        }).addTo(map);

        // Auto-fit bounds initially
        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

        // Real-time update function called from React Native without reloading page
        window.updateCoordinates = function(data) {
          if (data.pickup) {
            pickupMarker.setLatLng([data.pickup.latitude, data.pickup.longitude]);
          }
          if (data.dropoff) {
            dropoffMarker.setLatLng([data.dropoff.latitude, data.dropoff.longitude]);
          }
          if (data.routeCoordinates && data.routeCoordinates.length > 1) {
            routeLine.setLatLngs(data.routeCoordinates);
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
          } else if (data.pickup && data.dropoff && !data.driver) {
            routeLine.setLatLngs([
              [data.pickup.latitude, data.pickup.longitude],
              [data.dropoff.latitude, data.dropoff.longitude]
            ]);
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
          }
          if (data.driver) {
            if (!driverMarker) {
              driverMarker = L.marker([data.driver.latitude, data.driver.longitude], { icon: driverIcon }).addTo(map);
            } else {
              driverMarker.setLatLng([data.driver.latitude, data.driver.longitude]);
            }

            if (data.rideStatus === 'IN_PROGRESS') {
              // During trip to destination: clear pickup approach line and track vehicle towards dropoff
              if (approachingLine) {
                map.removeLayer(approachingLine);
                approachingLine = null;
              }
              if (data.dropoff) {
                var inRideBounds = L.latLngBounds([
                  [data.driver.latitude, data.driver.longitude],
                  [data.dropoff.latitude, data.dropoff.longitude]
                ]);
                map.fitBounds(inRideBounds, { padding: [60, 60], maxZoom: 16 });
              }
            } else if (data.pickup) {
              if (!approachingLine) {
                approachingLine = L.polyline([
                  [data.driver.latitude, data.driver.longitude],
                  [data.pickup.latitude, data.pickup.longitude]
                ], {
                  color: '#38bdf8',
                  weight: 3.5,
                  dashArray: '4, 6',
                  opacity: 0.95
                }).addTo(map);
              } else {
                approachingLine.setLatLngs([
                  [data.driver.latitude, data.driver.longitude],
                  [data.pickup.latitude, data.pickup.longitude]
                ]);
              }

              var approachBounds = L.latLngBounds([
                [data.driver.latitude, data.driver.longitude],
                [data.pickup.latitude, data.pickup.longitude]
              ]);
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
        };

        window.recenter = function() {
          if (routeLine) {
            map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });
          }
        };
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

