-- =============================================
-- SCRIPT DE MIGRATION - Correction des colonnes manquantes
-- Ce script vérifie et ajoute les colonnes si elles n'existent pas
-- =============================================

-- 1. D'abord, vérifions si la table question_cards existe
DO $$ 
BEGIN
    -- Si la table n'existe pas, la créer
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'question_cards') THEN
        CREATE TABLE question_cards (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            quiz_id UUID NOT NULL REFERENCES oral_quizzes(id) ON DELETE CASCADE,
            question TEXT NOT NULL,
            criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
            "L" INTEGER NOT NULL DEFAULT 0,
            g INTEGER NOT NULL DEFAULT 1,
            streak INTEGER NOT NULL DEFAULT 0,
            lapses INTEGER NOT NULL DEFAULT 0,
            is_leech BOOLEAN NOT NULL DEFAULT FALSE,
            position INTEGER NOT NULL DEFAULT 0,
            steps_until_due INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            last_reviewed_at TIMESTAMP WITH TIME ZONE
        );
    ELSE
        -- Si la table existe, ajouter les colonnes manquantes
        
        -- Ajouter la colonne L si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'question_cards' 
                      AND column_name = 'L') THEN
            ALTER TABLE question_cards ADD COLUMN "L" INTEGER NOT NULL DEFAULT 0;
        END IF;
        
        -- Ajouter la colonne g si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'question_cards' 
                      AND column_name = 'g') THEN
            ALTER TABLE question_cards ADD COLUMN g INTEGER NOT NULL DEFAULT 1;
        END IF;
        
        -- Ajouter la colonne streak si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'question_cards' 
                      AND column_name = 'streak') THEN
            ALTER TABLE question_cards ADD COLUMN streak INTEGER NOT NULL DEFAULT 0;
        END IF;
        
        -- Ajouter la colonne lapses si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'question_cards' 
                      AND column_name = 'lapses') THEN
            ALTER TABLE question_cards ADD COLUMN lapses INTEGER NOT NULL DEFAULT 0;
        END IF;
        
        -- Ajouter la colonne is_leech si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'question_cards' 
                      AND column_name = 'is_leech') THEN
            ALTER TABLE question_cards ADD COLUMN is_leech BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
        
        -- Ajouter la colonne position si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'question_cards' 
                      AND column_name = 'position') THEN
            ALTER TABLE question_cards ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
        END IF;
        
        -- Ajouter la colonne steps_until_due si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'question_cards' 
                      AND column_name = 'steps_until_due') THEN
            ALTER TABLE question_cards ADD COLUMN steps_until_due INTEGER NOT NULL DEFAULT 0;
        END IF;
        
        -- Ajouter la colonne last_reviewed_at si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'question_cards' 
                      AND column_name = 'last_reviewed_at') THEN
            ALTER TABLE question_cards ADD COLUMN last_reviewed_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        -- Ajouter la colonne updated_at si elle n'existe pas
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'question_cards' 
                      AND column_name = 'updated_at') THEN
            ALTER TABLE question_cards ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());
        END IF;
    END IF;
END $$;

-- 2. Créer la table revision_settings si elle n'existe pas
CREATE TABLE IF NOT EXISTS revision_settings (
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

-- 3. Créer la table revision_sessions si elle n'existe pas
CREATE TABLE IF NOT EXISTS revision_sessions (
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

-- 4. Créer les index s'ils n'existent pas
CREATE INDEX IF NOT EXISTS idx_question_cards_user_quiz ON question_cards(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_question_cards_due ON question_cards(user_id, steps_until_due);
CREATE INDEX IF NOT EXISTS idx_question_cards_level ON question_cards("L");
CREATE INDEX IF NOT EXISTS idx_revision_sessions_user_quiz ON revision_sessions(user_id, quiz_id);

-- 5. Activer RLS
ALTER TABLE question_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Créer les politiques RLS (avec DROP IF EXISTS)
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

-- Politiques pour revision_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON revision_settings;
CREATE POLICY "Users can view their own settings" ON revision_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own settings" ON revision_settings;
CREATE POLICY "Users can create their own settings" ON revision_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON revision_settings;
CREATE POLICY "Users can update their own settings" ON revision_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour revision_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON revision_sessions;
CREATE POLICY "Users can view their own sessions" ON revision_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own sessions" ON revision_sessions;
CREATE POLICY "Users can create their own sessions" ON revision_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON revision_sessions;
CREATE POLICY "Users can update their own sessions" ON revision_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- 7. Vérification finale
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Migration terminée avec succès!';
    RAISE NOTICE 'Tables créées/mises à jour: question_cards, revision_settings, revision_sessions';
    
    -- Afficher les colonnes de question_cards pour vérification
    RAISE NOTICE 'Colonnes de question_cards:';
    FOR r IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'question_cards' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - % (%)', r.column_name, r.data_type;
    END LOOP;
END $$;
