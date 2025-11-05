-- =============================================
-- SCRIPT DE DIAGNOSTIC - Vérifier l'état actuel
-- Exécutez ce script AVANT pour voir ce qui existe
-- =============================================

-- 1. Vérifier si la table question_cards existe
SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'question_cards'
) AS table_exists;

-- 2. Si la table existe, lister toutes ses colonnes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'question_cards'
ORDER BY ordinal_position;

-- 3. Compter le nombre de lignes dans la table (si elle existe)
SELECT COUNT(*) as row_count 
FROM question_cards
WHERE EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'question_cards'
);

-- 4. Vérifier les autres tables
SELECT 
    tablename,
    'EXISTS' as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('question_cards', 'revision_settings', 'revision_sessions')
ORDER BY tablename;

-- 5. Si vous avez des données, voir un échantillon
-- Décommentez la ligne suivante si la table existe et contient des données:
-- SELECT * FROM question_cards LIMIT 1;
