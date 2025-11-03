#!/bin/bash

echo "🎤 Configuration du Quiz Oral"
echo "============================"

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✅ Fichier .env.local trouvé"
else
    echo "❌ Fichier .env.local manquant"
    echo ""
    echo "Création du fichier .env.local..."
    
    # Create .env.local with template
    cat > .env.local << 'EOF'
# Supabase (Required for authentication)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI (Required for Oral Quiz)
OPENAI_API_KEY=

# Replicate (Optional)
REPLICATE_API_TOKEN=
EOF
    
    echo "✅ Fichier .env.local créé"
    echo ""
    echo "⚠️  IMPORTANT: Éditez .env.local et ajoutez vos clés API"
    echo "   - OPENAI_API_KEY: https://platform.openai.com/api-keys"
    echo "   - Supabase: https://supabase.com/dashboard"
fi

# Check for environment variables
echo ""
echo "Vérification des variables d'environnement..."

if grep -q "OPENAI_API_KEY=sk-" .env.local 2>/dev/null; then
    echo "✅ OPENAI_API_KEY configurée"
else
    echo "❌ OPENAI_API_KEY manquante ou invalide"
    echo "   → Ajoutez votre clé dans .env.local"
fi

if grep -q "NEXT_PUBLIC_SUPABASE_URL=https://" .env.local 2>/dev/null; then
    echo "✅ SUPABASE_URL configurée"
else
    echo "❌ SUPABASE_URL manquante"
    echo "   → Ajoutez l'URL Supabase dans .env.local"
fi

# Kill all Next.js processes
echo ""
echo "Arrêt des serveurs Next.js existants..."
pkill -f "next dev" 2>/dev/null || echo "Aucun serveur en cours"

# Start the server
echo ""
echo "Démarrage du serveur..."
echo "📌 L'application sera disponible sur: http://localhost:3000"
echo "📌 Si le port 3000 est occupé, essayez: http://localhost:3001"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""

npm run dev
