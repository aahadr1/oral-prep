import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('[Oral Blanc Session] Starting session creation...');
    
    // Skip auth check if in development and SKIP_AUTH is set
    const skipAuth = process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true';
    
    if (!skipAuth) {
      // Check authentication
      let user;
      try {
        user = await getCurrentUser();
      } catch (authError) {
        console.error('[Oral Blanc Session] Auth error:', authError);
        
        // If Supabase is not configured, provide helpful message
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          return NextResponse.json({ 
            error: 'Supabase not configured',
            message: 'To test without authentication, add SKIP_AUTH=true to .env.local',
            help: 'Or configure Supabase: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          error: 'Authentication failed',
          details: authError instanceof Error ? authError.message : 'Unknown auth error'
        }, { status: 401 });
      }
      
      if (!user) {
        console.log('[Oral Blanc Session] No user found');
        return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
      }
      
      console.log('[Oral Blanc Session] User authenticated:', user.id);
    } else {
      console.log('[Oral Blanc Session] Skipping auth (development mode)');
    }

    const body = await request.json();
    const { topic } = body;

    if (!topic || topic.trim().length === 0) {
      return NextResponse.json({ error: 'No topic provided' }, { status: 400 });
    }

    console.log('[Oral Blanc Session] Topic received, length:', topic.length);

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Oral Blanc Session] OPENAI_API_KEY is not configured');
      return NextResponse.json({ 
        error: 'OPENAI_API_KEY not configured',
        solution: 'Add to .env.local: OPENAI_API_KEY=sk-...',
        quickFix: 'See QUICK_FIX_ORAL_QUIZ.md for step-by-step instructions'
      }, { status: 500 });
    }

    // Verify API key format
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      return NextResponse.json({ 
        error: 'Invalid OPENAI_API_KEY format',
        message: 'API key should start with "sk-"',
        help: 'Get your key from: https://platform.openai.com/api-keys'
      }, { status: 500 });
    }

    // Create the system prompt for the oral blanc agent (jury simulation)
    const systemPrompt = `Tu es un membre de jury de concours expérimenté et exigeant mais bienveillant.

=== SUJET D'INTERROGATION ===
Voici le matériel sur lequel tu vas interroger le candidat:

${topic}

=== TON RÔLE ===
Tu es un jury de concours qui interroge un candidat sur le sujet ci-dessus. Tu dois:
1. Poser des questions pertinentes et approfondies basées sur le contenu fourni
2. Adapter tes questions au niveau de réponse du candidat
3. Creuser plus profond quand le candidat répond bien
4. Aider gentiment quand le candidat a des difficultés
5. Poser des questions de différents types: définitions, explications, applications, analyse critique

=== PROCESSUS D'INTERROGATION ===
1. DÉBUT: Présente-toi brièvement comme membre du jury et annonce le sujet
2. PREMIÈRE QUESTION: Commence par une question générale pour évaluer le niveau
3. QUESTIONS SUIVANTES: 
   - Si le candidat répond bien, pose des questions plus approfondies
   - Si le candidat a des difficultés, reformule ou pose des questions plus simples
   - Varie les types de questions (concepts, détails, liens, applications)
4. FEEDBACK: Donne un bref feedback après chaque réponse (positif ou constructif)
5. PROGRESSION: Couvre différents aspects du sujet fourni
6. Ne pose qu'UNE question à la fois
7. Attends la réponse complète avant de passer à la suite

=== STYLE DE QUESTIONS ===
Exemples de types de questions à poser:
- "Pouvez-vous expliquer le concept de...?"
- "Quelles sont les principales causes de...?"
- "Comment analysez-vous...?"
- "Quelle est la différence entre X et Y?"
- "Quelles sont les conséquences de...?"
- "Comment appliqueriez-vous ce principe dans...?"
- "Pouvez-vous développer ce point...?"

=== INSTRUCTION DE DÉMARRAGE ===
Dès que le candidat dit qu'il est prêt, réponds en AUDIO:
"Bonjour, je suis membre du jury. Nous allons vous interroger sur [sujet principal]. Êtes-vous prêt(e)?"

Puis attends confirmation et pose ta première question.

=== RÈGLES ABSOLUES ===
- Réponds TOUJOURS en AUDIO (parler)
- Pose UNE SEULE question à la fois
- Attends la réponse complète avant de continuer
- Sois exigeant mais encourageant
- Base tes questions sur le contenu fourni
- Adapte ton niveau au candidat
- Donne des feedbacks constructifs
- Toujours en français, ton professionnel

TON: Professionnel, rigoureux mais bienveillant, comme un vrai jury de concours.`;

    console.log('[Oral Blanc Session] Calling OpenAI API...');

    // Create session with OpenAI Realtime API
    const resp = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
        modalities: ['audio', 'text'],
        instructions: systemPrompt,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        // Enable server VAD for better turn detection
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        tools: [],
        temperature: 0.8
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[Oral Blanc Session] OpenAI API error:', resp.status, text);
      
      // Parse error for better feedback
      let errorMessage = 'OpenAI session creation failed';
      let errorDetails: any = {};
      
      try {
        errorDetails = JSON.parse(text);
        errorMessage = errorDetails.error?.message || errorMessage;
      } catch {
        errorMessage = text || 'Unknown OpenAI error';
      }
      
      // Specific error handling
      if (resp.status === 401) {
        return NextResponse.json({ 
          error: 'Invalid API key',
          message: 'Your OpenAI API key is invalid or expired',
          solution: 'Check your key at: https://platform.openai.com/api-keys'
        }, { status: 500 });
      }
      
      if (resp.status === 404 && errorMessage.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Realtime API not available',
          message: 'You may not have access to the Realtime API (gpt-4o-realtime-preview)',
          solution: 'Contact OpenAI support or check: https://platform.openai.com/docs/guides/realtime'
        }, { status: 500 });
      }
      
      if (resp.status === 429) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded',
          message: 'Too many requests or insufficient credits',
          solution: 'Check your usage at: https://platform.openai.com/usage'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        status: resp.status,
        details: errorDetails
      }, { status: 500 });
    }

    const json = await resp.json();
    console.log('[Oral Blanc Session] Session created successfully');
    
    return NextResponse.json({
      model: json?.model || 'gpt-4o-realtime-preview-2024-12-17',
      client_secret: json?.client_secret?.value || json?.client_secret,
    });
  } catch (error: any) {
    console.error('[Oral Blanc Session] Unexpected error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Internal server error',
      type: error?.constructor?.name || 'Unknown',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      help: 'Check server logs for more details'
    }, { status: 500 });
  }
}

