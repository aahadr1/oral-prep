import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { QuestionDraft } from '@/lib/quiz/types';
import { questionDraftArraySchema } from '@/lib/quiz/validation';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { projectId, draftId, name, items } = body || {};
    if (!projectId || !items) {
      return NextResponse.json({ error: 'Missing projectId or items' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    // Verify ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Validate items
    let drafts: QuestionDraft[];
    try {
      drafts = questionDraftArraySchema.parse(items) as QuestionDraft[];
    } catch (e: any) {
      return NextResponse.json({ error: 'Invalid items schema', details: e?.errors }, { status: 400 });
    }

    // Create batch
    const { data: batch, error: batchErr } = await supabase
      .from('quiz_batch')
      .insert({
        project_id: projectId,
        name: name || 'Bulk import',
        source_type: 'bulk',
        total: drafts.length,
        created_by: user.id,
      })
      .select('*')
      .single();
    if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 });

    // Insert questions
    const rows = drafts.map((d) => ({
      project_id: projectId,
      batch_id: batch.id,
      raw: d.raw,
      question: d.question,
      canonical_answer: d.canonicalAnswer,
      key_points: d.keyPoints,
      acceptable_synonyms: d.acceptableSynonyms,
      hints: d.hints ?? null,
      followups: d.followups,
      topic: d.topic ?? null,
      difficulty: d.difficulty ?? null,
    }));

    const { error: qErr } = await supabase.from('quiz_questions').insert(rows);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    return NextResponse.json({ batchId: batch.id, questionIds: undefined });
  } catch (err: any) {
    console.error('bulk commit error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}




