export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface OralQuizQuestion {
  question: string;
  criteria: string[];
}

export interface OralQuiz {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  questions: OralQuizQuestion[];
  created_at: string;
  updated_at: string;
}

export interface OralQuizSession {
  id: string;
  quiz_id: string;
  user_id: string;
  responses: {
    question: string;
    user_response: string;
    agent_feedback: string;
  }[];
  completed_at: string | null;
  created_at: string;
}

// 🧠 Types pour le système de révision intelligent
export type RevisionResponse = 'again' | 'hard' | 'good' | 'easy';

export interface QuestionCard {
  id: string;
  user_id: string;
  quiz_id: string;
  question: string;
  criteria: string[];
  
  // Métriques de l'algorithme de révision
  L: number;          // Niveau de maîtrise (≥ 0)
  g: number;          // Écart en pas avant prochaine apparition (≥ 1)
  streak: number;     // Nombre de réussites d'affilée
  lapses: number;     // Nombre d'échecs
  is_leech: boolean;  // Carte problématique
  
  // Position dans la file
  position: number;
  steps_until_due: number;  // Nombre de pas restants avant révision
  
  created_at: string;
  updated_at: string;
  last_reviewed_at: string | null;
}

export interface RevisionSettings {
  // Constantes de l'algorithme
  beta_low: number;   // Multiplicateur faible (ex: 1.2)
  beta_mid: number;   // Multiplicateur moyen (ex: 2.0)
  beta_high: number;  // Multiplicateur élevé (ex: 3.0)
  
  // Seuils
  leech_threshold: number;  // Seuil pour marquer comme leech (ex: 8)
  new_cards_per_session: number;  // Nouvelles cartes par session (ex: 5)
  
  // Cadence
  steps_between_new: number;  // Pas entre introduction de nouvelles cartes (ex: 3)
}

export interface RevisionSession {
  id: string;
  user_id: string;
  quiz_id: string;
  
  // État de la session
  cards_reviewed: number;
  cards_remaining: number;
  current_card_id: string | null;
  
  // Métriques de performance
  responses: {
    card_id: string;
    question: string;
    response: RevisionResponse;
    previous_L: number;
    new_L: number;
    previous_g: number;
    new_g: number;
    timestamp: string;
  }[];
  
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface RevisionStats {
  total_cards: number;
  new_cards: number;           // L = 0
  learning_cards: number;      // 0 < L < 5 
  mature_cards: number;        // L >= 5
  leech_cards: number;
  
  // Catégories de maîtrise
  categories: {
    [level: number]: {
      count: number;
      avg_streak: number;
      avg_lapses: number;
      questions: QuestionCard[];
    };
  };
}

