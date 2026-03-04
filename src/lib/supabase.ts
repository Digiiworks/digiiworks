import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fagqivnuadpmvjefgvgm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZ3Fpdm51YWRwbXZqZWZndmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjg4NDIsImV4cCI6MjA2NjkwNDg0Mn0.sb_publishable_VgOL2V3kFE4zOra0g2Imbg_JgS4t3Pj';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
