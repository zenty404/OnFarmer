import React, { useState } from 'react';
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
import * as Location from 'expo-location';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Navigation2, MapPin } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddParcel'>;

export const AddParcelScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [cropType, setCropType] = useState('');
  const [areaHectares, setAreaHectares] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleGetLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Activez la localisation dans les réglages pour utiliser cette fonctionnalité.'
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
    } catch {
      Alert.alert('Erreur', "Impossible d'obtenir votre position.");
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Veuillez entrer un nom pour la parcelle.');
      return;
    }
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Coordonnées invalides', 'Veuillez entrer des coordonnées valides.');
      return;
    }
    if (lat < -90 || lat > 90) {
      Alert.alert('Latitude invalide', 'La latitude doit être comprise entre -90 et 90.');
      return;
    }
    if (lon < -180 || lon > 180) {
      Alert.alert('Longitude invalide', 'La longitude doit être comprise entre -180 et 180.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('parcels').insert({
        user_id: user!.id,
        name: name.trim(),
        latitude: lat,
        longitude: lon,
        crop_type: cropType.trim() || null,
        area_hectares: areaHectares ? parseFloat(areaHectares) || null : null,
      });
      if (error) throw error;
      navigation.goBack();
    } catch (err) {
      console.error('Error saving parcel:', err);
      Alert.alert('Erreur', 'Impossible de sauvegarder la parcelle. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const hasCoords = latitude !== '' && longitude !== '';
  const parsedLat = parseFloat(latitude);
  const parsedLon = parseFloat(longitude);
  const coordsValid = !isNaN(parsedLat) && !isNaN(parsedLon);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle parcelle</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Informations générales */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Informations générales</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Nom de la parcelle <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Champ nord, Parcelle B..."
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Type de culture</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Blé, Maïs, Tournesol..."
              placeholderTextColor="#9ca3af"
              value={cropType}
              onChangeText={setCropType}
              returnKeyType="next"
            />
          </View>

          <View style={[styles.field, { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>Surface (hectares)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 12.5"
              placeholderTextColor="#9ca3af"
              value={areaHectares}
              onChangeText={setAreaHectares}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Localisation */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Localisation</Text>

          <TouchableOpacity
            style={[styles.gpsButton, locating && styles.gpsButtonDisabled]}
            onPress={handleGetLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Navigation2 size={18} color="#fff" />
            )}
            <Text style={styles.gpsButtonText}>
              {locating ? 'Localisation en cours...' : 'Utiliser ma position GPS'}
            </Text>
          </TouchableOpacity>

          <View style={styles.coordRow}>
            <View style={[styles.field, styles.coordField, { marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>
                Latitude <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="46.2276"
                placeholderTextColor="#9ca3af"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.field, styles.coordField, { marginLeft: 8 }]}>
              <Text style={styles.fieldLabel}>
                Longitude <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="2.2137"
                placeholderTextColor="#9ca3af"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {hasCoords && coordsValid ? (
            <View style={styles.coordPreview}>
              <MapPin size={14} color="#10b981" />
              <Text style={styles.coordPreviewText}>
                {parsedLat.toFixed(4)}, {parsedLon.toFixed(4)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bouton enregistrer */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer la parcelle</Text>
          )}
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#10b981',
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
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
    marginBottom: 18,
  },
  field: {
    marginBottom: 16,
  },
  coordField: {
    flex: 1,
    marginBottom: 0,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 13,
    marginBottom: 16,
    gap: 8,
  },
  gpsButtonDisabled: {
    opacity: 0.7,
  },
  gpsButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  coordRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  coordPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  coordPreviewText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
