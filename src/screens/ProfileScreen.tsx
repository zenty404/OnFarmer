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
  Modal,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, User, Tractor, Mail, Calendar, BarChart2,
  LogOut, Save, ShieldCheck, FileText, BookOpen, Headphones, X,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;
type ModalType = 'mentions' | 'cgu' | 'contact' | null;

const LEGAL_CONTENT: Record<Exclude<ModalType, null>, { title: string; body: string }> = {
  mentions: {
    title: 'Mentions Légales',
    body: `Éditeur de l'application
OnFarmer est un projet étudiant développé dans le cadre du cursus d'Expert en Informatique et Systèmes d'Information à l'école Sup de Vinci, Paris La Défense.

Responsable de la publication
Élio Charnay — eliocharnay95@gmail.com

Hébergement
L'application est hébergée via les services Supabase (base de données et authentification) et Expo Application Services (distribution mobile). Ces services sont fournis par des tiers indépendants.

Propriété intellectuelle
L'ensemble des contenus de l'application OnFarmer (textes, graphismes, interface) est la propriété exclusive de ses auteurs. Toute reproduction est interdite sans autorisation préalable.

Données personnelles
Les données collectées (nom, email, coordonnées GPS des parcelles) sont utilisées exclusivement dans le cadre du fonctionnement de l'application et ne sont pas cédées à des tiers.`,
  },
  cgu: {
    title: 'Conditions Générales d\'Utilisation',
    body: `Article 1 — Objet
Les présentes CGU régissent l'utilisation de l'application mobile OnFarmer, assistant agricole propulsé par l'intelligence artificielle.

Article 2 — Accès au service
L'accès à OnFarmer nécessite la création d'un compte utilisateur. L'utilisateur s'engage à fournir des informations exactes lors de son inscription.

Article 3 — Utilisation des données
Les coordonnées GPS des parcelles sont transmises à un service d'analyse météorologique tiers afin de générer des alertes personnalisées. L'utilisateur consent à cette transmission lors de l'ajout d'une parcelle.

Article 4 — Responsabilité
Les alertes générées par l'IA sont fournies à titre indicatif. OnFarmer ne peut être tenu responsable des décisions agricoles prises sur la base de ces informations.

Article 5 — Modifications
L'éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle.

Article 6 — Droit applicable
Les présentes CGU sont soumises au droit français. Tout litige relève de la compétence des tribunaux de Paris.`,
  },
  contact: {
    title: 'Contact & Support',
    body: `Support technique
Email : support@onfarmer.fr
Disponibilité : du lundi au vendredi, 9h–18h

Signaler un problème
En cas de bug ou d'anomalie, merci de nous contacter en précisant :
• Le modèle de votre appareil
• La version de l'application
• Une description détaillée du problème rencontré

Suggestions et retours
Vos retours sont précieux pour améliorer OnFarmer. Envoyez vos suggestions à : feedback@onfarmer.fr

Partenariats
Pour toute demande de partenariat ou collaboration : contact@onfarmer.fr

Adresse postale
OnFarmer — Sup de Vinci
47/49 Avenue de Paris
92000 Nanterre, France`,
  },
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [farmName, setFarmName] = useState(profile?.farm_name ?? '');
  const [parcelCount, setParcelCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [openModal, setOpenModal] = useState<ModalType>(null);

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
        .update({ full_name: fullName.trim(), farm_name: farmName.trim() || null })
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
          try { await signOut(); } catch { Alert.alert('Erreur', 'Impossible de se déconnecter.'); }
        },
      },
    ]);
  };

  const initials = (profile?.full_name ?? user?.email ?? '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '—';

  const activeModal = openModal ? LEGAL_CONTENT[openModal] : null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon profil</Text>
        {hasChanges ? (
          <TouchableOpacity style={styles.saveHeaderButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={20} color="#fff" />}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.avatarName}>{profile?.full_name || 'Agriculteur'}</Text>
          {profile?.farm_name ? <Text style={styles.avatarFarm}>{profile.farm_name}</Text> : null}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <BarChart2 size={20} color="#10b981" />
            <Text style={styles.statValue}>{parcelCount !== null ? parcelCount : '—'}</Text>
            <Text style={styles.statLabel}>Parcelle{parcelCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar size={20} color="#10b981" />
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{memberSince}</Text>
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
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
                placeholder="Votre nom" placeholderTextColor="#9ca3af" returnKeyType="next" />
            </View>
          </View>
          <View style={[styles.field, { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>Nom de l'exploitation</Text>
            <View style={styles.inputWrapper}>
              <Tractor size={16} color="#9ca3af" style={styles.inputIcon} />
              <TextInput style={styles.input} value={farmName} onChangeText={setFarmName}
                placeholder="Nom de votre ferme" placeholderTextColor="#9ca3af" returnKeyType="done" />
            </View>
          </View>
        </View>

        {/* Compte */}
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
          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.65 }]}
            onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <><Save size={18} color="#fff" /><Text style={styles.saveButtonText}>Sauvegarder les modifications</Text></>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Back-office admin */}
        <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('Admin')} activeOpacity={0.85}>
          <ShieldCheck size={18} color="#1f2937" />
          <Text style={styles.adminButtonText}>Accéder au Back-office</Text>
        </TouchableOpacity>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.85}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        {/* ── Pied de page légal ── */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Informations légales</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity style={styles.footerLink} onPress={() => setOpenModal('mentions')}>
              <FileText size={14} color="#6b7280" />
              <Text style={styles.footerLinkText}>Mentions légales</Text>
            </TouchableOpacity>
            <View style={styles.footerSep} />
            <TouchableOpacity style={styles.footerLink} onPress={() => setOpenModal('cgu')}>
              <BookOpen size={14} color="#6b7280" />
              <Text style={styles.footerLinkText}>CGU</Text>
            </TouchableOpacity>
            <View style={styles.footerSep} />
            <TouchableOpacity style={styles.footerLink} onPress={() => setOpenModal('contact')}>
              <Headphones size={14} color="#6b7280" />
              <Text style={styles.footerLinkText}>Contact & Support</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.followLabel}>Suivez-nous</Text>
          <View style={styles.socialRow}>
            {[
              { label: 'in',  bg: '#0077b5', name: 'LinkedIn'   },
              { label: '𝕏',   bg: '#000000', name: 'Twitter / X' },
              { label: '▶',  bg: '#e1306c', name: 'Instagram'   },
            ].map(({ label, bg, name }) => (
              <TouchableOpacity
                key={name}
                style={[styles.socialIcon, { backgroundColor: bg }]}
                onPress={() => Alert.alert(name, `Ouverture de ${name}...`)}
                activeOpacity={0.8}
              >
                <Text style={styles.socialIconText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.footerCopyright}>© 2025 OnFarmer — Projet Sup de Vinci</Text>
        </View>
      </ScrollView>

      {/* ── Modal légal ── */}
      <Modal visible={openModal !== null} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{activeModal?.title}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setOpenModal(null)}>
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalBody}>{activeModal?.body}</Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: '#10b981',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  saveHeaderButton: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  avatarName: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  avatarFarm: { fontSize: 14, color: '#6b7280' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: '#1f2937', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#10b981',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16,
  },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1f2937' },
  readonlyField: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  readonlyText: { flex: 1 },
  readonlyLabel: {
    fontSize: 11, color: '#9ca3af', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  readonlyValue: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 15, marginBottom: 12,
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  adminButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f3f4f6', borderRadius: 14, paddingVertical: 14, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  adminButtonText: { color: '#1f2937', fontSize: 15, fontWeight: '700' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 15, marginBottom: 24,
    borderWidth: 1.5, borderColor: '#fecaca',
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  footer: {
    borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 20, alignItems: 'center', gap: 12,
  },
  footerTitle: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  footerLinks: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 8 },
  footerLinkText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  footerSep: { width: 1, height: 14, backgroundColor: '#d1d5db' },
  footerCopyright: { fontSize: 11, color: '#d1d5db', marginTop: 4 },
  followLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  socialIconText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingHorizontal: 20,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  modalClose: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  modalScroll: { paddingTop: 16, paddingBottom: 32 },
  modalBody: { fontSize: 14, color: '#4b5563', lineHeight: 22, paddingBottom: 40 },
});
