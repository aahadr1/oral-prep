-- Create oral_quizzes table
CREATE TABLE IF NOT EXISTS oral_quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create oral_quiz_sessions table for tracking quiz attempts
CREATE TABLE IF NOT EXISTS oral_quiz_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES oral_quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_oral_quizzes_user_id ON oral_quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_oral_quiz_sessions_quiz_id ON oral_quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_oral_quiz_sessions_user_id ON oral_quiz_sessions(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE oral_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oral_quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for oral_quizzes: Users can only see and manage their own quizzes
CREATE POLICY "Users can view their own oral quizzes" ON oral_quizzes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own oral quizzes" ON oral_quizzes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own oral quizzes" ON oral_quizzes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own oral quizzes" ON oral_quizzes
    FOR DELETE USING (auth.uid() = user_id);

-- Policy for oral_quiz_sessions: Users can only see and manage their own sessions
CREATE POLICY "Users can view their own quiz sessions" ON oral_quiz_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz sessions" ON oral_quiz_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz sessions" ON oral_quiz_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_oral_quizzes_updated_at BEFORE UPDATE ON oral_quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Example of the JSONB structure for questions field:
-- [
--   {
--     "question": "What is React?",
--     "criteria": ["JavaScript library", "UI components", "Virtual DOM"]
--   },
--   {
--     "question": "Explain useState hook",
--     "criteria": ["State management", "Functional components", "Re-rendering"]
--   }
-- ]

-- Example of the JSONB structure for responses field in sessions:
-- [
--   {
--     "question": "What is React?",
--     "user_response": "React is a JavaScript library for building user interfaces...",
--     "agent_feedback": "Good answer! You covered the main points..."
--   }
-- ]
