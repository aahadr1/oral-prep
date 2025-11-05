# Guide du Module Oral Blanc

## 📋 Vue d'ensemble

Le module **Oral Blanc** est un simulateur d'examen oral avec un jury virtuel intelligent. Contrairement au module "Quiz Oral" qui utilise des questions prédéfinies, l'Oral Blanc permet à l'utilisateur de fournir un long texte (cours, document, sujet) et l'agent vocal joue le rôle d'un jury de concours qui pose des questions spécifiques sur ce contenu.

## 🎯 Fonctionnalités

### 1. Deux Modes d'Utilisation

#### Mode "Sessions Sauvegardées"
- Créer et sauvegarder des sessions d'oral blanc
- Chaque session contient :
  - Un **titre** descriptif
  - Un **sujet/matériel** (long texte) sur lequel le jury interrogera
- Modifier ou supprimer les sessions existantes
- Reprendre une session à tout moment

#### Mode "Session Rapide"
- Créer une session temporaire non sauvegardée
- Idéal pour les tests rapides ou les sujets ponctuels
- Coller directement le contenu et démarrer

### 2. Assistant Vocal - Jury Virtuel

L'agent vocal joue le rôle d'un **membre de jury de concours** :

#### Comportement du Jury
- **Présentation** : Se présente comme membre du jury
- **Questions variées** :
  - Questions de définition
  - Questions d'explication
  - Questions d'analyse
  - Questions d'application
  - Questions de synthèse
- **Adaptation** : Adapte le niveau des questions selon les réponses du candidat
- **Feedback** : Donne des retours constructifs après chaque réponse
- **Approfondissement** : Creuse plus profond si le candidat répond bien

#### Processus d'Interrogation
1. Présentation du jury et du sujet
2. Première question générale pour évaluer le niveau
3. Questions progressives basées sur les réponses
4. Feedback après chaque réponse
5. Passage à différents aspects du sujet fourni

## 🏗️ Architecture Technique

### Structure des Fichiers

```
app/
├── (dashboard)/
│   └── oral-blanc/
│       └── page.tsx                 # Page principale
├── api/
│   └── oral-blanc/
│       ├── session/
│       │   └── route.ts            # Création de session OpenAI
│       ├── create/
│       │   └── route.ts            # Création de session DB
│       ├── list/
│       │   └── route.ts            # Liste des sessions
│       └── [id]/
│           └── route.ts            # CRUD sessions

components/
├── OralBlancPlayer.tsx              # Interface vocale avec le jury
├── OralBlancManager.tsx             # Gestion des sessions
└── Sidebar.tsx                      # Navigation (mise à jour)

supabase-oral-blanc-schema.sql       # Schéma de base de données
```

### Base de Données

Table : `oral_blanc_sessions`

```sql
- id (UUID)               : Identifiant unique
- user_id (UUID)          : Utilisateur propriétaire
- title (TEXT)            : Titre de la session
- topic (TEXT)            : Sujet/matériel (long texte)
- created_at (TIMESTAMP)  : Date de création
- updated_at (TIMESTAMP)  : Date de modification
```

### API Routes

#### `POST /api/oral-blanc/session`
Crée une session OpenAI Realtime avec le prompt jury
- **Input** : `{ topic: string }`
- **Output** : `{ client_secret: string }`

#### `POST /api/oral-blanc/create`
Crée une nouvelle session dans la DB
- **Input** : `{ title: string, topic: string }`
- **Output** : Session créée

#### `GET /api/oral-blanc/list`
Liste toutes les sessions de l'utilisateur
- **Output** : Array de sessions

#### `GET /api/oral-blanc/[id]`
Récupère une session spécifique

#### `PUT /api/oral-blanc/[id]`
Met à jour une session
- **Input** : `{ title: string, topic: string }`

#### `DELETE /api/oral-blanc/[id]`
Supprime une session

## 🚀 Installation

### 1. Créer la table dans Supabase

Exécutez le fichier SQL dans votre console Supabase :

```bash
psql -h [votre-projet].supabase.co -U postgres -d postgres -f supabase-oral-blanc-schema.sql
```

Ou copiez-collez le contenu dans l'éditeur SQL de Supabase.

### 2. Vérifier les variables d'environnement

Assurez-vous d'avoir :

```bash
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Démarrer l'application

```bash
npm run dev
```

## 📖 Utilisation

### Créer une Session Sauvegardée

1. Aller sur "Oral Blanc" dans la sidebar
2. Cliquer sur "Nouvelle Session"
3. Remplir :
   - **Titre** : Ex. "Préparation Concours - Histoire Contemporaine"
   - **Sujet** : Coller votre cours, document, ou notes
4. Cliquer sur "Créer la Session"

### Démarrer un Oral Blanc

1. Cliquer sur "Commencer" sur une session
2. Attendre la connexion avec le jury
3. Le jury se présente et pose sa première question
4. **Pour répondre** :
   - Cliquer sur "Répondre au jury"
   - Parler clairement dans le microphone
   - Cliquer sur "Terminer ma réponse" quand vous avez fini
5. Le jury donne un feedback et pose la question suivante

### Session Rapide

1. Aller sur l'onglet "Session Rapide"
2. Coller votre contenu directement
3. Cliquer sur "Démarrer l'Oral Blanc"
4. La session commence immédiatement (non sauvegardée)

## 💡 Conseils d'Utilisation

### Pour de Meilleurs Résultats

1. **Contenu Détaillé** : Plus vous fournissez de détails dans le sujet, plus les questions seront pertinentes
2. **Structure Claire** : Organisez votre contenu avec des titres, sections, points clés
3. **Exemples** : Incluez des exemples concrets dans votre sujet
4. **Définitions** : Définissez les termes importants
5. **Contexte** : Donnez du contexte historique, théorique, etc.

### Types de Contenu Adaptés

- **Cours universitaires** : Chapitres complets avec concepts, définitions, exemples
- **Fiches de révision** : Synthèses de sujets avec points clés
- **Articles académiques** : Textes scientifiques ou techniques
- **Documents professionnels** : Méthodologies, processus, projets
- **Livres** : Résumés de chapitres ou sections

### Exemples de Sujets

#### Histoire
```
La Révolution Française (1789-1799)

Contexte:
- Crise financière de l'Ancien Régime
- Influence des idées des Lumières
- Tensions sociales entre ordres

Événements clés:
- 14 juillet 1789: Prise de la Bastille
- 26 août 1789: Déclaration des Droits de l'Homme
- 1792-1794: La Terreur

Conséquences:
- Fin de la monarchie absolue
- Émergence des principes républicains
- Impact sur l'Europe entière
```

#### Sciences
```
Thermodynamique - Premier Principe

Définition:
Le premier principe de la thermodynamique exprime la conservation de l'énergie.
ΔU = Q - W

Concepts:
- Énergie interne (U)
- Chaleur (Q)
- Travail (W)
- Système isolé, fermé, ouvert

Applications:
- Machines thermiques
- Réfrigérateurs
- Moteurs
```

## 🔧 Personnalisation

### Modifier le Comportement du Jury

Éditez `/app/api/oral-blanc/session/route.ts` pour modifier le `systemPrompt` :

```typescript
const systemPrompt = `Tu es un membre de jury...`
```

Vous pouvez ajuster :
- Le ton du jury (plus strict, plus bienveillant)
- Le niveau de détail des questions
- Le type de feedback donné
- La longueur de l'interrogation

### Changer la Voix

Dans le même fichier :

```typescript
voice: 'alloy',  // Options: alloy, echo, fable, onyx, nova, shimmer
```

## 🐛 Dépannage

### Le jury ne pose pas de questions

- Vérifiez que le sujet contient assez d'informations
- Assurez-vous que la connexion OpenAI est établie
- Vérifiez les logs du serveur

### Audio ne fonctionne pas

- Autorisez l'accès au microphone dans le navigateur
- Vérifiez que votre microphone fonctionne
- Essayez de parler plus fort et plus longtemps

### Erreur "Failed to get session token"

- Vérifiez votre `OPENAI_API_KEY`
- Assurez-vous d'avoir accès à l'API Realtime de OpenAI
- Vérifiez vos crédits OpenAI

### Sessions ne se sauvegardent pas

- Vérifiez la connexion Supabase
- Assurez-vous d'avoir exécuté le schéma SQL
- Vérifiez les permissions RLS dans Supabase

## 📊 Différences avec Quiz Oral

| Caractéristique | Quiz Oral | Oral Blanc |
|----------------|-----------|------------|
| Questions | Prédéfinies avec critères | Générées par l'IA selon le sujet |
| Structure | Liste de questions fixes | Interrogation adaptative |
| Évaluation | Critères prédéfinis | Feedback contextuel |
| Contenu | Questions courtes | Long texte de référence |
| Usage | Auto-évaluation | Simulation d'examen |
| Interaction | Questions-Réponses | Interrogation de jury |

## 🎓 Cas d'Usage

### Préparation aux Concours
- Simuler un oral de concours
- S'entraîner sur des sujets spécifiques
- Recevoir des questions variées

### Révisions
- Tester sa compréhension d'un cours
- Identifier les points faibles
- Pratiquer l'expression orale

### Entraînement Professionnel
- Préparer des présentations
- S'entraîner sur des dossiers
- Simuler des entretiens techniques

## 📝 Notes Techniques

### OpenAI Realtime API
Le module utilise l'API Realtime de OpenAI (gpt-4o-realtime-preview-2024-12-17) pour :
- Communication audio bidirectionnelle
- Transcription en temps réel (Whisper)
- Réponses vocales naturelles

### Sécurité
- RLS (Row Level Security) activé sur Supabase
- Les utilisateurs ne peuvent voir que leurs propres sessions
- Authentification requise pour toutes les opérations

### Performance
- Sessions WebRTC pour faible latence
- Audio worklets pour traitement audio efficace
- Chargement dynamique des composants audio

## 🔮 Améliorations Futures

Idées d'extensions possibles :
- Enregistrement de l'historique des sessions
- Statistiques de performance
- Notes et évaluation du jury
- Export des transcriptions
- Partage de sessions entre utilisateurs
- Simulation de jury multiple (plusieurs examinateurs)

