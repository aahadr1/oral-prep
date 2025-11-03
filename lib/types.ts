export interface Project {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  name: string;
  path: string;
  size_bytes: number;
  content_type: string;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export type QuizItemType = 'mcq' | 'flashcard' | 'open';

export interface Quiz {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuizItem {
  id: string;
  quiz_id: string;
  type: QuizItemType;
  question: string;
  options?: string[]; // For MCQ
  answer: string;
  explanation?: string;
  source_document_id?: string;
  page_from?: number;
  page_to?: number;
  created_at: string;
  updated_at: string;
}

export interface QuizReview {
  id: string;
  quiz_item_id: string;
  user_id: string;
  ease: number;
  interval_days: number;
  due_at: string;
  last_reviewed_at: string;
  review_count: number;
  created_at: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  document_id?: string;
  page?: number;
  title?: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiUsage {
  id: string;
  user_id: string;
  action: 'vision' | 'text';
  count: number;
  date: string;
  created_at: string;
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

