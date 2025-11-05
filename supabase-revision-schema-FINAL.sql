-- =============================================
-- SCRIPT SQL FINAL - Système de Révision Intelligent
-- Version corrigée et testée
-- =============================================

-- IMPORTANT: Ce script crée les tables nécessaires pour le système de révision
-- Exécutez-le dans votre base de données Supabase

-- =============================================
-- 1. TABLE DES CARTES DE RÉVISION
-- =============================================
CREATE TABLE IF NOT EXISTS question_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES oral_quizzes(id) ON DELETE CASCADE,
    
    -- Contenu de la question
    question TEXT NOT NULL,
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Métriques de l'algorithme (NOMS IMPORTANTS : L et g)
    "L" INTEGER NOT NULL DEFAULT 0,              -- Niveau de maîtrise (≥ 0)
    g INTEGER NOT NULL DEFAULT 1,                -- Écart en pas avant prochaine apparition (≥ 1)
    streak INTEGER NOT NULL DEFAULT 0,           -- Nombre de réussites d'affilée
    lapses INTEGER NOT NULL DEFAULT 0,           -- Nombre d'échecs
    is_leech BOOLEAN NOT NULL DEFAULT FALSE,     -- Carte problématique
    
    -- Position et timing
    position INTEGER NOT NULL DEFAULT 0,
    steps_until_due INTEGER NOT NULL DEFAULT 0,  -- Nombre de pas restants avant révision
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Index unique pour éviter les doublons
    UNIQUE(user_id, quiz_id, position)
);

-- =============================================
-- 2. TABLE DES PARAMÈTRES DE RÉVISION
-- =============================================
CREATE TABLE IF NOT EXISTS revision_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Constantes de l'algorithme
    beta_low DECIMAL(3,2) NOT NULL DEFAULT 1.2,    -- Multiplicateur faible (Hard)
    beta_mid DECIMAL(3,2) NOT NULL DEFAULT 2.0,    -- Multiplicateur moyen (Good)
    beta_high DECIMAL(3,2) NOT NULL DEFAULT 3.0,   -- Multiplicateur élevé (Easy)
    
    -- Seuils et limites
    leech_threshold INTEGER NOT NULL DEFAULT 8,              -- Seuil pour marquer comme leech
    new_cards_per_session INTEGER NOT NULL DEFAULT 5,        -- Nouvelles cartes par session
    steps_between_new INTEGER NOT NULL DEFAULT 3,            -- Pas entre nouvelles cartes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- 3. TABLE DES SESSIONS DE RÉVISION
-- =============================================
CREATE TABLE IF NOT EXISTS revision_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES oral_quizzes(id) ON DELETE CASCADE,
    
    -- Statistiques de la session
    cards_reviewed INTEGER NOT NULL DEFAULT 0,
    cards_remaining INTEGER NOT NULL DEFAULT 0,
    
    -- Historique détaillé des réponses
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Format: [{card_id, response, timestamp, old_L, new_L, old_g, new_g}]
    
    -- État de la session
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 4. INDEX POUR OPTIMISATION
-- =============================================
CREATE INDEX IF NOT EXISTS idx_question_cards_user_quiz ON question_cards(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_question_cards_due ON question_cards(user_id, steps_until_due);
CREATE INDEX IF NOT EXISTS idx_question_cards_level ON question_cards("L");
CREATE INDEX IF NOT EXISTS idx_question_cards_leech ON question_cards(is_leech) WHERE is_leech = true;
CREATE INDEX IF NOT EXISTS idx_revision_sessions_user_quiz ON revision_sessions(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_revision_sessions_status ON revision_sessions(status) WHERE status = 'active';

-- =============================================
-- 5. SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- =============================================

-- Activer RLS sur toutes les tables
ALTER TABLE question_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. POLITIQUES DE SÉCURITÉ - question_cards
-- =============================================
DROP POLICY IF EXISTS "Users can view their own cards" ON question_cards;
CREATE POLICY "Users can view their own cards" ON question_cards
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own cards" ON question_cards;
CREATE POLICY "Users can create their own cards" ON question_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cards" ON question_cards;
CREATE POLICY "Users can update their own cards" ON question_cards
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own cards" ON question_cards;
CREATE POLICY "Users can delete their own cards" ON question_cards
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 7. POLITIQUES DE SÉCURITÉ - revision_settings
-- =============================================
DROP POLICY IF EXISTS "Users can view their own settings" ON revision_settings;
CREATE POLICY "Users can view their own settings" ON revision_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own settings" ON revision_settings;
CREATE POLICY "Users can create their own settings" ON revision_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON revision_settings;
CREATE POLICY "Users can update their own settings" ON revision_settings
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own settings" ON revision_settings;
CREATE POLICY "Users can delete their own settings" ON revision_settings
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 8. POLITIQUES DE SÉCURITÉ - revision_sessions
-- =============================================
DROP POLICY IF EXISTS "Users can view their own sessions" ON revision_sessions;
CREATE POLICY "Users can view their own sessions" ON revision_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own sessions" ON revision_sessions;
CREATE POLICY "Users can create their own sessions" ON revision_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON revision_sessions;
CREATE POLICY "Users can update their own sessions" ON revision_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON revision_sessions;
CREATE POLICY "Users can delete their own sessions" ON revision_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 9. TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- =============================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_question_cards_updated_at ON question_cards;
CREATE TRIGGER update_question_cards_updated_at
    BEFORE UPDATE ON question_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_revision_settings_updated_at ON revision_settings;
CREATE TRIGGER update_revision_settings_updated_at
    BEFORE UPDATE ON revision_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_revision_sessions_updated_at ON revision_sessions;
CREATE TRIGGER update_revision_sessions_updated_at
    BEFORE UPDATE ON revision_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 10. FONCTIONS UTILITAIRES (OPTIONNELLES)
-- =============================================

-- Fonction pour obtenir les statistiques d'un quiz
CREATE OR REPLACE FUNCTION get_quiz_revision_stats(p_user_id UUID, p_quiz_id UUID)
RETURNS TABLE(
    total_cards INTEGER,
    new_cards INTEGER,
    learning_cards INTEGER,
    mature_cards INTEGER,
    leech_cards INTEGER,
    avg_level NUMERIC,
    avg_streak NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_cards,
        COUNT(*) FILTER (WHERE "L" = 0 AND streak = 0)::INTEGER as new_cards,
        COUNT(*) FILTER (WHERE "L" > 0 AND "L" < 5)::INTEGER as learning_cards,
        COUNT(*) FILTER (WHERE "L" >= 5)::INTEGER as mature_cards,
        COUNT(*) FILTER (WHERE is_leech = true)::INTEGER as leech_cards,
        ROUND(AVG("L"), 2) as avg_level,
        ROUND(AVG(streak), 2) as avg_streak
    FROM question_cards
    WHERE user_id = p_user_id AND quiz_id = p_quiz_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 11. DONNÉES DE TEST (OPTIONNEL)
-- =============================================
-- Si vous voulez insérer des paramètres par défaut pour un utilisateur test
-- Décommentez et adaptez avec votre user_id :

-- INSERT INTO revision_settings (user_id) 
-- VALUES ('votre-user-id-ici')
-- ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- FIN DU SCRIPT
-- =============================================

-- Pour vérifier que tout est créé correctement :
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('question_cards', 'revision_settings', 'revision_sessions');
