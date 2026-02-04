
import { createClient } from '@supabase/supabase-js';

// Initialized with environment variables or the provided credentials.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://easlydiycnpfmpcfckxq.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhc2x5ZGl5Y25wZm1wY2Zja3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTE0MzIsImV4cCI6MjA4NTY4NzQzMn0.-kYQijvHscUJ0EPJSBaAFHtL9E0yHVRtrpsZ5DYBX4s';

// Now that we have real credentials, this flag will be true.
export const isSupabaseConfigured = supabaseUrl !== 'https://example.supabase.co';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
