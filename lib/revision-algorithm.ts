/**
 * 🧠 Algorithme de révision intelligent basé sur les "pas"
 * Implémentation sans valeur temporelle, uniquement basée sur le nombre d'items vus
 * Inspiré d'Anki mais optimisé pour les quiz oraux
 */

import type { QuestionCard, RevisionResponse, RevisionSettings, RevisionStats } from './types';

// =============================================
// CONSTANTES PAR DÉFAUT
// =============================================

export const DEFAULT_SETTINGS: RevisionSettings = {
  beta_low: 1.2,   // Multiplicateur faible pour "Hard"
  beta_mid: 2.0,   // Multiplicateur moyen pour "Good"  
  beta_high: 3.0,  // Multiplicateur élevé pour "Easy"
  
  leech_threshold: 8,        // Seuil pour marquer comme leech
  new_cards_per_session: 5,  // Nouvelles cartes par session
  steps_between_new: 3       // Pas entre introduction de nouvelles cartes
};

// =============================================
// ALGORITHME PRINCIPAL
// =============================================

/**
 * Met à jour les métriques d'une carte selon la réponse de l'utilisateur
 */
export function updateCardMetrics(
  card: QuestionCard, 
  response: RevisionResponse, 
  settings: RevisionSettings = DEFAULT_SETTINGS
): QuestionCard {
  const updatedCard = { ...card };
  
  switch (response) {
    case 'again':
      // Échec : réduire le niveau, remettre à 1 pas
      updatedCard.L = Math.max(card.L - 1, 0);
      updatedCard.streak = 0;
      updatedCard.lapses += 1;
      updatedCard.g = 1;
      break;
      
    case 'hard':
      // Difficile : maintenir niveau minimum 1, petit écart
      updatedCard.L = Math.max(card.L, 1);
      updatedCard.streak = 0;
      updatedCard.g = Math.ceil(Math.max(1, card.g / settings.beta_low));
      break;
      
    case 'good':
      // Bien : augmenter niveau, écart moyen
      updatedCard.L = card.L + 1;
      updatedCard.streak += 1;
      updatedCard.g = Math.ceil(card.g * settings.beta_mid);
      break;
      
    case 'easy':
      // Facile : augmenter fortement, grand écart
      updatedCard.L = card.L + 2;
      updatedCard.streak += 1;
      updatedCard.g = Math.ceil(card.g * settings.beta_high);
      break;
  }
  
  // Vérifier si la carte devient une leech
  if (updatedCard.lapses >= settings.leech_threshold) {
    updatedCard.is_leech = true;
    updatedCard.g = 1; // Revoir rapidement avec aide
  }
  
  // Mettre à jour les métadonnées
  updatedCard.steps_until_due = updatedCard.g;
  updatedCard.last_reviewed_at = new Date().toISOString();
  updatedCard.updated_at = new Date().toISOString();
  
  return updatedCard;
}

// =============================================
// SÉLECTEUR DE PROCHAINE CARTE
// =============================================

/**
 * Sélectionne la prochaine carte à réviser selon l'algorithme
 */
export function selectNextCard(
  cards: QuestionCard[], 
  settings: RevisionSettings = DEFAULT_SETTINGS
): QuestionCard | null {
  if (cards.length === 0) return null;
  
  // 1. D'abord les cartes dues (steps_until_due = 0)
  const dueCards = cards.filter(card => card.steps_until_due <= 0 && !card.is_leech);
  
  if (dueCards.length > 0) {
    // Prioriser par niveau de maîtrise (plus faible = plus urgent)
    return dueCards.sort((a, b) => a.L - b.L)[0];
  }
  
  // 2. Ensuite les leeches si pas d'autres cartes
  const leechCards = cards.filter(card => card.is_leech && card.steps_until_due <= 0);
  if (leechCards.length > 0) {
    return leechCards.sort((a, b) => a.lapses - b.lapses)[0]; // Plus problématique en premier
  }
  
  // 3. Sinon, nouvelles cartes (L = 0)
  const newCards = cards.filter(card => card.L === 0 && card.steps_until_due <= 0);
  if (newCards.length > 0) {
    return newCards.sort((a, b) => a.position - b.position)[0]; // Dans l'ordre de création
  }
  
  // 4. En dernier recours, la carte la plus proche d'être due
  return cards.sort((a, b) => a.steps_until_due - b.steps_until_due)[0];
}

/**
 * Décrémente les steps_until_due de toutes les cartes après qu'une carte ait été vue
 */
export function decrementSteps(cards: QuestionCard[], currentCardId: string): QuestionCard[] {
  return cards.map(card => {
    if (card.id === currentCardId) {
      return card; // Ne pas décrémenter la carte actuelle
    }
    
    return {
      ...card,
      steps_until_due: Math.max(0, card.steps_until_due - 1)
    };
  });
}

// =============================================
// RÉINSERTION DANS LA FILE
// =============================================

/**
 * Réinsère une carte dans la file à la bonne position
 */
export function reinsertCard(
  cards: QuestionCard[], 
  updatedCard: QuestionCard, 
  currentPosition: number
): QuestionCard[] {
  // Retirer la carte actuelle
  const filteredCards = cards.filter(c => c.id !== updatedCard.id);
  
  // Calculer la nouvelle position (currentPosition + g)
  const targetPosition = Math.min(currentPosition + updatedCard.g, filteredCards.length);
  
  // Réinsérer à la position calculée
  const result = [...filteredCards];
  result.splice(targetPosition, 0, updatedCard);
  
  // Mettre à jour les positions
  return result.map((card, index) => ({
    ...card,
    position: index
  }));
}

// =============================================
// STATISTIQUES ET CATÉGORISATION
// =============================================

/**
 * Calcule les statistiques de révision
 */
export function calculateRevisionStats(cards: QuestionCard[]): RevisionStats {
  const stats: RevisionStats = {
    total_cards: cards.length,
    new_cards: 0,
    learning_cards: 0,
    mature_cards: 0,
    leech_cards: 0,
    categories: {}
  };
  
  // Grouper par niveau de maîtrise
  const levelGroups: { [level: number]: QuestionCard[] } = {};
  
  cards.forEach(card => {
    // Compteurs principaux
    if (card.is_leech) {
      stats.leech_cards++;
    } else if (card.L === 0) {
      stats.new_cards++;
    } else if (card.L < 5) {
      stats.learning_cards++;
    } else {
      stats.mature_cards++;
    }
    
    // Groupement par niveau
    if (!levelGroups[card.L]) {
      levelGroups[card.L] = [];
    }
    levelGroups[card.L].push(card);
  });
  
  // Calculer les statistiques par catégorie
  Object.keys(levelGroups).forEach(levelStr => {
    const level = parseInt(levelStr);
    const cardsInLevel = levelGroups[level];
    
    stats.categories[level] = {
      count: cardsInLevel.length,
      avg_streak: cardsInLevel.reduce((sum, card) => sum + card.streak, 0) / cardsInLevel.length,
      avg_lapses: cardsInLevel.reduce((sum, card) => sum + card.lapses, 0) / cardsInLevel.length,
      questions: cardsInLevel
    };
  });
  
  return stats;
}

/**
 * Obtient le label d'une catégorie selon le niveau
 */
export function getCategoryLabel(level: number): string {
  if (level === 0) return '🆕 Nouvelles';
  if (level < 3) return '📚 Apprentissage';
  if (level < 5) return '⚡ En cours';
  if (level < 8) return '💪 Maîtrisées';
  return '🏆 Expertes';
}

/**
 * Obtient la couleur d'une catégorie selon le niveau
 */
export function getCategoryColor(level: number): string {
  if (level === 0) return 'bg-gray-100 text-gray-800';
  if (level < 3) return 'bg-red-100 text-red-800';
  if (level < 5) return 'bg-yellow-100 text-yellow-800';
  if (level < 8) return 'bg-blue-100 text-blue-800';
  return 'bg-green-100 text-green-800';
}

// =============================================
// UTILITAIRES DE SESSION
// =============================================

/**
 * Détermine si il faut introduire une nouvelle carte
 */
export function shouldIntroduceNewCard(
  cardsReviewed: number, 
  settings: RevisionSettings
): boolean {
  return cardsReviewed > 0 && cardsReviewed % settings.steps_between_new === 0;
}

/**
 * Obtient les cartes éligibles pour une session de révision
 */
export function getEligibleCards(
  cards: QuestionCard[], 
  settings: RevisionSettings,
  maxCards: number = 20
): QuestionCard[] {
  // Trier par priorité : dues, leeches, nouvelles, puis autres
  const dueCards = cards.filter(card => card.steps_until_due <= 0 && !card.is_leech);
  const leechCards = cards.filter(card => card.is_leech && card.steps_until_due <= 0);
  const newCards = cards.filter(card => card.L === 0 && card.steps_until_due <= 0)
    .slice(0, settings.new_cards_per_session);
  
  // Combiner et limiter
  const eligible = [
    ...dueCards.sort((a, b) => a.L - b.L),
    ...leechCards.sort((a, b) => b.lapses - a.lapses),
    ...newCards.sort((a, b) => a.position - b.position)
  ];
  
  return eligible.slice(0, maxCards);
}



