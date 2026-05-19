export interface Profile {
  id: string;
  full_name: string | null;
  farm_name: string | null;
  created_at: string;
}

export interface Parcel {
  id: string;
  user_id: string;
  name: string;
  crop_type: string | null;
  latitude: number;
  longitude: number;
  area_hectares: number | null;
  created_at: string;
}

export interface WeatherLog {
  id: string;
  parcel_id: string;
  temperature: number | null;
  soil_humidity: number | null;
  rainfall_mm: number | null;
  recorded_at: string;
}

export interface Alert {
  id: string;
  parcel_id: string;
  date_prevision: string;
  niveau: 'faible' | 'modéré' | 'élevé';
  type_risque: string;
  recommandation: string | null;
  created_at: string;
}

export type AlertLevel = Alert['niveau'];
