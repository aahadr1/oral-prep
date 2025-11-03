# Guide de démarrage rapide - Modules IA

Ce guide vous aidera à démarrer rapidement avec les modules Agent IA et Quiz.

## Prérequis ✅

Avant de commencer, assurez-vous d'avoir :

1. ✅ Supabase configuré (voir README.md)
2. ✅ Un token Replicate dans `.env.local`
3. ✅ Les dépendances installées (`npm install`)
4. ✅ Le script SQL exécuté dans Supabase

## Configuration Replicate (5 minutes)

### Étape 1 : Créer un compte

1. Allez sur [replicate.com](https://replicate.com)
2. Cliquez sur "Sign up" (gratuit)
3. Connectez-vous avec GitHub ou email

### Étape 2 : Obtenir votre token API

1. Une fois connecté, allez dans **Account** → **API tokens**
2. Cliquez sur "Create token"
3. Donnez un nom (ex: "oral-prep-dev")
4. Copiez le token généré

### Étape 3 : Ajouter le token

Éditez votre fichier `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=votre_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_key

# Ajoutez cette ligne avec votre token
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Étape 4 : Redémarrer le serveur

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez
npm run dev
```

## Premier test 🎯

### Tester l'Agent IA

1. Connectez-vous à l'application
2. Créez un projet (ou ouvrez-en un existant)
3. Ajoutez un document (PDF, image, DOCX ou PPTX)
4. Cliquez sur **"Apprendre avec l'agent"**
5. Sélectionnez votre document
6. Naviguez à une page
7. Cliquez sur **"Expliquer cette page"**
8. Attendez 10-30 secondes
9. Vous devriez voir l'explication générée ! 🎉

### Tester le générateur de Quiz

1. Depuis votre projet, cliquez sur **"Apprendre avec des quiz"**
2. Dans l'onglet "Générer" :
   - Donnez un titre (ex: "Test Quiz 1")
   - Cochez au moins un document
   - Choisissez un type (ex: QCM)
   - Laissez les autres paramètres par défaut
3. Cliquez sur **"Générer le quiz"**
4. Attendez 20-40 secondes
5. Vous verrez des questions générées ! 🎉
6. Cliquez sur **"Sauvegarder le quiz"**
7. Allez dans l'onglet "Bibliothèque" pour voir votre quiz

### Tester la révision espacée

1. Dans l'onglet "Révision"
2. Vous verrez les questions à réviser
3. Lisez la question, essayez de répondre mentalement
4. Cliquez sur "Montrer la réponse" (ou "Vérifier" pour MCQ)
5. Auto-évaluez votre réponse (Difficile / Moyen / Facile / Très facile)
6. Le système calcule automatiquement quand revoir cette question

## Dépannage 🔧

### Erreur "REPLICATE_API_TOKEN is not configured"

**Solution** : Vérifiez que :
- Le token est dans `.env.local`
- Le fichier `.env.local` est à la racine du projet `oral-prep/`
- Vous avez redémarré le serveur après l'ajout

### Erreur "Limite quotidienne atteinte"

**Solution** : Les limites sont :
- Agent IA : 30 appels/jour
- Quiz : 10 générations/jour

Les compteurs se réinitialisent à minuit (UTC).

Pour augmenter les limites (développement) :
```typescript
// Éditez oral-prep/app/api/replicate/vision/route.ts
const limit = 100; // Au lieu de 30

// Et oral-prep/app/api/replicate/text/route.ts
const limit = 50; // Au lieu de 10
```

### L'agent ne répond pas ou répond mal

**Causes possibles** :
- Document de mauvaise qualité (scan flou, etc.)
- Page vide ou avec peu de texte
- Question trop vague

**Solutions** :
- Posez des questions plus spécifiques
- Essayez sur une autre page
- Sélectionnez du texte pour un contexte précis

### Les quiz générés sont vides ou de mauvaise qualité

**Causes possibles** :
- Documents sans texte extractible (images scannées)
- Documents trop courts
- Format non supporté pour l'extraction

**Solutions** :
- Utilisez des PDF avec texte sélectionnable
- Préférez DOCX à PDF pour une meilleure extraction
- Augmentez la difficulté ou réduisez le nombre de questions
- Éditez manuellement les questions après génération

### Erreur lors du chargement du document

**Solution** : Vérifiez que :
- Le document est bien uploadé dans Supabase Storage
- Les permissions RLS sont correctes
- Le document n'est pas corrompu

## Limites et coûts 💰

### Replicate Pricing

- **Modèle gratuit** : Vous avez un crédit de départ
- **Vision (Qwen2-VL)** : ~$0.003 par appel (image)
- **Text (Llama 3.1)** : ~$0.005-0.01 par génération de quiz

**Estimation mensuelle pour usage modéré** :
- 300 analyses Agent (~$1)
- 100 générations Quiz (~$0.75)
- **Total** : ~$2/mois

**Note** : Ces prix sont indicatifs. Vérifiez sur replicate.com/pricing

### Limites de l'application

| Fonctionnalité | Limite | Renouvellement |
|----------------|--------|----------------|
| Analyses Agent | 30/jour | Minuit UTC |
| Générations Quiz | 10/jour | Minuit UTC |
| Documents/projet | 10 | - |
| Taille document | 50 Mo | - |

## Conseils d'utilisation 💡

### Pour l'Agent IA

1. **Questions claires** : "Explique le concept X" plutôt que "C'est quoi ça ?"
2. **Sélection de texte** : Sélectionnez le passage précis pour des questions ciblées
3. **Sauvegarde** : Sauvegardez les bonnes explications pour révision ultérieure
4. **Navigation** : Utilisez ← et → pour naviguer rapidement

### Pour les Quiz

1. **Qualité des sources** : Meilleurs résultats avec DOCX > PDF > images
2. **Quantité raisonnable** : 10-20 questions = bon équilibre qualité/quantité
3. **Difficulté progressive** : Commencez "facile", augmentez avec la pratique
4. **Révision régulière** : Consultez l'onglet Révision quotidiennement
5. **Édition** : N'hésitez pas à éditer les questions générées

### Pour la révision espacée

1. **Honnêteté** : Évaluez-vous honnêtement pour de meilleurs résultats
2. **Régularité** : 10-15 min/jour > 2h le weekend
3. **Progression** : Les intervalles augmentent automatiquement
4. **Réinitialisation** : Une mauvaise réponse = retour à 1 jour (normal !)

## Prochaines étapes 🚀

Maintenant que tout fonctionne :

1. ✅ Testez avec vos vrais documents d'étude
2. ✅ Créez plusieurs quiz sur différents sujets
3. ✅ Établissez une routine de révision quotidienne
4. ✅ Explorez les autres fonctionnalités à venir

## Besoin d'aide ? 🆘

- 📖 Voir `AGENT_QUIZ_FEATURES.md` pour la documentation complète
- 💬 Vérifiez la console du navigateur (F12) pour les erreurs
- 🐛 Regardez les logs du serveur Next.js dans le terminal
- 📊 Consultez les logs Replicate sur replicate.com/account

Bon apprentissage ! 📚✨


