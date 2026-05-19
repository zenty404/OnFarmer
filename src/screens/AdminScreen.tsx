import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Users,
  MapPin,
  BellRing,
  Activity,
  CheckCircle,
  Clock,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Admin'>;

const STATS = [
  { icon: Users,   label: 'Utilisateurs actifs', value: '142',   color: '#3b82f6', bg: '#eff6ff' },
  { icon: MapPin,  label: 'Parcelles totales',    value: '512',   color: '#10b981', bg: '#ecfdf5' },
  { icon: BellRing,label: 'Alertes IA générées',  value: '3 584', color: '#f59e0b', bg: '#fffbeb' },
  { icon: Activity,label: 'Analyses ce mois',     value: '284',   color: '#8b5cf6', bg: '#f5f3ff' },
];

const RECENT_USERS = [
  { name: 'Jean-Pierre Martin',  email: 'jp.martin@gaec-martin.fr',    date: 'Il y a 2h',   parcels: 4 },
  { name: 'Sophie Durand',       email: 'sophie.durand@earl-durand.fr', date: 'Il y a 5h',   parcels: 7 },
  { name: 'Marc Lefevre',        email: 'm.lefevre@ferme-lefevre.fr',   date: 'Hier',         parcels: 2 },
  { name: 'Claire Bouchard',     email: 'claire@domaine-bouchard.fr',   date: 'Hier',         parcels: 11 },
  { name: 'Antoine Rousseau',    email: 'a.rousseau@agri-rousseau.fr',  date: 'Il y a 3j',   parcels: 3 },
];

const ACTIVITY_LOG = [
  { label: 'Alerte élevée générée',     sub: 'Parcelle "Champ Est" — Risque gel',     time: '14:02', status: 'error' },
  { label: 'Nouvel utilisateur inscrit', sub: 'claire@domaine-bouchard.fr',            time: '12:47', status: 'success' },
  { label: 'Analyse IA déclenchée',     sub: '7 parcelles analysées simultanément',   time: '11:30', status: 'info' },
  { label: 'Alerte modérée générée',    sub: 'Parcelle "Nord B" — Risque sécheresse', time: '09:15', status: 'warn' },
  { label: 'Webhook Make exécuté',      sub: 'Temps de réponse : 1.2s',              time: '08:58', status: 'success' },
];

const STATUS_COLOR: Record<string, string> = {
  error: '#ef4444',
  success: '#10b981',
  info: '#3b82f6',
  warn: '#f59e0b',
};

export const AdminScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

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
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge admin */}
        <View style={styles.adminBadge}>
          <CheckCircle size={14} color="#10b981" />
          <Text style={styles.adminBadgeText}>Accès administrateur · OnFarmer v1.0</Text>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Statistiques globales</Text>
        <View style={styles.statsGrid}>
          {STATS.map(({ icon: Icon, label, value, color, bg }) => (
            <View key={label} style={[styles.statCard, { backgroundColor: bg }]}>
              <View style={[styles.statIconWrap, { backgroundColor: color + '20' }]}>
                <Icon size={20} color={color} />
              </View>
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Journal d'activité */}
        <Text style={styles.sectionTitle}>Journal d'activité récent</Text>
        <View style={styles.card}>
          {ACTIVITY_LOG.map((item, i) => (
            <View key={i} style={[styles.logRow, i < ACTIVITY_LOG.length - 1 && styles.logRowBorder]}>
              <View style={[styles.logDot, { backgroundColor: STATUS_COLOR[item.status] }]} />
              <View style={styles.logContent}>
                <Text style={styles.logLabel}>{item.label}</Text>
                <Text style={styles.logSub}>{item.sub}</Text>
              </View>
              <View style={styles.logTime}>
                <Clock size={11} color="#9ca3af" />
                <Text style={styles.logTimeText}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Derniers utilisateurs */}
        <Text style={styles.sectionTitle}>Derniers inscrits</Text>
        <View style={styles.card}>
          {RECENT_USERS.map((u, i) => (
            <View key={i} style={[styles.userRow, i < RECENT_USERS.length - 1 && styles.logRowBorder]}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{u.name}</Text>
                <Text style={styles.userEmail}>{u.email}</Text>
              </View>
              <View style={styles.userRight}>
                <Text style={styles.userParcels}>{u.parcels} parcelles</Text>
                <Text style={styles.userDate}>{u.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1f2937',
    gap: 12,
  },
  backButton: { padding: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  adminBadgeText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  logRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  logContent: { flex: 1 },
  logLabel: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  logSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  logTime: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  logTimeText: { fontSize: 11, color: '#9ca3af' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  userEmail: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  userRight: { alignItems: 'flex-end', gap: 3 },
  userParcels: { fontSize: 12, fontWeight: '600', color: '#10b981' },
  userDate: { fontSize: 11, color: '#9ca3af' },
});
