import { runTextModel } from '@/lib/replicate';
import type { QuestionDraft } from './types';
import { clampDraft, validateDraftItems } from './validation';

type Candidate = { raw: string; question: string };

function extractJson(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) return fence[1];
  return t;
}

export async function parseCandidatesFromText(input: string, targetCount = 30): Promise<Candidate[]> {
  const system = 'Tu normalises des notes d\'études en questions orales distinctes. Réponds uniquement en JSON valide.';
  const user = `Extrait jusqu'à ${Math.min(40, Math.max(1, targetCount + 5))} questions candidates sous forme JSON.
Schéma attendu (array): [{"raw": "extrait original", "question": "question concise"}]
Texte source:\n${input}`;

  const out = await runTextModel(user, system);
  try {
    const jsonText = extractJson(out);
    const parsed = JSON.parse(jsonText);
    const candidates = (Array.isArray(parsed) ? parsed : []).filter((c: any) => c && c.raw && c.question);
    // Deduplicate by question
    const seen = new Set<string>();
    const unique = candidates.filter((c: Candidate) => {
      const key = c.question.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.slice(0, targetCount);
  } catch (e) {
    console.error('parseCandidatesFromText error:', e, out);
    return [];
  }
}

export async function expandCandidatesToDrafts(candidates: Candidate[]): Promise<QuestionDraft[]> {
  if (candidates.length === 0) return [];
  const system = 'Tu produis des questions orales prêtes à être posées avec une réponse canonique et une grille d\'évaluation concise. JSON strict.';
  const user = `Transforme ces questions candidates en objets complets.
Schéma exact par élément:
{
  "raw": string,
  "question": string,
  "canonicalAnswer": string,
  "keyPoints": string[],
  "acceptableSynonyms": { [index: number]: string[] },
  "hints": string | null,
  "followups": [
    {"trigger": {"missingKeyPointIndices": number[]}, "prompt": string, "expectedAnswer": string, "keyPoints": string[]}
  ],
  "topic": string | null,
  "difficulty": "easy" | "medium" | "hard"
}
Contraintes: 3–5 points clés; max 2 suivis; réponses courtes.
Entrées:
${JSON.stringify(candidates, null, 2)}`;

  const out = await runTextModel(user, system);
  try {
    const jsonText = extractJson(out);
    const parsed = JSON.parse(jsonText);
    let items = validateDraftItems(parsed);
    // Clamp and finalize
    items = items.map(clampDraft);
    return items;
  } catch (e) {
    console.error('expandCandidatesToDrafts error:', e, out);
    return [];
  }
}

export async function generateBulkDraft(text: string, targetCount = 30): Promise<QuestionDraft[]> {
  const candidates = await parseCandidatesFromText(text, targetCount);
  const drafts = await expandCandidatesToDrafts(candidates);
  // Ensure at most 30
  return drafts.slice(0, 30);
}




