import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { 
  selectNextCard, 
  getEligibleCards, 
  calculateRevisionStats,
  DEFAULT_SETTINGS
} from '@/lib/revision-algorithm';
import type { QuestionCard, RevisionSettings } from '@/lib/types';

/**
 * GET /api/revision/cards - Obtient les cartes pour une session de révision
 * Query params:
 * - quiz_id: ID du quiz
 * - action: 'next' | 'eligible' | 'stats'
 * - limit: nombre max de cartes (défaut: 20)
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
    const action = searchParams.get('action') || 'eligible';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!quiz_id) {
      return NextResponse.json({ error: 'Quiz ID required' }, { status: 400 });
    }

    // Récupérer les paramètres utilisateur
    const { data: settingsData } = await supabase
      .from('revision_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    const settings: RevisionSettings = settingsData || DEFAULT_SETTINGS;

    // Récupérer les cartes du quiz
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

    const questionCards: QuestionCard[] = cards.map(card => ({
      ...card,
      criteria: Array.isArray(card.criteria) ? card.criteria : []
    }));

    switch (action) {
      case 'next':
        const nextCard = selectNextCard(questionCards, settings);
        return NextResponse.json({ card: nextCard });

      case 'stats':
        const stats = calculateRevisionStats(questionCards);
        return NextResponse.json({ stats });

      case 'eligible':
      default:
        const eligible = getEligibleCards(questionCards, settings, limit);
        return NextResponse.json({ 
          cards: eligible,
          total_cards: questionCards.length,
          eligible_count: eligible.length 
        });
    }

  } catch (error) {
    console.error('Error in GET /api/revision/cards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/revision/cards - Crée des cartes à partir d'un quiz existant
 * Body: { quiz_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quiz_id } = await request.json();

    if (!quiz_id) {
      return NextResponse.json({ error: 'Quiz ID required' }, { status: 400 });
    }

    // Vérifier si les cartes existent déjà
    const { data: existingCards } = await supabase
      .from('question_cards')
      .select('id')
      .eq('user_id', user.id)
      .eq('quiz_id', quiz_id);

    if (existingCards && existingCards.length > 0) {
      return NextResponse.json({ 
        message: 'Cards already exist for this quiz',
        cards_count: existingCards.length 
      });
    }

    // Récupérer le quiz
    const { data: quiz, error: quizError } = await supabase
      .from('oral_quizzes')
      .select('*')
      .eq('id', quiz_id)
      .eq('user_id', user.id)
      .single();

    if (quizError || !quiz) {
      console.error('Error fetching quiz:', quizError);
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Créer les cartes à partir des questions du quiz
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const cardsToCreate = questions.map((q: any, index: number) => ({
      user_id: user.id,
      quiz_id: quiz_id,
      question: q.question || '',
      criteria: q.criteria || [],
      L: 0,
      g: 1,
      streak: 0,
      lapses: 0,
      is_leech: false,
      position: index,
      steps_until_due: 0
    }));

    const { data: createdCards, error: createError } = await supabase
      .from('question_cards')
      .insert(cardsToCreate)
      .select();

    if (createError) {
      console.error('Error creating cards:', createError);
      return NextResponse.json({ 
        error: 'Failed to create cards',
        details: createError.message 
      }, { status: 500 });
    }

    // Initialiser les paramètres par défaut si nécessaire
    const { data: settings } = await supabase
      .from('revision_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!settings) {
      await supabase
        .from('revision_settings')
        .insert({
          user_id: user.id,
          beta_low: 1.2,
          beta_mid: 2.0,
          beta_high: 3.0,
          leech_threshold: 8,
          new_cards_per_session: 5,
          steps_between_new: 3
        });
    }

    return NextResponse.json({ 
      message: 'Cards created successfully',
      cards_created: createdCards?.length || 0
    });

  } catch (error) {
    console.error('Error in POST /api/revision/cards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
