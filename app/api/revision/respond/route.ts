import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { 
  updateCardMetrics,
  decrementSteps,
  DEFAULT_SETTINGS
} from '@/lib/revision-algorithm';
import type { QuestionCard, RevisionResponse, RevisionSettings } from '@/lib/types';

/**
 * POST /api/revision/respond - Met à jour une carte après une réponse utilisateur
 * Body: { 
 *   card_id: string, 
 *   response: 'again' | 'hard' | 'good' | 'easy',
 *   session_id?: string 
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { card_id, response, session_id } = await request.json();

    if (!card_id || !response) {
      return NextResponse.json({ 
        error: 'Card ID and response required' 
      }, { status: 400 });
    }

    if (!['again', 'hard', 'good', 'easy'].includes(response)) {
      return NextResponse.json({ 
        error: 'Invalid response. Must be: again, hard, good, or easy' 
      }, { status: 400 });
    }

    // Récupérer les paramètres utilisateur
    const { data: settingsData } = await supabase
      .from('revision_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    const settings: RevisionSettings = settingsData || DEFAULT_SETTINGS;

    // Récupérer la carte actuelle
    const { data: cardData, error: cardError } = await supabase
      .from('question_cards')
      .select('*')
      .eq('id', card_id)
      .eq('user_id', user.id)
      .single();

    if (cardError || !cardData) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const currentCard: QuestionCard = {
      ...cardData,
      criteria: Array.isArray(cardData.criteria) ? cardData.criteria : []
    };

    // Appliquer l'algorithme de révision
    const updatedCard = updateCardMetrics(currentCard, response as RevisionResponse, settings);

    // Mettre à jour la carte dans la base de données
    const { error: updateError } = await supabase
      .from('question_cards')
      .update({
        L: updatedCard.L,
        g: updatedCard.g,
        streak: updatedCard.streak,
        lapses: updatedCard.lapses,
        is_leech: updatedCard.is_leech,
        steps_until_due: updatedCard.steps_until_due,
        last_reviewed_at: updatedCard.last_reviewed_at,
        updated_at: updatedCard.updated_at
      })
      .eq('id', card_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating card:', updateError);
      return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
    }

    // Décrémenter les steps_until_due des autres cartes du même quiz
    const { data: allCards } = await supabase
      .from('question_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_id', updatedCard.quiz_id)
      .neq('id', card_id);

    if (allCards && allCards.length > 0) {
      const otherCards: QuestionCard[] = allCards.map(card => ({
        ...card,
        criteria: Array.isArray(card.criteria) ? card.criteria : []
      }));

      const decrementedCards = decrementSteps(otherCards, card_id);
      
      // Mettre à jour les autres cartes par batch
      const updates = decrementedCards.map(card => ({
        id: card.id,
        steps_until_due: card.steps_until_due
      }));

      for (const update of updates) {
        await supabase
          .from('question_cards')
          .update({ steps_until_due: update.steps_until_due })
          .eq('id', update.id)
          .eq('user_id', user.id);
      }
    }

    // Enregistrer la réponse dans la session si fournie
    if (session_id) {
      const responseRecord = {
        card_id,
        question: currentCard.question,
        response,
        previous_L: currentCard.L,
        new_L: updatedCard.L,
        previous_g: currentCard.g,
        new_g: updatedCard.g,
        timestamp: new Date().toISOString()
      };

      // Récupérer la session actuelle
      const { data: sessionData } = await supabase
        .from('revision_sessions')
        .select('responses, cards_reviewed')
        .eq('id', session_id)
        .eq('user_id', user.id)
        .single();

      if (sessionData) {
        const existingResponses = Array.isArray(sessionData.responses) ? sessionData.responses : [];
        const newResponses = [...existingResponses, responseRecord];

        // Mettre à jour la session
        await supabase
          .from('revision_sessions')
          .update({
            responses: newResponses,
            cards_reviewed: (sessionData.cards_reviewed || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id)
          .eq('user_id', user.id);
      }
    }

    return NextResponse.json({
      message: 'Card updated successfully',
      card: updatedCard,
      metrics: {
        level_change: updatedCard.L - currentCard.L,
        gap_change: updatedCard.g - currentCard.g,
        is_new_leech: updatedCard.is_leech && !currentCard.is_leech
      }
    });

  } catch (error) {
    console.error('Error in POST /api/revision/respond:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}





