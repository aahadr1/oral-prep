import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { runTTSModel } from '@/lib/replicate';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, language = 'fr', speaker, pageTitle, speed } = body;

    console.log('Voice API request body:', { text: text?.substring(0, 100) + '...', language, speaker, pageTitle, speed });

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Directly synthesize with minimax speech-02-turbo (text already in spoken style)
    console.log('Calling runTTSModel with speed:', speed);
    const audioUrl = await runTTSModel(text, {
      voiceId: 'Deep_Voice_Man',
      languageBoost: 'French',
      speed: speed ?? 1.3,
      volume: 1,
      pitch: 0,
      sampleRate: 32000,
      bitrate: 128000,
      channel: 'mono',
      emotion: 'auto',
      englishNormalization: false,
    });

    return NextResponse.json({
      audioUrl,
      language,
      text,
    });
  } catch (error: any) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

