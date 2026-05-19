import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Alert } from '../types/database.types';
import { getAlertColor } from '../utils/alerts';
import { AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react-native';

interface AlertCardProps {
  alert: Alert | null;
  loading?: boolean;
}

const NIVEAU_LABELS: Record<Alert['niveau'], string> = {
  faible: 'FAIBLE',
  modéré: 'MODÉRÉ',
  élevé: 'ÉLEVÉ',
};

export const AlertCard: React.FC<AlertCardProps> = ({ alert, loading }) => {
  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingText}>Analyse IA de la météo en cours...</Text>
      </View>
    );
  }

  if (!alert) {
    return (
      <View style={[styles.card, styles.noAlertCard]}>
        <Text style={styles.noAlertText}>Aucune alerte disponible pour aujourd'hui</Text>
      </View>
    );
  }

  const color = getAlertColor(alert.niveau);
  const Icon =
    alert.niveau === 'faible'
      ? CheckCircle
      : alert.niveau === 'modéré'
      ? AlertTriangle
      : AlertOctagon;

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <Icon color={color} size={16} />
          <Text style={[styles.niveau, { color }]}>{NIVEAU_LABELS[alert.niveau]}</Text>
        </View>
        <Text style={styles.date}>
          {new Date(alert.date_prevision).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          })}
        </Text>
      </View>
      <Text style={styles.typeRisque}>{alert.type_risque}</Text>
      {alert.recommandation ? (
        <Text style={styles.recommandation}>{alert.recommandation}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  loadingCard: {
    borderLeftColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noAlertCard: {
    borderLeftColor: '#d1d5db',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    flexShrink: 1,
  },
  noAlertText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  niveau: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  typeRisque: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  recommandation: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
  },
});
