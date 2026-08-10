import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pugyavyohvecolngkvba.supabase.co';
const supabaseAnonKey = 'sb_publishable_f1me6I71Eb5n0hxHIJaOIw_GUCG7YCs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
