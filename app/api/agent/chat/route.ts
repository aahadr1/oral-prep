import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServer } from '@/lib/supabase/server';
import { runTextModel } from '@/lib/replicate';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      projectId,
      documentId,
      page,
      userText,
      instructions,
    } = body || {};

    if (!projectId || !userText || !instructions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const systemPrompt = `Tu es un tuteur pédagogique francophone.
Règles:
- Réponds UNIQUEMENT en français
- Ta réponse doit être concise, claire et pédagogique
- Base-toi sur l'explication de page fournie comme contexte, ne fabrique pas d'informations
- Si la question est ambiguë, demande une clarification courte
\nContexte:\n${String(instructions).slice(0, 4000)}`;

    const userPrompt = `Question de l'utilisateur (page ${page ?? '?'}):\n${String(userText).slice(0, 2000)}`;

    let assistantText: string;
    try {
      assistantText = await runTextModel(userPrompt, systemPrompt);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'LLM error' }, { status: 500 });
    }

    if (!assistantText || !assistantText.trim()) {
      return NextResponse.json({ error: 'Empty model response' }, { status: 500 });
    }

    await supabase.rpc('increment_api_usage', {
      p_user_id: user.id,
      p_action: 'text',
    });

    return NextResponse.json({ assistantText: String(assistantText) });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}


