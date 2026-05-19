import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft, Users, MapPin, BellRing, Activity,
  Clock, Lock, Eye, EyeOff, ShieldAlert, Bot, Webhook, Settings, X, CheckCircle2,
} from 'lucide-react-native';
import { supabase } from '../config/supabase';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Admin'>;

const ADMIN_CODE = 'admin1234';

interface AdminStats {
  users: number;
  parcels: number;
  alerts: number;
  analyses: number;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  farm_name: string | null;
  created_at: string;
}

interface RecentAlert {
  id: string;
  niveau: 'faible' | 'modéré' | 'élevé';
  type_risque: string;
  created_at: string;
  parcels: { name: string } | null;
}

const NIVEAU_COLOR: Record<string, string> = {
  faible: '#10b981',
  modéré: '#f59e0b',
  élevé: '#ef4444',
};

const formatRelative = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
};

export const AdminScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // ── Auth state ──
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // ── Data state ──
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    if (unlocked) fetchAdminData();
  }, [unlocked]);

  const handleUnlock = () => {
    if (code === ADMIN_CODE) {
      setCodeError(false);
      setUnlocked(true);
    } else {
      setCodeError(true);
      setAttempts((a) => a + 1);
      setCode('');
      Vibration.vibrate(300);
      setTimeout(() => setCodeError(false), 2000);
    }
  };

  const fetchAdminData = async () => {
    setDataLoading(true);
    try {
      const [
        { count: usersCount },
        { count: parcelsCount },
        { count: alertsCount },
        { data: users },
        { data: alerts },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('parcels').select('*', { count: 'exact', head: true }),
        supabase.from('alertes').select('*', { count: 'exact', head: true }),
        supabase.from('profiles')
          .select('id, full_name, farm_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('alertes')
          .select('id, niveau, type_risque, created_at, parcels(name)')
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

      setStats({
        users: usersCount ?? 0,
        parcels: parcelsCount ?? 0,
        alerts: alertsCount ?? 0,
        analyses: alertsCount ?? 0,
      });
      setRecentUsers((users as RecentUser[]) ?? []);
      setRecentAlerts((alerts as unknown as RecentAlert[]) ?? []);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // ────────────────────────────────────────────
  // Écran de verrouillage
  // ────────────────────────────────────────────
  if (!unlocked) {
    return (
      <KeyboardAvoidingView
        style={styles.lockContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.lockHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.lockHeaderTitle}>Back-Office</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.lockBody}>
          <View style={styles.lockIconWrap}>
            <Lock size={36} color="#1f2937" />
          </View>
          <Text style={styles.lockTitle}>Accès restreint</Text>
          <Text style={styles.lockSub}>
            Entrez le code administrateur pour accéder au tableau de bord.
          </Text>

          <View style={[styles.codeInputWrap, codeError && styles.codeInputError]}>
            <ShieldAlert size={18} color={codeError ? '#ef4444' : '#9ca3af'} />
            <TextInput
              ref={inputRef}
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              placeholder="Code administrateur"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showCode}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleUnlock}
            />
            <TouchableOpacity onPress={() => setShowCode((v) => !v)}>
              {showCode
                ? <EyeOff size={18} color="#9ca3af" />
                : <Eye size={18} color="#9ca3af" />}
            </TouchableOpacity>
          </View>

          {codeError ? (
            <Text style={styles.errorText}>
              Code incorrect.{attempts >= 2 ? ' Conseil : admin1234' : ''}
            </Text>
          ) : null}

          <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock} activeOpacity={0.85}>
            <Text style={styles.unlockButtonText}>Accéder</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ────────────────────────────────────────────
  // Tableau de bord
  // ────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Back-Office</Text>
          <Text style={styles.headerSub}>Tableau de bord administrateur</Text>
        </View>
        <TouchableOpacity style={styles.lockAgainButton} onPress={() => { setUnlocked(false); setCode(''); }}>
          <Lock size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {dataLoading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loaderText}>Chargement des données...</Text>
        </View>
      ) : (
        <>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Stats */}
          <Text style={styles.sectionTitle}>Statistiques globales</Text>
          <View style={styles.statsGrid}>
            {[
              { icon: Users,    label: 'Utilisateurs',      value: stats?.users    ?? 0, color: '#3b82f6', bg: '#eff6ff' },
              { icon: MapPin,   label: 'Parcelles',          value: stats?.parcels  ?? 0, color: '#10b981', bg: '#ecfdf5' },
              { icon: BellRing, label: 'Alertes IA',         value: stats?.alerts   ?? 0, color: '#f59e0b', bg: '#fffbeb' },
              { icon: Activity, label: 'Analyses totales',   value: stats?.analyses ?? 0, color: '#8b5cf6', bg: '#f5f3ff' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <View key={label} style={[styles.statCard, { backgroundColor: bg }]}>
                <View style={[styles.statIconWrap, { backgroundColor: color + '25' }]}>
                  <Icon size={20} color={color} />
                </View>
                <Text style={[styles.statValue, { color }]}>{value.toLocaleString('fr-FR')}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Journal d'activité — vraies alertes */}
          <Text style={styles.sectionTitle}>Dernières alertes générées</Text>
          <View style={styles.card}>
            {recentAlerts.length === 0 ? (
              <Text style={styles.emptyText}>Aucune alerte enregistrée.</Text>
            ) : recentAlerts.map((alert, i) => (
              <View key={alert.id} style={[styles.logRow, i < recentAlerts.length - 1 && styles.logRowBorder]}>
                <View style={[styles.logDot, { backgroundColor: NIVEAU_COLOR[alert.niveau] ?? '#9ca3af' }]} />
                <View style={styles.logContent}>
                  <Text style={styles.logLabel}>{alert.type_risque}</Text>
                  <Text style={styles.logSub}>
                    {alert.parcels?.name ?? 'Parcelle inconnue'} · Niveau {alert.niveau}
                  </Text>
                </View>
                <View style={styles.logTime}>
                  <Clock size={11} color="#9ca3af" />
                  <Text style={styles.logTimeText}>{formatRelative(alert.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Derniers inscrits */}
          <Text style={styles.sectionTitle}>Derniers utilisateurs inscrits</Text>
          <View style={styles.card}>
            {recentUsers.length === 0 ? (
              <Text style={styles.emptyText}>Aucun utilisateur trouvé.</Text>
            ) : recentUsers.map((u, i) => (
              <View key={u.id} style={[styles.userRow, i < recentUsers.length - 1 && styles.logRowBorder]}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {(u.full_name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.full_name ?? 'Utilisateur'}</Text>
                  {u.farm_name ? <Text style={styles.userFarm}>{u.farm_name}</Text> : null}
                </View>
                <Text style={styles.userDate}>{formatRelative(u.created_at)}</Text>
              </View>
            ))}
          </View>

          {/* Configuration Système */}
          <Text style={styles.sectionTitle}>Configuration Système</Text>
          <View style={styles.configCard}>
            <View style={styles.configRow}>
              <View style={[styles.configIconWrap, { backgroundColor: '#ede9fe' }]}>
                <Bot size={20} color="#7c3aed" />
              </View>
              <View style={styles.configInfo}>
                <Text style={styles.configLabel}>Modèle IA actif</Text>
                <Text style={styles.configValue}>GPT-4o via Make.com</Text>
              </View>
              <View style={styles.configStatus}>
                <CheckCircle2 size={16} color="#10b981" />
                <Text style={styles.configStatusText}>Actif</Text>
              </View>
            </View>

            <View style={[styles.configRow, { borderTopWidth: 1, borderTopColor: '#f3f4f6' }]}>
              <View style={[styles.configIconWrap, { backgroundColor: '#fef3c7' }]}>
                <Webhook size={20} color="#d97706" />
              </View>
              <View style={styles.configInfo}>
                <Text style={styles.configLabel}>Webhook Make</Text>
                <Text style={styles.configValue}>hook.eu2.make.com/••••••</Text>
              </View>
              <View style={styles.configStatus}>
                <CheckCircle2 size={16} color="#10b981" />
                <Text style={styles.configStatusText}>Connecté</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.manageAIButton}
              onPress={() => setShowAIModal(true)}
              activeOpacity={0.85}
            >
              <Settings size={16} color="#fff" />
              <Text style={styles.manageAIText}>Gérer le modèle IA et les webhooks Make</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.refreshButton} onPress={fetchAdminData}>
            <Text style={styles.refreshText}>Actualiser les données</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal config IA */}
        <Modal visible={showAIModal} animationType="slide" transparent presentationStyle="overFullScreen">
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configuration IA & Webhooks</Text>
                <TouchableOpacity style={styles.modalClose} onPress={() => setShowAIModal(false)}>
                  <X size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {[
                  { label: 'Modèle IA', value: 'GPT-4o (OpenAI via Make)', icon: Bot, color: '#7c3aed' },
                  { label: 'Scénario Make', value: 'OnFarmer — Analyse Météo v2', icon: Settings, color: '#d97706' },
                  { label: 'Webhook URL', value: 'hook.eu2.make.com/[token]', icon: Webhook, color: '#3b82f6' },
                  { label: 'Déclencheur', value: 'POST JSON — parcel_id, latitude, longitude', icon: Activity, color: '#10b981' },
                  { label: 'Délai moyen', value: '8 – 15 secondes par parcelle', icon: Clock, color: '#f59e0b' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <View key={label} style={styles.modalRow}>
                    <View style={[styles.modalRowIcon, { backgroundColor: color + '18' }]}>
                      <Icon size={16} color={color} />
                    </View>
                    <View>
                      <Text style={styles.modalRowLabel}>{label}</Text>
                      <Text style={styles.modalRowValue}>{value}</Text>
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={() => {
                    setShowAIModal(false);
                    Alert.alert('Modification', 'Dans une version production, cette section permettrait de modifier le modèle IA, l\'URL du webhook et les paramètres d\'analyse.');
                  }}
                >
                  <Text style={styles.modalActionText}>Modifier la configuration</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Lock screen
  lockContainer: { flex: 1, backgroundColor: '#f3f4f6' },
  lockHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: '#1f2937',
  },
  lockHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  lockBody: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16,
  },
  lockIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#e5e7eb',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  lockTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  lockSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  codeInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 14, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  codeInputError: { borderColor: '#ef4444' },
  codeInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1f2937' },
  errorText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
  unlockButton: {
    backgroundColor: '#1f2937', borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 40, marginTop: 4,
  },
  unlockButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Dashboard
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: '#1f2937',
  },
  backButton: { padding: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  lockAgainButton: { padding: 8 },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 12, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', borderRadius: 14, padding: 16, gap: 8 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  emptyText: { fontSize: 14, color: '#9ca3af', padding: 20, textAlign: 'center' },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  logRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  logDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  logContent: { flex: 1 },
  logLabel: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  logSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  logTime: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  logTimeText: { fontSize: 11, color: '#9ca3af' },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  userAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#1f2937',
    justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  userFarm: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  userDate: { fontSize: 11, color: '#9ca3af' },
  refreshButton: {
    alignItems: 'center', paddingVertical: 14, backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  refreshText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  configCard: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  configRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
  },
  configIconWrap: {
    width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  configInfo: { flex: 1 },
  configLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '600', marginBottom: 2 },
  configValue: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  configStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  configStatusText: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  manageAIButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#7c3aed', margin: 14, borderRadius: 10, paddingVertical: 12,
  },
  manageAIText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingHorizontal: 20,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  modalClose: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  modalScroll: { paddingTop: 12 },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  modalRowIcon: {
    width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  modalRowLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 2 },
  modalRowValue: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  modalActionButton: {
    backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginVertical: 20,
  },
  modalActionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
