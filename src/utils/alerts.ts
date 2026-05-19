import { supabase } from '../config/supabase';
import { Alert } from '../types/database.types';

const MAKE_WEBHOOK_URL = process.env.EXPO_PUBLIC_MAKE_WEBHOOK_URL!;

export const getTodayAlert = async (parcelId: string): Promise<Alert | null> => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('alertes')
    .select('*')
    .eq('parcel_id', parcelId)
    .eq('date_prevision', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
};

export const getActiveAlerts = async (parcelId: string): Promise<Alert[]> => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('alertes')
    .select('*')
    .eq('parcel_id', parcelId)
    .gte('date_prevision', today)
    .order('date_prevision', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const triggerAIAnalysis = async (
  parcelId: string,
  latitude: number,
  longitude: number
): Promise<void> => {
  const response = await fetch(MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parcel_id: parcelId, latitude, longitude }),
  });

  if (!response.ok) throw new Error('Failed to trigger AI analysis');
};

export const getAlertColor = (niveau: Alert['niveau']): string => {
  switch (niveau) {
    case 'faible':
      return '#10b981'; // green
    case 'modéré':
      return '#f59e0b'; // orange
    case 'élevé':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
};

export const getAlertIcon = (niveau: Alert['niveau']): string => {
  switch (niveau) {
    case 'faible':
      return 'check-circle';
    case 'modéré':
      return 'alert-triangle';
    case 'élevé':
      return 'alert-octagon';
    default:
      return 'help-circle';
  }
};
