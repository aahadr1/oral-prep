import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { getCurrentUser } from '@/lib/auth';

// Creates an ephemeral GPT-4o Realtime session token for browser use.
// Client then uses this token to complete a WebRTC SDP handshake directly with OpenAI.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      instructions,
      language = 'fr',
      voice = 'alloy',
      model = 'gpt-4o-realtime-preview-2024-12-17',
    } = body || {};

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    // Compose system instructions with guardrails
    const systemInstructions =
      (instructions ? String(instructions) + '\n\n' : '') +
      (language === 'fr'
        ? 'Règles: Réponds uniquement en français. Joue le rôle d\'un tuteur pédagogique, pose des questions de clarification si nécessaire, reste factuel par rapport à l\'explication fournie.'
        : 'Rules: Reply in French. Act as a tutoring assistant; ask clarifying questions and stay grounded in the provided explanation.');

    const resp = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify({
        model,
        voice,
        modalities: ['audio', 'text'],
        // Realtime API expects an object for turn detection
        turn_detection: {
          type: 'server_vad',
          silence_duration_ms: 400,
        },
        instructions: systemInstructions,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `OpenAI session error: ${text}` }, { status: 500 });
    }

    const json = await resp.json();
    // Return minimal fields the client needs
    return NextResponse.json({
      model: json?.model || model,
      client_secret: json?.client_secret?.value || json?.client_secret,
    });
  } catch (error: any) {
    console.error('Realtime session error:', error);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}


