import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Proxy endpoint for WebRTC SDP negotiation with OpenAI Realtime API
 * This avoids CORS issues by proxying the request through our backend
 */
export async function POST(request: NextRequest) {
  try {
    const { sdp, client_secret, model } = await request.json();

    if (!sdp || !client_secret) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'sdp and client_secret are required'
      }, { status: 400 });
    }

    const modelName = model || 'gpt-4o-realtime-preview-2024-12-17';

    console.log('[WebRTC Proxy] Negotiating SDP with OpenAI...');

    // Forward the SDP offer to OpenAI
    const response = await fetch(
      `https://api.openai.com/v1/realtime?model=${modelName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client_secret}`,
          'Content-Type': 'application/sdp',
        },
        body: sdp,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WebRTC Proxy] OpenAI error:', response.status, errorText);
      return NextResponse.json({ 
        error: 'OpenAI WebRTC negotiation failed',
        status: response.status,
        details: errorText
      }, { status: response.status });
    }

    const answerSDP = await response.text();
    console.log('[WebRTC Proxy] SDP negotiation successful');

    // Return the SDP answer as plain text
    return new NextResponse(answerSDP, {
      status: 200,
      headers: {
        'Content-Type': 'application/sdp',
      },
    });

  } catch (error: any) {
    console.error('[WebRTC Proxy] Error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Internal server error',
      help: 'Failed to proxy WebRTC SDP negotiation'
    }, { status: 500 });
  }
}

