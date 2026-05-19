#!/bin/bash

# Script de vérification de l'installation
echo "🌾 Vérification de la configuration d'Agri Météo..."
echo ""

# Vérifier Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js installé: $(node --version)"
else
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Vérifier npm
if command -v npm &> /dev/null; then
    echo "✅ npm installé: $(npm --version)"
else
    echo "❌ npm n'est pas installé"
    exit 1
fi

# Vérifier les dépendances
if [ -d "node_modules" ]; then
    echo "✅ Dépendances installées"
else
    echo "⚠️  Dépendances non installées. Exécutez: npm install"
fi

# Vérifier .env
if [ -f ".env" ]; then
    echo "✅ Fichier .env trouvé"

    # Vérifier les variables
    if grep -q "EXPO_PUBLIC_SUPABASE_URL" .env; then
        echo "  ✅ EXPO_PUBLIC_SUPABASE_URL configurée"
    else
        echo "  ❌ EXPO_PUBLIC_SUPABASE_URL manquante"
    fi

    if grep -q "EXPO_PUBLIC_SUPABASE_ANON_KEY" .env; then
        echo "  ✅ EXPO_PUBLIC_SUPABASE_ANON_KEY configurée"
    else
        echo "  ❌ EXPO_PUBLIC_SUPABASE_ANON_KEY manquante"
    fi

    if grep -q "EXPO_PUBLIC_MAKE_WEBHOOK_URL" .env; then
        echo "  ✅ EXPO_PUBLIC_MAKE_WEBHOOK_URL configurée"
    else
        echo "  ❌ EXPO_PUBLIC_MAKE_WEBHOOK_URL manquante"
    fi
else
    echo "❌ Fichier .env non trouvé"
    exit 1
fi

# Vérifier Supabase CLI
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI installé"
else
    echo "⚠️  Supabase CLI non installé (optionnel)"
fi

# Vérifier les migrations
if [ -d "supabase/migrations" ]; then
    migration_count=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
    if [ $migration_count -gt 0 ]; then
        echo "✅ Migrations trouvées ($migration_count fichier(s))"
    else
        echo "❌ Aucun fichier de migration trouvé"
    fi
else
    echo "❌ Dossier migrations non trouvé"
fi

echo ""
echo "📱 Configuration complète !"
echo ""
echo "Pour démarrer l'application:"
echo "  npm start"
echo ""
echo "Pour lancer sur Android:"
echo "  npm run android"
echo ""
echo "Pour lancer sur iOS:"
echo "  npm run ios"
