-- =====================================================
-- Oral Blanc Schema
-- =====================================================
-- This schema handles oral examination simulation sessions
-- where users are interrogated by a virtual jury
-- =====================================================

-- Create oral_blanc_sessions table
CREATE TABLE IF NOT EXISTS public.oral_blanc_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_oral_blanc_sessions_user_id 
    ON public.oral_blanc_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_oral_blanc_sessions_created_at 
    ON public.oral_blanc_sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.oral_blanc_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own oral blanc sessions" ON public.oral_blanc_sessions;
DROP POLICY IF EXISTS "Users can create their own oral blanc sessions" ON public.oral_blanc_sessions;
DROP POLICY IF EXISTS "Users can update their own oral blanc sessions" ON public.oral_blanc_sessions;
DROP POLICY IF EXISTS "Users can delete their own oral blanc sessions" ON public.oral_blanc_sessions;

-- Create RLS policies
CREATE POLICY "Users can view their own oral blanc sessions"
    ON public.oral_blanc_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own oral blanc sessions"
    ON public.oral_blanc_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own oral blanc sessions"
    ON public.oral_blanc_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own oral blanc sessions"
    ON public.oral_blanc_sessions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_oral_blanc_sessions_updated_at ON public.oral_blanc_sessions;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_oral_blanc_sessions_updated_at
    BEFORE UPDATE ON public.oral_blanc_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.oral_blanc_sessions TO authenticated;
GRANT ALL ON public.oral_blanc_sessions TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.oral_blanc_sessions IS 'Stores oral examination simulation sessions';
COMMENT ON COLUMN public.oral_blanc_sessions.id IS 'Unique identifier for the session';
COMMENT ON COLUMN public.oral_blanc_sessions.user_id IS 'Reference to the user who owns this session';
COMMENT ON COLUMN public.oral_blanc_sessions.title IS 'Title of the oral examination session';
COMMENT ON COLUMN public.oral_blanc_sessions.topic IS 'Topic/material for the oral examination (long text with course content, documents, etc.)';
COMMENT ON COLUMN public.oral_blanc_sessions.created_at IS 'Timestamp when the session was created';
COMMENT ON COLUMN public.oral_blanc_sessions.updated_at IS 'Timestamp when the session was last updated';

