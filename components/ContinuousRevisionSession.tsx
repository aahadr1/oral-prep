'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { QuestionCard, RevisionResponse } from '@/lib/types';
import type { OralQuizPlayerRef } from './OralQuizPlayer';

const OralQuizPlayer = dynamic<any>(() => import('./OralQuizPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

interface ContinuousRevisionSessionProps {
  cards: QuestionCard[];
  sessionId: string;
  onCardResponse: (cardId: string, response: RevisionResponse) => Promise<void>;
  onComplete: () => void;
  onExit: () => void;
}

export default function ContinuousRevisionSession({
  cards,
  sessionId,
  onCardResponse,
  onComplete,
  onExit
}: ContinuousRevisionSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedResponse, setSelectedResponse] = useState<RevisionResponse | null>(null);
  const [hasUserSpoken, setHasUserSpoken] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const oralPlayerRef = useRef<OralQuizPlayerRef>(null);

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  // Reset quand on change de carte
  useEffect(() => {
    setSelectedResponse(null);
    setHasUserSpoken(false);
    setShowCriteria(false);
  }, [currentIndex]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!hasUserSpoken) return;

      if (e.key === '1') {
        setSelectedResponse('again');
      } else if (e.key === '2') {
        setSelectedResponse('hard');
      } else if (e.key === '3') {
        setSelectedResponse('good');
      } else if (e.key === '4') {
        setSelectedResponse('easy');
      } else if (e.key === 'Enter' && selectedResponse) {
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasUserSpoken, selectedResponse]);

  const handleNextQuestion = async () => {
    if (!selectedResponse || isProcessing) return;

    setIsProcessing(true);

    try {
      // Cancel any active response before transitioning
      if (oralPlayerRef.current) {
        oralPlayerRef.current.cancelActiveResponse();
      }

      await onCardResponse(currentCard.id, selectedResponse);

      // Passer à la question suivante
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        
        // Wait a bit for the previous response to be cancelled
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        onComplete();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getResponsePreview = (response: RevisionResponse) => {
    const previews = {
      again: { label: 'À revoir', icon: '🔴', color: 'text-red-600', bgColor: 'from-red-50 to-red-100', nextReview: '< 10 min' },
      hard: { label: 'Difficile', icon: '🟠', color: 'text-orange-600', bgColor: 'from-orange-50 to-orange-100', nextReview: '1-2 jours' },
      good: { label: 'Bien', icon: '🔵', color: 'text-blue-600', bgColor: 'from-blue-50 to-blue-100', nextReview: '1-2 semaines' },
      easy: { label: 'Facile', icon: '🟢', color: 'text-green-600', bgColor: 'from-green-50 to-green-100', nextReview: '1-3 mois' }
    };
    return previews[response];
  };

  const getCardLevel = () => {
    if (currentCard.L === 0) return { label: 'NOUVELLE', color: 'from-gray-400 to-gray-600', emoji: '🆕' };
    if (currentCard.L < 3) return { label: 'DÉBUTANT', color: 'from-orange-400 to-red-500', emoji: '📚' };
    if (currentCard.L < 5) return { label: 'APPRENTI', color: 'from-yellow-400 to-orange-500', emoji: '⚡' };
    if (currentCard.L < 8) return { label: 'INTERMÉDIAIRE', color: 'from-blue-400 to-indigo-500', emoji: '💪' };
    if (currentCard.L < 12) return { label: 'AVANCÉ', color: 'from-purple-400 to-pink-500', emoji: '🚀' };
    return { label: 'EXPERT', color: 'from-green-400 to-emerald-600', emoji: '🏆' };
  };

  const cardLevel = getCardLevel();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`px-4 py-2 rounded-xl bg-gradient-to-r ${cardLevel.color} text-white font-bold shadow-lg flex items-center gap-2`}
            >
              <span className="text-xl">{cardLevel.emoji}</span>
              <span className="text-sm">{cardLevel.label}</span>
            </motion.div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-600">
              <span className="text-2xl font-bold text-blue-600">{currentIndex + 1}</span>
              <span className="text-gray-400"> / {cards.length}</span>
            </div>
            <button
              onClick={onExit}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Quitter"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Côté gauche - Agent Vocal (UNE session pour tout le quiz) */}
        <div className="w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 overflow-auto border-r-2 border-gray-200">
          <OralQuizPlayer
            ref={oralPlayerRef}
            questions={cards.map(card => ({
              question: card.question,
              criteria: card.criteria
            }))}
            onUserSpoke={() => setHasUserSpoken(true)}
            onComplete={() => {}}
            questionNumber={currentIndex + 1}
          />
        </div>

        {/* Côté droit - Carte actuelle + évaluation */}
        <div className="w-1/2 bg-white p-8 overflow-auto flex flex-col">
          {/* Carte */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-200 p-6 shadow-lg mb-6"
          >
            <div className="flex items-start justify-between mb-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Question #{currentIndex + 1}
              </h4>
              <button
                onClick={() => setShowCriteria(!showCriteria)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {showCriteria ? 'Masquer' : 'Voir'} les critères
                <svg className={`w-4 h-4 transition-transform ${showCriteria ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <p className="text-2xl font-bold text-gray-900 mb-4 leading-relaxed">
              {currentCard.question}
            </p>

            <AnimatePresence>
              {showCriteria && currentCard.criteria && currentCard.criteria.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 border-t border-gray-200"
                >
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Points Clés Attendus</h5>
                  <div className="space-y-2">
                    {currentCard.criteria.map((criterion, index) => (
                      <div key={index} className="flex items-start bg-blue-50 rounded-lg p-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700">{criterion}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Boutons d'évaluation */}
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <div className="text-center mb-2">
              <h4 className="text-lg font-bold text-gray-800 mb-1">Évaluez votre Performance</h4>
              <p className="text-sm text-gray-600">
                {!hasUserSpoken 
                  ? "Répondez à la question pour débloquer les boutons"
                  : "Sélectionnez votre évaluation"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(['again', 'hard', 'good', 'easy'] as RevisionResponse[]).map((response) => {
                const preview = getResponsePreview(response);
                const isSelected = selectedResponse === response;
                const isDisabled = !hasUserSpoken;

                return (
                  <motion.button
                    key={response}
                    whileHover={!isDisabled ? { scale: 1.02 } : {}}
                    whileTap={!isDisabled ? { scale: 0.98 } : {}}
                    onClick={() => !isDisabled && setSelectedResponse(response)}
                    disabled={isDisabled}
                    className={`
                      relative p-5 rounded-xl border-3 transition-all duration-300
                      ${isDisabled 
                        ? 'opacity-30 cursor-not-allowed bg-white border-gray-200' 
                        : isSelected 
                          ? `bg-gradient-to-br ${preview.bgColor} border-current shadow-2xl ring-4 ring-blue-300` 
                          : 'bg-white border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-4xl">{preview.icon}</span>
                      <div className="font-bold text-lg text-gray-800">{preview.label}</div>
                      <div className={`text-xs font-semibold ${isSelected ? preview.color : 'text-gray-500'}`}>
                        ⏰ {preview.nextReview}
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div
                        layoutId="selection"
                        className="absolute inset-0 border-4 border-blue-500 rounded-xl"
                        transition={{ type: 'spring', bounce: 0.3 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Bouton Question Suivante */}
            <motion.button
              animate={{ opacity: selectedResponse ? 1 : 0.5 }}
              whileHover={selectedResponse ? { scale: 1.02 } : {}}
              whileTap={selectedResponse ? { scale: 0.98 } : {}}
              onClick={handleNextQuestion}
              disabled={!selectedResponse || isProcessing}
              className={`
                w-full py-4 rounded-xl font-bold text-lg shadow-2xl flex items-center justify-center gap-2 transition-all
                ${selectedResponse && !isProcessing
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Enregistrement...
                </>
              ) : currentIndex < cards.length - 1 ? (
                <>
                  <span>Question Suivante</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Terminer le Quiz</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </motion.button>

            <div className="text-center text-xs text-gray-500">
              💡 Raccourcis: <kbd className="px-2 py-1 bg-gray-100 rounded">1-4</kbd> pour évaluer • <kbd className="px-2 py-1 bg-gray-100 rounded">Entrée</kbd> pour continuer
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

