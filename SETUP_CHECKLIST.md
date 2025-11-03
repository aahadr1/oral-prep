# ✅ Checklist de Configuration - Oral Prep

Suivez cette checklist étape par étape pour configurer l'application.

## 📋 Prérequis

- [ ] Node.js 18+ installé
- [ ] npm ou yarn installé
- [ ] Compte Supabase créé (gratuit sur supabase.com)
- [ ] Éditeur de code (VS Code recommandé)

## 🔧 Étape 1 : Installation des Dépendances

```bash
cd oral-prep
npm install
```

- [ ] Dépendances installées sans erreur
- [ ] Dossier `node_modules/` créé

## 🗄️ Étape 2 : Configuration Supabase

### 2.1 Créer le Projet Supabase

- [ ] Aller sur https://supabase.com
- [ ] Cliquer sur "New Project"
- [ ] Choisir un nom de projet
- [ ] Choisir un mot de passe de base de données (notez-le!)
- [ ] Sélectionner une région proche de vous
- [ ] Attendre ~2 minutes que le projet soit créé

### 2.2 Exécuter le Script SQL

- [ ] Dans Supabase, aller dans l'onglet **SQL Editor**
- [ ] Cliquer sur "+ New query"
- [ ] Ouvrir le fichier `supabase-setup.sql` de ce projet
- [ ] Copier tout son contenu
- [ ] Coller dans l'éditeur SQL Supabase
- [ ] Cliquer sur **Run** (ou Ctrl/Cmd + Enter)
- [ ] Vérifier qu'aucune erreur n'apparaît

### 2.3 Vérifier les Tables

- [ ] Aller dans **Table Editor**
- [ ] Vérifier que ces tables existent :
  - [ ] `profiles`
  - [ ] `projects`
  - [ ] `project_documents`

### 2.4 Vérifier le Storage

- [ ] Aller dans **Storage**
- [ ] Vérifier que le bucket `project-docs` existe
- [ ] Vérifier qu'il est marqué comme "Private"

### 2.5 Récupérer les Clés API

- [ ] Aller dans **Settings** → **API**
- [ ] Copier **Project URL** (format : https://xxx.supabase.co)
- [ ] Copier **anon public** key (commence par eyJ...)
- [ ] ⚠️ NE PAS copier la "service_role" key

### 2.6 Configurer l'Authentification

- [ ] Aller dans **Authentication** → **Providers**
- [ ] Vérifier que **Email** est activé (✓)
- [ ] Aller dans **Authentication** → **URL Configuration**
- [ ] Dans **Site URL**, mettre : `http://localhost:3000`
- [ ] Dans **Redirect URLs**, ajouter : `http://localhost:3000/**`
- [ ] Cliquer sur **Save**

## 🔐 Étape 3 : Variables d'Environnement

- [ ] À la racine du projet, créer un fichier nommé `.env.local`
- [ ] Copier le contenu de `env.example`
- [ ] Remplacer les valeurs :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...VOTRE_CLE_ANON_ICI
```

- [ ] Sauvegarder le fichier
- [ ] ⚠️ Ne JAMAIS commiter ce fichier (il est déjà dans .gitignore)

## 🚀 Étape 4 : Lancer l'Application

```bash
npm run dev
```

- [ ] Le serveur démarre sans erreur
- [ ] Message affiché : "Ready on http://localhost:3000"
- [ ] Ouvrir http://localhost:3000 dans le navigateur

## ✨ Étape 5 : Premier Test

### 5.1 Test d'Inscription

- [ ] Cliquer sur "Créer un compte"
- [ ] Entrer un email valide
- [ ] Entrer un mot de passe (min 6 caractères)
- [ ] Confirmer le mot de passe
- [ ] Cliquer sur "Créer un compte"
- [ ] Vérifier la redirection vers `/projets`

### 5.2 Vérifier dans Supabase

- [ ] Dans Supabase, aller dans **Authentication** → **Users**
- [ ] Vérifier que votre utilisateur apparaît
- [ ] Copier l'UUID de l'utilisateur

### 5.3 Test de Création de Projet

- [ ] Cliquer sur "Créer un projet"
- [ ] Entrer un nom : "Projet de test"
- [ ] (Optionnel) Glisser-déposer un fichier PDF de test
- [ ] Cliquer sur "Terminé"
- [ ] Vérifier la redirection vers la page du projet

### 5.4 Vérifier les Données

Dans Supabase **Table Editor** :

- [ ] Aller dans `projects`
- [ ] Vérifier qu'une ligne apparaît avec votre projet
- [ ] Vérifier que `owner_id` correspond à votre UUID

Si vous avez uploadé un fichier :

- [ ] Aller dans `project_documents`
- [ ] Vérifier qu'une ligne apparaît pour votre document
- [ ] Aller dans **Storage** → `project-docs`
- [ ] Naviguer dans `users/{votre-uuid}/{project-id}/docs/`
- [ ] Vérifier que votre fichier est là

### 5.5 Test de Déconnexion

- [ ] Cliquer sur votre avatar (en haut à droite)
- [ ] Cliquer sur "Se déconnecter"
- [ ] Vérifier la redirection vers `/auth/login`

### 5.6 Test de Reconnexion

- [ ] Entrer votre email et mot de passe
- [ ] Cliquer sur "Se connecter"
- [ ] Vérifier que vous voyez votre projet créé

## 🐛 Dépannage

### Erreur : "Failed to fetch"

- [ ] Vérifier que Supabase URL et clé sont corrects dans `.env.local`
- [ ] Vérifier qu'il n'y a pas d'espaces avant/après les valeurs
- [ ] Relancer `npm run dev` après modification de `.env.local`

### Erreur : "Row Level Security policy violation"

- [ ] Vérifier que le script SQL a bien été exécuté
- [ ] Vérifier dans **Authentication** → **Policies** que les politiques existent
- [ ] Réexécuter le script SQL si nécessaire

### Erreur d'upload : "Storage error"

- [ ] Vérifier que le bucket `project-docs` existe
- [ ] Vérifier les politiques Storage dans Supabase
- [ ] Vérifier que le fichier fait moins de 50 Mo

### Erreur : "Cannot add more than 10 documents"

- [ ] C'est normal ! Limite à 10 documents par projet
- [ ] Créer un nouveau projet pour tester

### Aucune erreur mais rien ne s'affiche

- [ ] Ouvrir la console du navigateur (F12)
- [ ] Vérifier s'il y a des erreurs JavaScript
- [ ] Vérifier les logs du serveur dans le terminal

## 🎉 Étape 6 : Configuration Terminée !

Si tous les tests passent :

- ✅ L'application est opérationnelle
- ✅ Vous pouvez commencer à l'utiliser
- ✅ Vous pouvez passer au déploiement (voir DEPLOYMENT.md)

## 📚 Prochaines Étapes

1. [ ] Lire le README.md pour comprendre l'architecture
2. [ ] Consulter DEPLOYMENT.md pour déployer en production
3. [ ] Consulter API.md pour comprendre la structure de données
4. [ ] Commencer à développer les modules d'IA

## 🆘 Besoin d'Aide ?

Si quelque chose ne fonctionne pas :

1. Vérifiez cette checklist point par point
2. Consultez les logs dans :
   - Terminal (serveur Next.js)
   - Console navigateur (F12)
   - Supabase Dashboard → Logs
3. Vérifiez que toutes les variables d'environnement sont correctes
4. Essayez de supprimer `node_modules/` et réinstaller : `rm -rf node_modules && npm install`

## ⚠️ Points d'Attention

- ⚠️ Ne JAMAIS commiter `.env.local`
- ⚠️ Ne JAMAIS exposer la clé `service_role` de Supabase
- ⚠️ Toujours utiliser `anon` key côté client
- ⚠️ Redémarrer `npm run dev` après changement de `.env.local`
- ⚠️ En production, configurer les URLs dans Supabase Auth

---

**Date de dernière mise à jour** : Octobre 2025

**Version de l'application** : 1.0.0

