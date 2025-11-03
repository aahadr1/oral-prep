# Oral Prep - Application de Préparation aux Examens Oraux

Une application Next.js moderne pour préparer vos examens oraux en étudiant vos documents PDF et en vous entraînant avec des modules d'apprentissage interactifs.

## 🚀 Fonctionnalités

- **Authentification sécurisée** : Système complet de connexion/inscription avec Supabase
- **Gestion de projets** : Créez et organisez vos projets d'étude
- **Upload de documents** : Importez jusqu'à 10 documents (50 Mo max chacun) par projet
- **Modules d'apprentissage** :
  - ✅ **Apprendre avec l'agent IA** : Analyse page par page avec explications IA (vision)
  - ✅ **Quiz interactifs** : Génération, organisation et révision avec répétition espacée
  - 🚧 Fiches de révision
  - 🚧 Vidéos explicatives
- **Entraînement oral** (à venir) :
  - Tests de connaissances oraux
  - Oraux blancs complets

## 🛠️ Stack Technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : Supabase Auth
- **Stockage** : Supabase Storage
- **Upload** : React Dropzone
- **IA** : Replicate (Qwen2-VL-72B, Llama 3.1 70B, Mixtral 8x7B)
 - **IA** : Replicate (Qwen2-VL-72B, Llama 3.1 70B, Mixtral 8x7B) + OpenAI Realtime (GPT‑4o)
- **Documents** : PDF.js, Mammoth, JSZip

## 📋 Prérequis

- Node.js 18+ et npm
- Un compte Supabase (gratuit)
- Un compte Replicate (gratuit) - Pour les fonctionnalités IA

## 🔧 Installation

1. **Cloner le projet** (si applicable)

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer Supabase**

   a. Créez un projet sur [supabase.com](https://supabase.com)
   
   b. Exécutez le script SQL dans l'éditeur SQL de Supabase (voir `supabase-setup.sql`)
   
   c. Créez un fichier `.env.local` à la racine :
   ```
   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
   ```
   
   Vous trouverez ces valeurs dans :
   Settings → API → Project URL et anon/public key

4. **Configurer l'authentification Supabase**
   - Allez dans Authentication → Settings
   - Activez "Enable email confirmations" (optionnel)
   - Ajoutez `http://localhost:3000/**` dans "Site URL" et "Redirect URLs"

5. **Configurer Replicate (pour les fonctionnalités IA)**

   a. Créez un compte sur [replicate.com](https://replicate.com)
   
   b. Allez dans Settings → API Tokens et créez un nouveau token
   
   c. Ajoutez le token dans `.env.local` :
   ```
   REPLICATE_API_TOKEN=votre_token_replicate
   ```
   
   **Note** : Sans token Replicate, les modules Agent IA et Quiz ne fonctionneront pas.

7. **Activer la Voix Realtime (OpenAI GPT‑4o)**

   a. Créez un compte sur `https://platform.openai.com`

   b. Générez une API key et ajoutez-la à `.env.local` :
   ```
   OPENAI_API_KEY=votre_cle_openai
   ```
   c. Aucun SDK côté client n'est requis : la route `POST /api/openai/realtime/session` fabrique un jeton éphémère et gère la configuration.

6. **Lancer l'application en développement**
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du Projet

```
oral-prep/
├── app/
│   ├── (auth)/              # Pages d'authentification
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/         # Pages du tableau de bord
│   │   └── projets/
│   │       ├── page.tsx     # Liste des projets
│   │       ├── nouveau/     # Création de projet
│   │       └── [projectId]/ # Page d'un projet
│   ├── globals.css
│   └── layout.tsx
├── components/              # Composants réutilisables
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   ├── EmptyState.tsx
│   ├── ProjectCard.tsx
│   ├── ModuleCard.tsx
│   └── Uploader.tsx
├── lib/
│   ├── supabase/           # Configuration Supabase
│   │   ├── client.ts
│   │   └── server.ts
│   └── auth.ts             # Utilitaires d'authentification
└── middleware.ts           # Protection des routes
```

## 🗄️ Base de Données

### Tables

- **profiles** : Profils utilisateurs (optionnel, pour extensions futures)
- **projects** : Projets créés par les utilisateurs
- **project_documents** : Documents associés aux projets

### Règles de Sécurité (RLS)

- Les utilisateurs ne peuvent voir que leurs propres projets
- Les utilisateurs ne peuvent accéder qu'aux documents de leurs projets
- Maximum 10 documents par projet (appliqué via trigger)
- Maximum 50 Mo par document (appliqué via contrainte CHECK)

### Storage

- Bucket `project-docs` : Stockage des documents utilisateurs
- Structure : `users/{userId}/{projectId}/docs/{filename}`

## 🚢 Déploiement sur Vercel

1. Poussez votre code sur GitHub

2. Connectez votre repo sur [vercel.com](https://vercel.com)

3. Ajoutez les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `REPLICATE_API_TOKEN`

4. Dans Supabase, ajoutez l'URL de production dans :
   - Authentication → Settings → Site URL
   - Authentication → Settings → Redirect URLs

5. Déployez !

## 🎨 Design

L'interface suit les principes de design :
- **Minimalisme** : Interface épurée et moderne
- **Clarté** : Navigation intuitive
- **Accessibilité** : Contraste et tailles de police optimisés
- **Réactivité** : Responsive sur tous les écrans

## 🎓 Modules Disponibles

### Agent IA - Apprendre avec l'agent
**Statut** : ✅ Disponible

Analysez vos documents page par page avec l'aide d'un agent IA :
- Support PDF, images, DOCX, PPTX
- Navigation intuitive entre les pages
- Explications contextuelles basées sur vision IA
- Sélection de texte pour questions ciblées
- Sauvegarde des explications comme notes
- Limite : 30 analyses par jour

### Quiz - Apprendre avec des quiz
**Statut** : ✅ Disponible

Générez, organisez et révisez des quiz intelligents :
- **Génération** : QCM, flashcards, questions ouvertes
- **Bibliothèque** : Organisation, recherche, export JSON
- **Révision** : Répétition espacée (algorithme SM-2)
- Difficulté ajustable (facile, moyen, difficile)
- Limite : 10 générations par jour

📖 **Documentation complète** : Voir `AGENT_QUIZ_FEATURES.md`

## 📝 Prochaines Étapes

- [x] Intégration IA pour l'agent conversationnel
- [x] Génération automatique de quiz
- [ ] Système de fiches de révision
- [ ] Génération de vidéos explicatives
- [ ] Simulation d'oral avec enregistrement
- [ ] Analyse de performance et statistiques
- [ ] OCR pour documents scannés
- [ ] Mode hors ligne

## 🤝 Contribution

Ce projet est en développement actif. N'hésitez pas à suggérer des améliorations !

## 📄 Licence

MIT

# oral-prep
# oral-prep
