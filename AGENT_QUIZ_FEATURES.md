# Agent IA et Quiz - Documentation

## Vue d'ensemble

Deux nouveaux modules d'apprentissage complets ont été ajoutés à l'application :

1. **Apprendre avec l'agent** : Analyse page par page de vos documents avec explications IA
2. **Apprendre avec des quiz** : Génération, organisation et révision de quiz intelligents

## Module Agent IA

### Fonctionnalités

- **Visualisation de documents** : Support PDF, images (PNG/JPG), DOCX, PPTX
- **Navigation page par page** : Flèches clavier (←/→) ou boutons
- **Explications IA** : Analyse visuelle avec Qwen2-VL-72B
- **Questions contextuelles** : Sélectionnez du texte pour des questions spécifiques
- **Sauvegarde de notes** : Conservez les explications utiles
- **Zoom** : Ajustez l'affichage des PDFs

### Utilisation

1. Depuis la page du projet, cliquez sur "Apprendre avec l'agent"
2. Sélectionnez un document à analyser
3. Naviguez entre les pages
4. Cliquez sur "Expliquer cette page" pour une analyse complète
5. Ou sélectionnez du texte et cliquez "Expliquer la sélection"
6. Sauvegardez les explications importantes comme notes

### Raccourcis clavier

- `←` : Page précédente
- `→` : Page suivante
- Sélection de texte : Active le bouton "Expliquer la sélection"

### Limites

- 30 appels vision par jour par utilisateur
- Les explications sont basées uniquement sur la page visible
- Temps de réponse : 10-30 secondes selon la complexité

## Module Quiz

### Fonctionnalités

Le module quiz comprend 3 onglets :

#### 1. Générer

- **Types de questions** :
  - QCM (Questions à Choix Multiples) avec 4 options
  - Flashcards (recto/verso)
  - Questions ouvertes avec réponse modèle
  
- **Configuration** :
  - Sélection de documents sources
  - Choix des types de questions (mixte possible)
  - Niveau de difficulté (facile, moyen, difficile)
  - Nombre de questions (1-50)
  
- **Prévisualisation** : Modifiez les questions avant sauvegarde
- **Génération IA** : Utilise Meta Llama 3.1 70B (fallback : Mixtral 8x7B)

#### 2. Bibliothèque

- **Organisation** : Tous vos quiz sauvegardés
- **Recherche** : Filtrez par titre
- **Vue détaillée** : Expandez pour voir toutes les questions
- **Édition** : Modifiez ou supprimez des questions
- **Export** : Téléchargez au format JSON

#### 3. Révision

- **Répétition espacée** : Algorithme SM-2 pour optimiser la mémorisation
- **File de révision** : Questions dues pour aujourd'hui
- **Auto-évaluation** : 4 niveaux (Difficile, Moyen, Facile, Très facile)
- **Progression** : Suivi détaillé de vos révisions
- **Calcul intelligent** : Les intervalles s'adaptent à vos performances

### Algorithme de révision (SM-2)

```
Première révision : +6 jours
Bonnes réponses : intervalle multiplié par ease factor (≥2.5)
Mauvaises réponses : retour à 1 jour
Ease factor ajusté selon la difficulté perçue
```

### Utilisation

**Générer un quiz** :
1. Onglet "Générer"
2. Donnez un titre
3. Sélectionnez documents, types, difficulté
4. Cliquez "Générer le quiz"
5. Prévisualisez et éditez si besoin
6. Sauvegardez

**Réviser** :
1. Onglet "Révision"
2. Répondez aux questions dues
3. Auto-évaluez votre performance
4. Le système calcule le prochain rappel

### Limites

- 10 générations de quiz par jour par utilisateur
- Maximum 50 questions par quiz
- L'extraction de texte PDF est simplifiée (sera améliorée)

## Architecture technique

### Modèles IA (Replicate)

| Usage | Modèle | Fallback |
|-------|--------|----------|
| Vision (Agent) | qwen2-vl-72b-instruct | - |
| Texte (Quiz) | meta-llama-3.1-70b-instruct | mixtral-8x7b-instruct |

### Base de données (Supabase)

**Nouvelles tables** :
- `quizzes` : Métadonnées des quiz
- `quiz_items` : Questions individuelles
- `quiz_reviews` : Historique de révision (spaced repetition)
- `project_notes` : Notes sauvegardées depuis l'agent
- `api_usage` : Tracking des limites d'utilisation

### Routes API

```
POST /api/replicate/vision
- Analyse une page de document avec vision IA
- Body: { projectId, documentId, page, prompt, pageImage, pageText }
- Response: { explanation, remaining, page }

POST /api/replicate/text
- Génère des questions de quiz
- Body: { projectId, documents, types, difficulty, count }
- Response: { items, remaining }
```

### Extraction de documents

**Bibliothèques** :
- PDF : `pdfjs-dist` (client-side)
- DOCX : `mammoth` (server) + `docx-preview` (client)
- PPTX : `jszip` + parsing XML
- Capture : `html-to-image` pour DOM → image

## Configuration

### Variables d'environnement

Ajoutez dans `.env.local` :

```bash
# Supabase (déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Nouveau : Replicate API
REPLICATE_API_TOKEN=your_replicate_token
```

### Obtenir un token Replicate

1. Créez un compte sur [replicate.com](https://replicate.com)
2. Allez dans Settings → API Tokens
3. Créez un nouveau token
4. Ajoutez-le dans `.env.local`

### Migration de la base de données

Exécutez le script SQL mis à jour dans Supabase SQL Editor :

```bash
# Le fichier contient toutes les nouvelles tables et fonctions
oral-prep/supabase-setup.sql
```

## Installation des dépendances

```bash
cd oral-prep
npm install
```

Nouvelles dépendances ajoutées :
- `replicate` : Client Replicate officiel
- `pdfjs-dist` : Rendu et extraction PDF
- `mammoth` : Extraction DOCX
- `docx-preview` : Prévisualisation DOCX
- `jszip` : Lecture de fichiers PPTX
- `html-to-image` : Capture d'écran DOM

## Démarrage

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## Structure des fichiers

```
oral-prep/
├── app/
│   ├── (dashboard)/projets/[projectId]/
│   │   ├── agent/
│   │   │   ├── page.tsx              # Sélection de document
│   │   │   └── [documentId]/
│   │   │       └── page.tsx          # Vue agent complète
│   │   └── quiz/
│   │       └── page.tsx              # Interface quiz (3 onglets)
│   └── api/replicate/
│       ├── vision/route.ts           # Endpoint vision
│       └── text/route.ts             # Endpoint génération quiz
├── components/
│   ├── DocumentViewer.tsx            # Visualiseur universel
│   ├── AgentSidebar.tsx              # Chat agent IA
│   ├── QuizBuilder.tsx               # Générateur de quiz
│   ├── QuizLibrary.tsx               # Bibliothèque de quiz
│   └── QuizReview.tsx                # Système de révision
├── lib/
│   ├── replicate.ts                  # Client Replicate
│   ├── doc-extract/
│   │   ├── pdf.ts                    # Extraction PDF
│   │   ├── docx.ts                   # Extraction DOCX
│   │   └── pptx.ts                   # Extraction PPTX
│   └── types.ts                      # Types TypeScript
└── supabase-setup.sql                # Schema DB complet
```

## Prochaines améliorations

### Court terme
- [ ] Améliorer l'extraction de texte PDF (pdf-parse côté serveur)
- [ ] Ajouter l'export CSV pour les quiz
- [ ] Permettre l'édition manuelle de questions
- [ ] Historique des conversations agent
- [ ] Statistiques de révision détaillées

### Moyen terme
- [ ] Support vidéo et audio
- [ ] Génération de fiches de révision automatiques
- [ ] Partage de quiz entre utilisateurs
- [ ] Mode hors ligne pour les révisions
- [ ] Graphiques de progression

### Long terme
- [ ] OCR pour images de documents scannés
- [ ] Synthèse vocale des explications
- [ ] Quiz adaptatifs basés sur les performances
- [ ] Intégration avec calendriers externes
- [ ] Application mobile

## Dépannage

### "REPLICATE_API_TOKEN is not configured"
➜ Ajoutez votre token Replicate dans `.env.local`

### "Limite quotidienne atteinte"
➜ Les limites se réinitialisent à minuit (fuseau serveur)
➜ Augmentez les limites dans `lib/replicate.ts` si nécessaire

### "Erreur lors du chargement du document"
➜ Vérifiez que le document existe dans Supabase Storage
➜ Vérifiez les permissions RLS

### Les explications sont hors sujet
➜ L'IA se base uniquement sur l'image de la page
➜ Assurez-vous que la qualité du document est bonne
➜ Posez des questions plus spécifiques

### Les quiz générés sont de mauvaise qualité
➜ Vérifiez que les documents sources contiennent du texte extractible
➜ Ajustez la difficulté et le nombre de questions
➜ Éditez manuellement après génération

## Support

Pour toute question ou bug :
1. Vérifiez la console du navigateur (F12)
2. Vérifiez les logs du serveur Next.js
3. Consultez les erreurs Supabase
4. Vérifiez votre quota Replicate

## Licence

Même licence que le projet principal.


