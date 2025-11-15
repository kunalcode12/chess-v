-- Add arena_state column to games table for unified arena system
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS arena_state JSONB;

-- Add comment
COMMENT ON COLUMN public.games.arena_state IS 'Stores shared arena state, events, and points for both players';

