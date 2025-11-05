import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('[Oral Blanc List] Starting request...');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('[Oral Blanc List] No user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Oral Blanc List] User authenticated:', user.id);

    const supabase = createSupabaseServer();

    console.log('[Oral Blanc List] Querying oral_blanc_sessions table...');
    const { data, error } = await supabase
      .from('oral_blanc_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Oral Blanc List] Supabase error:', error);
      console.error('[Oral Blanc List] Error code:', error.code);
      console.error('[Oral Blanc List] Error message:', error.message);
      console.error('[Oral Blanc List] Error details:', error.details);
      console.error('[Oral Blanc List] Error hint:', error.hint);
      
      return NextResponse.json({ 
        error: 'Failed to fetch sessions',
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    console.log('[Oral Blanc List] Success! Found', data?.length || 0, 'sessions');
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[Oral Blanc List] Unexpected error:', error);
    console.error('[Oral Blanc List] Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

