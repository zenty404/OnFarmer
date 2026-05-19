import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert as RNAlert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Parcel, Alert } from '../types/database.types';
import { getTodayAlert, getAlertColor } from '../utils/alerts';
import { ArrowLeft } from 'lucide-react-native';

type RootStackParamList = {
  Dashboard: undefined;
  Map: undefined;
  ParcelDetail: { parcelId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;

interface ParcelWithAlert extends Parcel {
  alert?: Alert | null;
}

export const MapScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [parcels, setParcels] = useState<ParcelWithAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  useEffect(() => {
    if (user) {
      fetchParcelsWithAlerts();
    }
  }, [user]);

  const fetchParcelsWithAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      if (data && data.length > 0) {
        // Calculer le centre de toutes les parcelles
        const avgLat =
          data.reduce((sum, p) => sum + p.latitude, 0) / data.length;
        const avgLng =
          data.reduce((sum, p) => sum + p.longitude, 0) / data.length;

        setRegion({
          latitude: avgLat,
          longitude: avgLng,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        });

        // Récupérer les alertes pour chaque parcelle
        const parcelsWithAlerts = await Promise.all(
          data.map(async (parcel) => {
            try {
              const alert = await getTodayAlert(parcel.id);
              return { ...parcel, alert };
            } catch (error) {
              return { ...parcel, alert: null };
            }
          })
        );

        setParcels(parcelsWithAlerts);
      }
    } catch (error) {
      console.error('Error fetching parcels:', error);
      RNAlert.alert('Erreur', 'Impossible de charger les parcelles');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carte des Parcelles</Text>
      </View>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {parcels.map((parcel) => {
          const pinColor = parcel.alert
            ? getAlertColor(parcel.alert.niveau)
            : '#6b7280';

          return (
            <Marker
              key={parcel.id}
              coordinate={{
                latitude: parcel.latitude,
                longitude: parcel.longitude,
              }}
              title={parcel.name}
              description={parcel.crop_type || ''}
              pinColor={pinColor}
              onCalloutPress={() =>
                navigation.navigate('ParcelDetail', { parcelId: parcel.id })
              }
            />
          );
        })}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Légende des alertes</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>Faible</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendText}>Modéré</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Élevé</Text>
        </View>
      </View>
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#10b981',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  map: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#4b5563',
  },
});
