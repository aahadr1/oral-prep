-- =============================================
-- Schéma de révision intelligent (système Anki-like)
-- Basé sur l'algorithme de révision par "pas" sans temps
-- =============================================

-- Table des cartes individuelles pour la révision
CREATE TABLE IF NOT EXISTS question_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES oral_quizzes(id) ON DELETE CASCADE,
    
    -- Contenu de la question
    question TEXT NOT NULL,
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Métriques de l'algorithme de révision
    L INTEGER NOT NULL DEFAULT 0,              -- Niveau de maîtrise (≥ 0)
    g INTEGER NOT NULL DEFAULT 1,              -- Écart en pas avant prochaine apparition (≥ 1)
    streak INTEGER NOT NULL DEFAULT 0,         -- Nombre de réussites d'affilée
    lapses INTEGER NOT NULL DEFAULT 0,         -- Nombre d'échecs
    is_leech BOOLEAN NOT NULL DEFAULT FALSE,   -- Carte problématique
    
    -- Position dans la file de révision
    position INTEGER NOT NULL DEFAULT 0,
    steps_until_due INTEGER NOT NULL DEFAULT 0,  -- Nombre de pas restants avant révision
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Table des paramètres de révision par utilisateur
CREATE TABLE IF NOT EXISTS revision_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Constantes de l'algorithme
    beta_low DECIMAL(3,2) NOT NULL DEFAULT 1.2,    -- Multiplicateur faible
    beta_mid DECIMAL(3,2) NOT NULL DEFAULT 2.0,    -- Multiplicateur moyen
    beta_high DECIMAL(3,2) NOT NULL DEFAULT 3.0,   -- Multiplicateur élevé
    
    -- Seuils et limites
    leech_threshold INTEGER NOT NULL DEFAULT 8,              -- Seuil pour marquer comme leech
    new_cards_per_session INTEGER NOT NULL DEFAULT 5,        -- Nouvelles cartes par session
    steps_between_new INTEGER NOT NULL DEFAULT 3,            -- Pas entre nouvelles cartes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Table des sessions de révision
CREATE TABLE IF NOT EXISTS revision_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES oral_quizzes(id) ON DELETE CASCADE,
    
    -- État de la session
    cards_reviewed INTEGER NOT NULL DEFAULT 0,
    cards_remaining INTEGER NOT NULL DEFAULT 0,
    current_card_id UUID REFERENCES question_cards(id) ON DELETE SET NULL,
    
    -- Historique des réponses
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- INDEX pour optimiser les performances
-- =============================================

CREATE INDEX IF NOT EXISTS idx_question_cards_user_id ON question_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_question_cards_quiz_id ON question_cards(quiz_id);
CREATE INDEX IF NOT EXISTS idx_question_cards_due ON question_cards(user_id, steps_until_due, position);
CREATE INDEX IF NOT EXISTS idx_question_cards_level ON question_cards(user_id, L);
CREATE INDEX IF NOT EXISTS idx_question_cards_leech ON question_cards(user_id, is_leech);

CREATE INDEX IF NOT EXISTS idx_revision_sessions_user ON revision_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_revision_sessions_quiz ON revision_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_revision_sessions_active ON revision_sessions(user_id, completed_at) WHERE completed_at IS NULL;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE question_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_sessions ENABLE ROW LEVEL SECURITY;

-- Policies pour question_cards
CREATE POLICY "Users can view their own question cards" ON question_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own question cards" ON question_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own question cards" ON question_cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own question cards" ON question_cards
    FOR DELETE USING (auth.uid() = user_id);

-- Policies pour revision_settings
CREATE POLICY "Users can view their own revision settings" ON revision_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revision settings" ON revision_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revision settings" ON revision_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies pour revision_sessions
CREATE POLICY "Users can view their own revision sessions" ON revision_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revision sessions" ON revision_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revision sessions" ON revision_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS pour mise à jour automatique
-- =============================================

-- Trigger pour question_cards
CREATE TRIGGER update_question_cards_updated_at 
    BEFORE UPDATE ON question_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour revision_settings
CREATE TRIGGER update_revision_settings_updated_at 
    BEFORE UPDATE ON revision_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour revision_sessions
CREATE TRIGGER update_revision_sessions_updated_at 
    BEFORE UPDATE ON revision_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FONCTIONS utilitaires
-- =============================================

-- Fonction pour initialiser les paramètres par défaut d'un utilisateur
CREATE OR REPLACE FUNCTION init_default_revision_settings(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO revision_settings (user_id) 
    VALUES (user_uuid)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer des cartes à partir d'un quiz existant
CREATE OR REPLACE FUNCTION create_cards_from_quiz(
    p_user_id UUID, 
    p_quiz_id UUID
) RETURNS INTEGER AS $$
DECLARE
    quiz_record RECORD;
    question_item JSONB;
    cards_created INTEGER := 0;
BEGIN
    -- Récupérer le quiz
    SELECT INTO quiz_record * FROM oral_quizzes 
    WHERE id = p_quiz_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quiz not found or access denied';
    END IF;
    
    -- Créer une carte pour chaque question
    FOR question_item IN SELECT * FROM jsonb_array_elements(quiz_record.questions)
    LOOP
        INSERT INTO question_cards (
            user_id, 
            quiz_id, 
            question, 
            criteria,
            position
        ) VALUES (
            p_user_id,
            p_quiz_id,
            question_item->>'question',
            question_item->'criteria',
            cards_created
        );
        
        cards_created := cards_created + 1;
    END LOOP;
    
    RETURN cards_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exemple d'utilisation :
-- SELECT create_cards_from_quiz('user-uuid', 'quiz-uuid');

-- Structure JSONB des critères : ["critère 1", "critère 2", "critère 3"]
-- Structure JSONB des réponses dans revision_sessions :
-- [
--   {
--     "card_id": "uuid",
--     "question": "Question text",
--     "response": "again|hard|good|easy",
--     "previous_L": 0,
--     "new_L": 1,
--     "previous_g": 1,
--     "new_g": 2,
--     "timestamp": "2024-11-04T22:30:00Z"
--   }
-- ]





