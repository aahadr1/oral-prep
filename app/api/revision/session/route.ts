import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getEligibleCards, DEFAULT_SETTINGS } from '@/lib/revision-algorithm';
import type { RevisionSettings } from '@/lib/types';

/**
 * POST /api/revision/session - Crée une nouvelle session de révision
 * Body: { quiz_id: string, max_cards?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quiz_id, max_cards = 20 } = await request.json();

    if (!quiz_id) {
      return NextResponse.json({ error: 'Quiz ID required' }, { status: 400 });
    }

    // Fermer toute session active existante pour ce quiz
    await supabase
      .from('revision_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('quiz_id', quiz_id)
      .is('completed_at', null);

    // Récupérer les paramètres utilisateur
    const { data: settingsData } = await supabase
      .from('revision_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    const settings: RevisionSettings = settingsData || DEFAULT_SETTINGS;

    // Récupérer les cartes éligibles
    const { data: cards, error: cardsError } = await supabase
      .from('question_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_id', quiz_id)
      .order('position');

    if (cardsError) {
      console.error('Error fetching cards:', cardsError);
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
    }

    if (!cards || cards.length === 0) {
      return NextResponse.json({ 
        error: 'No cards found. Create cards first.',
        suggestion: 'Use POST /api/revision/cards to create cards from quiz'
      }, { status: 404 });
    }

    const questionCards = cards.map(card => ({
      ...card,
      criteria: Array.isArray(card.criteria) ? card.criteria : []
    }));

    const eligibleCards = getEligibleCards(questionCards, settings, max_cards);

    if (eligibleCards.length === 0) {
      return NextResponse.json({
        message: 'No cards due for revision',
        total_cards: questionCards.length,
        next_due: questionCards
          .filter(card => card.steps_until_due > 0)
          .sort((a, b) => a.steps_until_due - b.steps_until_due)[0]?.steps_until_due || 0
      });
    }

    // Créer la session
    const { data: session, error: sessionError } = await supabase
      .from('revision_sessions')
      .insert({
        user_id: user.id,
        quiz_id,
        cards_remaining: eligibleCards.length,
        current_card_id: eligibleCards[0]?.id || null
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({
      session_id: session.id,
      cards_count: eligibleCards.length,
      first_card: eligibleCards[0],
      settings
    });

  } catch (error) {
    console.error('Error in POST /api/revision/session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/revision/session - Récupère les sessions actives
 * Query params: quiz_id (optionnel)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quiz_id = searchParams.get('quiz_id');

    let query = supabase
      .from('revision_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('completed_at', null)
      .order('created_at', { ascending: false });

    if (quiz_id) {
      query = query.eq('quiz_id', quiz_id);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Error in GET /api/revision/session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/revision/session - Met à jour ou termine une session
 * Body: { session_id: string, action: 'complete' | 'update', current_card_id?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, action, current_card_id } = await request.json();

    if (!session_id || !action) {
      return NextResponse.json({ 
        error: 'Session ID and action required' 
      }, { status: 400 });
    }

    let updateData: any = { updated_at: new Date().toISOString() };

    if (action === 'complete') {
      updateData.completed_at = new Date().toISOString();
      updateData.current_card_id = null;
    } else if (action === 'update' && current_card_id) {
      updateData.current_card_id = current_card_id;
    }

    const { error: updateError } = await supabase
      .from('revision_sessions')
      .update(updateData)
      .eq('id', session_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Session updated successfully' });

  } catch (error) {
    console.error('Error in PATCH /api/revision/session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
