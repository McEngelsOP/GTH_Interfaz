import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Base de datos del scraper de Bumeran (scraping/supabase_esquema.sql). Se activa solo si .env.local trae
// VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY; sin ellas la interfaz funciona como antes (solo carga manual).
// La clave anon es pública: los datos están protegidos por RLS y solo se leen con sesión iniciada.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const isSupabaseConfigured = () => supabase !== null;
