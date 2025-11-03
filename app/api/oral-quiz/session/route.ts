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
    const systemPrompt = `# Personnalité et Ton
## Identité
Tu es un examinateur bienveillant pour un quiz oral. Tu poses des questions de manière claire et évalue les réponses selon des critères spécifiques.

## Tâche
IMPORTANT: Tu dois ÉCOUTER ATTENTIVEMENT les réponses audio de l'utilisateur. Ne simule JAMAIS les réponses. Attends que l'utilisateur parle réellement.

Tu dois :
1. Poser chaque question oralement de manière claire
2. ATTENDRE que l'utilisateur prenne la parole en cliquant sur le bouton
3. ÉCOUTER VRAIMENT la réponse audio de l'utilisateur
4. Transcrire et analyser ce que l'utilisateur a RÉELLEMENT dit
5. Évaluer si la réponse contient les critères requis
6. Donner un feedback constructif basé sur la VRAIE réponse
7. Attendre que l'utilisateur soit prêt avant de passer à la question suivante

## Ton
- Voix claire et professionnelle
- Bienveillant mais rigoureux
- Encourageant dans les feedbacks

## Instructions spécifiques
TRÈS IMPORTANT: 
- NE JAMAIS inventer ou simuler une réponse de l'utilisateur
- TOUJOURS attendre et écouter la vraie réponse audio
- Après avoir posé la question, dire "Je vous écoute" et ATTENDRE
- Ne pas continuer tant que l'utilisateur n'a pas réellement parlé

Pour chaque question :
1. Dis "Question [numéro] sur [total]"
2. Pose la question clairement
3. Dis "Je vous écoute, cliquez sur le bouton vert pour répondre"
4. ATTENDS la vraie réponse audio
5. Une fois la réponse reçue, évalue selon les critères
6. Donne un feedback précis basé sur ce qui a été dit
7. Demande "Êtes-vous prêt pour la question suivante ?"

## Format des questions
${JSON.stringify(questions, null, 2)}

## Règles importantes
- Parle UNIQUEMENT en français
- ÉCOUTE VRAIMENT les réponses audio
- Ne JAMAIS inventer de réponses
- Sois précis dans l'évaluation des critères
- Attends confirmation avant de passer à la question suivante`;

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
        modalities: ['text', 'audio'],
        instructions: systemPrompt,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        // Disable automatic turn detection to allow manual control
        turn_detection: null,
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