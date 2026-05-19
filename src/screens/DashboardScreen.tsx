import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Parcel, Alert as AlertType } from '../types/database.types';
import { getTodayAlert, triggerAIAnalysis, getAlertColor } from '../utils/alerts';
import { AlertCard } from '../components/AlertCard';
import { MapPin, Plus, LogOut } from 'lucide-react-native';

type RootStackParamList = {
  Dashboard: undefined;
  Map: undefined;
  ParcelDetail: { parcelId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface ParcelWithAlert extends Parcel {
  alert?: AlertType | null;
  loadingAlert?: boolean;
}

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile, signOut } = useAuth();
  const [parcels, setParcels] = useState<ParcelWithAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchParcels();
      subscribeToAlerts();
    }
  }, [user]);

  const subscribeToAlerts = () => {
    const subscription = supabase
      .channel('alertes-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alertes',
        },
        (payload) => {
          const newAlert = payload.new as AlertType;
          setParcels((prev) =>
            prev.map((p) =>
              p.id === newAlert.parcel_id
                ? { ...p, alert: newAlert, loadingAlert: false }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const fetchParcels = async () => {
    try {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const parcelsWithAlerts = await Promise.all(
          data.map(async (parcel) => {
            try {
              const alert = await getTodayAlert(parcel.id);
              if (!alert) {
                // Pas d'alerte pour aujourd'hui, déclencher l'analyse
                triggerAIAnalysis(parcel.id).catch(console.error);
                return { ...parcel, alert: null, loadingAlert: true };
              }
              return { ...parcel, alert, loadingAlert: false };
            } catch (error) {
              console.error('Error fetching alert:', error);
              return { ...parcel, alert: null, loadingAlert: false };
            }
          })
        );
        setParcels(parcelsWithAlerts);
      }
    } catch (error) {
      console.error('Error fetching parcels:', error);
      Alert.alert('Erreur', 'Impossible de charger les parcelles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchParcels();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🌾 Agri Météo</Text>
          <Text style={styles.headerSubtitle}>
            Bienvenue, {profile?.full_name || 'Agriculteur'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <LogOut size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes Parcelles</Text>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => navigation.navigate('Map')}
            >
              <MapPin size={20} color="#fff" />
              <Text style={styles.mapButtonText}>Carte</Text>
            </TouchableOpacity>
          </View>

          {parcels.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Aucune parcelle enregistrée
              </Text>
              <Text style={styles.emptySubtext}>
                Ajoutez votre première parcelle pour commencer
              </Text>
            </View>
          ) : (
            parcels.map((parcel) => (
              <TouchableOpacity
                key={parcel.id}
                style={styles.parcelCard}
                onPress={() =>
                  navigation.navigate('ParcelDetail', { parcelId: parcel.id })
                }
              >
                <View style={styles.parcelHeader}>
                  <View>
                    <Text style={styles.parcelName}>{parcel.name}</Text>
                    <Text style={styles.parcelInfo}>
                      {parcel.crop_type || 'Culture non spécifiée'} •{' '}
                      {parcel.area_hectares?.toFixed(1) || '?'} ha
                    </Text>
                  </View>
                  {parcel.alert && (
                    <View
                      style={[
                        styles.levelBadge,
                        { backgroundColor: getAlertColor(parcel.alert.niveau) },
                      ]}
                    >
                      <Text style={styles.levelBadgeText}>
                        {parcel.alert.niveau}
                      </Text>
                    </View>
                  )}
                </View>

                <AlertCard
                  alert={parcel.alert || null}
                  loading={parcel.loadingAlert}
                />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#10b981',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  parcelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parcelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  parcelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  parcelInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
