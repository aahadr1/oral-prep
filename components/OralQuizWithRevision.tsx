'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import RevisionButtons from './RevisionButtons';
import type { QuestionCard, RevisionResponse } from '@/lib/types';

// Import dynamically to avoid SSR issues with audio APIs
const OralQuizPlayer = dynamic(() => import('./OralQuizPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

interface OralQuizWithRevisionProps {
  cards: QuestionCard[];
  sessionId: string;
  onCardComplete: (cardId: string, response: RevisionResponse) => Promise<void>;
  onSessionComplete: () => void;
}

export default function OralQuizWithRevision({
  cards,
  sessionId,
  onCardComplete,
  onSessionComplete
}: OralQuizWithRevisionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;
  const cardsRemaining = cards.length - currentIndex;

  useEffect(() => {
    // Reset state when moving to next card
    setHasAnswered(false);
    setShowPlayer(false);
  }, [currentIndex]);

  const handleAnswerComplete = () => {
    // L'utilisateur a fini de répondre oralement
    setHasAnswered(true);
    setShowPlayer(false);
  };

  const handleRevisionResponse = async (response: RevisionResponse) => {
    if (!currentCard || isProcessing) return;

    try {
      setIsProcessing(true);

      // Enregistrer la réponse
      await onCardComplete(currentCard.id, response);

      // Passer à la question suivante ou terminer
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Session terminée
        onSessionComplete();
      }
    } catch (error) {
      console.error('Error handling revision response:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucune carte à réviser.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-medium text-gray-700">
              Question {currentIndex + 1} sur {cards.length}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              ({cardsRemaining} restante{cardsRemaining > 1 ? 's' : ''})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Niveau {currentCard.L}</span>
            {currentCard.is_leech && (
              <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-medium">
                PROBLÉMATIQUE
              </span>
            )}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stats rapides */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <div className="flex space-x-3">
            <span>🔥 Streak: {currentCard.streak}</span>
            <span>❌ Échecs: {currentCard.lapses}</span>
          </div>
          <span>📊 Écart: {currentCard.g} pas</span>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {currentCard.question}
          </h3>

          {/* Critères attendus */}
          {currentCard.criteria && currentCard.criteria.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Points clés à mentionner :
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentCard.criteria.map((criterion, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-white rounded px-3 py-2 text-sm text-blue-800"
                  >
                    <span className="mr-2">✓</span>
                    {criterion}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indice pour cartes problématiques */}
          {currentCard.is_leech && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h5 className="font-semibold text-red-800">Question difficile détectée</h5>
                  <p className="text-sm text-red-700 mt-1">
                    Cette question a été marquée comme problématique. Prenez votre temps et concentrez-vous sur les points clés ci-dessus.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Oral Player Section */}
        {!hasAnswered ? (
          <div className="space-y-4">
            {!showPlayer ? (
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <button
                  onClick={() => setShowPlayer(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center mx-auto"
                >
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Commencer ma réponse orale
                </button>
                <p className="text-sm text-gray-600 mt-4">
                  Cliquez pour activer le microphone et répondre à la question
                </p>
              </div>
            ) : (
              <div>
                <OralQuizPlayer
                  questions={[{
                    question: currentCard.question,
                    criteria: currentCard.criteria
                  }]}
                  onComplete={handleAnswerComplete}
                />
              </div>
            )}
          </div>
        ) : (
          /* Classification de la réponse */
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <svg className="w-8 h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-medium">
                Réponse enregistrée ! Évaluez maintenant votre performance.
              </p>
            </div>

            <RevisionButtons
              onResponse={handleRevisionResponse}
              disabled={isProcessing}
            />

            {isProcessing && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Enregistrement...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}





