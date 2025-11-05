'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { RevisionResponse } from '@/lib/types';

interface SessionStats {
  totalCards: number;
  responses: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  duration: number; // en secondes
  avgResponseTime: number;
  streakBest: number;
  cardsLearned: number;
  cardsMastered: number;
}

interface SessionSummaryProps {
  stats: SessionStats;
  onContinue: () => void;
  onReviewMistakes?: () => void;
}

export default function SessionSummary({ stats, onContinue, onReviewMistakes }: SessionSummaryProps) {
  const totalReviewed = stats.totalCards;
  const successRate = totalReviewed > 0 
    ? Math.round((((stats.responses.good + stats.responses.easy) / totalReviewed) * 100))
    : 0;
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getPerformanceMessage = () => {
    if (successRate >= 90) return { 
      emoji: '🏆', 
      title: 'Performance Exceptionnelle !', 
      message: 'Vous êtes un expert ! Continuez comme ça !',
      color: 'from-yellow-400 to-orange-500'
    };
    if (successRate >= 75) return { 
      emoji: '⭐', 
      title: 'Excellent Travail !', 
      message: 'Très belle maîtrise du sujet !',
      color: 'from-green-400 to-emerald-500'
    };
    if (successRate >= 60) return { 
      emoji: '👍', 
      title: 'Bon Travail !', 
      message: 'Vous progressez bien !',
      color: 'from-blue-400 to-indigo-500'
    };
    if (successRate >= 40) return { 
      emoji: '💪', 
      title: 'Continuez !', 
      message: 'La persévérance paye toujours !',
      color: 'from-orange-400 to-red-500'
    };
    return { 
      emoji: '🎯', 
      title: 'Bon Début !', 
      message: 'Continuez à réviser, ça va venir !',
      color: 'from-purple-400 to-pink-500'
    };
  };

  const performance = getPerformanceMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header avec célébration */}
        <div className={`bg-gradient-to-r ${performance.color} p-8 text-white text-center relative overflow-hidden`}>
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 10, repeat: Infinity }}
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
          
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', bounce: 0.6, delay: 0.2 }}
            className="text-8xl mb-4"
          >
            {performance.emoji}
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold mb-2"
          >
            {performance.title}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xl opacity-90"
          >
            {performance.message}
          </motion.p>
        </div>

        <div className="p-8 space-y-8">
          {/* Statistiques principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border border-blue-200"
            >
              <div className="text-3xl font-bold text-blue-600 mb-1">{totalReviewed}</div>
              <div className="text-sm text-blue-800 font-medium">Cartes Révisées</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200"
            >
              <div className="text-3xl font-bold text-green-600 mb-1">{successRate}%</div>
              <div className="text-sm text-green-800 font-medium">Taux de Réussite</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200"
            >
              <div className="text-3xl font-bold text-purple-600 mb-1">✅</div>
              <div className="text-sm text-purple-800 font-medium">Session Complète</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center border border-orange-200"
            >
              <div className="text-3xl font-bold text-orange-600 mb-1 flex items-center justify-center">
                {stats.streakBest}
                <span className="text-2xl ml-1">🔥</span>
              </div>
              <div className="text-sm text-orange-800 font-medium">Meilleure Série</div>
            </motion.div>
          </div>

          {/* Répartition des réponses */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              Répartition des Évaluations
            </h3>

            <div className="space-y-3">
              {[
                { key: 'again', label: 'À revoir', icon: '🔴', color: 'red', value: stats.responses.again },
                { key: 'hard', label: 'Difficile', icon: '🟠', color: 'orange', value: stats.responses.hard },
                { key: 'good', label: 'Bien', icon: '🔵', color: 'blue', value: stats.responses.good },
                { key: 'easy', label: 'Facile', icon: '🟢', color: 'green', value: stats.responses.easy },
              ].map((response, index) => {
                const percentage = totalReviewed > 0 ? Math.round((response.value / totalReviewed) * 100) : 0;
                
                return (
                  <motion.div
                    key={response.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + (index * 0.1) }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 w-32">
                      <span className="text-xl">{response.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{response.label}</span>
                    </div>
                    
                    <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.8 + (index * 0.1) }}
                        className={`h-full bg-gradient-to-r from-${response.color}-400 to-${response.color}-600`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-700">{response.value}</span>
                      </div>
                    </div>
                    
                    <div className="w-12 text-right">
                      <span className="text-sm font-bold text-gray-600">{percentage}%</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Accomplissements */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span className="text-2xl mr-2">🏅</span>
              Accomplissements de cette Session
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border border-yellow-200">
                <div className="text-3xl mb-2">📚</div>
                <div className="text-2xl font-bold text-gray-800">{stats.cardsLearned}</div>
                <div className="text-xs text-gray-600">Cartes Apprises</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 text-center border border-yellow-200">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-2xl font-bold text-gray-800">{stats.cardsMastered}</div>
                <div className="text-xs text-gray-600">Cartes Maîtrisées</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 text-center border border-yellow-200">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-2xl font-bold text-gray-800">🎯</div>
                <div className="text-xs text-gray-600">Performance</div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-4">
            {onReviewMistakes && stats.responses.again > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onReviewMistakes}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Revoir les Erreurs ({stats.responses.again})
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onContinue}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
            >
              Terminer la Session
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
