import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Parcel, Alert as AlertType } from '../types/database.types';
import { getTodayAlert, triggerAIAnalysis, getAlertColor } from '../utils/alerts';
import { AlertCard } from '../components/AlertCard';
import { MapPin, Plus, Sprout, CloudSun, Leaf, Cloud, CloudRain, CloudSnow, CloudLightning } from 'lucide-react-native';
import { fetchWeatherNews, WeatherNews } from '../utils/weather';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

const WEATHER_CARD_THEME: Record<WeatherNews['icon'], { bg: string; iconBg: string; color: string }> = {
  sun:   { bg: '#fffbeb', iconBg: '#fef3c7', color: '#d97706' },
  cloud: { bg: '#f8fafc', iconBg: '#e2e8f0', color: '#64748b' },
  rain:  { bg: '#eff6ff', iconBg: '#dbeafe', color: '#3b82f6' },
  snow:  { bg: '#f0f9ff', iconBg: '#e0f2fe', color: '#0284c7' },
  storm: { bg: '#fdf4ff', iconBg: '#f3e8ff', color: '#9333ea' },
  leaf:  { bg: '#f0fdf4', iconBg: '#dcfce7', color: '#16a34a' },
};

const WEATHER_ICONS: Record<WeatherNews['icon'], React.FC<{ size: number; color: string }>> = {
  sun:   CloudSun,
  cloud: Cloud,
  rain:  CloudRain,
  snow:  CloudSnow,
  storm: CloudLightning,
  leaf:  Leaf,
};

const WeatherNewsCard: React.FC<{ item: WeatherNews }> = ({ item }) => {
  const theme = WEATHER_CARD_THEME[item.icon];
  const Icon = WEATHER_ICONS[item.icon];
  return (
    <View style={[styles.newsCard, { backgroundColor: theme.bg }]}>
      <View style={[styles.newsIconWrap, { backgroundColor: theme.iconBg }]}>
        <Icon size={18} color={theme.color} />
      </View>
      <Text style={styles.newsCardTag}>{item.tag}</Text>
      <Text style={styles.newsCardTitle}>{item.title}</Text>
      <Text style={styles.newsCardSub}>{item.sub}</Text>
    </View>
  );
};

interface ParcelWithAlert extends Parcel {
  alert?: AlertType | null;
  loadingAlert?: boolean;
}

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile } = useAuth();
  const [parcels, setParcels] = useState<ParcelWithAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weatherNews, setWeatherNews] = useState<WeatherNews[] | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const cleanup = subscribeToAlerts();
    return cleanup;
  }, [user]);

  useEffect(() => {
    fetchWeatherNews().then((news) => {
      setWeatherNews(news);
      setWeatherLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchParcels();
    }, [user])
  );

  const subscribeToAlerts = () => {
    const channel = supabase
      .channel('dashboard-alertes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alertes' },
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
      supabase.removeChannel(channel);
    };
  };

  const fetchParcels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return;

      const parcelsWithAlerts = await Promise.all(
        data.map(async (parcel) => {
          try {
            const alert = await getTodayAlert(parcel.id);
            if (!alert) {
              triggerAIAnalysis(parcel.id, parcel.latitude, parcel.longitude).catch(
                console.error
              );
              return { ...parcel, alert: null, loadingAlert: true };
            }
            return { ...parcel, alert, loadingAlert: false };
          } catch {
            return { ...parcel, alert: null, loadingAlert: false };
          }
        })
      );

      setParcels(parcelsWithAlerts);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les parcelles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchParcels();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingLabel}>Chargement de vos parcelles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🌾 OnFarmer</Text>
          <Text style={styles.headerSubtitle}>
            Bonjour, {profile?.full_name || 'Agriculteur'} 👋
          </Text>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.avatarText}>
            {(profile?.full_name ?? user?.email ?? '?')
              .split(' ')
              .map((w: string) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{parcels.length}</Text>
          <Text style={styles.statLabel}>Parcelle{parcels.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {parcels.filter((p) => p.alert?.niveau === 'élevé').length}
          </Text>
          <Text style={styles.statLabel}>Alerte{parcels.filter((p) => p.alert?.niveau === 'élevé').length !== 1 ? 's' : ''} élevée{parcels.filter((p) => p.alert?.niveau === 'élevé').length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {parcels.filter((p) => p.alert?.niveau === 'faible').length}
          </Text>
          <Text style={styles.statLabel}>OK</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Banner ── */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroGreeting}>
            Bonjour {profile?.full_name?.split(' ')[0] || 'Agriculteur'} 👋
          </Text>
          <Text style={styles.heroTagline}>
            Votre assistant agricole propulsé par l'IA pour la surveillance météo et des risques.
          </Text>
        </View>

        {/* ── Actualités météo temps réel ── */}
        <Text style={styles.newsTitle}>Météo & Conseils</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.newsScroll}
          contentContainerStyle={styles.newsScrollContent}
        >
          {weatherLoading ? (
            <View style={[styles.newsCard, styles.newsCardLoading]}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.newsLoadingText}>Récupération météo...</Text>
            </View>
          ) : weatherNews ? (
            weatherNews.map((item, i) => (
              <WeatherNewsCard key={i} item={item} />
            ))
          ) : (
            <View style={[styles.newsCard, { backgroundColor: '#f9fafb' }]}>
              <Text style={styles.newsCardTag}>Météo indisponible</Text>
              <Text style={styles.newsCardTitle}>Autorisez la localisation pour voir la météo en temps réel.</Text>
            </View>
          )}
        </ScrollView>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes parcelles</Text>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => navigation.navigate('Map')}
          >
            <MapPin size={16} color="#3b82f6" />
            <Text style={styles.mapButtonText}>Carte</Text>
          </TouchableOpacity>
        </View>

        {parcels.length === 0 ? (
          <View style={styles.emptyState}>
            <Sprout size={52} color="#d1fae5" />
            <Text style={styles.emptyTitle}>Aucune parcelle</Text>
            <Text style={styles.emptySubtext}>
              Appuyez sur le bouton + pour ajouter votre première parcelle et recevoir des alertes météo IA.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddParcel')}
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.emptyButtonText}>Ajouter une parcelle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          parcels.map((parcel) => (
            <TouchableOpacity
              key={parcel.id}
              style={styles.parcelCard}
              onPress={() => navigation.navigate('ParcelDetail', { parcelId: parcel.id })}
              activeOpacity={0.88}
            >
              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleGroup}>
                  <Text style={styles.parcelName}>{parcel.name}</Text>
                  <Text style={styles.parcelMeta}>
                    {[parcel.crop_type, parcel.area_hectares ? `${parcel.area_hectares.toFixed(1)} ha` : null]
                      .filter(Boolean)
                      .join(' · ') || 'Culture non précisée'}
                  </Text>
                </View>
                {parcel.alert ? (
                  <View
                    style={[
                      styles.levelBadge,
                      { backgroundColor: getAlertColor(parcel.alert.niveau) },
                    ]}
                  >
                    <Text style={styles.levelBadgeText}>
                      {parcel.alert.niveau.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Coords */}
              <View style={styles.coordRow}>
                <MapPin size={12} color="#9ca3af" />
                <Text style={styles.coordText}>
                  {parcel.latitude.toFixed(4)}, {parcel.longitude.toFixed(4)}
                </Text>
              </View>

              <View style={styles.divider} />

              {/* Alert card */}
              <AlertCard alert={parcel.alert ?? null} loading={parcel.loadingAlert} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddParcel')}
        activeOpacity={0.85}
      >
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
    gap: 12,
  },
  loadingLabel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#10b981',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  mapButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  parcelCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitleGroup: {
    flex: 1,
    marginRight: 10,
  },
  parcelName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 3,
  },
  parcelMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  levelBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  coordText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  heroBanner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  heroGreeting: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 6,
  },
  heroTagline: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 10,
  },
  newsCardLoading: {
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 200,
  },
  newsLoadingText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  newsScroll: {
    marginBottom: 20,
  },
  newsScrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  newsCard: {
    width: 220,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  newsIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  newsCardTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  newsCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 18,
  },
  newsCardSub: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
});
