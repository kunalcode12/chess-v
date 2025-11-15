// Deno type definitions for Supabase Edge Functions
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

// Allow URL imports
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

// Allow Supabase client imports from esm.sh
declare module "https://esm.sh/@supabase/supabase-js@2.39.3" {
  export function createClient(url: string, key: string, options?: any): any;
}

