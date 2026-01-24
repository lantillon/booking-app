import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// These environment variables should be set in production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if URL and key are provided
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Check if Supabase is configured
export const isSupabaseConfigured = !!supabase;


