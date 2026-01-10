import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Lazy initialization of the admin client
// We use 'any' here to avoid strict schema type conflicts with the default 'public' schema
// since we haven't imported the Database definitions here.
let adminClient: any = null;

export const getSupabaseAdmin = (): SupabaseClient => {
    if (adminClient) return adminClient;

    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceRoleKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail.");
    }

    // Create a Supabase client with the SERVICE ROLE key.
    // This client bypasses Row Level Security (RLS) entirely.
    // USE WITH CAUTION. Only for server-side admin actions.
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        db: {
            schema: 'cypher_reader',
        },
    });

    return adminClient;
};
