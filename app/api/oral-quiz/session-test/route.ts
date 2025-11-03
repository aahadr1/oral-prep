import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Version de test sans authentification
export async function POST(request: NextRequest) {
  try {
    console.log('[Test Session] Starting test session creation...');
    
    const body = await request.json();
    const { questions } = body;

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 });
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OPENAI_API_KEY not configured',
        solution: 'Create a .env.local file and add: OPENAI_API_KEY=sk-...',
        testEndpoint: '/api/oral-quiz/test'
      }, { status: 500 });
    }

    // Test OpenAI API key validity
    console.log('[Test Session] Testing OpenAI API key...');
    const testResp = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    if (!testResp.ok) {
      const error = await testResp.text();
      return NextResponse.json({ 
        error: 'Invalid OpenAI API key',
        details: error,
        status: testResp.status
      }, { status: 500 });
    }

    // Create session
    const systemPrompt = `Tu es un assistant de test. Dis simplement "Bonjour, ceci est un test du système de quiz oral. Dites 'test' pour vérifier que l'audio fonctionne."`;

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
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ 
        error: 'OpenAI Realtime API error',
        details: text,
        status: resp.status,
        possibleCause: 'You might not have access to the Realtime API (gpt-4o-realtime-preview)'
      }, { status: 500 });
    }

    const json = await resp.json();
    
    return NextResponse.json({
      success: true,
      model: json?.model,
      client_secret: json?.client_secret?.value || json?.client_secret,
      message: 'Test session created successfully'
    });
    
  } catch (error: any) {
    console.error('[Test Session] Error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Internal error',
      type: error?.constructor?.name
    }, { status: 500 });
  }
}
