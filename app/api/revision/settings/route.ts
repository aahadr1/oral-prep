import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { DEFAULT_SETTINGS } from '@/lib/revision-algorithm';

/**
 * GET /api/revision/settings - Récupère les paramètres de révision utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('revision_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Retourner les paramètres par défaut si aucun n'existe
    const userSettings = settings || {
      user_id: user.id,
      ...DEFAULT_SETTINGS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({ settings: userSettings });

  } catch (error) {
    console.error('Error in GET /api/revision/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/revision/settings - Crée ou met à jour les paramètres de révision
 * Body: Partial<RevisionSettings>
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      beta_low = DEFAULT_SETTINGS.beta_low,
      beta_mid = DEFAULT_SETTINGS.beta_mid,
      beta_high = DEFAULT_SETTINGS.beta_high,
      leech_threshold = DEFAULT_SETTINGS.leech_threshold,
      new_cards_per_session = DEFAULT_SETTINGS.new_cards_per_session,
      steps_between_new = DEFAULT_SETTINGS.steps_between_new
    } = body;

    // Validation
    if (beta_low >= beta_mid || beta_mid >= beta_high) {
      return NextResponse.json({ 
        error: 'Invalid multipliers: beta_low < beta_mid < beta_high required' 
      }, { status: 400 });
    }

    if (beta_low <= 1 || beta_mid <= 1 || beta_high <= 1) {
      return NextResponse.json({ 
        error: 'All multipliers must be greater than 1' 
      }, { status: 400 });
    }

    if (leech_threshold < 3 || new_cards_per_session < 1 || steps_between_new < 1) {
      return NextResponse.json({ 
        error: 'Invalid thresholds: all must be positive integers' 
      }, { status: 400 });
    }

    const settingsData = {
      user_id: user.id,
      beta_low,
      beta_mid,
      beta_high,
      leech_threshold,
      new_cards_per_session,
      steps_between_new,
      updated_at: new Date().toISOString()
    };

    // Utiliser upsert pour créer ou mettre à jour
    const { data: settings, error } = await supabase
      .from('revision_settings')
      .upsert(settingsData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving settings:', error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Settings saved successfully',
      settings 
    });

  } catch (error) {
    console.error('Error in POST /api/revision/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/revision/settings - Remet les paramètres par défaut
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('revision_settings')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting settings:', error);
      return NextResponse.json({ error: 'Failed to reset settings' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Settings reset to default successfully',
      settings: {
        user_id: user.id,
        ...DEFAULT_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in DELETE /api/revision/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

