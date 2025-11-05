'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ContinuousRevisionSession from './ContinuousRevisionSession';
import SessionSummary from './SessionSummary';
import type { QuestionCard, RevisionResponse } from '@/lib/types';

interface UltimateRevisionManagerProps {
  quizId: string;
  userId: string;
  onExit: () => void;
}

type SessionPhase = 'loading' | 'session' | 'summary';

interface SessionData {
  sessionId: string;
  cards: QuestionCard[];
  responses: Array<{
    cardId: string;
    response: RevisionResponse;
    timestamp: number;
  }>;
  startTime: number;
}

export default function UltimateRevisionManager({
  quizId,
  userId,
  onExit
}: UltimateRevisionManagerProps) {
  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    initializeSession();
  }, [quizId]);

  const initializeSession = async () => {
    try {
      setPhase('loading');
      setError(null);

      // Créer ou récupérer les cartes
      let cardsData: QuestionCard[] = [];
      
      // Essayer de récupérer les cartes existantes
      const cardsResponse = await fetch(`/api/revision/cards?quiz_id=${quizId}&action=eligible&limit=500`);
      
      if (cardsResponse.ok) {
        const { cards } = await cardsResponse.json();
        cardsData = cards || [];
      }

      // Si aucune carte, les créer
      if (cardsData.length === 0) {
        const createResponse = await fetch('/api/revision/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz_id: quizId })
        });

        if (!createResponse.ok) {
          throw new Error('Impossible de créer les cartes de révision');
        }

        // Recharger les cartes
        const newCardsResponse = await fetch(`/api/revision/cards?quiz_id=${quizId}&action=eligible&limit=500`);
        const { cards: newCards } = await newCardsResponse.json();
        cardsData = newCards || [];
      }

      if (cardsData.length === 0) {
        throw new Error('Aucune carte disponible pour la révision');
      }

      // Créer une session
      const sessionResponse = await fetch('/api/revision/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId, max_cards: 500 })
      });

      if (!sessionResponse.ok) {
        throw new Error('Impossible de créer la session');
      }

      const { session_id } = await sessionResponse.json();

      setSession({
        sessionId: session_id,
        cards: cardsData,
        responses: [],
        startTime: Date.now()
      });

      setPhase('session');

    } catch (err) {
      console.error('Error initializing session:', err);
      setError(err instanceof Error ? err.message : 'Erreur d\'initialisation');
    }
  };

  const handleCardResponse = async (cardId: string, response: RevisionResponse) => {
    if (!session) return;
    
    try {
      // Enregistrer la réponse
      const responseResult = await fetch('/api/revision/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: cardId,
          response,
          session_id: session.sessionId
        })
      });

      if (!responseResult.ok) {
        throw new Error('Impossible d\'enregistrer la réponse');
      }

      // Mettre à jour le streak
      if (response === 'again') {
        setCurrentStreak(0);
      } else {
        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
      }

      // Enregistrer la réponse dans la session
      const newResponses = [
        ...session.responses,
        {
          cardId,
          response,
          timestamp: Date.now()
        }
      ];

      setSession({
        ...session,
        responses: newResponses
      });
    } catch (error) {
      console.error('Error handling response:', error);
      throw error;
    }
  };

  const calculateSessionStats = () => {
    if (!session) return null;

    const responses = {
      again: session.responses.filter(r => r.response === 'again').length,
      hard: session.responses.filter(r => r.response === 'hard').length,
      good: session.responses.filter(r => r.response === 'good').length,
      easy: session.responses.filter(r => r.response === 'easy').length,
    };

    const duration = Math.round((Date.now() - session.startTime) / 1000);
    const avgResponseTime = session.responses.length > 0 
      ? Math.round(duration / session.responses.length)
      : 0;

    const cardsLearned = responses.good + responses.easy;
    const cardsMastered = responses.easy;

    return {
      totalCards: session.responses.length,
      responses,
      duration,
      avgResponseTime,
      streakBest: bestStreak,
      cardsLearned,
      cardsMastered
    };
  };

  // Loading State
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-lg font-medium text-gray-700">Préparation de votre session...</p>
          <p className="text-sm text-gray-500 mt-2">Chargement des cartes de révision</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Erreur</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={initializeSession}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Réessayer
              </button>
              <button
                onClick={onExit}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Summary Phase
  if (phase === 'summary' && session) {
    const stats = calculateSessionStats();
    if (!stats) return null;

    return (
      <SessionSummary
        stats={stats}
        onContinue={onExit}
        onReviewMistakes={stats.responses.again > 0 ? () => {
          // TODO: Implement review mistakes
          console.log('Review mistakes');
        } : undefined}
      />
    );
  }

  // Session Phase
  if (phase === 'session' && session) {
    return (
      <ContinuousRevisionSession
        cards={session.cards}
        sessionId={session.sessionId}
        onCardResponse={handleCardResponse}
        onComplete={() => {
          setPhase('summary');
        }}
        onExit={onExit}
      />
    );
  }

  return null;
}
