# 🚀 Guide de Démarrage Rapide

## Installation en 5 Minutes

### 1. Prérequis
- Node.js 18+ installé
- Un compte Supabase (gratuit)

### 2. Installation

```bash
# Installer les dépendances
npm install
```

### 3. Configuration Supabase

**A. Créer un projet Supabase**
1. Allez sur https://supabase.com
2. Créez un compte et un nouveau projet
3. Attendez ~2 minutes que le projet soit prêt

**B. Configurer la base de données**
1. Dans Supabase, allez dans **SQL Editor**
2. Copiez tout le contenu de `supabase-setup.sql`
3. Collez et cliquez sur **Run**

**C. Récupérer les clés**
1. Allez dans **Settings** → **API**
2. Copiez **Project URL** et **anon public key**

### 4. Variables d'environnement

Créez un fichier `.env.local` à la racine :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_ici
```

### 5. Lancer l'application

```bash
npm run dev
```

Ouvrez http://localhost:3000 🎉

## Premier Test

1. Cliquez sur "Créer un compte"
2. Entrez un email et mot de passe
3. Créez votre premier projet
4. Uploadez un document test
5. Explorez les modules !

## Problèmes ?

### L'authentification ne marche pas
- Vérifiez que le script SQL a bien été exécuté
- Vérifiez vos variables d'environnement dans `.env.local`

### L'upload de fichier échoue
- Vérifiez que le bucket `project-docs` existe dans Supabase Storage
- Maximum 50 Mo par fichier, 10 fichiers par projet

### Erreur RLS (Row Level Security)
- Le script SQL crée automatiquement toutes les politiques nécessaires
- Réexécutez le script si besoin

## Besoin d'aide ?

Consultez :
- `README.md` - Documentation complète
- `DEPLOYMENT.md` - Guide de déploiement détaillé
- Logs Supabase pour déboguer les erreurs de base de données

