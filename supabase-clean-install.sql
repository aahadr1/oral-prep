-- =============================================
-- SCRIPT D'INSTALLATION PROPRE - Supprime et recrée tout
-- ⚠️ ATTENTION: Ce script SUPPRIME les tables existantes!
-- =============================================

-- Supprimer les tables existantes (dans le bon ordre à cause des foreign keys)
DROP TABLE IF EXISTS revision_sessions CASCADE;
DROP TABLE IF EXISTS question_cards CASCADE;
DROP TABLE IF EXISTS revision_settings CASCADE;

-- =============================================
-- CRÉER LES TABLES PROPREMENT
-- =============================================

-- 1. Table des cartes de révision
CREATE TABLE question_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES oral_quizzes(id) ON DELETE CASCADE,
    
    -- Contenu
    question TEXT NOT NULL,
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Métriques IMPORTANTES (avec les bons noms)
    "L" INTEGER NOT NULL DEFAULT 0,          -- Niveau (avec guillemets car L est réservé)
    g INTEGER NOT NULL DEFAULT 1,            -- Gap/Écart
    streak INTEGER NOT NULL DEFAULT 0,       -- Réussites consécutives
    lapses INTEGER NOT NULL DEFAULT 0,       -- Échecs
    is_leech BOOLEAN NOT NULL DEFAULT FALSE, -- Problématique
    
    -- Position et timing
    position INTEGER NOT NULL DEFAULT 0,
    steps_until_due INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Table des paramètres
CREATE TABLE revision_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    beta_low DECIMAL(3,2) NOT NULL DEFAULT 1.2,
    beta_mid DECIMAL(3,2) NOT NULL DEFAULT 2.0,
    beta_high DECIMAL(3,2) NOT NULL DEFAULT 3.0,
    leech_threshold INTEGER NOT NULL DEFAULT 8,
    new_cards_per_session INTEGER NOT NULL DEFAULT 5,
    steps_between_new INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Table des sessions
CREATE TABLE revision_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES oral_quizzes(id) ON DELETE CASCADE,
    cards_reviewed INTEGER NOT NULL DEFAULT 0,
    cards_remaining INTEGER NOT NULL DEFAULT 0,
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Créer les index pour optimisation
CREATE INDEX idx_question_cards_user_quiz ON question_cards(user_id, quiz_id);
CREATE INDEX idx_question_cards_due ON question_cards(user_id, steps_until_due);
CREATE INDEX idx_question_cards_level ON question_cards("L");
CREATE INDEX idx_question_cards_leech ON question_cards(is_leech) WHERE is_leech = true;
CREATE INDEX idx_revision_sessions_user_quiz ON revision_sessions(user_id, quiz_id);
CREATE INDEX idx_revision_sessions_active ON revision_sessions(status) WHERE status = 'active';

-- 5. Activer RLS
ALTER TABLE question_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Créer les politiques RLS pour question_cards
CREATE POLICY "Users can view their own cards" ON question_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cards" ON question_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" ON question_cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" ON question_cards
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Créer les politiques RLS pour revision_settings
CREATE POLICY "Users can view their own settings" ON revision_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" ON revision_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON revision_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON revision_settings
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Créer les politiques RLS pour revision_sessions
CREATE POLICY "Users can view their own sessions" ON revision_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON revision_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON revision_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON revision_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Installation terminée avec succès!';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables créées:';
    RAISE NOTICE '  • question_cards (avec colonnes L, g, streak, etc.)';
    RAISE NOTICE '  • revision_settings';
    RAISE NOTICE '  • revision_sessions';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS activé et politiques créées ✓';
    RAISE NOTICE 'Index créés pour optimisation ✓';
    RAISE NOTICE '';
    RAISE NOTICE 'Le système de révision est prêt à être utilisé!';
END $$;
