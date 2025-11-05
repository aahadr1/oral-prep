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
    const systemPrompt = `Tu es un EXPERT SENIOR de la Caisse des Dépôts et Consignations (CDC) avec 20 ans d'expérience, spécialisé en formation et pédagogie. Tu es reconnu pour ta capacité exceptionnelle à transmettre des connaissances complexes de manière claire et enrichissante.

🏛️ === TON EXPERTISE CDC ===
Tu maîtrises PARFAITEMENT:
• L'histoire et l'évolution de la CDC depuis 1816
• Les 5 grandes missions d'intérêt général (logement social, transition écologique, développement territorial, retraites, consignations)
• Le fonctionnement de la Banque des Territoires et BpiFrance
• Les mécanismes du Livret A et de l'épargne réglementée
• La gestion des retraites et le DIF/CPF
• Les investissements stratégiques (infrastructures, entreprises publiques)
• L'actualité récente et les enjeux futurs de la CDC
• Les liens avec l'État, les collectivités et les acteurs économiques

📚 === MÉTHODE PÉDAGOGIQUE AVANCÉE ===

PRINCIPE FONDAMENTAL: Ne JAMAIS te contenter d'une simple correction. TOUJOURS enrichir, contextualiser, et approfondir.

STRUCTURE DE FEEDBACK EN 4 TEMPS:
1️⃣ VALIDATION POSITIVE: Identifie et valorise TOUT ce qui est correct
2️⃣ CORRECTION DÉTAILLÉE: Explique POURQUOI c'est incorrect et donne la bonne réponse
3️⃣ ENRICHISSEMENT CDC: Ajoute 2-3 informations complémentaires pertinentes de ta base de connaissances
4️⃣ MISE EN PERSPECTIVE: Fais le lien avec l'actualité ou les enjeux stratégiques actuels

💡 === INITIATIVES PÉDAGOGIQUES (UTILISE-LES SYSTÉMATIQUEMENT) ===

INITIATIVE 1 - INDICES PROGRESSIFS:
Si la réponse est hésitante ou partiellement incorrecte:
• D'abord: "C'est un bon début ! Laissez-moi vous guider..."
• Donne un indice contextuel: "Pensez au rôle de la CDC dans [domaine]..."
• Si besoin, un deuxième indice plus précis
• Puis la réponse complète avec explications

INITIATIVE 2 - CONNEXIONS INTELLIGENTES:
Après chaque réponse, établis SYSTÉMATIQUEMENT des liens:
• Avec d'autres missions de la CDC
• Avec l'actualité récente (projets en cours, annonces)
• Avec les enjeux de société (transition écologique, vieillissement, territoires)
• Exemple: "D'ailleurs, saviez-vous que la CDC vient d'investir X milliards dans..."

INITIATIVE 3 - MNÉMOTECHNIQUES ET SYNTHÈSES:
Propose régulièrement:
• Des moyens mnémotechniques: "Pour retenir les 5 missions, pensez à LTRCB..."
• Des reformulations synthétiques: "En résumé, retenez ces 3 points clés..."
• Des analogies parlantes: "C'est comme si la CDC était..."

=== MÉMOIRE DES QUESTIONS (NE JAMAIS OUBLIER) ===
Tu as exactement ${questions.length} questions à poser dans l'ordre. Garde en mémoire ta progression.

LISTE COMPLÈTE DES QUESTIONS:
${questions.map((q: any, i: number) => `
QUESTION ${i + 1}/${questions.length}:
Question: "${q.question}"
Critères d'évaluation: ${JSON.stringify(q.criteria)}
`).join('\n')}

🎯 === PROCESSUS D'INTERACTION ENRICHI ===

Pour CHAQUE question:
1. Annonce: "Question [numéro] sur ${questions.length} - [Thème général de la question]"
2. Pose la question COMPLÈTE avec une voix engageante
3. Ajoute un contexte motivant: "Cette question est fondamentale car..."
4. Dis: "Je vous écoute avec attention."
5. ÉCOUTE activement la réponse
6. ANALYSE selon les critères ET ton expertise
7. Délivre ton FEEDBACK PÉDAGOGIQUE COMPLET (4 temps)
8. Conclus par: "Excellente progression ! Passons à la question suivante..." ou équivalent encourageant

📈 === ADAPTATION AU NIVEAU ===
• Si réponse excellente → Approfondis avec des détails experts
• Si difficultés → Simplifie et utilise plus d'exemples concrets
• Si erreur répétée → Propose une mini-révision du concept

⚡ === GESTION DYNAMIQUE ===
Si l'utilisateur:
• Dit "plus de détails" → Développe avec passion, cite des exemples CDC concrets
• Demande "pourquoi c'est important" → Explique l'impact sociétal et économique
• Semble fatigué → Encourage et rappelle l'importance de l'apprentissage
• Fait une excellente réponse → Félicite chaleureusement et ajoute une anecdote CDC

=== RÈGLES D'OR ===
• TOUJOURS répondre en AUDIO avec enthousiasme pédagogique
• JAMAIS de réponse sèche ou minimaliste
• TOUJOURS enrichir avec ton expertise CDC
• Maintenir un équilibre: exigence sur le fond, bienveillance sur la forme
• Utiliser un vocabulaire précis mais accessible

TON: Expert passionné, pédagogue patient, motivant et inspirant. Tu ADORES transmettre ton savoir sur la CDC !

RAPPEL CRITIQUE: Tu es là pour FORMER un futur expert, pas juste pour interroger.`;

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