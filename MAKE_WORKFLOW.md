# 🤖 Configuration du Workflow Make.com

Ce document explique comment configurer le workflow Make.com pour générer les alertes météo IA.

## 📋 Vue d'ensemble

Le workflow Make.com :
1. Reçoit un webhook avec `parcel_id` et `date`
2. Récupère les données de la parcelle depuis Supabase
3. Appelle une API météo (OpenWeatherMap, Météo France, etc.)
4. Envoie les données à Google Gemini pour l'analyse
5. Insère le résultat dans la table `alertes` de Supabase

## 🔧 Étape 1 : Créer le scénario Make

1. Allez sur [make.com](https://make.com)
2. Créez un nouveau scénario
3. Nom : "Agri Météo - Analyse IA"

## 📥 Étape 2 : Webhook

### Module 1 : Webhooks > Custom Webhook

**Configuration** :
- Créez un nouveau webhook
- Copiez l'URL du webhook
- Mettez-la dans `.env` : `EXPO_PUBLIC_MAKE_WEBHOOK_URL`

**Structure des données reçues** :
```json
{
  "parcel_id": "uuid",
  "date": "2026-05-19"
}
```

## 🗄️ Étape 3 : Récupérer les données Supabase

### Module 2 : Supabase > Make an API Call

**Configuration** :
- URL : `https://rojjeeluasjyznedhysk.supabase.co/rest/v1/parcels`
- Method : GET
- Headers :
  - `apikey` : Votre ANON_KEY
  - `Authorization` : `Bearer VOTRE_ANON_KEY`
- Query String :
  - `id` = `eq.{{1.parcel_id}}`
  - `select` = `*`

**Mappings** :
```
parcel_id = {{1.parcel_id}}
```

## 🌤️ Étape 4 : Appeler l'API Météo

### Module 3 : HTTP > Make a request

**Option A : OpenWeatherMap** (gratuit jusqu'à 1000 calls/jour)

1. Créez un compte sur [openweathermap.org](https://openweathermap.org/api)
2. Obtenez votre API key

**Configuration** :
- URL : `https://api.openweathermap.org/data/2.5/forecast`
- Method : GET
- Query String :
  - `lat` = `{{2.latitude}}`
  - `lon` = `{{2.longitude}}`
  - `appid` = `VOTRE_OPENWEATHER_API_KEY`
  - `units` = `metric`
  - `lang` = `fr`

**Option B : Météo France API** (nécessite une inscription)

Consultez [portail-api.meteofrance.fr](https://portail-api.meteofrance.fr/)

## 🧠 Étape 5 : Analyse avec Google Gemini

### Module 4 : Google Gemini > Create a Prompt Completion

**Configuration** :
- Model : `gemini-2.0-flash-exp` (ou `gemini-1.5-pro`)
- Température : 0.7

**Prompt** :
```
Tu es un expert agronome spécialisé dans la prédiction des rendements agricoles.

Voici les informations d'une parcelle agricole :
- Culture : {{2.crop_type}}
- Surface : {{2.area_hectares}} hectares
- Localisation : {{2.latitude}}, {{2.longitude}}

Données météo pour les 5 prochains jours :
{{3.list}}

Analyse ces données et fournis :
1. Le niveau de risque pour les rendements (faible, modéré, ou élevé)
2. Le type de risque principal (sécheresse, gel, inondation, maladie, etc.)
3. Une recommandation pratique pour l'agriculteur

IMPORTANT : Réponds UNIQUEMENT au format JSON suivant, sans texte supplémentaire :
{
  "niveau": "faible|modéré|élevé",
  "type_risque": "Description courte du risque",
  "recommandation": "Action concrète à prendre"
}
```

**Astuce** : Vous pouvez améliorer le prompt en ajoutant :
- Des données historiques
- Le stade de croissance de la culture
- Des informations sur le sol

## 💾 Étape 6 : Parser la réponse JSON

### Module 5 : Tools > Parse JSON

**Configuration** :
- JSON string : `{{4.text}}`

Si Gemini renvoie du texte avant/après le JSON, utilisez :

### Module 5 bis : Text Parser > Match Pattern

**Configuration** :
- Text : `{{4.text}}`
- Pattern : `\{[^}]+\}`
- Global match : No

Puis Parse JSON sur `{{5.0}}`

## 💉 Étape 7 : Insérer dans Supabase

### Module 6 : Supabase > Make an API Call

**Configuration** :
- URL : `https://rojjeeluasjyznedhysk.supabase.co/rest/v1/alertes`
- Method : POST
- Headers :
  - `apikey` : Votre ANON_KEY
  - `Authorization` : `Bearer VOTRE_ANON_KEY`
  - `Content-Type` : `application/json`
  - `Prefer` : `return=representation`

**Body** :
```json
{
  "parcel_id": "{{1.parcel_id}}",
  "date_prevision": "{{1.date}}",
  "niveau": "{{5.niveau}}",
  "type_risque": "{{5.type_risque}}",
  "recommandation": "{{5.recommandation}}"
}
```

## ✅ Étape 8 : Tester le workflow

1. Dans Make, cliquez sur "Run once"
2. Depuis l'app mobile, ouvrez une parcelle
3. L'alerte devrait apparaître en temps réel !

**Test manuel via curl** :
```bash
curl -X POST https://hook.eu1.make.com/VOTRE_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -d '{
    "parcel_id": "votre-parcel-uuid",
    "date": "2026-05-19"
  }'
```

## 🔐 Sécurité

### Protéger le webhook

Ajoutez un secret dans le body :

```json
{
  "parcel_id": "uuid",
  "date": "2026-05-19",
  "secret": "VOTRE_SECRET_PARTAGE"
}
```

Dans Make, Module 1, ajoutez un Router avec un filtre :
- `{{1.secret}}` égal à `VOTRE_SECRET_PARTAGE`

### Limiter les appels

Ajoutez un cache dans l'app pour éviter de déclencher le webhook trop souvent :

```typescript
// Vérifier si une alerte a déjà été créée aujourd'hui
const existingAlert = await getTodayAlert(parcelId);
if (existingAlert) {
  // Ne pas déclencher le webhook
  return;
}
```

## 📊 Monitoring

### Dans Make
- History > Voir les exécutions
- Logs > Voir les erreurs

### Dans Supabase
- Database > Table `alertes` > Voir les insertions
- Logs > Voir les requêtes

## 💰 Coûts estimés

### Make.com
- Plan gratuit : 1 000 opérations/mois
- 1 exécution = 6 opérations (webhook + 5 modules)
- ~166 alertes/mois gratuitement

### Google Gemini
- Plan gratuit : 60 requêtes/minute
- Flash : gratuit jusqu'à 1 500 requêtes/jour

### OpenWeatherMap
- Plan gratuit : 1 000 requêtes/jour

**Total** : 100% gratuit pour commencer ! 🎉

## 🚀 Améliorations possibles

1. **Cache intelligent** : Ne pas recalculer si les conditions météo n'ont pas changé
2. **Historique** : Stocker l'historique des prédictions pour améliorer le modèle
3. **Multi-sources** : Combiner plusieurs APIs météo
4. **ML custom** : Entraîner un modèle spécifique à vos cultures
5. **Alertes push** : Envoyer une notification si niveau = "élevé"

## 📝 Exemple de réponse Gemini

```json
{
  "niveau": "modéré",
  "type_risque": "Risque de stress hydrique",
  "recommandation": "Augmenter l'irrigation de 30% dans les 48 prochaines heures. Surveiller l'humidité du sol quotidiennement."
}
```

## 🆘 Dépannage

### Le webhook ne se déclenche pas
- Vérifiez l'URL dans `.env`
- Testez avec curl
- Vérifiez les logs Make

### Gemini ne répond pas en JSON
- Améliorez le prompt
- Ajoutez des exemples dans le prompt
- Utilisez le Text Parser pour extraire le JSON

### L'alerte n'apparaît pas dans l'app
- Vérifiez que Realtime est activé
- Vérifiez les RLS policies
- Vérifiez que le `parcel_id` est correct

Bon workflow ! 🤖
