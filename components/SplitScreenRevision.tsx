'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { QuestionCard, RevisionResponse } from '@/lib/types';

// Import dynamique pour éviter les erreurs SSR
const OralQuizPlayer = dynamic(() => import('./OralQuizPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  )
});

interface SplitScreenRevisionProps {
  cards: QuestionCard[];
  sessionId: string;
  onCardComplete: (cardId: string, response: RevisionResponse) => Promise<void>;
  onSessionComplete: () => void;
}

// Fonction pour obtenir le statut de la carte
function getCardStatus(card: QuestionCard): { label: string; color: string; bgColor: string } {
  if (card.L === 0 && card.streak === 0) {
    return { label: '🆕 NOUVELLE', color: 'text-gray-700', bgColor: 'bg-gray-100 border-gray-300' };
  }
  
  if (card.is_leech) {
    return { label: '⚠️ PROBLÉMATIQUE', color: 'text-red-700', bgColor: 'bg-red-50 border-red-300' };
  }
  
  if (card.L < 3) {
    return { label: '📚 EN APPRENTISSAGE', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-300' };
  }
  
  if (card.L < 5) {
    return { label: '⚡ EN PROGRESSION', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-300' };
  }
  
  if (card.L < 8) {
    return { label: '💪 MAÎTRISÉE', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-300' };
  }
  
  return { label: '🏆 EXPERTE', color: 'text-green-700', bgColor: 'bg-green-50 border-green-300' };
}

export default function SplitScreenRevision({
  cards,
  sessionId,
  onCardComplete,
  onSessionComplete
}: SplitScreenRevisionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<RevisionResponse | null>(null);
  const [isOralAgentActive, setIsOralAgentActive] = useState(false);

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;
  const cardStatus = currentCard ? getCardStatus(currentCard) : null;

  useEffect(() => {
    // Reset lors du changement de carte
    setHasAnswered(false);
    setSelectedResponse(null);
    setIsOralAgentActive(false);
  }, [currentIndex]);

  useEffect(() => {
    // Raccourcis clavier
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!hasAnswered || isProcessing) return;

      switch(e.key) {
        case '1':
          handleResponseSelect('again');
          break;
        case '2':
          handleResponseSelect('hard');
          break;
        case '3':
          handleResponseSelect('good');
          break;
        case '4':
          handleResponseSelect('easy');
          break;
        case 'Enter':
          if (selectedResponse) {
            handleConfirmResponse();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasAnswered, isProcessing, selectedResponse]);

  const handleOralComplete = () => {
    setHasAnswered(true);
    setIsOralAgentActive(false);
  };

  const handleResponseSelect = (response: RevisionResponse) => {
    setSelectedResponse(response);
  };

  const handleConfirmResponse = async () => {
    if (!currentCard || !selectedResponse || isProcessing) return;

    try {
      setIsProcessing(true);
      await onCardComplete(currentCard.id, selectedResponse);

      // Passer à la question suivante
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onSessionComplete();
      }
    } catch (error) {
      console.error('Error handling response:', error);
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
    <div className="h-full flex flex-col">
      {/* Header avec progression */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-900">Session de Révision</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Question {currentIndex + 1} sur {cards.length}
            </div>
            <button
              onClick={() => {
                if (confirm('Voulez-vous vraiment quitter la session ?')) {
                  onSessionComplete();
                }
              }}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Quitter la session"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Zone split-screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Côté gauche - Agent Vocal */}
        <div className="w-1/2 bg-gradient-to-br from-green-50 to-emerald-50 p-6 border-r border-gray-200 overflow-auto">
          <div className="h-full flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Agent Vocal
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Cliquez sur le bouton pour répondre oralement à la question
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center">
              {!isOralAgentActive ? (
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 animate-pulse bg-green-400 rounded-full blur-xl opacity-30"></div>
                    <button
                      onClick={() => setIsOralAgentActive(true)}
                      disabled={hasAnswered}
                      className={`
                        relative px-8 py-4 rounded-xl font-bold text-lg transition-all transform
                        ${hasAnswered 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white hover:scale-105 shadow-lg'
                        }
                      `}
                    >
                      <span className="flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        {hasAnswered ? 'Déjà répondu' : 'Prendre la parole'}
                      </span>
                    </button>
                  </div>
                  
                  {hasAnswered && (
                    <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg">
                      ✓ Réponse enregistrée
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full">
                  <OralQuizPlayer
                    questions={[{
                      question: currentCard.question,
                      criteria: currentCard.criteria
                    }]}
                    onComplete={handleOralComplete}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Côté droit - Carte de Révision */}
        <div className="w-1/2 bg-gray-50 p-6 overflow-auto">
          <div className="h-full flex flex-col">
            {/* Statut de la carte */}
            {cardStatus && (
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold mb-4 border ${cardStatus.bgColor} ${cardStatus.color}`}>
                {cardStatus.label}
              </div>
            )}

            {/* Question */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Question #{currentIndex + 1}
              </h4>
              <p className="text-xl font-medium text-gray-900 mb-4">
                {currentCard.question}
              </p>

              {/* Critères */}
              {currentCard.criteria && currentCard.criteria.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-semibold text-gray-600 mb-2">Points clés attendus :</h5>
                  <div className="space-y-1">
                    {currentCard.criteria.map((criterion, index) => (
                      <div key={index} className="flex items-start">
                        <svg className="w-4 h-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">{criterion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Métriques */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                <span>Niveau: {currentCard.L}</span>
                <span>Streak: {currentCard.streak} 🔥</span>
                <span>Échecs: {currentCard.lapses}</span>
                <span>Écart: {currentCard.g} pas</span>
              </div>
            </div>

            {/* Boutons d'évaluation */}
            {hasAnswered && (
              <div className="flex-1 flex flex-col justify-end">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Comment avez-vous trouvé cette question ?
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleResponseSelect('again')}
                      className={`
                        px-4 py-3 rounded-lg font-medium transition-all border-2
                        ${selectedResponse === 'again' 
                          ? 'bg-red-500 text-white border-red-500 shadow-lg' 
                          : 'bg-white text-red-600 border-red-300 hover:border-red-500 hover:bg-red-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-2xl mr-2">🔴</span>
                        <div className="text-left">
                          <div className="font-bold">Again</div>
                          <div className="text-xs opacity-75">Je ne savais pas</div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleResponseSelect('hard')}
                      className={`
                        px-4 py-3 rounded-lg font-medium transition-all border-2
                        ${selectedResponse === 'hard' 
                          ? 'bg-orange-500 text-white border-orange-500 shadow-lg' 
                          : 'bg-white text-orange-600 border-orange-300 hover:border-orange-500 hover:bg-orange-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-2xl mr-2">🟠</span>
                        <div className="text-left">
                          <div className="font-bold">Hard</div>
                          <div className="text-xs opacity-75">Difficile</div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleResponseSelect('good')}
                      className={`
                        px-4 py-3 rounded-lg font-medium transition-all border-2
                        ${selectedResponse === 'good' 
                          ? 'bg-blue-500 text-white border-blue-500 shadow-lg' 
                          : 'bg-white text-blue-600 border-blue-300 hover:border-blue-500 hover:bg-blue-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-2xl mr-2">🔵</span>
                        <div className="text-left">
                          <div className="font-bold">Good</div>
                          <div className="text-xs opacity-75">Bien répondu</div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleResponseSelect('easy')}
                      className={`
                        px-4 py-3 rounded-lg font-medium transition-all border-2
                        ${selectedResponse === 'easy' 
                          ? 'bg-green-500 text-white border-green-500 shadow-lg' 
                          : 'bg-white text-green-600 border-green-300 hover:border-green-500 hover:bg-green-50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-2xl mr-2">🟢</span>
                        <div className="text-left">
                          <div className="font-bold">Easy</div>
                          <div className="text-xs opacity-75">Très facile</div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {selectedResponse && (
                    <button
                      onClick={handleConfirmResponse}
                      disabled={isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:opacity-50"
                    >
                      {isProcessing ? 'Enregistrement...' : 'Valider et Continuer →'}
                    </button>
                  )}
                </div>

                {/* Raccourcis clavier */}
                <div className="mt-4 text-xs text-gray-500 text-center">
                  Raccourcis : 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
