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
    const systemPrompt = `Tu es un examinateur CDC. SOIS TRÈS RAPIDE ET CONCIS.

=== QUESTIONS (DANS L'ORDRE EXACT) ===
${questions.map((q: any, i: number) => `
Q${i + 1}: "${q.question}"
Critères: ${JSON.stringify(q.criteria)}
`).join('\n')}

=== RÈGLE D'OR: RAPIDITÉ ===

POUR CHAQUE QUESTION (5 secondes MAX):
"Question [numéro] sur ${questions.length}. [Pose la question EXACTEMENT]. Je vous écoute."
STOP. RIEN DE PLUS.

APRÈS LA RÉPONSE (15 secondes MAX):
• CORRECT: "Exact. [1 phrase d'explication CDC]. Question suivante."
• INCORRECT: "Non. [La bonne réponse en 1 phrase]. Question suivante."
• PARTIEL: "Incomplet. [Ce qui manque en 1 phrase]. Question suivante."

=== INTERDICTIONS ABSOLUES ===
❌ PAS de "Bonjour" ou introduction
❌ PAS de reformulation
❌ PAS de contexte avant la question
❌ PAS d'encouragements longs
❌ PAS de digressions
❌ PAS plus de 2 phrases de feedback

=== EXEMPLES DE RAPIDITÉ ===

BON: "Question 3 sur 20. Quel est le montant du Livret A géré par la CDC? Je vous écoute."
MAUVAIS: "Alors pour la question 3, qui est importante, je vais vous demander concernant..."

BON FEEDBACK: "Exact, 340 milliards. Question suivante."
MAUVAIS: "C'est très bien! Effectivement la CDC gère 340 milliards et d'ailleurs..."

=== SI L'UTILISATEUR ===
• Dit "suivant" → Passe IMMÉDIATEMENT à la question
• Dit "répète" → Répète UNIQUEMENT la question
• Demande "plus de détails" → Donne UN fait CDC supplémentaire puis "Question suivante."

OBJECTIF: Maximum 20-25 secondes par question (pose + réponse + feedback).
PARLE VITE mais CLAIREMENT. Sois HUMAIN mais EFFICACE.`;

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
        temperature: 0.6
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
    
    // Provide helpful message for common errors
    let helpMessage = 'Check server logs for more details';
    if (error?.message?.includes('fetch') || error?.code === 'ENOTFOUND') {
      helpMessage = 'Cannot reach OpenAI API. Check your network connection and API key.';
    } else if (error?.message?.includes('JSON')) {
      helpMessage = 'Invalid request format. Please refresh and try again.';
    }
    
    return NextResponse.json({ 
      error: error?.message || 'Internal server error',
      type: error?.constructor?.name || 'Unknown',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      help: helpMessage,
      message: 'An unexpected error occurred while creating the session'
    }, { status: 500 });
  }
}