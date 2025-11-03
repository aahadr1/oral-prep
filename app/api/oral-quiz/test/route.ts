import { NextResponse } from 'next/server';

export async function GET() {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return NextResponse.json({
    status: 'API route working',
    environment: {
      OPENAI_API_KEY: hasOpenAIKey ? '✅ Configured' : '❌ Missing',
      SUPABASE_URL: hasSupabaseUrl ? '✅ Configured' : '❌ Missing',
      SUPABASE_KEY: hasSupabaseKey ? '✅ Configured' : '❌ Missing',
    },
    timestamp: new Date().toISOString(),
    help: !hasOpenAIKey ? 'Please add OPENAI_API_KEY to your .env.local file' : 'All required keys are configured'
  });
}
