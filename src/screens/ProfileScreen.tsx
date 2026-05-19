import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, User, Tractor, Mail, Calendar, BarChart2, LogOut, Save } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [farmName, setFarmName] = useState(profile?.farm_name ?? '');
  const [parcelCount, setParcelCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchParcelCount();
  }, []);

  useEffect(() => {
    const nameChanged = fullName !== (profile?.full_name ?? '');
    const farmChanged = farmName !== (profile?.farm_name ?? '');
    setHasChanges(nameChanged || farmChanged);
  }, [fullName, farmName, profile]);

  const fetchParcelCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('parcels')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    setParcelCount(count ?? 0);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Champ requis', 'Le nom complet ne peut pas être vide.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          farm_name: farmName.trim() || null,
        })
        .eq('id', user!.id);
      if (error) throw error;
      await refreshProfile();
      Alert.alert('Succès', 'Profil mis à jour.');
      setHasChanges(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert('Erreur', 'Impossible de se déconnecter.');
          }
        },
      },
    ]);
  };

  const initials = (profile?.full_name ?? user?.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon profil</Text>
        {hasChanges ? (
          <TouchableOpacity
            style={styles.saveHeaderButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Save size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.avatarName}>{profile?.full_name || 'Agriculteur'}</Text>
          {profile?.farm_name ? (
            <Text style={styles.avatarFarm}>{profile.farm_name}</Text>
          ) : null}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <BarChart2 size={20} color="#10b981" />
            <Text style={styles.statValue}>
              {parcelCount !== null ? parcelCount : '—'}
            </Text>
            <Text style={styles.statLabel}>Parcelle{parcelCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar size={20} color="#10b981" />
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {memberSince}
            </Text>
            <Text style={styles.statLabel}>Membre depuis</Text>
          </View>
        </View>

        {/* Infos éditables */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Informations personnelles</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nom complet</Text>
            <View style={styles.inputWrapper}>
              <User size={16} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Votre nom"
                placeholderTextColor="#9ca3af"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={[styles.field, { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>Nom de l'exploitation</Text>
            <View style={styles.inputWrapper}>
              <Tractor size={16} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={farmName}
                onChangeText={setFarmName}
                placeholder="Nom de votre ferme"
                placeholderTextColor="#9ca3af"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* Infos lecture seule */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Compte</Text>

          <View style={styles.readonlyField}>
            <Mail size={16} color="#9ca3af" />
            <View style={styles.readonlyText}>
              <Text style={styles.readonlyLabel}>Adresse email</Text>
              <Text style={styles.readonlyValue}>{user?.email ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Bouton sauvegarder */}
        {hasChanges ? (
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.65 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Sauvegarder les modifications</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Déconnexion */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#10b981',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  saveHeaderButton: {
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  avatarName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  avatarFarm: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  readonlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readonlyText: {
    flex: 1,
  },
  readonlyLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  readonlyValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
