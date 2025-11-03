export type Difficulty = 'easy' | 'medium' | 'hard';

export type Followup = {
  trigger: { missingKeyPointIndices: number[] };
  prompt: string;
  expectedAnswer: string;
  keyPoints: string[];
};

export type QuestionDraft = {
  raw: string;
  question: string;
  canonicalAnswer: string; // ≤2 sentences
  keyPoints: string[]; // 3–5
  acceptableSynonyms: Record<number, string[]>; // per key point
  hints?: string;
  followups: Followup[];
  topic?: string;
  difficulty?: Difficulty;
};

export type BulkDraftResponse = {
  draftId: string;
  items: QuestionDraft[];
};




