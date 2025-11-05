'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { QuestionCard, RevisionResponse } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

const OralQuizPlayer = dynamic(() => import('./OralQuizPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

interface UltimateRevisionCardProps {
  card: QuestionCard;
  cardNumber: number;
  totalCards: number;
  onResponse: (response: RevisionResponse) => Promise<void>;
  onSkip?: () => void;
}

type RevisionState = 'ready' | 'oral-active' | 'answered' | 'rating' | 'processing' | 'feedback';

interface ResponsePreview {
  label: string;
  description: string;
  nextReview: string;
  color: string;
  bgColor: string;
  icon: string;
}

export default function UltimateRevisionCard({
  card,
  cardNumber,
  totalCards,
  onResponse,
  onSkip
}: UltimateRevisionCardProps) {
  const [state, setState] = useState<RevisionState>('ready');
  const [selectedResponse, setSelectedResponse] = useState<RevisionResponse | null>(null);
  const [showCriteria, setShowCriteria] = useState(false);
  const [streak, setStreak] = useState(card.streak || 0);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (state !== 'answered' && state !== 'rating') return;

      if (e.key === '1') {
        handleRatingSelect('again');
      } else if (e.key === '2') {
        handleRatingSelect('hard');
      } else if (e.key === '3') {
        handleRatingSelect('good');
      } else if (e.key === '4') {
        handleRatingSelect('easy');
      } else if (e.key === 'Enter' && selectedResponse && state === 'rating') {
        handleConfirmRating();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state, selectedResponse]);

  // Calculer le niveau de la carte
  const getCardLevel = () => {
    if (card.L === 0) return { label: 'NOUVELLE', color: 'from-gray-400 to-gray-600', emoji: '🆕' };
    if (card.L < 3) return { label: 'DÉBUTANT', color: 'from-orange-400 to-red-500', emoji: '📚' };
    if (card.L < 5) return { label: 'APPRENTI', color: 'from-yellow-400 to-orange-500', emoji: '⚡' };
    if (card.L < 8) return { label: 'INTERMÉDIAIRE', color: 'from-blue-400 to-indigo-500', emoji: '💪' };
    if (card.L < 12) return { label: 'AVANCÉ', color: 'from-purple-400 to-pink-500', emoji: '🚀' };
    return { label: 'EXPERT', color: 'from-green-400 to-emerald-600', emoji: '🏆' };
  };

  const cardLevel = getCardLevel();

  // Calculer l'aperçu des réponses
  const getResponsePreview = (response: RevisionResponse): ResponsePreview => {
    const previews: Record<RevisionResponse, ResponsePreview> = {
      again: {
        label: 'À revoir',
        description: 'Je ne savais pas du tout',
        nextReview: '< 10 minutes',
        color: 'text-red-600',
        bgColor: 'from-red-50 to-red-100',
        icon: '🔴'
      },
      hard: {
        label: 'Difficile',
        description: 'J\'ai eu du mal à répondre',
        nextReview: card.L < 3 ? '1 jour' : '2-3 jours',
        color: 'text-orange-600',
        bgColor: 'from-orange-50 to-orange-100',
        icon: '🟠'
      },
      good: {
        label: 'Bien',
        description: 'Réponse correcte',
        nextReview: card.L < 3 ? '3 jours' : card.L < 8 ? '1 semaine' : '2 semaines',
        color: 'text-blue-600',
        bgColor: 'from-blue-50 to-blue-100',
        icon: '🔵'
      },
      easy: {
        label: 'Facile',
        description: 'Réponse parfaite et immédiate',
        nextReview: card.L < 5 ? '1 semaine' : card.L < 10 ? '1 mois' : '3 mois',
        color: 'text-green-600',
        bgColor: 'from-green-50 to-green-100',
        icon: '🟢'
      }
    };
    return previews[response];
  };

  const handleOralStart = () => {
    setState('oral-active');
  };

  const handleOralComplete = () => {
    setState('answered');
  };

  const handleRatingSelect = (response: RevisionResponse) => {
    setSelectedResponse(response);
    setState('rating');
  };

  const handleConfirmRating = async () => {
    if (!selectedResponse) return;
    
    setState('processing');
    
    try {
      await onResponse(selectedResponse);
      setState('feedback');
      
      // Update streak animation
      if (selectedResponse !== 'again') {
        setStreak(prev => prev + 1);
      } else {
        setStreak(0);
      }
      
      // Auto-continue after 2 seconds
      setTimeout(() => {
        // Parent component will handle moving to next card
      }, 2000);
    } catch (error) {
      console.error('Error submitting response:', error);
      setState('answered');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header amélioré */}
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
            
            {streak > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold flex items-center gap-1.5 shadow-md"
              >
                <span className="text-lg">🔥</span>
                <span className="text-sm">{streak} série</span>
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-600">
              <span className="text-2xl font-bold text-blue-600">{cardNumber}</span>
              <span className="text-gray-400"> / {totalCards}</span>
            </div>
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Passer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Progress bar ultra */}
        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(cardNumber / totalCards) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-inner"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Zone gauche - Agent Vocal */}
        <div className="w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 overflow-auto border-r-2 border-gray-200">
          <AnimatePresence mode="wait">
            {state === 'ready' && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col justify-center items-center text-center space-y-8"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-2xl"
                  >
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </motion.div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-gray-800">Agent Vocal Intelligent</h3>
                  <p className="text-gray-600 max-w-md">
                    L&apos;IA va vous poser la question oralement et analyser votre réponse en temps réel
                  </p>
                </div>

                <div className="bg-white/60 backdrop-blur rounded-xl p-6 max-w-md border border-white/40 shadow-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Instructions
                  </h4>
                  <ol className="text-sm text-gray-700 space-y-2 text-left">
                    <li className="flex items-start">
                      <span className="font-bold text-blue-600 mr-2">1.</span>
                      <span>Cliquez sur &quot;Démarrer&quot; pour lancer l&apos;agent</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold text-blue-600 mr-2">2.</span>
                      <span>L&apos;agent pose la question</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold text-blue-600 mr-2">3.</span>
                      <span>Répondez à voix haute</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold text-blue-600 mr-2">4.</span>
                      <span>Évaluez votre performance</span>
                    </li>
                  </ol>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleOralStart}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-2xl flex items-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Démarrer l&apos;Agent Vocal
                </motion.button>
              </motion.div>
            )}

            {state === 'oral-active' && (
              <motion.div
                key="oral"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <OralQuizPlayer
                  questions={[{
                    question: card.question,
                    criteria: card.criteria
                  }]}
                  onComplete={handleOralComplete}
                />
              </motion.div>
            )}

            {(state === 'answered' || state === 'rating' || state === 'processing') && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col justify-center items-center space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl"
                >
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>

                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-gray-800">Réponse Enregistrée !</h3>
                  <p className="text-gray-600">
                    Évaluez maintenant votre performance pour optimiser vos révisions futures
                  </p>
                </div>

                {state === 'processing' && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="font-medium">Enregistrement...</span>
                  </div>
                )}
              </motion.div>
            )}

            {state === 'feedback' && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col justify-center items-center space-y-8"
              >
                {selectedResponse === 'again' ? (
                  <>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, -10, 10, 0]
                      }}
                      transition={{ duration: 0.5 }}
                      className="text-8xl"
                    >
                      💪
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-3xl font-bold text-gray-800 mb-2">Continuez !</h3>
                      <p className="text-gray-600">La persévérance est la clé du succès</p>
                    </div>
                  </>
                ) : selectedResponse === 'hard' ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                      className="text-8xl"
                    >
                      👍
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-3xl font-bold text-gray-800 mb-2">Bon Travail !</h3>
                      <p className="text-gray-600">Vous progressez bien</p>
                    </div>
                  </>
                ) : selectedResponse === 'good' ? (
                  <>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.3, 1],
                        rotate: [0, 360]
                      }}
                      transition={{ duration: 0.6 }}
                      className="text-8xl"
                    >
                      ⭐
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-3xl font-bold text-gray-800 mb-2">Excellent !</h3>
                      <p className="text-gray-600">Très bonne maîtrise</p>
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.5, 1],
                        rotate: [0, -20, 20, 0]
                      }}
                      transition={{ duration: 0.7 }}
                      className="text-8xl"
                    >
                      🏆
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">
                        Parfait !
                      </h3>
                      <p className="text-gray-600">Maîtrise totale de cette question</p>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Zone droite - Question et Évaluation */}
        <div className="w-1/2 bg-white p-8 overflow-auto flex flex-col">
          {/* Carte de question */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-200 p-6 shadow-lg mb-6"
          >
            <div className="flex items-start justify-between mb-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Question #{cardNumber}
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

            <p className="text-2xl font-bold text-gray-900 mb-6 leading-relaxed">
              {card.question}
            </p>

            <AnimatePresence>
              {showCriteria && card.criteria && card.criteria.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 border-t border-gray-200"
                >
                  <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Points Clés Attendus
                  </h5>
                  <div className="space-y-2">
                    {card.criteria.map((criterion, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start bg-blue-50 rounded-lg p-3"
                      >
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700">{criterion}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Statistiques de la carte */}
            <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Niveau</div>
                <div className="text-lg font-bold text-blue-600">{card.L}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Écart</div>
                <div className="text-lg font-bold text-purple-600">{card.g}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Série</div>
                <div className="text-lg font-bold text-orange-600">{card.streak}🔥</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Échecs</div>
                <div className="text-lg font-bold text-red-600">{card.lapses}</div>
              </div>
            </div>
          </motion.div>

          {/* Boutons d'évaluation */}
          <AnimatePresence>
            {(state === 'answered' || state === 'rating' || state === 'processing') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex-1 flex flex-col justify-center space-y-6"
              >
                <div className="text-center mb-2">
                  <h4 className="text-lg font-bold text-gray-800 mb-1">
                    Évaluez votre Performance
                  </h4>
                  <p className="text-sm text-gray-600">
                    Choisissez la réponse qui correspond le mieux à votre ressenti
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(['again', 'hard', 'good', 'easy'] as RevisionResponse[]).map((response) => {
                    const preview = getResponsePreview(response);
                    const isSelected = selectedResponse === response;
                    
                    return (
                      <motion.button
                        key={response}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRatingSelect(response)}
                        className={`
                          relative p-5 rounded-xl border-3 transition-all duration-300
                          ${isSelected 
                            ? `bg-gradient-to-br ${preview.bgColor} border-current shadow-2xl ring-4 ring-${preview.color.split('-')[1]}-200` 
                            : 'bg-white border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <span className="text-4xl">{preview.icon}</span>
                          <div className="font-bold text-lg text-gray-800">{preview.label}</div>
                          <div className="text-xs text-gray-600 text-center">{preview.description}</div>
                          <div className={`text-xs font-semibold ${isSelected ? preview.color : 'text-gray-500'}`}>
                            ⏰ Prochaine: {preview.nextReview}
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

                {selectedResponse && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmRating}
                    disabled={state === 'processing'}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold text-lg rounded-xl shadow-2xl disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {state === 'processing' ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        Valider et Continuer
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </motion.button>
                )}

                <div className="text-center text-xs text-gray-500 space-y-1">
                  <div>💡 Raccourcis clavier: 1️⃣ Again • 2️⃣ Hard • 3️⃣ Good • 4️⃣ Easy</div>
                  <div>Appuyez sur <kbd className="px-2 py-1 bg-gray-100 rounded">Entrée</kbd> pour valider</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
