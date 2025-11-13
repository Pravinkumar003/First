// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// ✅ Replace these with your actual project values
const supabaseUrl = 'https://wfxdvgwlfpqkadkvwbzg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmeGR2Z3dsZnBxa2Fka3Z3YnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDgxNTIsImV4cCI6MjA3ODQyNDE1Mn0.svO7O2XMoCOHDCt6zxchQOzQD05X1Y3onxqcXplA5gk'

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
