import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../config/supabase';
import { Parcel, Alert, WeatherLog } from '../types/database.types';
import { getTodayAlert, triggerAIAnalysis } from '../utils/alerts';
import { AlertCard } from '../components/AlertCard';
import { ArrowLeft, MapPin, Droplets, ThermometerSun } from 'lucide-react-native';

type RootStackParamList = {
  Dashboard: undefined;
  Map: undefined;
  ParcelDetail: { parcelId: string };
};

type ParcelDetailRouteProp = RouteProp<RootStackParamList, 'ParcelDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ParcelDetail'>;

export const ParcelDetailScreen: React.FC = () => {
  const route = useRoute<ParcelDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { parcelId } = route.params;

  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [weatherLogs, setWeatherLogs] = useState<WeatherLog[]>([]);
  const [loadingAlert, setLoadingAlert] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParcelData();
    subscribeToAlerts();
  }, [parcelId]);

  const subscribeToAlerts = () => {
    const subscription = supabase
      .channel(`parcel-${parcelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alertes',
          filter: `parcel_id=eq.${parcelId}`,
        },
        (payload) => {
          const newAlert = payload.new as Alert;
          setAlert(newAlert);
          setLoadingAlert(false);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const fetchParcelData = async () => {
    try {
      // Récupérer les infos de la parcelle
      const { data: parcelData, error: parcelError } = await supabase
        .from('parcels')
        .select('*')
        .eq('id', parcelId)
        .single();

      if (parcelError) throw parcelError;
      setParcel(parcelData);

      // Récupérer l'alerte du jour
      try {
        const todayAlert = await getTodayAlert(parcelId);
        if (!todayAlert) {
          setLoadingAlert(true);
          triggerAIAnalysis(parcelId).catch(console.error);
        } else {
          setAlert(todayAlert);
        }
      } catch (error) {
        console.error('Error fetching alert:', error);
      }

      // Récupérer les derniers logs météo
      const { data: logsData, error: logsError } = await supabase
        .from('weather_logs')
        .select('*')
        .eq('parcel_id', parcelId)
        .order('recorded_at', { ascending: false })
        .limit(5);

      if (logsError) throw logsError;
      if (logsData) setWeatherLogs(logsData);
    } catch (error) {
      console.error('Error fetching parcel data:', error);
      RNAlert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !parcel) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{parcel.name}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MapPin size={20} color="#6b7280" />
            <Text style={styles.infoText}>
              {parcel.latitude.toFixed(4)}, {parcel.longitude.toFixed(4)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Culture:</Text>
            <Text style={styles.infoValue}>
              {parcel.crop_type || 'Non spécifiée'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Surface:</Text>
            <Text style={styles.infoValue}>
              {parcel.area_hectares?.toFixed(1) || '?'} hectares
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerte du jour</Text>
          <AlertCard alert={alert} loading={loadingAlert} />
        </View>

        {weatherLogs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique météo</Text>
            {weatherLogs.map((log) => (
              <View key={log.id} style={styles.weatherCard}>
                <Text style={styles.weatherDate}>
                  {new Date(log.recorded_at).toLocaleDateString('fr-FR')}
                </Text>
                <View style={styles.weatherRow}>
                  <View style={styles.weatherItem}>
                    <ThermometerSun size={18} color="#ef4444" />
                    <Text style={styles.weatherText}>
                      {log.temperature?.toFixed(1)}°C
                    </Text>
                  </View>
                  <View style={styles.weatherItem}>
                    <Droplets size={18} color="#3b82f6" />
                    <Text style={styles.weatherText}>
                      {log.soil_humidity?.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.weatherItem}>
                    <Text style={styles.weatherLabel}>Pluie:</Text>
                    <Text style={styles.weatherText}>
                      {log.rainfall_mm?.toFixed(1)} mm
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#4b5563',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  weatherText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
});
