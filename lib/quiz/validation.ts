import { z } from 'zod';
import type { QuestionDraft } from './types';

export const followupSchema = z.object({
  trigger: z.object({
    missingKeyPointIndices: z.array(z.number().int().min(0)).min(1).max(3),
  }),
  prompt: z.string().min(5).max(200),
  expectedAnswer: z.string().min(3).max(280),
  keyPoints: z.array(z.string().min(2).max(120)).min(1).max(3),
});

export const questionDraftSchema = z.object({
  raw: z.string().min(1).max(4000),
  question: z.string().min(8).max(160),
  canonicalAnswer: z.string().min(5).max(280),
  keyPoints: z.array(z.string().min(2).max(120)).min(3).max(5),
  acceptableSynonyms: z.record(z.string()).or(
    z.record(z.number(), z.array(z.string().min(1).max(80)).max(10)) as unknown as z.ZodType<Record<number, string[]>>
  ),
  hints: z.string().max(200).optional(),
  followups: z.array(followupSchema).max(2),
  topic: z.string().max(120).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

export const questionDraftArraySchema = z.array(questionDraftSchema).min(1).max(30);

export type QuestionDraftValidated = z.infer<typeof questionDraftSchema>;

function normalizeSynonyms(value: Record<string, string> | Record<number, string[]>): Record<number, string[]> {
  const result: Record<number, string[]> = {};
  for (const [key, rawVal] of Object.entries(value)) {
    const index = Number(key);
    if (Number.isNaN(index)) continue;

    if (Array.isArray(rawVal)) {
      const cleaned = rawVal
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map((entry) => entry.trim());
      if (cleaned.length > 0) {
        result[index] = cleaned;
      }
    } else if (typeof rawVal === 'string') {
      const trimmed = rawVal.trim();
      if (trimmed) {
        result[index] = [trimmed];
      }
    }
  }
  return result;
}

export function validateDraftItems(items: unknown): QuestionDraft[] {
  const parsed = questionDraftArraySchema.parse(items);
  return parsed.map((item) => ({
    ...item,
    acceptableSynonyms: normalizeSynonyms(item.acceptableSynonyms),
  }));
}

export function clampDraft(draft: QuestionDraft): QuestionDraft {
  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
  return {
    ...draft,
    question: truncate(draft.question, 160),
    canonicalAnswer: truncate(draft.canonicalAnswer, 280),
    hints: draft.hints ? truncate(draft.hints, 200) : undefined,
    keyPoints: draft.keyPoints.slice(0, 5).map((k) => truncate(k, 120)),
    followups: (draft.followups || []).slice(0, 2).map((f) => ({
      ...f,
      prompt: truncate(f.prompt, 200),
      expectedAnswer: truncate(f.expectedAnswer, 280),
      keyPoints: f.keyPoints.slice(0, 3).map((k) => truncate(k, 120)),
      trigger: {
        missingKeyPointIndices: Array.from(new Set((f.trigger?.missingKeyPointIndices || []).map((i) => Math.max(0, Math.min(9, i))))).slice(0, 3),
      },
    })),
  };
}




