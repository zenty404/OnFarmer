-- Script SQL pour créer des données de test
-- Exécuter ce script dans le SQL Editor de Supabase

-- Note: Remplacez 'USER_ID_HERE' par l'ID de votre utilisateur
-- Vous pouvez le trouver dans Authentication > Users

-- Exemple de parcelles
INSERT INTO public.parcels (user_id, name, crop_type, latitude, longitude, area_hectares)
VALUES
  ('USER_ID_HERE', 'Parcelle Nord', 'Blé', 48.8566, 2.3522, 5.2),
  ('USER_ID_HERE', 'Parcelle Sud', 'Maïs', 48.8466, 2.3422, 7.8),
  ('USER_ID_HERE', 'Parcelle Est', 'Tournesol', 48.8666, 2.3622, 3.5);

-- Exemple de logs météo (remplacez PARCEL_ID_HERE par l'ID d'une parcelle)
INSERT INTO public.weather_logs (parcel_id, temperature, soil_humidity, rainfall_mm, recorded_at)
VALUES
  ('PARCEL_ID_HERE', 18.5, 65.2, 2.3, NOW() - INTERVAL '1 day'),
  ('PARCEL_ID_HERE', 19.2, 62.8, 0.0, NOW() - INTERVAL '2 days'),
  ('PARCEL_ID_HERE', 17.8, 68.5, 5.1, NOW() - INTERVAL '3 days');

-- Exemple d'alerte
INSERT INTO public.alertes (parcel_id, date_prevision, niveau, type_risque, recommandation)
VALUES
  ('PARCEL_ID_HERE', CURRENT_DATE, 'modéré', 'Risque de sécheresse', 'Augmenter l''irrigation de 20% dans les 48 prochaines heures');
