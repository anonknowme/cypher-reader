import { createClient } from '@supabase/supabase-js';

// Environment variables check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
// We explicitly set the schema to 'cypher_reader' so we don't have to specify it every time
export const supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
        schema: 'cypher_reader',
    },
});
