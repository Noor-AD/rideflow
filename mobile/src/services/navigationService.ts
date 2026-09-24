// mobile/src/services/navigationService.ts

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AddressSuggestion {
  displayName: string;
  shortName: string;
  latitude: number;
  longitude: number;
}

export interface RouteDetails {
  coordinates: [number, number][]; // [latitude, longitude]
  distanceKm: number;
  durationMins: number;
}

interface GazetteerEntry extends AddressSuggestion {
  aliases: string[];
}

// =========================================================================
// Curated High-Fidelity Bengaluru Gazetteer & Nickname/Acronym Dictionary
// Provides 0ms instant matching for local colloquial areas, landmarks & acronyms
// =========================================================================
const BENGALURU_GAZETTEER: GazetteerEntry[] = [
  // --- BTM Layout & Guruppanpalya ---
  {
    displayName: 'BTM Layout 2nd Stage, Udupi Garden Signal, Bengaluru',
    shortName: 'BTM Layout 2nd Stage',
    latitude: 12.9140,
    longitude: 77.6079,
    aliases: ['btm', 'btm layout', 'btm 2nd stage', 'btm second stage', 'udupi garden', 'btm 2', 'btm stage 2'],
  },
  {
    displayName: 'BTM Layout 1st Stage, 7th Main Road, Bengaluru',
    shortName: 'BTM Layout 1st Stage',
    latitude: 12.9190,
    longitude: 77.6112,
    aliases: ['btm', 'btm layout', 'btm 1st stage', 'btm first stage', 'btm 1', 'btm stage 1', 'mico layout'],
  },
  {
    displayName: 'BTM Water Tank, 16th Main Road, BTM 2nd Stage, Bengaluru',
    shortName: 'BTM Water Tank',
    latitude: 12.9152,
    longitude: 77.6105,
    aliases: ['btm water tank', 'btm 16th main', 'btm tank'],
  },
  {
    displayName: 'Gurappana Palya, Bannerghatta Main Road, Bengaluru',
    shortName: 'Gurappanapalya',
    latitude: 12.9207,
    longitude: 77.6033,
    aliases: ['gurupalya', 'guruppanpalya', 'gurappanapalya', 'gurappana palya', 'dairy circle', 'gura palya'],
  },
  {
    displayName: 'Tavarekere Main Road, Near Forum Mall, Bengaluru',
    shortName: 'Tavarekere',
    latitude: 12.9250,
    longitude: 77.6090,
    aliases: ['tavarekere', 'taverekere', 'tavarekere main road', 'maruthi nagar btm'],
  },
  {
    displayName: 'Central Silk Board Junction, Hosur Road / ORR, Bengaluru',
    shortName: 'Silk Board Junction',
    latitude: 12.9176,
    longitude: 77.6238,
    aliases: ['silk board', 'silkboard', 'csb', 'madiwala silk board', 'central silk board'],
  },
  {
    displayName: 'Madiwala Market, Total Mall / Hosur Road, Bengaluru',
    shortName: 'Madiwala Market',
    latitude: 12.9226,
    longitude: 77.6174,
    aliases: ['madiwala', 'madivala', 'madiwala market', 'madiwala police station'],
  },

  // --- Koramangala ---
  {
    displayName: 'Koramangala 5th Block, 80 Feet Road, Bengaluru',
    shortName: 'Koramangala 5th Block',
    latitude: 12.9352,
    longitude: 77.6245,
    aliases: ['koramangala', 'kora', 'koramangala 5th block', 'kora 5th block', 'jyoti nivas college', 'jnc'],
  },
  {
    displayName: 'Nexus Koramangala (Forum Mall), Hosur Road, Bengaluru',
    shortName: 'Forum Mall Koramangala',
    latitude: 12.9348,
    longitude: 77.6111,
    aliases: ['forum mall', 'nexus mall', 'nexus koramangala', 'forum koramangala'],
  },
  {
    displayName: 'Koramangala 4th Block, Sony World Signal, Bengaluru',
    shortName: 'Sony World Signal, Koramangala',
    latitude: 12.9344,
    longitude: 77.6284,
    aliases: ['sony world', 'sony signal', 'koramangala 4th block', 'sony world signal'],
  },
  {
    displayName: 'Koramangala 6th Block, 100 Feet Road, Bengaluru',
    shortName: 'Koramangala 6th Block',
    latitude: 12.9385,
    longitude: 77.6202,
    aliases: ['koramangala 6th block', 'kora 6th block'],
  },

  // --- HSR Layout ---
  {
    displayName: 'HSR Layout Sector 1, 27th Main Road, Bengaluru',
    shortName: 'HSR Layout Sector 1',
    latitude: 12.9116,
    longitude: 77.6389,
    aliases: ['hsr', 'hsr layout', 'hsr sector 1', 'hsr 27th main', '27th main hsr'],
  },
  {
    displayName: 'HSR BDA Complex, 12th Main Road, Sector 6, Bengaluru',
    shortName: 'HSR BDA Complex',
    latitude: 12.9142,
    longitude: 77.6401,
    aliases: ['hsr bda', 'hsr bda complex', 'hsr sector 6', 'hsr club'],
  },
  {
    displayName: 'HSR Layout Sector 2, 14th Main Road, Bengaluru',
    shortName: 'HSR Layout Sector 2',
    latitude: 12.9125,
    longitude: 77.6465,
    aliases: ['hsr sector 2', 'hsr 14th main'],
  },

  // --- Jayanagar & JP Nagar ---
  {
    displayName: 'Jayanagar 4th Block Complex, 11th Main Road, Bengaluru',
    shortName: 'Jayanagar 4th Block',
    latitude: 12.9299,
    longitude: 77.5833,
    aliases: ['jayanagar', 'jayanagar 4th block', 'jayanagar shopping complex', 'jayanagar 4'],
  },
  {
    displayName: 'JP Nagar 2nd Phase, 24th Main Road, Bengaluru',
    shortName: 'JP Nagar 2nd Phase',
    latitude: 12.9102,
    longitude: 77.5855,
    aliases: ['jp nagar', 'jp nagar 2nd phase', 'jp nagar 24th main', 'delmia circle'],
  },
  {
    displayName: 'Central Mall JP Nagar, 9th Cross, Bengaluru',
    shortName: 'JP Nagar Central',
    latitude: 12.9080,
    longitude: 77.5950,
    aliases: ['central mall jp nagar', 'jp nagar 3rd phase', 'ragigudda temple'],
  },
  {
    displayName: 'Dairy Circle Flyover, Bannerghatta Road, Bengaluru',
    shortName: 'Dairy Circle',
    latitude: 12.9366,
    longitude: 77.5982,
    aliases: ['dairy circle', 'christ university', 'nimhans', 'sagarr hospitals'],
  },

  // --- Indiranagar & Central Bengaluru ---
  {
    displayName: 'Indiranagar 100 Feet Road, HAL 2nd Stage, Bengaluru',
    shortName: 'Indiranagar 100 Feet Rd',
    latitude: 12.9784,
    longitude: 77.6408,
    aliases: ['indiranagar', '100 feet road', 'indiranagar 100ft', 'domlur flyover'],
  },
  {
    displayName: 'Indiranagar 12th Main Road, Defence Colony, Bengaluru',
    shortName: 'Indiranagar 12th Main',
    latitude: 12.9721,
    longitude: 77.6415,
    aliases: ['indiranagar 12th main', 'defence colony indiranagar', 'toit'],
  },
  {
    displayName: 'MG Road Metro Station, Shivaji Nagar, Bengaluru',
    shortName: 'MG Road Metro Station',
    latitude: 12.9756,
    longitude: 77.6066,
    aliases: ['mg road', 'trinity circle', 'anil kumble circle', 'cauvery arts'],
  },
  {
    displayName: 'Church Street / Brigade Road, Central Bengaluru',
    shortName: 'Church Street / Brigade Rd',
    latitude: 12.9745,
    longitude: 77.6072,
    aliases: ['church street', 'brigade road', 'blossoms', 'rex theatre'],
  },
  {
    displayName: 'Majestic Kempegowda Bus Station & Metro, Bengaluru',
    shortName: 'Majestic (KSR Bengaluru)',
    latitude: 12.9767,
    longitude: 77.5713,
    aliases: ['majestic', 'kempegowda bus station', 'ksr railway station', 'bangalore city railway station', 'city railway station'],
  },

  // --- Tech Corridors & Airports ---
  {
    displayName: 'Electronic City Phase 1, Wipro Gate / Infosys Campus, Bengaluru',
    shortName: 'Electronic City Phase 1',
    latitude: 12.8452,
    longitude: 77.6602,
    aliases: ['electronic city', 'ecity', 'electronic city phase 1', 'wipro gate', 'infosys ecity'],
  },
  {
    displayName: 'Electronic City Phase 2, Hosur Road, Bengaluru',
    shortName: 'Electronic City Phase 2',
    latitude: 12.8398,
    longitude: 77.6775,
    aliases: ['electronic city phase 2', 'ecity 2', 'tcs ecity'],
  },
  {
    displayName: 'Bellandur EcoSpace, Outer Ring Road, Bengaluru',
    shortName: 'Bellandur EcoSpace',
    latitude: 12.9260,
    longitude: 77.6762,
    aliases: ['bellandur', 'ecospace', 'rmz ecospace', 'rmz ecoworld', 'outer ring road', 'devarabisanahalli'],
  },
  {
    displayName: 'Marathahalli Bridge, Outer Ring Road, Bengaluru',
    shortName: 'Marathahalli Bridge',
    latitude: 12.9591,
    longitude: 77.6974,
    aliases: ['marathahalli', 'marathahalli bridge', 'kalamandir marathahalli'],
  },
  {
    displayName: 'Whitefield, ITPL / Hope Farm Junction, Bengaluru',
    shortName: 'Whitefield (ITPL)',
    latitude: 12.9863,
    longitude: 77.7346,
    aliases: ['whitefield', 'itpl', 'hope farm', 'inorbit mall whitefield', 'kadugodi'],
  },
  {
    displayName: 'Manyata Tech Park, Nagawara Outer Ring Road, Bengaluru',
    shortName: 'Manyata Tech Park',
    latitude: 13.0475,
    longitude: 77.6200,
    aliases: ['manyata', 'manyata tech park', 'hebbal', 'nagawara'],
  },
  {
    displayName: 'Kempegowda International Airport (BLR), Devanahalli, Bengaluru',
    shortName: 'Bengaluru Airport (BLR)',
    latitude: 13.1986,
    longitude: 77.7066,
    aliases: ['airport', 'blr airport', 'kia', 'kempegowda airport', 'bangalore airport', 'devanahalli'],
  },

  // --- Popular Outstation Hubs from Bengaluru ---
  {
    displayName: 'Hassan City (NH 75 Outstation), Karnataka',
    shortName: 'Hassan, Karnataka',
    latitude: 13.0302,
    longitude: 76.1745,
    aliases: ['hassan', 'hasan', 'hassan karnataka', 'hassan bus stand', 'hassan city'],
  },
  {
    displayName: 'Mysuru (Mysore Palace / Suburban Bus Stand), Karnataka',
    shortName: 'Mysuru (Mysore)',
    latitude: 12.3051,
    longitude: 76.6551,
    aliases: ['mysuru', 'mysore', 'mysore palace', 'mysuru bus stand'],
  },
  {
    displayName: 'Chikmagalur Town, Western Ghats, Karnataka',
    shortName: 'Chikmagalur, Karnataka',
    latitude: 13.3153,
    longitude: 75.7754,
    aliases: ['chikmagalur', 'chikkamagaluru', 'chickmagalur'],
  },
  {
    displayName: 'Coorg (Madikeri Town), Karnataka',
    shortName: 'Coorg (Madikeri)',
    latitude: 12.4244,
    longitude: 75.7382,
    aliases: ['coorg', 'madikeri', 'kodagu'],
  },
  {
    displayName: 'Mangaluru (Mangalore Central), Karnataka',
    shortName: 'Mangaluru (Mangalore)',
    latitude: 12.9141,
    longitude: 74.8560,
    aliases: ['mangalore', 'mangaluru'],
  },
  {
    displayName: 'Tumakuru (Tumkur City, NH 48), Karnataka',
    shortName: 'Tumakuru (Tumkur)',
    latitude: 13.3409,
    longitude: 77.1006,
    aliases: ['tumkur', 'tumakuru'],
  },
];

export const navigationService = {
  /**
   * Search for addresses, landmarks, or locations.
   * Hybrid Engine:
   * 1. Instant local Bengaluru gazetteer matching (resolves acronyms like BTM, Gurupalya, Silk Board)
   * 2. Photon Komoot API with Bengaluru proximity biasing (12.9716, 77.5946)
   * 3. OpenStreetMap Nominatim fallback
   */
  searchAddress: async (query: string, userCoords?: Coordinates): Promise<AddressSuggestion[]> => {
    if (!query || query.trim().length < 2) return [];

    const cleanQuery = query.trim().toLowerCase();
    const suggestions: AddressSuggestion[] = [];
    const seenCoordKeys = new Set<string>();

    const addSuggestion = (item: AddressSuggestion) => {
      // Deduplicate suggestions based on 3-decimal rounded coordinates
      const key = `${item.latitude.toFixed(3)},${item.longitude.toFixed(3)}`;
      if (!seenCoordKeys.has(key)) {
        seenCoordKeys.add(key);
        suggestions.push(item);
      }
    };

    // 1. FAST MATCH: Check local Bengaluru Gazetteer for instant match
    for (const entry of BENGALURU_GAZETTEER) {
      const matchInName = entry.displayName.toLowerCase().includes(cleanQuery) ||
                          entry.shortName.toLowerCase().includes(cleanQuery);
      const matchInAlias = entry.aliases.some((alias) =>
        alias.includes(cleanQuery) || cleanQuery.includes(alias)
      );

      if (matchInName || matchInAlias) {
        addSuggestion({
          displayName: entry.displayName,
          shortName: entry.shortName,
          latitude: entry.latitude,
          longitude: entry.longitude,
        });
      }
    }

    // 2. REMOTE PHOTON API MATCH (Komoot OSM Elasticsearch with proximity biasing)
    try {
      const biasLat = userCoords?.latitude ?? 12.9716;
      const biasLon = userCoords?.longitude ?? 77.5946;

      // Pinpoint search: try with city suffix if not already present
      const hasCity = cleanQuery.includes('bangalore') || cleanQuery.includes('bengaluru') || cleanQuery.includes('blr');
      const targetQuery = hasCity ? cleanQuery : `${cleanQuery} Bengaluru`;

      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        targetQuery
      )}&lat=${biasLat}&lon=${biasLon}&limit=10`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s network budget

      let response = await fetch(photonUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      // If strict city search returned 0 results, retry with raw cleanQuery
      let json = response.ok ? await response.json() : null;
      if (!json || !json.features || json.features.length === 0) {
        const fallbackUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          cleanQuery
        )}&lat=${biasLat}&lon=${biasLon}&limit=8`;
        const retryRes = await fetch(fallbackUrl);
        if (retryRes.ok) {
          json = await retryRes.json();
        }
      }
      clearTimeout(timeoutId);

      if (json && Array.isArray(json.features)) {
        for (const feature of json.features) {
          const props = feature.properties || {};
          const coords = feature.geometry?.coordinates;
          if (!coords || coords.length < 2) continue;

          const lon = coords[0];
          const lat = coords[1];

          // Priority Filter: keep places within Greater Bengaluru region [12.65 to 13.45, 77.15 to 78.05]
          const isWithinBengaluru = lat >= 12.65 && lat <= 13.45 && lon >= 77.15 && lon <= 78.05;

          // Build human-friendly display name
          const name = props.name || props.street || '';
          const district = props.district || props.suburb || '';
          const city = props.city || props.county || 'Bengaluru';
          const state = props.state || '';

          if (!name) continue;

          const parts = [name, district, city].filter((p) => p && p.trim().length > 0);
          const shortName = district ? `${name}, ${district}` : name;
          const displayName = [...parts, state].filter(Boolean).join(', ');

          addSuggestion({
            displayName,
            shortName,
            latitude: lat,
            longitude: lon,
          });
        }
      }
    } catch (photonErr) {
      // Fall through to Nominatim if Photon is slow or down
    }

    // 3. NOMINATIM FALLBACK (If we have very few results)
    if (suggestions.length < 3) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query.trim()
        )}&viewbox=77.4,13.15,77.8,12.8&bounded=0&countrycodes=in&limit=5`;

        const nomResponse = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'RideFlowApp/1.0 (rideflow@example.com)',
            Accept: 'application/json',
          },
        });

        if (nomResponse.ok) {
          const nomData = await nomResponse.json();
          if (Array.isArray(nomData)) {
            for (const item of nomData) {
              const parts = (item.display_name || '').split(',');
              const shortName =
                parts.length > 2
                  ? `${parts[0].trim()}, ${parts[1].trim()}`
                  : parts[0]?.trim() || item.display_name;

              addSuggestion({
                displayName: item.display_name,
                shortName,
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lon),
              });
            }
          }
        }
      } catch (nomErr) {
        // Silently continue
      }
    }

    return suggestions.slice(0, 10);
  },

  /**
   * Fetch driving road geometry and turn-by-turn path from Open Source Routing Machine (OSRM).
   * Free, zero-API-key driving route engine.
   */
  getDrivingRoute: async (
    start: Coordinates,
    end: Coordinates
  ): Promise<RouteDetails> => {
    try {
      // OSRM expects coordinates in {longitude},{latitude} format
      const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM HTTP error: ${response.status}`);
      }

      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // GeoJSON coordinates are in [longitude, latitude] -> Map to Leaflet [latitude, longitude]
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (pt: [number, number]) => [pt[1], pt[0]]
        );

        const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
        const durationMins = Math.max(1, Math.round(route.duration / 60));

        return {
          coordinates,
          distanceKm,
          durationMins,
        };
      }
    } catch (err) {
      console.warn('OSRM routing fetch failed, calculating straight-line fallback:', err);
    }

    // Straight-line fallback if OSRM is unreachable
    const latDiff = end.latitude - start.latitude;
    const lngDiff = end.longitude - start.longitude;
    const approxDistKm = parseFloat((Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111).toFixed(1));
    const approxMins = Math.max(2, Math.round(approxDistKm * 2.5));

    return {
      coordinates: [
        [start.latitude, start.longitude],
        [end.latitude, end.longitude],
      ],
      distanceKm: approxDistKm,
      durationMins: approxMins,
    };
  },

  /**
   * Calculate dynamic fare based on real road distance.
   */
  calculateFare: (
    distanceKm: number,
    vehicleType: 'ECONOMY' | 'PREMIUM' | 'SUV'
  ): number => {
    const baseKm = Math.max(1, distanceKm);
    switch (vehicleType) {
      case 'ECONOMY':
        // ₹50 base + ₹12/km
        return Math.round(50 + baseKm * 12);
      case 'PREMIUM':
        // ₹80 base + ₹18/km
        return Math.round(80 + baseKm * 18);
      case 'SUV':
        // ₹120 base + ₹26/km
        return Math.round(120 + baseKm * 26);
      default:
        return Math.round(60 + baseKm * 15);
    }
  },
};
