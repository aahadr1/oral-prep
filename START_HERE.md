# 🚀 Bienvenue dans Oral Prep !

## Votre Application est Prête

Une application complète de préparation aux examens oraux a été créée pour vous.

## 📂 Ce qui a été créé

✅ **Application Next.js 14 complète** avec :
- Authentification email/mot de passe
- Gestion de projets
- Upload de documents (max 10 docs, 50 Mo chacun)
- Interface utilisateur moderne et minimaliste
- Base de données Supabase configurée
- Stockage de fichiers sécurisé

## 🎯 Prochaines Étapes

### 1️⃣ Configuration (15 minutes)

Suivez **SETUP_CHECKLIST.md** étape par étape pour :
- Créer votre projet Supabase
- Configurer la base de données
- Remplir vos variables d'environnement
- Lancer l'application

### 2️⃣ Démarrage Rapide (5 minutes)

Ou si vous préférez un guide plus rapide, suivez **QUICKSTART.md**

### 3️⃣ Comprendre l'Architecture

Lisez **README.md** pour comprendre :
- L'architecture complète
- Les fonctionnalités disponibles
- Comment personnaliser l'app

## 📚 Documentation Disponible

| Document | Utilité |
|----------|---------|
| **SETUP_CHECKLIST.md** | ✅ Checklist de configuration complète |
| **QUICKSTART.md** | 🚀 Guide de démarrage rapide |
| **README.md** | 📖 Documentation principale |
| **DEPLOYMENT.md** | 🌐 Guide de déploiement en production |
| **API.md** | 🔌 Documentation base de données et API |
| **PROJECT_SUMMARY.md** | 📋 Résumé complet du projet |

## ⚡ Démarrage Ultra-Rapide

Si vous avez déjà un projet Supabase :

```bash
# 1. Installer les dépendances
npm install

# 2. Créer .env.local et remplir vos clés Supabase
cp env.example .env.local
# Éditer .env.local avec vos clés

# 3. Exécuter le SQL dans Supabase
# Copier tout le contenu de supabase-setup.sql
# Le coller dans SQL Editor de Supabase

# 4. Lancer l'app
npm run dev
```

Ouvrez http://localhost:3000 🎉

## 🎨 Fonctionnalités Disponibles

### ✅ Actuellement Implémenté

- **Authentification** : Inscription et connexion sécurisées
- **Projets** : Créer, lister, visualiser des projets
- **Documents** : Upload multiple avec drag-n-drop
- **UI/UX** : Interface propre et moderne en français
- **Sécurité** : Row Level Security, validation, limites

### 🔮 Modules Prévus (À Développer)

- **Agent IA** : Conversationnel basé sur vos documents
- **Quiz** : Génération automatique de questions
- **Fiches** : Système de flashcards intelligent
- **Vidéos** : Explications visuelles
- **Oral Blanc** : Simulation d'examen complet

## 🛠️ Stack Technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + Storage)
- **Déploiement** : Vercel (recommandé)

## 📦 Structure du Projet

```
oral-prep/
├── app/                    # Pages et routes
│   ├── (auth)/            # Pages d'authentification
│   └── (dashboard)/       # Pages du dashboard
├── components/            # Composants réutilisables
├── lib/                   # Configuration et utilitaires
│   └── supabase/         # Config Supabase
├── middleware.ts         # Protection des routes
└── supabase-setup.sql   # Script de base de données
```

## 🔑 Variables d'Environnement Requises

Créez `.env.local` à la racine :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

Récupérez ces valeurs dans :
**Supabase Dashboard** → **Settings** → **API**

## ✨ Première Utilisation

1. Lancez `npm run dev`
2. Ouvrez http://localhost:3000
3. Cliquez sur "Créer un compte"
4. Créez votre premier projet
5. Uploadez vos documents d'étude
6. Explorez les modules !

## 🐛 Problèmes Courants

### "Failed to fetch"
→ Vérifiez vos variables d'environnement dans `.env.local`

### "RLS policy violation"
→ Exécutez le script `supabase-setup.sql` dans Supabase

### L'upload ne fonctionne pas
→ Vérifiez que le bucket `project-docs` existe dans Supabase Storage

## 📞 Support

1. Consultez **SETUP_CHECKLIST.md** pour la configuration
2. Vérifiez la console du navigateur (F12) pour les erreurs
3. Vérifiez les logs Supabase Dashboard
4. Relisez la documentation correspondante

## 🚢 Déploiement en Production

Quand vous êtes prêt :

1. Lisez **DEPLOYMENT.md**
2. Poussez votre code sur GitHub
3. Déployez sur Vercel (gratuit)
4. Configurez les URLs dans Supabase Auth
5. C'est en ligne ! 🎉

## 🎯 Objectifs du Projet

Cette application vous permet de :
- 📚 Centraliser vos documents d'étude
- 🤖 Utiliser l'IA pour apprendre (à venir)
- 📝 Vous tester avec des quiz (à venir)
- 🎤 Pratiquer l'oral (à venir)
- 📊 Suivre votre progression (à venir)

## 💡 Conseils

- **Testez d'abord en local** avant de déployer
- **Lisez la documentation** pour comprendre l'architecture
- **Sauvegardez vos clés** Supabase en lieu sûr
- **Ne commitez jamais** le fichier `.env.local`
- **Consultez les logs** en cas de problème

## 🎓 Apprentissage

Si vous voulez comprendre le code :
1. Commencez par `app/layout.tsx` (point d'entrée)
2. Regardez `middleware.ts` (protection des routes)
3. Explorez `app/(dashboard)/projets/page.tsx` (liste des projets)
4. Consultez `lib/supabase/` (configuration backend)

## ✅ Check Final

Avant de commencer :
- [ ] Node.js 18+ installé
- [ ] Compte Supabase créé
- [ ] Documentation parcourue
- [ ] Prêt à configurer !

---

## 🚀 C'est Parti !

**Suivez SETUP_CHECKLIST.md maintenant pour configurer votre application.**

Bon courage avec votre préparation ! 🎓

---

**Version** : 1.0.0  
**Créé** : Octobre 2025  
**Licence** : MIT

