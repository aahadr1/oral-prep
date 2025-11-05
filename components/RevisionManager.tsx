'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RevisionStats from './RevisionStats';
import OralQuizWithRevision from './OralQuizWithRevision';
import type { 
  QuestionCard, 
  RevisionResponse, 
  RevisionStats as RevisionStatsType,
  RevisionSettings
} from '@/lib/types';

interface RevisionManagerProps {
  quizId: string;
  userId: string;
}

type RevisionMode = 'overview' | 'session' | 'stats' | 'settings';

export default function RevisionManager({ quizId, userId }: RevisionManagerProps) {
  const router = useRouter();
  
  // État principal
  const [mode, setMode] = useState<RevisionMode>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Données de révision
  const [cards, setCards] = useState<QuestionCard[]>([]);
  const [stats, setStats] = useState<RevisionStatsType | null>(null);
  const [settings, setSettings] = useState<RevisionSettings | null>(null);
  
  // État de la session
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCards, setSessionCards] = useState<QuestionCard[]>([]);

  // Initialisation
  useEffect(() => {
    initializeRevision();
  }, [quizId, userId]);

  const initializeRevision = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les paramètres
      const settingsResponse = await fetch('/api/revision/settings');
      if (settingsResponse.ok) {
        const { settings: userSettings } = await settingsResponse.json();
        setSettings(userSettings);
      }

      // Vérifier si des cartes existent
      const cardsResponse = await fetch(`/api/revision/cards?quiz_id=${quizId}&action=eligible`);
      if (!cardsResponse.ok) {
        // Cartes n'existent pas, les créer
        const createResponse = await fetch('/api/revision/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz_id: quizId })
        });

        if (!createResponse.ok) {
          throw new Error('Impossible de créer les cartes de révision');
        }

        // Recharger les cartes
        const newCardsResponse = await fetch(`/api/revision/cards?quiz_id=${quizId}&action=eligible`);
        const { cards: newCards } = await newCardsResponse.json();
        setCards(newCards || []);
      } else {
        const { cards: existingCards } = await cardsResponse.json();
        setCards(existingCards || []);
      }

      // Charger les statistiques
      await loadStats();
      
    } catch (err) {
      console.error('Error initializing revision:', err);
      setError(err instanceof Error ? err.message : 'Erreur d\'initialisation');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/revision/stats?quiz_id=${quizId}`);
      if (response.ok) {
        const { stats } = await response.json();
        setStats(stats);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const startRevisionSession = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/revision/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId, max_cards: 20 })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Impossible de créer la session');
      }

      const { session_id } = await response.json();
      
      // Récupérer les cartes éligibles
      const cardsResponse = await fetch(`/api/revision/cards?quiz_id=${quizId}&action=eligible&limit=20`);
      if (cardsResponse.ok) {
        const { cards: eligibleCards } = await cardsResponse.json();
        setSessionCards(eligibleCards || []);
        setSessionId(session_id);
        setMode('session');
      }
      
    } catch (err) {
      console.error('Error starting session:', err);
      setError(err instanceof Error ? err.message : 'Erreur de session');
    } finally {
      setLoading(false);
    }
  };

  const handleCardComplete = async (cardId: string, response: RevisionResponse) => {
    if (!sessionId) return;
    
    try {
      // Envoyer la réponse au backend
      const responseResult = await fetch('/api/revision/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: cardId,
          response,
          session_id: sessionId
        })
      });

      if (!responseResult.ok) {
        throw new Error('Impossible d&apos;enregistrer la réponse');
      }
      
    } catch (err) {
      console.error('Error handling response:', err);
      throw err; // Propager l'erreur pour que le composant le gère
    }
  };

  const completeSession = async () => {
    if (sessionId) {
      try {
        await fetch('/api/revision/session', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, action: 'complete' })
        });
      } catch (err) {
        console.error('Error completing session:', err);
      }
    }
    
    // Recharger les stats et retourner à l'overview
    await loadStats();
    setSessionId(null);
    setSessionCards([]);
    setMode('overview');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du système de révision...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-800">Erreur</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={initializeRevision}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Mode session de révision
  if (mode === 'session' && sessionId && sessionCards.length > 0) {
    return (
      <div className="space-y-6">
        {/* En-tête de session */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Session de révision</h2>
          <button
            onClick={() => {
              if (confirm('Voulez-vous vraiment quitter la session en cours ?')) {
                completeSession();
              }
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Quitter
          </button>
        </div>

        {/* Composant intégré oral quiz + révision */}
        <OralQuizWithRevision
          cards={sessionCards}
          sessionId={sessionId}
          onCardComplete={handleCardComplete}
          onSessionComplete={completeSession}
        />
      </div>
    );
  }

  // Mode statistiques
  if (mode === 'stats' && stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Statistiques de révision</h2>
          <button
            onClick={() => setMode('overview')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            ← Retour
          </button>
        </div>
        
        <RevisionStats stats={stats} showDetails={true} />
      </div>
    );
  }

  // Mode vue d'ensemble (défaut)
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Système de révision intelligent</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setMode('stats')}
            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            📊 Statistiques
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">🧠 Comment ça marche</h3>
        <p className="text-blue-700 text-sm mb-2">
          Le système de révision intelligent adapte la fréquence des questions selon vos performances.
          Plus vous maîtrisez une question, moins souvent vous la verrez.
        </p>
        <div className="text-blue-600 text-xs">
          <strong>Again</strong> = revoir très vite • <strong>Hard</strong> = petit espacement • 
          <strong>Good</strong> = espacement moyen • <strong>Easy</strong> = grand espacement
        </div>
      </div>

      {/* Statistiques rapides */}
      {stats && (
        <RevisionStats stats={stats} showDetails={false} />
      )}

      {/* Actions principales */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Démarrer session */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 Session de révision</h3>
          <p className="text-gray-600 mb-4">
            Révisez les questions qui ont besoin d&apos;attention selon l&apos;algorithme intelligent.
          </p>
          
          {stats && (
            <div className="mb-4 text-sm text-gray-600">
              <div>• {stats.new_cards + stats.learning_cards} cartes à réviser</div>
              <div>• {stats.leech_cards} cartes problématiques</div>
            </div>
          )}
          
          <button
            onClick={startRevisionSession}
            disabled={stats?.total_cards === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            Démarrer la révision
          </button>
        </div>

        {/* Accès rapide aux stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📈 Suivi de progression</h3>
          <p className="text-gray-600 mb-4">
            Consultez vos statistiques détaillées et votre progression par catégorie.
          </p>
          
          {stats && (
            <div className="mb-4 text-sm text-gray-600">
              <div>• {stats.mature_cards} questions maîtrisées</div>
              <div>• {Math.round((stats.mature_cards / stats.total_cards) * 100)}% de progression</div>
            </div>
          )}
          
          <button
            onClick={() => setMode('stats')}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors"
          >
            Voir les statistiques
          </button>
        </div>
      </div>
    </div>
  );
}
