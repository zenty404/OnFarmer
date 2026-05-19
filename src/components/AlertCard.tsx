import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Alert } from '../types/database.types';
import { getAlertColor } from '../utils/alerts';
import { AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react-native';

interface AlertCardProps {
  alert: Alert | null;
  loading?: boolean;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, loading }) => {
  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <Text style={styles.loadingText}>🤖 Analyse météo par l'IA en cours...</Text>
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
  const Icon = alert.niveau === 'faible'
    ? CheckCircle
    : alert.niveau === 'modéré'
    ? AlertTriangle
    : AlertOctagon;

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.header}>
        <Icon color={color} size={24} />
        <Text style={[styles.niveau, { color }]}>{alert.niveau.toUpperCase()}</Text>
      </View>
      <Text style={styles.typeRisque}>{alert.type_risque}</Text>
      {alert.recommandation && (
        <Text style={styles.recommandation}>{alert.recommandation}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingCard: {
    borderLeftColor: '#3b82f6',
    alignItems: 'center',
  },
  noAlertCard: {
    borderLeftColor: '#9ca3af',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  noAlertText: {
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  niveau: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  typeRisque: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  recommandation: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});
