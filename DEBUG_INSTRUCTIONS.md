# 🔧 DEBUG : Résoudre l'Erreur 500

## ❌ Problème Identifié

L'erreur 500 sur `/api/revision/session` vient du fait que la base de données n'a pas les bonnes tables ou colonnes.

## ✅ Solution Rapide

### Étape 1 : Vérifier ce qui existe

Exécutez ce script dans Supabase SQL Editor :

```sql
-- Vérifier si les tables existent
SELECT 
    tablename,
    CASE 
        WHEN tablename IS NOT NULL THEN 'EXISTS ✓' 
        ELSE 'MISSING ✗' 
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('question_cards', 'revision_settings', 'revision_sessions');

-- Vérifier les colonnes de question_cards (si elle existe)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'question_cards'
ORDER BY ordinal_position;
```

### Étape 2 : Installer les Tables

**⚠️ IMPORTANT : Exécutez `supabase-clean-install.sql`**

C'est le moyen le plus sûr de résoudre le problème :

1. Ouvrez Supabase SQL Editor
2. Copiez-collez le contenu de **`supabase-clean-install.sql`**
3. Exécutez le script

Ce script va :
- ✅ Supprimer les tables mal configurées
- ✅ Recréer proprement les 3 tables
- ✅ Ajouter tous les index et politiques RLS
- ✅ Confirmer l'installation avec un message

### Étape 3 : Vérifier l'Installation

Après l'installation, exécutez :

```sql
-- Vérifier que tout est créé
SELECT table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('question_cards', 'revision_settings', 'revision_sessions')
GROUP BY table_name;
```

Vous devriez voir :
- `question_cards` : ~15 colonnes
- `revision_settings` : ~8 colonnes  
- `revision_sessions` : ~8 colonnes

## 📋 Colonnes Attendues

### Table `question_cards`
- id, user_id, quiz_id
- question, criteria
- **"L"** (avec guillemets !), g
- streak, lapses, is_leech
- position, steps_until_due
- created_at, updated_at, last_reviewed_at

### Table `revision_sessions`
- id, user_id, quiz_id
- cards_reviewed, cards_remaining
- responses, status
- created_at, updated_at, completed_at

## 🎯 Test Final

Après l'installation :

1. Rechargez votre application (`npm run dev`)
2. Allez dans "Mes Quiz Sauvegardés"
3. Cliquez sur "Commencer" sur un quiz
4. L'erreur 500 devrait être résolue !

## 💡 Si l'Erreur Persiste

Vérifiez dans la console du navigateur les détails de l'erreur.

Si vous voyez encore une erreur sur une colonne spécifique, exécutez :

```sql
-- Ajouter une colonne manquante (exemple pour "L")
ALTER TABLE question_cards 
ADD COLUMN IF NOT EXISTS "L" INTEGER NOT NULL DEFAULT 0;
```

## 📝 Note Importante

Le problème principal était que l'API essayait d'insérer `current_card_id` qui n'existe pas dans le schéma. J'ai corrigé le code pour ne plus utiliser cette colonne.

Les changements dans le code :
- ✅ Supprimé `current_card_id` de l'insertion
- ✅ Ajouté `status: 'active'` à la création de session
- ✅ Simplifié la mise à jour de session

## 🚀 Prochaine Étape

Une fois les tables installées, le système de révision fonctionnera parfaitement avec :
- Interface split-screen
- Labels de statut sur chaque carte
- Système de révision intelligent
- Raccourcis clavier (1,2,3,4)

**Le script `supabase-clean-install.sql` est votre meilleur ami !**
