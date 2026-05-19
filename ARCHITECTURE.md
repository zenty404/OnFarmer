# 🏗️ Architecture - Agri Météo

## 📐 Vue d'ensemble

```
┌─────────────────┐
│   Mobile App    │
│  (React Native) │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────┐  ┌──────────────┐
│  Supabase   │  │  Make.com    │
│  (Backend)  │◄─┤  (Workflow)  │
└──────┬──────┘  └──────┬───────┘
       │                │
       │         ┌──────┴───────┐
       │         │              │
       │         ▼              ▼
       │   ┌──────────┐  ┌──────────┐
       │   │  Météo   │  │  Gemini  │
       │   │   API    │  │   AI     │
       │   └──────────┘  └──────────┘
       │
       ▼
┌────────────────┐
│   PostgreSQL   │
│   + Realtime   │
└────────────────┘
```

## 🎯 Flux de données

### 1. Authentification

```
User → SignUp/SignIn → Supabase Auth
                        ↓
                    Trigger (handle_new_user)
                        ↓
                    Insert Profile
                        ↓
                    Return Session
                        ↓
                    Store in AsyncStorage
```

### 2. Affichage des alertes (Smart Loading)

```
User opens Dashboard
    ↓
For each Parcel:
    ↓
Query: getTodayAlert(parcel_id)
    ↓
    ├─ Alert EXISTS? → Display immediately
    │
    └─ Alert NOT EXISTS?
        ↓
        Show "Analyse en cours..."
        ↓
        Trigger Make Webhook
        ↓
        Subscribe to Realtime
        ↓
        Wait for INSERT event
        ↓
        Update UI automatically
```

### 3. Workflow Make.com

```
Webhook receives { parcel_id, date }
    ↓
Fetch parcel data from Supabase
    ↓
Call Weather API (lat, lon)
    ↓
Send to Gemini AI
    ↓
Parse JSON response
    ↓
Insert into Supabase.alertes
    ↓
Realtime broadcasts to clients
    ↓
App updates UI automatically
```

## 🗂️ Structure de la base de données

### Relations

```
auth.users (Supabase Auth)
    ↓ 1:1
profiles
    ↓ 1:N
parcels
    ↓ 1:N         ↓ 1:N
weather_logs   alertes
```

### Row Level Security (RLS)

Toutes les tables ont RLS activé :

- **profiles** : Users can only access their own profile
- **parcels** : Users can only access their own parcels
- **weather_logs** : Users can access logs for their parcels
- **alertes** :
  - Users can read alerts for their parcels
  - Service role can insert (for Make webhook)

## 📱 Architecture Frontend

### Navigation

```
AppNavigator
    ├─ Auth Stack (if !session)
    │   └─ AuthScreen
    │
    └─ Main Stack (if session)
        ├─ DashboardScreen (default)
        ├─ MapScreen
        └─ ParcelDetailScreen
```

### Context Providers

```
App
 └─ AuthProvider
     └─ NavigationContainer
         └─ Stack.Navigator
             └─ Screens
```

### State Management

- **Global** : AuthContext (session, user, profile)
- **Local** : useState + useEffect dans chaque écran
- **Real-time** : Supabase subscriptions

## 🔄 Composants clés

### AlertCard

Affiche l'état d'une alerte :
- Loading state : "Analyse en cours..."
- No alert : "Aucune alerte"
- Alert : Niveau + Type + Recommandation

**Props** :
- `alert: Alert | null`
- `loading?: boolean`

### Screens

#### DashboardScreen
- Liste des parcelles
- Alertes en temps réel
- Pull-to-refresh
- Navigation

#### MapScreen
- Carte interactive
- Marqueurs colorés (selon niveau d'alerte)
- Légende

#### ParcelDetailScreen
- Infos parcelle
- Alerte du jour
- Historique météo

## 🔐 Sécurité

### Authentication
- JWT tokens gérés par Supabase
- Refresh automatique des tokens
- Session persistante via AsyncStorage

### Row Level Security
- Isolation des données par utilisateur
- Policies PostgreSQL
- Service role pour le webhook

### API Keys
- Clés publiques (ANON_KEY) côté client
- Clé service (SERVICE_KEY) côté Make.com
- Variables d'environnement

## ⚡ Performance

### Optimisations

1. **Smart Alert Loading** :
   - Vérifie d'abord la base
   - Déclenche l'IA uniquement si nécessaire
   - Évite les appels redondants

2. **Realtime Subscriptions** :
   - Mises à jour instantanées
   - Pas de polling
   - Faible latence

3. **Pull-to-Refresh** :
   - L'utilisateur contrôle les updates
   - Pas de refresh automatique inutile

4. **Index Database** :
   - Index sur `user_id`, `parcel_id`, `date_prevision`
   - Requêtes rapides

### Scalabilité

**Limites actuelles** :
- Make.com gratuit : 1 000 ops/mois
- Gemini gratuit : 1 500 req/jour
- Supabase gratuit : 500 MB DB, 2 GB bandwidth

**Pour scaler** :
- Passer à Make.com Pro (10 000+ ops/mois)
- Utiliser Gemini API payant
- Upgrade Supabase (plans à partir de $25/mois)

## 🎨 Design System

### Couleurs

```typescript
// Niveaux d'alerte
faible: '#10b981'  // green-500
modéré: '#f59e0b'  // amber-500
élevé:  '#ef4444'  // red-500

// Marque
primary:   '#10b981' // green
secondary: '#3b82f6' // blue
background: '#f3f4f6' // gray-100
```

### Typographie

```typescript
headerTitle: 24px, bold
sectionTitle: 20px, 600
cardTitle: 18px, 600
body: 16px, normal
caption: 14px, normal
```

### Spacing

```typescript
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 20px
2xl: 24px
```

## 🧪 Testing Strategy

### À implémenter

1. **Unit Tests**
   - Utilitaires (alerts.ts)
   - Validation des données
   - Parsing JSON

2. **Integration Tests**
   - Supabase queries
   - Authentication flow
   - Realtime subscriptions

3. **E2E Tests**
   - Detox pour React Native
   - Scénarios utilisateur complets

### Points critiques à tester

- [ ] Authentification (signup, signin, signout)
- [ ] Fetch des parcelles
- [ ] Logique smart loading des alertes
- [ ] Realtime updates
- [ ] Navigation entre écrans
- [ ] Gestion des erreurs réseau

## 📊 Monitoring

### Métriques à suivre

1. **Performance** :
   - Temps de chargement des écrans
   - Latence des requêtes Supabase
   - Temps de réponse du webhook

2. **Erreurs** :
   - Échecs d'authentification
   - Erreurs réseau
   - Timeouts webhook

3. **Usage** :
   - Nombre d'alertes générées/jour
   - Taux de rafraîchissement
   - Temps passé par écran

### Outils recommandés

- Sentry : Error tracking
- Supabase Logs : Database monitoring
- Make.com History : Workflow tracking
- Expo Analytics : App usage

## 🔮 Évolutions futures

### Priorité 1 : Fonctionnalités manquantes

- [ ] Formulaire d'ajout de parcelles
- [ ] Édition/suppression de parcelles
- [ ] Profil utilisateur éditable
- [ ] Historique des alertes

### Priorité 2 : UX améliorée

- [ ] Graphiques d'évolution météo
- [ ] Calendrier des prévisions 7 jours
- [ ] Notifications push
- [ ] Mode hors-ligne

### Priorité 3 : Fonctionnalités avancées

- [ ] Export PDF des rapports
- [ ] Comparaison inter-parcelles
- [ ] Recommandations personnalisées
- [ ] Intégration IoT (capteurs)

### Priorité 4 : Scalabilité

- [ ] Cache Redis
- [ ] CDN pour les assets
- [ ] API Gateway
- [ ] Microservices

## 🛠️ Stack technique détaillée

### Frontend
- React Native 0.83.6
- Expo 55.0.24
- TypeScript 5.9.2
- React Navigation 6.x
- Lucide React Native (icons)

### Backend
- Supabase (PostgreSQL 15)
- PostgREST (API REST auto)
- Realtime (WebSockets)

### Automation
- Make.com (iPaaS)
- Google Gemini AI

### APIs
- Supabase Auth
- OpenWeatherMap
- Google Maps (optionnel)

### DevOps
- Git / GitHub
- Expo EAS (build & deploy)
- Supabase CLI (migrations)

## 📚 Ressources

- [Supabase Docs](https://supabase.com/docs)
- [Expo v55 Docs](https://docs.expo.dev/versions/v55.0.0/)
- [React Native Docs](https://reactnative.dev/)
- [Make.com Academy](https://www.make.com/en/academy)
- [Gemini API Docs](https://ai.google.dev/docs)

---

Cette architecture est conçue pour être :
- ✅ **Simple** : Stack moderne, peu de dépendances
- ✅ **Scalable** : Architecture modulaire
- ✅ **Sécurisée** : RLS, JWT, API keys
- ✅ **Performante** : Smart loading, Realtime
- ✅ **Maintenable** : Code TypeScript typé, structure claire
