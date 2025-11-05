-- =============================================
-- Schéma de révision intelligent V2 (colonnes renommées)
-- Basé sur l'algorithme de révision par "pas" sans temps
-- =============================================

-- Supprimer les tables existantes si elles existent (optionnel, décommentez si besoin)
-- DROP TABLE IF EXISTS revision_sessions CASCADE;
-- DROP TABLE IF EXISTS question_cards CASCADE;
-- DROP TABLE IF EXISTS revision_settings CASCADE;

-- Table des cartes individuelles pour la révision
CREATE TABLE IF NOT EXISTS question_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES oral_quizzes(id) ON DELETE CASCADE,
    
    -- Contenu de la question
    question TEXT NOT NULL,
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Métriques de l'algorithme de révision (noms simplifiés)
    level INTEGER NOT NULL DEFAULT 0,          -- Niveau de maîtrise (≥ 0), anciennement L
    gap INTEGER NOT NULL DEFAULT 1,            -- Écart en pas avant prochaine apparition (≥ 1), anciennement g
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
    
    -- Statistiques de la session
    cards_reviewed INTEGER NOT NULL DEFAULT 0,
    cards_remaining INTEGER NOT NULL DEFAULT 0,
    
    -- Historique des réponses dans cette session
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- État de la session
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_question_cards_user_quiz ON question_cards(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_question_cards_due ON question_cards(user_id, steps_until_due);
CREATE INDEX IF NOT EXISTS idx_question_cards_level ON question_cards(level);
CREATE INDEX IF NOT EXISTS idx_revision_sessions_user_quiz ON revision_sessions(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_revision_sessions_status ON revision_sessions(status);

-- RLS (Row Level Security)
ALTER TABLE question_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_sessions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour question_cards
CREATE POLICY "Users can view their own cards" ON question_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cards" ON question_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" ON question_cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" ON question_cards
    FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour revision_settings
CREATE POLICY "Users can view their own settings" ON revision_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" ON revision_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON revision_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON revision_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour revision_sessions
CREATE POLICY "Users can view their own sessions" ON revision_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON revision_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON revision_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON revision_sessions
    FOR DELETE USING (auth.uid() = user_id);
