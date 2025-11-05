-- Vérifier si la table oral_blanc_sessions existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'oral_blanc_sessions'
) as table_exists;

-- Si la table existe, compter les entrées
SELECT COUNT(*) as session_count 
FROM oral_blanc_sessions;

