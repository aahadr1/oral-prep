# Guide de Déploiement - Oral Prep

## 🔧 Configuration Supabase

### 1. Créer un Projet Supabase

1. Allez sur [supabase.com](https://supabase.com) et créez un compte
2. Cliquez sur "New Project"
3. Choisissez un nom, mot de passe de base de données et une région
4. Attendez que le projet soit créé (environ 2 minutes)

### 2. Configurer la Base de Données

1. Dans votre projet Supabase, allez dans l'onglet **SQL Editor**
2. Cliquez sur "New Query"
3. Copiez tout le contenu du fichier `supabase-setup.sql`
4. Collez-le dans l'éditeur SQL
5. Cliquez sur "Run" pour exécuter le script

Cela créera :
- Les tables `profiles`, `projects`, `project_documents`
- Les politiques RLS (Row Level Security)
- Le bucket de stockage `project-docs`
- Les triggers et fonctions nécessaires

### 3. Récupérer les Clés API

1. Allez dans **Settings** → **API**
2. Copiez les valeurs suivantes :
   - **Project URL** (votre `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public** key (votre `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 4. Configurer l'Authentification

1. Allez dans **Authentication** → **Providers**
2. Assurez-vous que **Email** est activé
3. Dans **Authentication** → **URL Configuration** :
   - Site URL : `http://localhost:3000` (développement)
   - Redirect URLs : Ajoutez `http://localhost:3000/**`

## 💻 Configuration Locale

### 1. Créer le fichier .env.local

À la racine du projet, créez un fichier `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_ici
```

### 2. Installer les Dépendances

```bash
npm install
```

### 3. Lancer en Développement

```bash
npm run dev
```

L'application sera accessible sur http://localhost:3000

## 🚀 Déploiement sur Vercel

### 1. Préparer le Repository

```bash
# Initialiser git (si ce n'est pas déjà fait)
git init
git add .
git commit -m "Initial commit"

# Créer un repo sur GitHub et pusher
git remote add origin https://github.com/votre-username/oral-prep.git
git push -u origin main
```

### 2. Déployer sur Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur "New Project"
3. Importez votre repository GitHub
4. Dans **Environment Variables**, ajoutez :
   - `NEXT_PUBLIC_SUPABASE_URL` : votre URL Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : votre clé anon
5. Cliquez sur "Deploy"

### 3. Configurer l'URL de Production dans Supabase

Une fois déployé, récupérez votre URL Vercel (ex: `https://oral-prep.vercel.app`)

Dans Supabase :
1. Allez dans **Authentication** → **URL Configuration**
2. Modifiez le **Site URL** : `https://votre-app.vercel.app`
3. Ajoutez dans **Redirect URLs** : `https://votre-app.vercel.app/**`

## ✅ Vérifications Post-Déploiement

### Tester l'Inscription

1. Allez sur votre application
2. Cliquez sur "Créer un compte"
3. Entrez un email et mot de passe
4. Vérifiez que vous êtes redirigé vers la page des projets

### Tester la Création de Projet

1. Cliquez sur "Créer un projet"
2. Donnez un nom et uploadez un fichier test
3. Cliquez sur "Terminé"
4. Vérifiez que vous arrivez sur la page du projet

### Vérifier le Stockage

Dans Supabase :
1. Allez dans **Storage**
2. Cliquez sur le bucket `project-docs`
3. Vous devriez voir vos fichiers uploadés dans `users/{user-id}/{project-id}/docs/`

## 🐛 Dépannage

### Erreur d'Authentification

- Vérifiez que les URLs de redirection sont correctes dans Supabase
- Vérifiez que les variables d'environnement sont bien définies
- Vérifiez que le script SQL a bien été exécuté

### Erreur d'Upload de Fichier

- Vérifiez que le bucket `project-docs` existe dans Supabase Storage
- Vérifiez que les politiques de storage ont été créées
- Vérifiez la taille du fichier (max 50 Mo)

### Erreur RLS (Row Level Security)

- Vérifiez que toutes les politiques ont été créées via le script SQL
- Vérifiez que vous êtes bien connecté avec l'utilisateur qui a créé le projet

### Erreur de Limite de Documents

- Vérifiez que le trigger `trg_max_docs` a été créé
- Maximum 10 documents par projet

## 📊 Monitoring

### Supabase Dashboard

Consultez régulièrement votre dashboard Supabase pour :
- Usage de la base de données
- Usage du stockage
- Logs d'authentification
- Requêtes lentes

### Vercel Analytics

Activez Vercel Analytics pour suivre :
- Temps de chargement
- Core Web Vitals
- Erreurs en production

## 🔒 Sécurité

- ✅ Row Level Security (RLS) activé sur toutes les tables
- ✅ Politiques de stockage par utilisateur
- ✅ Validation côté serveur des tailles de fichiers
- ✅ Limite de 10 documents par projet
- ✅ Taille maximale de 50 Mo par fichier

## 📈 Prochaines Étapes

1. Configurer un domaine personnalisé sur Vercel
2. Activer HTTPS (automatique avec Vercel)
3. Configurer les emails personnalisés dans Supabase (optionnel)
4. Mettre en place des backups réguliers
5. Configurer le monitoring des erreurs (Sentry, etc.)

