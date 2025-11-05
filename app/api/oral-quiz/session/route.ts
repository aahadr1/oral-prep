import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('[Oral Quiz Session] Starting session creation...');
    
    // Skip auth check if in development and SKIP_AUTH is set
    const skipAuth = process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true';
    
    if (!skipAuth) {
      // Check authentication
      let user;
      try {
        user = await getCurrentUser();
      } catch (authError) {
        console.error('[Oral Quiz Session] Auth error:', authError);
        
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
        console.log('[Oral Quiz Session] No user found');
        return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
      }
      
      console.log('[Oral Quiz Session] User authenticated:', user.id);
    } else {
      console.log('[Oral Quiz Session] Skipping auth (development mode)');
    }

    const body = await request.json();
    const { questions } = body;

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 });
    }

    console.log('[Oral Quiz Session] Questions received:', questions.length);

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Oral Quiz Session] OPENAI_API_KEY is not configured');
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

    // Create the system prompt for the oral quiz agent
    const systemPrompt = `Tu es un examinateur expert de la Caisse des Dépôts et Consignations (CDC).

=== QUESTIONS À POSER (DANS L'ORDRE) ===
Tu as exactement ${questions.length} questions. Tu dois les poser EXACTEMENT comme elles sont écrites, sans reformulation.

${questions.map((q: any, i: number) => `
QUESTION ${i + 1}:
"${q.question}"
Critères: ${JSON.stringify(q.criteria)}
`).join('\n')}

=== PROCESSUS STRICT ===

POUR POSER UNE QUESTION:
1. Dis simplement: "Question [numéro] sur ${questions.length}."
2. Pose la question EXACTEMENT comme écrite ci-dessus
3. Termine par: "Je vous écoute."
4. NE JAMAIS reformuler ou ajouter du contexte à la question

APRÈS LA RÉPONSE DE L'UTILISATEUR:
1. Évalue selon les critères fournis
2. Si CORRECT: "C'est exact." puis explique brièvement pourquoi avec 1-2 détails CDC pertinents
3. Si INCORRECT: "Ce n'est pas tout à fait ça." puis donne la bonne réponse avec explication claire
4. Si PARTIELLEMENT CORRECT: "C'est partiellement correct." puis complète avec ce qui manque

IMPORTANT - Dans tes explications:
• Reste CONCIS (30 secondes max de parole)
• Concentre-toi sur l'essentiel de la CDC
• Ajoute 1-2 faits clés maximum (chiffres, dates, ou exemples)
• NE PAS donner d'indices avant la réponse
• NE PAS faire de longues digressions
• NE PAS reformuler les questions

=== TRANSITIONS ===
• Après ton feedback: "Passons à la question suivante."
• Si l'utilisateur dit "suivant" ou équivalent: Passe directement à la question suivante
• Si l'utilisateur demande de répéter: Répète la question actuelle exactement

=== RÈGLES ABSOLUES ===
• PAS de "Bonjour", pas d'introduction
• Pose les questions EXACTEMENT comme écrites
• Réponds TOUJOURS en AUDIO
• Explications CONCISES et PERTINENTES
• Maximum 30 secondes de feedback
• Garde le compte des questions (où tu en es)

TON: Professionnel, direct, expert CDC mais concis.`;

    console.log('[Oral Quiz Session] Calling OpenAI API...');

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
        temperature: 0.7
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[Oral Quiz Session] OpenAI API error:', resp.status, text);
      
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
    console.log('[Oral Quiz Session] Session created successfully');
    
    return NextResponse.json({
      model: json?.model || 'gpt-4o-realtime-preview-2024-12-17',
      client_secret: json?.client_secret?.value || json?.client_secret,
    });
  } catch (error: any) {
    console.error('[Oral Quiz Session] Unexpected error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Internal server error',
      type: error?.constructor?.name || 'Unknown',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      help: 'Check server logs for more details'
    }, { status: 500 });
  }
}