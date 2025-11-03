import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, description, questions } = body;

    // Validate input
    if (!title || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Title and at least one question are required' },
        { status: 400 }
      );
    }

    // Create oral quiz
    const { data: quiz, error } = await supabase
      .from('oral_quizzes')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        questions
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating oral quiz:', error);
      return NextResponse.json(
        { error: 'Failed to create quiz' },
        { status: 500 }
      );
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error('Error in create oral quiz endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
