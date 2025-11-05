# 🧠 Système de Révision Intelligent - Documentation Complète

## ✅ Implémentation Terminée

Le système de révision intelligent basé sur un algorithme de répétition espacée (type Anki) est maintenant **entièrement intégré** dans le module Oral Quiz !

---

## 🎯 Flow UX Final

### 1. **Créer ou Ouvrir un Quiz Sauvegardé**
   - Accédez à l'onglet "Mes Quiz Sauvegardés"
   - Créez un nouveau quiz OU sélectionnez un quiz existant

### 2. **Deux Modes Disponibles**
   - **"Jouer"** (vert) : Mode classique sans système de révision
   - **"Réviser"** (violet/indigo) : Mode révision intelligente avec classification

### 3. **Flow de Révision Intégré**

#### Étape 1 : Voir la Question
   - **Numéro de question affiché** : "Question 1 sur 10"
   - **Progression visuelle** : barre de progression animée
   - **Métadonnées** : Niveau, Streak, Échecs, Écart en pas
   - **Critères attendus** clairement affichés
   - **Indice** pour les cartes problématiques (leeches)

#### Étape 2 : Répondre Oralement
   - Cliquez sur **"Commencer ma réponse orale"**
   - Le système active le microphone
   - L'agent vocal vous pose la question
   - Vous répondez oralement
   - Le système enregistre votre réponse

#### Étape 3 : Classifier Votre Performance
   Une fois votre réponse terminée, **4 boutons** apparaissent :

   - **Again** (Rouge) 🔴  
     "Je ne savais pas"  
     → Revoir très vite (1 pas)

   - **Hard** (Orange) 🟠  
     "Difficile, avec hésitation"  
     → Petit espacement

   - **Good** (Bleu) 🔵  
     "Bien répondu"  
     → Espacement moyen

   - **Easy** (Vert) 🟢  
     "Très facile"  
     → Grand espacement

#### Étape 4 : Passage Automatique
   - Après classification, passage automatique à la question suivante
   - Les métriques sont enregistrées en temps réel
   - La progression est mise à jour

---

## 🧮 Algorithme de Révision

### Métriques par Carte

Chaque question devient une "carte" avec :
- **L** : Niveau de maîtrise (≥ 0)
- **g** : Écart en "pas" avant prochaine révision (≥ 1)
- **streak** : Nombre de réussites consécutives
- **lapses** : Nombre d'échecs
- **is_leech** : Marqueur de carte problématique

### Règles de Mise à Jour

```
Again:  L = max(L-1, 0)     streak = 0      lapses++    g = 1
Hard:   L = max(L, 1)       streak = 0      g = ceil(g / β_low)
Good:   L = L + 1           streak++        g = ceil(g * β_mid)
Easy:   L = L + 2           streak++        g = ceil(g * β_high)
```

**Paramètres par défaut :**
- `β_low = 1.2` (multiplicateur faible)
- `β_mid = 2.0` (multiplicateur moyen)
- `β_high = 3.0` (multiplicateur élevé)
- `leech_threshold = 8` (seuil pour marquer comme problématique)

### Système de "Pas"

**PAS de temps** ! Tout est basé sur le nombre de cartes vues entre deux apparitions :

- **Again** : Revoir après 1 carte
- **Hard** : Revoir après ~2-3 cartes
- **Good** : Revoir après ~4-8 cartes (selon niveau actuel)
- **Easy** : Revoir après ~12-24 cartes (selon niveau actuel)

---

## 📊 Catégorisation Automatique

Les cartes sont automatiquement catégorisées selon leur niveau :

| Niveau | Catégorie | Badge | Description |
|--------|-----------|-------|-------------|
| L = 0 | 🆕 Nouvelles | Gris | Jamais vues |
| L < 3 | 📚 Apprentissage | Rouge | En cours d'acquisition |
| L < 5 | ⚡ En cours | Jaune | Progression active |
| L < 8 | 💪 Maîtrisées | Bleu | Bien connues |
| L ≥ 8 | 🏆 Expertes | Vert | Parfaitement maîtrisées |

---

## 🚨 Cartes Problématiques (Leeches)

Quand `lapses ≥ 8` :
- La carte est marquée **"PROBLÉMATIQUE"**
- Badge rouge affiché
- **Indice contextuel** automatiquement affiché
- Reset de l'écart à 1 (revoir rapidement)
- Conseil : décomposer la question ou ajouter des aides-mémoire

---

## 🗃️ Base de Données

### Nouvelles Tables Créées

#### `question_cards`
Stocke les cartes individuelles avec métriques de révision
```sql
- id, user_id, quiz_id
- question, criteria (JSONB)
- L, g, streak, lapses, is_leech
- position, steps_until_due
- created_at, updated_at, last_reviewed_at
```

#### `revision_settings`
Paramètres personnalisables par utilisateur
```sql
- user_id (PK)
- beta_low, beta_mid, beta_high
- leech_threshold
- new_cards_per_session
- steps_between_new
```

#### `revision_sessions`
Historique des sessions de révision
```sql
- id, user_id, quiz_id
- cards_reviewed, cards_remaining
- responses (JSONB) - historique détaillé
- created_at, updated_at, completed_at
```

### Fonctions SQL Utilitaires

```sql
-- Créer des cartes depuis un quiz existant
SELECT create_cards_from_quiz('user-uuid', 'quiz-uuid');

-- Initialiser les paramètres par défaut
SELECT init_default_revision_settings('user-uuid');
```

---

## 🔌 API Routes

### `/api/revision/cards`
- **GET** : Récupérer les cartes (action: next, eligible, stats)
- **POST** : Créer des cartes depuis un quiz

### `/api/revision/respond`
- **POST** : Enregistrer une réponse (again/hard/good/easy)

### `/api/revision/session`
- **POST** : Créer une session de révision
- **GET** : Récupérer les sessions actives
- **PATCH** : Mettre à jour/terminer une session

### `/api/revision/settings`
- **GET** : Récupérer les paramètres utilisateur
- **POST** : Créer/mettre à jour les paramètres
- **DELETE** : Reset aux paramètres par défaut

### `/api/revision/stats`
- **GET** : Statistiques détaillées (par quiz, par période)

---

## 🎨 Composants Créés

### `OralQuizWithRevision`
**Le composant principal** qui intègre :
- Player oral (OralQuizPlayer)
- Affichage de la question et critères
- Barre de progression
- Boutons de classification (RevisionButtons)
- Gestion de l'état de la session

### `RevisionButtons`
Boutons de classification avec :
- 4 boutons colorés (Again/Hard/Good/Easy)
- Raccourcis clavier (1/2/3/4)
- Descriptions claires
- Légende visuelle

### `RevisionStats`
Interface de statistiques avec :
- Vue d'ensemble (total, nouvelles, apprentissage, maîtrisées, leeches)
- Barre de progression globale
- Détail par catégorie (expandable)
- Métriques de performance

### `RevisionManager`
Orchestrateur principal :
- Gestion des modes (overview, session, stats)
- Initialisation des cartes
- Communication avec l'API
- Navigation entre les vues

---

## 🚀 Pour Commencer

### 1. **Appliquer le Schéma SQL**
```bash
# Connectez-vous à votre base Supabase
# Exécutez le contenu de :
supabase-revision-schema.sql
```

### 2. **Lancer l'Application**
```bash
npm run dev
```

### 3. **Utiliser le Système**

#### A. Depuis un Quiz Existant
1. Allez dans "Mes Quiz Sauvegardés"
2. Cliquez sur **"Réviser"** (bouton violet)
3. Les cartes sont créées automatiquement
4. La session de révision démarre

#### B. Créer un Nouveau Quiz
1. Créez votre quiz normalement
2. Cliquez sur **"Réviser"**
3. Commencez votre première session

---

## 📈 Statistiques Disponibles

### Par Quiz
- Nombre total de cartes
- Répartition par niveau de maîtrise
- Cartes problématiques
- Taux de précision
- Distribution des réponses (Again/Hard/Good/Easy)

### Par Session
- Cartes révisées
- Durée moyenne par carte
- Performance globale
- Historique complet des réponses

### Progression Globale
- Cartes maîtrisées (%)
- Évolution du niveau moyen
- Sessions complétées
- Temps total de révision

---

## ⚙️ Configuration Personnalisable

Les utilisateurs peuvent ajuster :
- **Multiplicateurs** (β_low, β_mid, β_high)
- **Seuil de leech** (nombre d'échecs avant marquage)
- **Nouvelles cartes par session**
- **Cadence d'introduction**

Via l'API `/api/revision/settings` ou (future) interface de paramètres.

---

## 🎯 Avantages du Système

✅ **UX Logique** : L'utilisateur répond PUIS évalue sa performance  
✅ **Progression Visible** : Numéro de question, barre de progression, métriques  
✅ **Algorithme Intelligent** : Adapte automatiquement la fréquence  
✅ **Pas de Temps** : Basé sur le nombre de cartes, pas sur des dates  
✅ **Détection Problèmes** : Leeches automatiquement identifiées  
✅ **Statistiques Riches** : Suivi complet de la progression  
✅ **Intégration Parfaite** : S'intègre naturellement dans l'oral quiz existant  

---

## 🔄 Workflow Complet

```
1. Créer/Sélectionner Quiz
         ↓
2. Cliquer "Réviser"
         ↓
3. Cartes Créées Automatiquement (si nécessaire)
         ↓
4. Session Démarre
         ↓
5. POUR CHAQUE CARTE:
   a) Afficher Question + Critères
   b) Cliquer "Commencer réponse orale"
   c) Répondre oralement
   d) Réponse enregistrée ✓
   e) Classifier (Again/Hard/Good/Easy)
   f) Métriques mises à jour
   g) Passage automatique à la suivante
         ↓
6. Session Terminée
         ↓
7. Statistiques Mises à Jour
         ↓
8. Retour à la liste des quiz
```

---

## 🐛 Troubleshooting

### "No cards found"
→ Les cartes n'ont pas été créées. Cliquez à nouveau sur "Réviser" pour les créer automatiquement.

### "Failed to fetch cards"
→ Vérifiez que le schéma SQL a été appliqué dans Supabase.

### La progression ne s'affiche pas
→ Rechargez la page ou vérifiez la connexion réseau.

### Les boutons de classification ne s'affichent pas
→ Attendez que la réponse orale soit complétée.

---

## 📝 Notes Techniques

- **Algorithme 100% côté serveur** : Les calculs sont faits par l'API
- **Pas de cache côté client** : Les données sont toujours à jour
- **RLS Supabase activé** : Sécurité des données garantie
- **Optimisé pour Vercel** : Build et déploiement testés
- **TypeScript strict** : Types complets pour toutes les interfaces

---

## 🎓 Pour les Développeurs

### Structure des Fichiers Clés

```
lib/
  ├── types.ts                    # Types TypeScript étendus
  └── revision-algorithm.ts       # Logique de l'algorithme

app/api/revision/
  ├── cards/route.ts             # Gestion des cartes
  ├── respond/route.ts           # Traitement des réponses
  ├── session/route.ts           # Gestion des sessions
  ├── settings/route.ts          # Paramètres utilisateur
  └── stats/route.ts             # Statistiques

components/
  ├── OralQuizWithRevision.tsx   # Composant intégré principal
  ├── RevisionButtons.tsx        # Boutons de classification
  ├── RevisionStats.tsx          # Affichage des statistiques
  ├── RevisionManager.tsx        # Orchestrateur
  └── OralQuizManager.tsx        # Intégration dans le manager

supabase-revision-schema.sql     # Schéma de base de données complet
```

### Tests Locaux

```bash
# 1. Appliquer le schéma
# Exécutez supabase-revision-schema.sql dans Supabase

# 2. Variables d'environnement
# Assurez-vous d'avoir dans .env.local:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...

# 3. Lancer
npm run dev

# 4. Tester
# - Créez un quiz
# - Cliquez sur "Réviser"
# - Répondez à quelques questions
# - Vérifiez les statistiques
```

---

## 🎉 Résumé

Le système de révision intelligent est maintenant **COMPLÈTEMENT FONCTIONNEL** avec :

✅ UX intuitive (réponse orale → classification)  
✅ Affichage du numéro de question et progression  
✅ Boutons de classification intégrés  
✅ Backend API complet  
✅ Base de données structurée  
✅ Algorithme de révision intelligent  
✅ Statistiques détaillées  
✅ Intégration parfaite dans l'oral quiz  

**Prêt pour les tests en local !** 🚀


