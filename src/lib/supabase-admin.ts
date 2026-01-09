import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceRoleKey) {
    console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail.");
}

// Create a Supabase client with the SERVICE ROLE key.
// This client bypasses Row Level Security (RLS) entirely.
// USE WITH CAUTION. Only for server-side admin actions.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
    db: {
        schema: 'cypher_reader',
    },
});
