# 🌾 Agri Météo - Application Mobile Agricole

Application mobile de prédiction des rendements agricoles basée sur la météorologie et l'IA.

## 📱 Technologies

- **Frontend**: React Native + Expo (TypeScript)
- **Backend**: Supabase (PostgreSQL + Realtime)
- **IA**: Make.com + Google Gemini (workflow externe)
- **Maps**: React Native Maps

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- Expo CLI
- Compte Supabase
- Compte Make.com (pour le workflow IA)

### Configuration

1. **Cloner le projet et installer les dépendances**

```bash
npm install
```

2. **Configuration des variables d'environnement**

Le fichier `.env` contient déjà les variables suivantes :

```env
EXPO_PUBLIC_SUPABASE_URL=https://rojjeeluasjyznedhysk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
EXPO_PUBLIC_MAKE_WEBHOOK_URL=https://hook.eu1.make.com/votre-webhook-id
```

3. **Configuration de Google Maps (Android)**

Dans `app.json`, remplacez `YOUR_GOOGLE_MAPS_API_KEY` par votre clé API Google Maps :

```json
"config": {
  "googleMaps": {
    "apiKey": "VOTRE_CLE_API_GOOGLE_MAPS"
  }
}
```

4. **Appliquer les migrations de base de données**

Les migrations ont déjà été appliquées. Si vous souhaitez les réappliquer :

```bash
npx supabase db push
```

## 🏗️ Structure de la base de données

### Tables

- **profiles** : Profils utilisateurs (lié à auth.users)
- **parcels** : Parcelles agricoles (coordonnées, culture, surface)
- **weather_logs** : Historique des données météo
- **alertes** : Alertes générées par l'IA (avec Realtime activé)

### Sécurité

- Row Level Security (RLS) activé sur toutes les tables
- Les utilisateurs ne peuvent accéder qu'à leurs propres données
- Le webhook Make peut insérer des alertes via la politique `Service role`

## 🎯 Fonctionnalités

### ✅ Authentification
- Inscription / Connexion
- Profil utilisateur automatiquement créé
- Session persistante

### ✅ Gestion des Parcelles
- Liste des parcelles
- Détails de chaque parcelle
- Historique météo

### ✅ Alertes Météo IA
- **Optimisation intelligente** :
  - Vérifie d'abord si une alerte existe pour aujourd'hui
  - Si OUI : affiche immédiatement
  - Si NON : déclenche l'analyse IA via Make webhook
- **Mise à jour en temps réel** via Supabase Realtime
- Indicateurs visuels de niveau de risque (faible, modéré, élevé)

### ✅ Carte Interactive
- Visualisation géographique des parcelles
- Marqueurs colorés selon le niveau d'alerte
- Navigation vers les détails depuis la carte

## 🔄 Workflow IA (Make.com)

Le webhook Make.com doit :

1. Recevoir `{ parcel_id, date }`
2. Récupérer les données de la parcelle depuis Supabase
3. Appeler une API météo externe
4. Envoyer les données à Gemini pour l'analyse
5. Insérer le résultat dans la table `alertes`

Exemple de structure de réponse attendue :

```json
{
  "parcel_id": "uuid",
  "date_prevision": "2026-05-19",
  "niveau": "modéré",
  "type_risque": "Risque de gel",
  "recommandation": "Arroser les cultures avant le lever du soleil"
}
```

## 🚀 Lancement de l'application

```bash
# Démarrer Expo
npm start

# Lancer sur Android
npm run android

# Lancer sur iOS
npm run ios
```

## 📦 Structure du projet

```
app-agri-meteo/
├── src/
│   ├── components/          # Composants réutilisables
│   │   └── AlertCard.tsx
│   ├── config/             # Configuration
│   │   └── supabase.ts
│   ├── contexts/           # Contextes React
│   │   └── AuthContext.tsx
│   ├── navigation/         # Navigation
│   │   └── AppNavigator.tsx
│   ├── screens/            # Écrans
│   │   ├── AuthScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── MapScreen.tsx
│   │   └── ParcelDetailScreen.tsx
│   ├── types/              # Types TypeScript
│   │   └── database.types.ts
│   └── utils/              # Utilitaires
│       └── alerts.ts
├── supabase/
│   └── migrations/         # Migrations SQL
│       └── 20260519000000_initial_schema.sql
├── App.tsx                 # Point d'entrée
├── app.json               # Config Expo
└── .env                   # Variables d'environnement
```

## 🔐 Sécurité

- Toutes les données utilisateurs sont protégées par RLS
- Les tokens sont stockés de manière sécurisée via AsyncStorage
- Les sessions sont automatiquement rafraîchies
- Le webhook Make utilise une clé de service pour insérer les alertes

## 🐛 Debug

### Vérifier la connexion Supabase

```bash
npx supabase status
```

### Voir les logs Realtime

Dans le dashboard Supabase > Database > Replication, vérifier que `alertes` est bien dans la publication `supabase_realtime`.

### Tester le webhook Make

```bash
curl -X POST https://hook.eu1.make.com/votre-webhook-id \
  -H "Content-Type: application/json" \
  -d '{"parcel_id":"uuid-test","date":"2026-05-19"}'
```

## 📝 TODO

- [ ] Ajouter un formulaire de création de parcelles
- [ ] Intégrer une vraie API météo
- [ ] Ajouter des graphiques d'évolution
- [ ] Notifications push pour les alertes critiques
- [ ] Export des données en PDF

## 📄 Licence

MIT
