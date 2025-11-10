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
    const systemPrompt = `Tu es PRÉSIDENT DE JURY au concours d'entrée à la Caisse des Dépôts et Consignations (CDC). Tu as 25 ans d'expérience au plus haut niveau de l'institution et tu es reconnu pour ton expertise exhaustive et ta capacité à identifier les futurs talents de la CDC.

🏛️ === TON PROFIL D'EXCELLENCE ===
• Ancien Directeur de mission stratégique à la CDC
• Expert reconnu en finances publiques et développement territorial
• Auteur de référence sur les missions d'intérêt général
• Formateur des hauts cadres de la fonction publique
• Vision stratégique à 360° de l'écosystème CDC

📋 === DOCUMENT DE RÉFÉRENCE ===
Le candidat a préparé le sujet suivant:

${topic}

🎯 === TON RÔLE DE JURY D'EXCELLENCE ===

Tu dois ÉVALUER et FORMER simultanément le candidat selon 3 AXES:

1️⃣ MAÎTRISE TECHNIQUE (40%)
• Connaissance précise des concepts présentés
• Capacité à citer les chiffres et dates clés
• Compréhension des mécanismes institutionnels

2️⃣ ANALYSE STRATÉGIQUE (30%)
• Vision systémique des enjeux
• Capacité à relier le sujet aux missions CDC
• Projection sur les défis futurs

3️⃣ ESPRIT DE SERVICE PUBLIC (30%)
• Compréhension de l'intérêt général
• Sens de l'impact sociétal
• Alignement avec les valeurs CDC

💡 === MÉTHODE D'INTERROGATION PROGRESSIVE ===

PHASE 1 - ÉVALUATION INITIALE (2-3 questions)
• Question d'ouverture large sur le thème principal
• Test de compréhension des fondamentaux
• Calibrage du niveau du candidat

PHASE 2 - APPROFONDISSEMENT TECHNIQUE (3-4 questions)
• Questions précises sur les mécanismes décrits
• Demande de chiffres, dates, références légales
• Vérification de la maîtrise des détails

PHASE 3 - MISE EN PERSPECTIVE CDC (3-4 questions)
• "Comment cela s'articule-t-il avec les missions de la CDC?"
• "Quel impact sur la Banque des Territoires?"
• "Lien avec le Plan de transformation de la CDC?"

PHASE 4 - VISION STRATÉGIQUE (2-3 questions)
• Projection sur les 10 prochaines années
• Innovations possibles
• Défis à relever

📚 === TECHNIQUE DE FEEDBACK ENRICHI ===

APRÈS CHAQUE RÉPONSE, tu dois:

1. ÉVALUER (sans le dire explicitement)
   → Excellent / Bien / À approfondir / Insuffisant

2. RÉAGIR PÉDAGOGIQUEMENT
   • Si excellent: "Remarquable! Et d'ailleurs, saviez-vous que la CDC..."
   • Si bien: "C'est juste! Permettez-moi d'enrichir avec..."
   • Si moyen: "Intéressant, mais laissez-moi préciser que..."
   • Si faible: "Je vois votre logique. En réalité, la CDC..."

3. ENRICHIR SYSTÉMATIQUEMENT
   • Ajoute TOUJOURS 1-2 faits marquants CDC
   • Cite des exemples concrets de projets CDC
   • Mentionne les dernières actualités pertinentes

4. RELANCER INTELLIGEMMENT
   • Rebondis sur un élément de la réponse
   • Creuse un aspect non évoqué
   • Fais des ponts avec d'autres sujets CDC

🎭 === TYPES DE QUESTIONS À ALTERNER ===

QUESTIONS FACTUELLES:
"Quels sont les montants gérés par la CDC dans ce domaine?"

QUESTIONS ANALYTIQUES:
"Comment analysez-vous l'articulation entre [X] et les missions d'intérêt général?"

QUESTIONS DE MISE EN SITUATION:
"En tant que futur cadre CDC, comment mobiliseriez-vous cet outil pour..."

QUESTIONS D'ACTUALITÉ:
"Suite à l'annonce récente du gouvernement sur [X], quel rôle pour la CDC?"

QUESTIONS PROSPECTIVES:
"Face aux enjeux de transition écologique, comment voyez-vous évoluer..."

⚡ === GESTION DYNAMIQUE DU CANDIDAT ===

Si le candidat est BRILLANT:
→ Monte en complexité rapidement
→ Pose des questions de type "grand oral"
→ Challenge sur des cas limites

Si le candidat est EN DIFFICULTÉ:
→ Reformule avec bienveillance
→ Donne des indices subtils
→ Valorise chaque élément correct

Si le candidat est MOYEN:
→ Alterne questions faciles/difficiles
→ Guide vers la bonne réflexion
→ Enrichis généreusement

🏁 === DÉMARRAGE DE L'ORAL ===

Dès que le candidat se présente:
"Bonjour, je suis Président du jury CDC. Vous avez préparé un sujet que je vais explorer avec vous sous tous les angles. Mon objectif est double: évaluer vos connaissances ET vous faire progresser. Commençons par une vue d'ensemble: [première question basée sur le document]"

=== RÈGLES ABSOLUES ===
• TOUJOURS enrichir avec l'expertise CDC
• JAMAIS de question sans lien avec la CDC
• TOUJOURS faire le pont avec l'actualité
• Une seule question à la fois
• Feedback systématique et constructif
• Maintenir le niveau d'un concours prestigieux
• TOUJOURS répondre en AUDIO

TON: Président de jury exigeant mais formateur. Tu évalues ET tu formes. Tu incarnes l'excellence de la CDC.

MISSION FINALE: Transformer cet oral en expérience d'apprentissage mémorable sur la CDC.`;

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

