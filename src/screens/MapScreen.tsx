import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, Region, MapType } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Parcel, Alert } from '../types/database.types';
import { getTodayAlert, getAlertColor } from '../utils/alerts';
import { ArrowLeft, Plus, Layers, Navigation2, ChevronRight } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;

interface ParcelWithAlert extends Parcel {
  alert?: Alert | null;
}

const FRANCE_REGION: Region = {
  latitude: 46.6,
  longitude: 2.35,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export const MapScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [parcels, setParcels] = useState<ParcelWithAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState<MapType>('satellite');

  useEffect(() => {
    if (user) fetchParcelsWithAlerts();
  }, [user]);

  const fetchParcelsWithAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      if (!data) return;

      const parcelsWithAlerts = await Promise.all(
        data.map(async (parcel) => {
          try {
            const alert = await getTodayAlert(parcel.id);
            return { ...parcel, alert };
          } catch {
            return { ...parcel, alert: null };
          }
        })
      );

      setParcels(parcelsWithAlerts);

      if (data.length > 0) {
        fitMapToParcels(data);
      }
    } catch (err) {
      console.error('Error fetching parcels:', err);
    } finally {
      setLoading(false);
    }
  };

  const fitMapToParcels = (data: Parcel[]) => {
    if (data.length === 0) return;

    const lats = data.map((p) => p.latitude);
    const lons = data.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const padding = 0.05;
    mapRef.current?.animateToRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(maxLat - minLat + padding * 2, 0.05),
      longitudeDelta: Math.max(maxLon - minLon + padding * 2, 0.05),
    }, 600);
  };

  const handleCenterOnUser = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 600);
  };

  const toggleMapType = () => {
    setMapType((prev) => (prev === 'satellite' ? 'standard' : 'satellite'));
  };

  const getNiveauLabel = (niveau: Alert['niveau']) => {
    const labels = { faible: 'Faible', modéré: 'Modéré', élevé: 'Élevé' };
    return labels[niveau];
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carte des parcelles</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        initialRegion={FRANCE_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
      >
        {parcels.map((parcel) => {
          const color = parcel.alert ? getAlertColor(parcel.alert.niveau) : '#6b7280';
          return (
            <Marker
              key={parcel.id}
              coordinate={{ latitude: parcel.latitude, longitude: parcel.longitude }}
              pinColor={color}
            >
              <Callout
                tooltip
                onPress={() => navigation.navigate('ParcelDetail', { parcelId: parcel.id })}
              >
                <View style={styles.callout}>
                  <View style={styles.calloutHeader}>
                    <Text style={styles.calloutName}>{parcel.name}</Text>
                    {parcel.alert ? (
                      <View style={[styles.calloutBadge, { backgroundColor: color }]}>
                        <Text style={styles.calloutBadgeText}>
                          {getNiveauLabel(parcel.alert.niveau)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {parcel.crop_type ? (
                    <Text style={styles.calloutMeta}>{parcel.crop_type}</Text>
                  ) : null}
                  {parcel.area_hectares ? (
                    <Text style={styles.calloutMeta}>{parcel.area_hectares.toFixed(1)} ha</Text>
                  ) : null}
                  {parcel.alert ? (
                    <Text style={styles.calloutRisk}>{parcel.alert.type_risque}</Text>
                  ) : null}
                  <View style={styles.calloutFooter}>
                    <Text style={styles.calloutLink}>Voir le détail</Text>
                    <ChevronRight size={14} color="#10b981" />
                  </View>
                  <View style={styles.calloutArrow} />
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Spinner de chargement */}
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : null}

      {/* Boutons flottants droite */}
      <View style={styles.controlsRight}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMapType}>
          <Layers size={20} color="#1f2937" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleCenterOnUser}>
          <Navigation2 size={20} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        {[
          { color: '#10b981', label: 'Faible' },
          { color: '#f59e0b', label: 'Modéré' },
          { color: '#ef4444', label: 'Élevé' },
          { color: '#6b7280', label: 'Non analysé' },
        ].map(({ color, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* FAB ajout parcelle */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddParcel')}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#10b981',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  controlsRight: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    gap: 10,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  legend: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  callout: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    minWidth: 200,
    maxWidth: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  calloutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  calloutName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  calloutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  calloutBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  calloutMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  calloutRisk: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    marginTop: 6,
  },
  calloutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  calloutLink: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
    flex: 1,
  },
  calloutArrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
});
