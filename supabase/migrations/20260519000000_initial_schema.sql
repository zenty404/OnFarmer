-- Création de la table profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  farm_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Politique: Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Politique: Les utilisateurs peuvent insérer leur propre profil
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Création de la table parcels
CREATE TABLE IF NOT EXISTS public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop_type TEXT,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  area_hectares FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active RLS sur parcels
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres parcelles
CREATE POLICY "Users can view own parcels"
  ON public.parcels FOR SELECT
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leurs propres parcelles
CREATE POLICY "Users can insert own parcels"
  ON public.parcels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent mettre à jour leurs propres parcelles
CREATE POLICY "Users can update own parcels"
  ON public.parcels FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent supprimer leurs propres parcelles
CREATE POLICY "Users can delete own parcels"
  ON public.parcels FOR DELETE
  USING (auth.uid() = user_id);

-- Création de la table weather_logs
CREATE TABLE IF NOT EXISTS public.weather_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  temperature FLOAT,
  soil_humidity FLOAT,
  rainfall_mm FLOAT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active RLS sur weather_logs
ALTER TABLE public.weather_logs ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les logs de leurs parcelles
CREATE POLICY "Users can view weather logs for own parcels"
  ON public.weather_logs FOR SELECT
  USING (
    parcel_id IN (
      SELECT id FROM public.parcels WHERE user_id = auth.uid()
    )
  );

-- Politique: Les utilisateurs peuvent insérer des logs pour leurs parcelles
CREATE POLICY "Users can insert weather logs for own parcels"
  ON public.weather_logs FOR INSERT
  WITH CHECK (
    parcel_id IN (
      SELECT id FROM public.parcels WHERE user_id = auth.uid()
    )
  );

-- Création de la table alertes (avec Realtime activé)
CREATE TABLE IF NOT EXISTS public.alertes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  date_prevision DATE NOT NULL,
  niveau TEXT NOT NULL CHECK (niveau IN ('faible', 'modéré', 'élevé')),
  type_risque TEXT NOT NULL,
  recommandation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active RLS sur alertes
ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les alertes de leurs parcelles
CREATE POLICY "Users can view alerts for own parcels"
  ON public.alertes FOR SELECT
  USING (
    parcel_id IN (
      SELECT id FROM public.parcels WHERE user_id = auth.uid()
    )
  );

-- Politique: Permettre l'insertion d'alertes (pour le webhook Make)
CREATE POLICY "Service role can insert alerts"
  ON public.alertes FOR INSERT
  WITH CHECK (true);

-- Active Realtime sur la table alertes
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertes;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_parcels_user_id ON public.parcels(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_logs_parcel_id ON public.weather_logs(parcel_id);
CREATE INDEX IF NOT EXISTS idx_alertes_parcel_id ON public.alertes(parcel_id);
CREATE INDEX IF NOT EXISTS idx_alertes_date_prevision ON public.alertes(date_prevision);

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
