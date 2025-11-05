import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, topic } = await request.json();

    if (!title || !topic) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Both title and topic are required'
      }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from('oral_blanc_sessions')
      .insert({
        user_id: user.id,
        title,
        topic
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating oral blanc session:', error);
      return NextResponse.json({ 
        error: 'Failed to create session',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

