import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Alert } from '../types/database.types';
import { getAlertColor } from '../utils/alerts';

interface AlertsChartProps {
  alerts: Alert[];
}

export const AlertsChart: React.FC<AlertsChartProps> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  const sortedAlerts = [...alerts].sort(
    (a, b) => new Date(a.date_prevision).getTime() - new Date(b.date_prevision).getTime()
  );

  const screenWidth = Dimensions.get('window').width - 72;
  const barWidth = Math.max(30, screenWidth / sortedAlerts.length - 12);
  const maxBarHeight = 120;

  const levelValues: { [key: string]: number } = {
    faible: 1,
    modéré: 2,
    élevé: 3,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Niveaux d'alerte</Text>

      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {sortedAlerts.map((alert) => {
            const value = levelValues[alert.niveau] || 1;
            const height = (value / 3) * maxBarHeight;
            const color = getAlertColor(alert.niveau);

            return (
              <View key={alert.id} style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: color,
                      width: barWidth,
                    },
                  ]}
                />
                <Text style={styles.barLabel}>
                  {new Date(alert.date_prevision).getDate()}/
                  {new Date(alert.date_prevision).getMonth() + 1}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>Faible</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.legendText}>Modéré</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Élevé</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    height: 140,
  },
  barWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    borderRadius: 6,
    minHeight: 20,
  },
  barLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
});
