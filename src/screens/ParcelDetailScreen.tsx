import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../config/supabase';
import { Parcel, Alert, WeatherLog } from '../types/database.types';
import { getActiveAlerts, triggerAIAnalysis } from '../utils/alerts';
import { AlertCard } from '../components/AlertCard';
import { ArrowLeft, MapPin, Droplets, ThermometerSun, Wind, RefreshCw } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/AppNavigator';

type ParcelDetailRouteProp = RouteProp<RootStackParamList, 'ParcelDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ParcelDetail'>;

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20; // 60 secondes max

export const ParcelDetailScreen: React.FC = () => {
  const route = useRoute<ParcelDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { parcelId } = route.params;

  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [weatherLogs, setWeatherLogs] = useState<WeatherLog[]>([]);
  const [loadingAlert, setLoadingAlert] = useState(false);
  const [analysisTimedOut, setAnalysisTimedOut] = useState(false);
  const [loading, setLoading] = useState(true);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttempts = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    fetchParcelData();
    const cleanup = subscribeToAlerts();
    return () => {
      isMounted.current = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
      cleanup();
    };
  }, [parcelId]);

  const subscribeToAlerts = () => {
    const channel = supabase
      .channel(`parcel-detail-${parcelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alertes',
          filter: `parcel_id=eq.${parcelId}`,
        },
        (payload) => {
          if (!isMounted.current) return;
          const newAlert = payload.new as Alert;
          setAlerts((prev) => {
            const exists = prev.some((a) => a.id === newAlert.id);
            if (exists) return prev;
            return [...prev, newAlert].sort(
              (a, b) =>
                new Date(a.date_prevision).getTime() - new Date(b.date_prevision).getTime()
            );
          });
          setLoadingAlert(false);
          stopPolling();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const startPolling = () => {
    pollAttempts.current = 0;
    pollOnce();
  };

  const pollOnce = async () => {
    if (!isMounted.current) return;
    pollAttempts.current += 1;

    try {
      const found = await getActiveAlerts(parcelId);
      if (!isMounted.current) return;

      if (found.length > 0) {
        setAlerts(found);
        setLoadingAlert(false);
        return;
      }
    } catch {
      // continue polling on error
    }

    if (pollAttempts.current >= POLL_MAX_ATTEMPTS) {
      if (isMounted.current) {
        setLoadingAlert(false);
        setAnalysisTimedOut(true);
      }
      return;
    }

    pollTimer.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
  };

  const fetchParcelData = async () => {
    try {
      const { data: parcelData, error: parcelError } = await supabase
        .from('parcels')
        .select('*')
        .eq('id', parcelId)
        .single();

      if (parcelError) throw parcelError;
      setParcel(parcelData);

      const activeAlerts = await getActiveAlerts(parcelId);

      if (activeAlerts.length === 0) {
        setLoadingAlert(true);
        setAnalysisTimedOut(false);
        try {
          await triggerAIAnalysis(parcelId, parcelData.latitude, parcelData.longitude);
        } catch (err) {
          console.error('Webhook error:', err);
          if (isMounted.current) {
            setLoadingAlert(false);
            setAnalysisTimedOut(true);
          }
          return;
        }
        startPolling();
      } else {
        setAlerts(activeAlerts);
      }

      const { data: logsData } = await supabase
        .from('weather_logs')
        .select('*')
        .eq('parcel_id', parcelId)
        .order('recorded_at', { ascending: false })
        .limit(5);

      if (logsData && isMounted.current) setWeatherLogs(logsData);
    } catch (err) {
      console.error('Error fetching parcel data:', err);
      RNAlert.alert('Erreur', 'Impossible de charger les données.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!parcel) return;
    setAnalysisTimedOut(false);
    setLoadingAlert(true);
    try {
      await triggerAIAnalysis(parcelId, parcel.latitude, parcel.longitude);
      startPolling();
    } catch {
      setLoadingAlert(false);
      setAnalysisTimedOut(true);
    }
  };

  if (loading || !parcel) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {parcel.name}
          </Text>
          {parcel.crop_type ? (
            <Text style={styles.headerSubtitle}>{parcel.crop_type}</Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MapPin size={16} color="#10b981" />
              <View>
                <Text style={styles.infoItemLabel}>Coordonnées</Text>
                <Text style={styles.infoItemValue}>
                  {parcel.latitude.toFixed(4)}, {parcel.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
            {parcel.area_hectares ? (
              <View style={styles.infoItem}>
                <Wind size={16} color="#10b981" />
                <View>
                  <Text style={styles.infoItemLabel}>Surface</Text>
                  <Text style={styles.infoItemValue}>
                    {parcel.area_hectares.toFixed(1)} ha
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* Alertes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prévisions & Alertes</Text>

          {loadingAlert ? (
            <View style={styles.aiLoadingCard}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.aiLoadingTitle}>Analyse IA de la météo en cours...</Text>
              <Text style={styles.aiLoadingSubtext}>
                Interrogation des données météo et génération des alertes.
                {pollAttempts.current > 0
                  ? ` Vérification ${pollAttempts.current}/${POLL_MAX_ATTEMPTS}...`
                  : ''}
              </Text>
            </View>
          ) : analysisTimedOut ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Analyse indisponible</Text>
              <Text style={styles.errorSubtext}>
                Le webhook Make n'a pas répondu dans les délais. Vérifiez que votre scénario Make est actif et que l'URL est correctement configurée.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <RefreshCw size={16} color="#fff" />
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : alerts.length === 0 ? (
            <AlertCard alert={null} />
          ) : (
            alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </View>

        {/* Historique météo */}
        {weatherLogs.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique météo</Text>
            {weatherLogs.map((log) => (
              <View key={log.id} style={styles.weatherCard}>
                <Text style={styles.weatherDate}>
                  {new Date(log.recorded_at).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
                <View style={styles.weatherRow}>
                  {log.temperature != null ? (
                    <View style={styles.weatherItem}>
                      <ThermometerSun size={16} color="#ef4444" />
                      <Text style={styles.weatherValue}>{log.temperature.toFixed(1)}°C</Text>
                    </View>
                  ) : null}
                  {log.soil_humidity != null ? (
                    <View style={styles.weatherItem}>
                      <Droplets size={16} color="#3b82f6" />
                      <Text style={styles.weatherValue}>{log.soil_humidity.toFixed(0)}%</Text>
                    </View>
                  ) : null}
                  {log.rainfall_mm != null ? (
                    <View style={styles.weatherItem}>
                      <Text style={styles.weatherLabel}>Pluie</Text>
                      <Text style={styles.weatherValue}>{log.rainfall_mm.toFixed(1)} mm</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
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
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#10b981',
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoItemLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoItemValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  aiLoadingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#dbeafe',
    borderStyle: 'dashed',
    gap: 12,
  },
  aiLoadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
    textAlign: 'center',
  },
  aiLoadingSubtext: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 19,
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fecaca',
    gap: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
  errorSubtext: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  weatherDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  weatherRow: {
    flexDirection: 'row',
    gap: 20,
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  weatherLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  weatherValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
});
