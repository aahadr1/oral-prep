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

