import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServer } from '@/lib/supabase/server';
import { generateBulkDraft } from '@/lib/quiz/generation';
import type { BulkDraftResponse } from '@/lib/quiz/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { projectId, text, targetCount } = body || {};
    if (!projectId || !text) {
      return NextResponse.json({ error: 'Missing projectId or text' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Generate drafts
    const items = await generateBulkDraft(String(text), Math.min(30, Math.max(1, Number(targetCount) || 30)));

    // Return a stateless draftId (client can echo it back on commit)
    const draftId = (globalThis.crypto || (await import('crypto'))).randomUUID();
    const response: BulkDraftResponse = { draftId, items };
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('bulk import draft error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}




