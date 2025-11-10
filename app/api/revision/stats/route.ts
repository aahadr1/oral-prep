import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { calculateRevisionStats } from '@/lib/revision-algorithm';
import type { QuestionCard } from '@/lib/types';

/**
 * GET /api/revision/stats - Récupère les statistiques de révision
 * Query params:
 * - quiz_id (optionnel): statistiques pour un quiz specifique
 * - period (optionnel): 'day' | 'week' | 'month' | 'all' (défaut: 'all')
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
    const period = searchParams.get('period') || 'all';

    // Construire la requête des cartes
    let cardsQuery = supabase
      .from('question_cards')
      .select('*')
      .eq('user_id', user.id);

    if (quiz_id) {
      cardsQuery = cardsQuery.eq('quiz_id', quiz_id);
    }

    // Filtrer par période si nécessaire
    if (period !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // Début des temps
      }

      cardsQuery = cardsQuery.gte('last_reviewed_at', startDate.toISOString());
    }

    const { data: cards, error: cardsError } = await cardsQuery;

    if (cardsError) {
      console.error('Error fetching cards:', cardsError);
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
    }

    if (!cards || cards.length === 0) {
      return NextResponse.json({
        message: 'No cards found',
        stats: {
          total_cards: 0,
          new_cards: 0,
          learning_cards: 0,
          mature_cards: 0,
          leech_cards: 0,
          categories: {}
        }
      });
    }

    const questionCards: QuestionCard[] = cards.map(card => ({
      ...card,
      criteria: Array.isArray(card.criteria) ? card.criteria : []
    }));

    // Calculer les statistiques
    const stats = calculateRevisionStats(questionCards);

    // Récupérer les statistiques des sessions
    let sessionsQuery = supabase
      .from('revision_sessions')
      .select('*')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null);

    if (quiz_id) {
      sessionsQuery = sessionsQuery.eq('quiz_id', quiz_id);
    }

    if (period !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      sessionsQuery = sessionsQuery.gte('completed_at', startDate.toISOString());
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.warn('Error fetching sessions:', sessionsError);
    }

    // Calculer les métriques de performance
    let totalReviews = 0;
    let totalCorrect = 0;
    let averageSessionLength = 0;
    let responseDistribution = { again: 0, hard: 0, good: 0, easy: 0 };

    if (sessions && sessions.length > 0) {
      sessions.forEach(session => {
        const responses = Array.isArray(session.responses) ? session.responses : [];
        totalReviews += responses.length;
        
        responses.forEach((response: any) => {
          if (response.response === 'good' || response.response === 'easy') {
            totalCorrect++;
          }
          
          if (responseDistribution[response.response as keyof typeof responseDistribution] !== undefined) {
            responseDistribution[response.response as keyof typeof responseDistribution]++;
          }
        });
      });

      averageSessionLength = sessions.reduce((sum, session) => {
        const responses = Array.isArray(session.responses) ? session.responses : [];
        return sum + responses.length;
      }, 0) / sessions.length;
    }

    const accuracy = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;

    // Ajouter les métriques de performance aux statistiques
    const extendedStats = {
      ...stats,
      performance: {
        total_reviews: totalReviews,
        accuracy: Math.round(accuracy * 100) / 100,
        average_session_length: Math.round(averageSessionLength * 100) / 100,
        response_distribution: responseDistribution,
        sessions_completed: sessions?.length || 0
      },
      period,
      quiz_id
    };

    return NextResponse.json({ stats: extendedStats });

  } catch (error) {
    console.error('Error in GET /api/revision/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}





