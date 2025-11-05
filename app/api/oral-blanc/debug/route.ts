import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  try {
    // Step 1: Check authentication
    diagnostics.steps.push({ step: 1, name: 'Checking authentication...' });
    let user;
    try {
      user = await getCurrentUser();
      if (user) {
        diagnostics.steps.push({ 
          step: 1, 
          name: 'Authentication', 
          status: '✅ Success', 
          userId: user.id 
        });
      } else {
        diagnostics.steps.push({ 
          step: 1, 
          name: 'Authentication', 
          status: '❌ No user found' 
        });
        return NextResponse.json(diagnostics);
      }
    } catch (authError: any) {
      diagnostics.steps.push({ 
        step: 1, 
        name: 'Authentication', 
        status: '❌ Error', 
        error: authError.message 
      });
      return NextResponse.json(diagnostics);
    }

    // Step 2: Create Supabase client
    diagnostics.steps.push({ step: 2, name: 'Creating Supabase client...' });
    const supabase = await createSupabaseServer();
    diagnostics.steps.push({ 
      step: 2, 
      name: 'Supabase Client', 
      status: '✅ Created' 
    });

    // Step 3: Check if table exists
    diagnostics.steps.push({ step: 3, name: 'Checking if table exists...' });
    const { data: tableCheck, error: tableError } = await supabase
      .from('oral_blanc_sessions')
      .select('id')
      .limit(0);

    if (tableError) {
      diagnostics.steps.push({
        step: 3,
        name: 'Table Check',
        status: '❌ Table does not exist or error',
        error: {
          code: tableError.code,
          message: tableError.message,
          details: tableError.details,
          hint: tableError.hint
        }
      });
      
      // Add solution
      diagnostics.solution = {
        problem: 'Table oral_blanc_sessions does not exist',
        action: 'Execute the SQL schema file',
        steps: [
          '1. Go to https://app.supabase.com',
          '2. Open your project',
          '3. Click on "SQL Editor" in the left menu',
          '4. Click "+ New query"',
          '5. Copy ALL content from supabase-oral-blanc-schema.sql',
          '6. Paste in the SQL editor',
          '7. Click "Run" or press Ctrl+Enter',
          '8. Refresh this page'
        ]
      };
      
      return NextResponse.json(diagnostics);
    }

    diagnostics.steps.push({
      step: 3,
      name: 'Table Check',
      status: '✅ Table exists'
    });

    // Step 4: Check RLS policies
    diagnostics.steps.push({ step: 4, name: 'Checking RLS policies...' });
    
    // Try to query with user filter
    const { data: sessions, error: queryError } = await supabase
      .from('oral_blanc_sessions')
      .select('*')
      .eq('user_id', user.id);

    if (queryError) {
      diagnostics.steps.push({
        step: 4,
        name: 'Query Test',
        status: '❌ Query failed',
        error: {
          code: queryError.code,
          message: queryError.message,
          details: queryError.details,
          hint: queryError.hint
        }
      });
      
      diagnostics.solution = {
        problem: 'RLS policies may be misconfigured',
        action: 'Check RLS policies in Supabase',
        query: `
SELECT * FROM pg_policies 
WHERE tablename = 'oral_blanc_sessions';
        `
      };
      
      return NextResponse.json(diagnostics);
    }

    diagnostics.steps.push({
      step: 4,
      name: 'Query Test',
      status: '✅ Query successful',
      sessionsFound: sessions?.length || 0
    });

    // All checks passed
    diagnostics.status = '✅ ALL CHECKS PASSED';
    diagnostics.message = 'Everything is working correctly!';
    diagnostics.sessions = sessions;

    return NextResponse.json(diagnostics);

  } catch (error: any) {
    diagnostics.steps.push({
      name: 'Unexpected Error',
      status: '❌ Fatal error',
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    return NextResponse.json(diagnostics);
  }
}

