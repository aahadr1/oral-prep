# Configuration du Quiz Oral

## Installation rapide

### 1. Configuration minimale (.env.local)

```env
# Pour tester rapidement sans authentification
SKIP_AUTH=true

# Votre clé OpenAI (obligatoire)
OPENAI_API_KEY=sk-votre-clé-api

# Supabase (optionnel en mode SKIP_AUTH)
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=example
```

### 2. Obtenir une clé OpenAI

1. Allez sur https://platform.openai.com/api-keys
2. Créez une nouvelle clé API
3. Assurez-vous d'avoir accès à l'API Realtime (gpt-4o-realtime-preview)

### 3. Lancer l'application

```bash
npm run dev
```

Puis ouvrez http://localhost:3000 (ou 3001 si le port est occupé)

## Utilisation

1. Cliquez sur le bouton **ORAL QUIZ** sur le tableau de bord
2. Ajoutez vos questions et critères d'évaluation
3. Cliquez sur **Démarrer le Quiz Oral**
4. Attendez que l'agent parle (indicateur bleu)
5. Cliquez sur **Prendre la parole** pour répondre
6. L'agent évaluera votre réponse selon les critères

## En cas de problème

- Vérifiez votre configuration : http://localhost:3001/api/oral-quiz/test
- Assurez-vous que votre clé OpenAI est valide
- Vérifiez que vous avez bien `SKIP_AUTH=true` dans .env.local
- Redémarrez le serveur après avoir modifié .env.local
