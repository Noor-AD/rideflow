// mobile/src/components/AddressSearchModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, X, Navigation, Building2, Plane, Sparkles } from 'lucide-react-native';
import { navigationService, type AddressSuggestion } from '../services/navigationService';

interface AddressSearchModalProps {
  visible: boolean;
  mode: 'PICKUP' | 'DROPOFF';
  currentAddress?: string;
  onClose: () => void;
  onSelectLocation: (location: AddressSuggestion) => void;
}

const POPULAR_BENGALURU_HOTSPOTS: AddressSuggestion[] = [
  {
    displayName: 'BTM Layout 2nd Stage, Udupi Garden Signal, Bengaluru',
    shortName: 'BTM Layout 2nd Stage',
    latitude: 12.9140,
    longitude: 77.6079,
  },
  {
    displayName: 'Gurappana Palya, Bannerghatta Main Road, Bengaluru',
    shortName: 'Gurappanapalya',
    latitude: 12.9207,
    longitude: 77.6033,
  },
  {
    displayName: 'Koramangala 5th Block, 80 Feet Road, Bengaluru',
    shortName: 'Koramangala 5th Block',
    latitude: 12.9352,
    longitude: 77.6245,
  },
  {
    displayName: 'HSR Layout Sector 1, 27th Main Road, Bengaluru',
    shortName: 'HSR Layout Sector 1',
    latitude: 12.9116,
    longitude: 77.6389,
  },
  {
    displayName: 'MG Road Metro Station, Shivaji Nagar, Bengaluru',
    shortName: 'MG Road Metro Station',
    latitude: 12.9756,
    longitude: 77.6066,
  },
  {
    displayName: 'Indiranagar 100 Feet Road, HAL 2nd Stage, Bengaluru',
    shortName: 'Indiranagar 100 Feet Rd',
    latitude: 12.9784,
    longitude: 77.6408,
  },
  {
    displayName: 'Central Silk Board Junction, Hosur Road, Bengaluru',
    shortName: 'Silk Board Junction',
    latitude: 12.9176,
    longitude: 77.6238,
  },
  {
    displayName: 'Kempegowda International Airport (BLR), Devanahalli, Bengaluru',
    shortName: 'Bengaluru Airport (BLR)',
    latitude: 13.1986,
    longitude: 77.7066,
  },
];

export const AddressSearchModal: React.FC<AddressSearchModalProps> = ({
  visible,
  mode,
  currentAddress,
  onClose,
  onSelectLocation,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSuggestions([]);
    }
  }, [visible]);

  // Debounced live search with fast local preview
  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (text.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    // 0ms instant preview from local gazetteer
    navigationService.searchAddress(text).then((fastResults) => {
      if (fastResults.length > 0) {
        setSuggestions(fastResults);
      }
    });

    // 250ms debounced full network search
    debounceTimerRef.current = setTimeout(async () => {
      const results = await navigationService.searchAddress(text);
      setSuggestions(results);
      setIsSearching(false);
    }, 250);
  };

  const handleSelect = (item: AddressSuggestion) => {
    onSelectLocation(item);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Top Search Bar Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color="#94a3b8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'PICKUP' ? 'Select Pickup Point' : 'Where to?'}
          </Text>
        </View>

        {/* Search Input Box */}
        <View style={styles.inputContainer}>
          <View style={styles.inputIconBox}>
            {mode === 'PICKUP' ? (
              <Navigation size={18} color="#10b981" />
            ) : (
              <MapPin size={18} color="#f43f5e" />
            )}
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder={
              mode === 'PICKUP'
                ? 'Search pickup address or landmark...'
                : 'Enter destination, area or colony...'
            }
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            clearButtonMode="while-editing"
          />
          {isSearching ? (
            <ActivityIndicator size="small" color="#10b981" style={styles.inputRight} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={() => handleQueryChange('')} style={styles.inputRight}>
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Quick Suggestion Chips (City Hotspots) */}
        <View style={styles.chipsSection}>
          <View style={styles.sectionTitleRow}>
            <Sparkles size={14} color="#38bdf8" />
            <Text style={styles.sectionTitle}>Popular Hotspots</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {POPULAR_BENGALURU_HOTSPOTS.map((spot, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                onPress={() => handleSelect(spot)}
              >
                {spot.shortName.includes('Airport') ? (
                  <Plane size={14} color="#38bdf8" />
                ) : (
                  <Building2 size={14} color="#10b981" />
                )}
                <Text style={styles.chipText}>{spot.shortName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Live Search Suggestions List */}
        <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled">
          {query.trim().length > 0 && suggestions.length === 0 && !isSearching ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No locations matching "{query}"</Text>
              <Text style={styles.emptySubtext}>Try typing a nearby major landmark or street name.</Text>
            </View>
          ) : null}

          {suggestions.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.resultItem}
              onPress={() => handleSelect(item)}
            >
              <View style={styles.resultIconWrapper}>
                <MapPin size={18} color="#38bdf8" />
              </View>
              <View style={styles.resultTextCol}>
                <Text style={styles.resultShortName} numberOfLines={1}>
                  {item.shortName}
                </Text>
                <Text style={styles.resultFullName} numberOfLines={2}>
                  {item.displayName}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  closeBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    margin: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  inputIconBox: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 14,
  },
  inputRight: {
    padding: 6,
  },
  chipsSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    gap: 14,
  },
  resultIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextCol: {
    flex: 1,
  },
  resultShortName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultFullName: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
});

