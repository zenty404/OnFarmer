# 🚀 Démarrage Rapide - Agri Météo

## ✨ L'application est prête à être lancée !

### 1️⃣ Lancer l'application

```bash
npm start
```

Ensuite, scannez le QR code avec l'application **Expo Go** sur votre téléphone :
- iOS : Scannez avec l'appareil photo
- Android : Scannez avec l'app Expo Go

Ou lancez sur un émulateur :

```bash
# Android
npm run android

# iOS
npm run ios
```

### 2️⃣ Créer un compte

1. Sur l'écran d'authentification, cliquez sur "Créer un compte"
2. Remplissez :
   - Nom complet
   - Email
   - Mot de passe (minimum 6 caractères)
3. Cliquez sur "Créer un compte"
4. Vérifiez votre email (Supabase envoie un lien de confirmation)
5. Revenez dans l'app et connectez-vous

### 3️⃣ Ajouter des parcelles de test

Pour l'instant, le bouton "+" n'est pas implémenté. Utilisez le SQL Editor de Supabase :

1. Allez sur [supabase.com](https://supabase.com)
2. Ouvrez votre projet
3. SQL Editor > New Query
4. Copiez le contenu de `src/utils/seed-data.sql`
5. **Remplacez `USER_ID_HERE`** par votre ID utilisateur :
   - Authentication > Users > Copiez votre User ID
6. Exécutez la requête

### 4️⃣ Tester le Dashboard

Une fois les parcelles créées :

1. Tirez vers le bas pour rafraîchir (pull-to-refresh)
2. Vous verrez vos parcelles avec :
   - État "Analyse météo par l'IA en cours..." (si pas d'alerte)
   - Ou l'alerte du jour (si elle existe)
3. Cliquez sur une parcelle pour voir les détails
4. Cliquez sur "Carte" pour voir la vue géographique

### 5️⃣ Configurer le Workflow Make (Optionnel)

Pour que les alertes IA fonctionnent réellement, configurez Make.com :

1. Créez un scénario Make.com
2. Configurez le webhook (voir `MAKE_WORKFLOW.md`)
3. Mettez à jour `EXPO_PUBLIC_MAKE_WEBHOOK_URL` dans `.env`

**Sans Make** : Les alertes ne seront pas générées automatiquement, mais vous pouvez les créer manuellement via SQL.

## 🎯 Fonctionnalités testables

### ✅ Authentification
- Inscription / Connexion
- Déconnexion (bouton rouge en haut à droite)

### ✅ Dashboard
- Liste des parcelles
- Pull-to-refresh
- Alertes en temps réel (via Supabase Realtime)
- Navigation vers les détails

### ✅ Carte
- Visualisation géographique
- Marqueurs colorés selon les alertes
- Tap sur un marqueur pour ouvrir les détails

### ✅ Détails Parcelle
- Informations de la parcelle
- Alerte du jour
- Historique météo

## 🐛 Dépannage

### L'app ne démarre pas

```bash
# Nettoyer le cache
npm start --clear

# Ou réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Les alertes ne s'affichent pas

1. Vérifiez que Realtime est activé dans Supabase :
   - Database > Replication > Publication `supabase_realtime`
   - La table `alertes` doit être cochée
2. Créez une alerte manuellement pour tester :

```sql
INSERT INTO public.alertes (parcel_id, date_prevision, niveau, type_risque, recommandation)
VALUES
  ('VOTRE_PARCEL_ID', CURRENT_DATE, 'modéré', 'Test', 'Ceci est un test');
```

### La carte ne s'affiche pas (Android)

1. Obtenez une clé API Google Maps
2. Dans `app.json`, remplacez `YOUR_GOOGLE_MAPS_API_KEY`
3. Rebuild l'app : `npm run android`

### Erreurs de permissions (iOS)

Les permissions sont configurées dans `app.json`. Si elles ne fonctionnent pas :

```bash
# Rebuild l'app
npx expo prebuild --clean
npm run ios
```

## 📚 Documentation complète

- `README.md` : Documentation technique complète
- `MAKE_WORKFLOW.md` : Configuration du workflow Make.com
- `src/utils/seed-data.sql` : Données de test

## 💡 Prochaines étapes

1. Implémenter le formulaire d'ajout de parcelles
2. Configurer le workflow Make.com pour les vraies alertes IA
3. Ajouter des graphiques et visualisations
4. Implémenter les notifications push

Bon développement ! 🚀
