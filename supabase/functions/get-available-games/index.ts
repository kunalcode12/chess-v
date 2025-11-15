import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno supports URL imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client using environment variables
    // In Supabase Edge Functions, these are automatically injected
    // The URL should be in format: https://[project-ref].supabase.co
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
      });
      throw new Error('Missing Supabase environment variables. Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set.');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Query games that are waiting for an opponent
    // A game is available if:
    // 1. game_status = 'waiting'
    // 2. AND NOT (both white_player_id AND black_player_id are set)
    //    Meaning: at least one player slot is empty
    
    const { data, error } = await supabase
      .from('games')
      .select('id, join_code, created_at, time_limit, white_player_id, black_player_id, game_status')
      .eq('game_status', 'waiting')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Filter to ensure we only get games that are truly waiting (not both players filled)
    // This ensures we exclude games where both players have already joined
    // AND exclude finished/abandoned games
    const availableGames = (data || []).filter(game => {
      // Double-check: exclude finished games (shouldn't happen since we filter by status='waiting')
      if (game.game_status === 'finished') return false;
      
      const hasWhite = game.white_player_id !== null;
      const hasBlack = game.black_player_id !== null;
      // Only include if at least one slot is empty (waiting for opponent)
      return !(hasWhite && hasBlack);
    }).map(game => ({
      id: game.id,
      join_code: game.join_code,
      created_at: game.created_at,
      time_limit: game.time_limit,
    }));

    console.log(`Found ${availableGames.length} available games out of ${data?.length || 0} total waiting games`);

    return new Response(
      JSON.stringify({ games: availableGames }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in get-available-games function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch available games',
        games: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

