import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { WeatherLog } from '../types/database.types';

interface WeatherChartProps {
  weatherLogs: WeatherLog[];
}

export const WeatherChart: React.FC<WeatherChartProps> = ({ weatherLogs }) => {
  if (weatherLogs.length === 0) return null;

  const sortedLogs = [...weatherLogs].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  const labels = sortedLogs.map((log) => {
    const date = new Date(log.recorded_at);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });

  const temperatures = sortedLogs.map((log) => log.temperature ?? 0);
  const humidities = sortedLogs.map((log) => log.soil_humidity ?? 0);
  const rainfalls = sortedLogs.map((log) => log.rainfall_mm ?? 0);

  const hasData =
    temperatures.some((t) => t !== 0) ||
    humidities.some((h) => h !== 0) ||
    rainfalls.some((r) => r !== 0);

  if (!hasData) return null;

  const screenWidth = Dimensions.get('window').width - 40;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Évolution météo</Text>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: temperatures,
              color: () => '#ef4444',
              strokeWidth: 2,
            },
            {
              data: humidities,
              color: () => '#3b82f6',
              strokeWidth: 2,
            },
            {
              data: rainfalls,
              color: () => '#06b6d4',
              strokeWidth: 2,
            },
          ],
          legend: ['Température (°C)', 'Humidité (%)', 'Pluie (mm)'],
        }}
        width={screenWidth}
        height={220}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: () => '#6b7280',
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
          },
        }}
        bezier
        style={styles.chart}
      />
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
  chart: {
    borderRadius: 16,
  },
});
