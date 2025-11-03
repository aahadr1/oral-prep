# 📋 Quick Reference - Modules IA

## 🚀 Installation rapide

```bash
# 1. Installer les dépendances
cd oral-prep
npm install

# 2. Configurer .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
REPLICATE_API_TOKEN=your_token
EOF

# 3. Exécuter le SQL dans Supabase
# → Copier/coller supabase-setup.sql dans SQL Editor

# 4. Démarrer
npm run dev
```

## 🎯 Fonctionnalités principales

| Module | URL | Fonctionnalité |
|--------|-----|----------------|
| Agent IA | `/projets/[id]/agent` | Explications page par page |
| Quiz | `/projets/[id]/quiz` | Génération, bibliothèque, révision |

## ⌨️ Raccourcis clavier

### Agent IA
- `←` : Page précédente
- `→` : Page suivante
- Sélection texte : Active "Expliquer la sélection"

## 📊 Limites

| Action | Limite | Reset |
|--------|--------|-------|
| Analyses vision | 30/jour | Minuit UTC |
| Générations quiz | 10/jour | Minuit UTC |

## 🗂️ Structure des fichiers

```
oral-prep/
├── app/
│   ├── api/replicate/
│   │   ├── vision/route.ts    # API vision
│   │   └── text/route.ts      # API quiz
│   └── (dashboard)/projets/[projectId]/
│       ├── agent/             # Module Agent IA
│       └── quiz/              # Module Quiz
├── components/
│   ├── DocumentViewer.tsx     # Viewer universel
│   ├── AgentSidebar.tsx       # Chat agent
│   ├── QuizBuilder.tsx        # Générateur
│   ├── QuizLibrary.tsx        # Bibliothèque
│   └── QuizReview.tsx         # Révision
├── lib/
│   ├── replicate.ts           # Client Replicate
│   └── doc-extract/           # Extraction docs
└── supabase-setup.sql         # Schema DB
```

## 🔧 Fichiers de configuration

### `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
REPLICATE_API_TOKEN=r8_xxx...
```

### Modèles IA
```typescript
VISION: 'qwen/qwen2-vl-72b-instruct'
TEXT: 'meta/meta-llama-3.1-70b-instruct'
FALLBACK: 'mistralai/mixtral-8x7b-instruct-v0.1'
```

## 🗃️ Tables Supabase

```sql
quizzes           # Métadonnées quiz
quiz_items        # Questions
quiz_reviews      # Historique révision
project_notes     # Notes sauvegardées
api_usage         # Rate limiting
```

## 💡 Conseils rapides

### Agent IA
```typescript
// ✅ Bon
"Explique le théorème de Pythagore présenté sur cette page"

// ❌ Éviter
"C'est quoi ça ?"
```

### Quiz
```typescript
// ✅ Bon
- 10-20 questions
- Documents DOCX > PDF
- Difficulté progressive

// ❌ Éviter
- 50 questions d'un coup
- Images scannées sans OCR
```

## 🐛 Dépannage express

### Erreur token Replicate
```bash
# Vérifier
cat .env.local | grep REPLICATE

# Redémarrer
npm run dev
```

### Limite atteinte
```typescript
// Modifier dans:
// app/api/replicate/vision/route.ts
const limit = 100; // Au lieu de 30

// app/api/replicate/text/route.ts
const limit = 50; // Au lieu de 10
```

### Document ne charge pas
```sql
-- Vérifier RLS
SELECT * FROM storage.objects WHERE bucket_id = 'project-docs';
```

## 📖 Documentation complète

- 📘 **Fonctionnalités** : `AGENT_QUIZ_FEATURES.md`
- 🚀 **Démarrage** : `GETTING_STARTED_AI.md`
- 📊 **Implémentation** : `IMPLEMENTATION_SUMMARY.md`
- 📝 **Général** : `README.md`

## 💰 Coûts estimés

| Usage | Coût/mois |
|-------|-----------|
| Léger (10 appels/j) | ~$0.50 |
| Modéré (30 appels/j) | ~$2.00 |
| Intensif (100 appels/j) | ~$7.00 |

*Prix Replicate indicatifs, vérifier sur replicate.com*

## 🔗 Liens utiles

- [Replicate](https://replicate.com) - API IA
- [Supabase](https://supabase.com) - Backend
- [Next.js](https://nextjs.org) - Framework
- [Tailwind](https://tailwindcss.com) - CSS

## 📞 Support

1. Consulter la console navigateur (F12)
2. Vérifier logs serveur Next.js
3. Consulter Supabase logs
4. Vérifier quota Replicate

---

**Version** : 1.0.0  
**Dernière mise à jour** : Octobre 2025


