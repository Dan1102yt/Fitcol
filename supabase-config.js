// =====================================================
// supabase-config.js — Inicialización del cliente Supabase
// IMPORTANTE: reemplaza SUPABASE_URL y SUPABASE_ANON_KEY con
// los valores de tu proyecto (ver SETUP.md). La anon key es
// segura de publicar; la seguridad real vive en RLS.
// =====================================================

// TODO developer: poner aquí los valores de tu proyecto Supabase
const SUPABASE_URL      = "REPLACE_SUPABASE_URL";       // ej: https://abcd1234.supabase.co
const SUPABASE_ANON_KEY = "REPLACE_SUPABASE_ANON_KEY";  // anon public key

const isConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_URL.includes(".supabase.co") &&
  SUPABASE_ANON_KEY.length > 30;

window.supabaseClient = null;
window.supabaseConfigured = isConfigured;

if (isConfigured) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  } catch (err) {
    console.error("Supabase CDN failed:", err);
    window.supabaseConfigured = false;
  }
}

window.dispatchEvent(new Event("supabase-ready"));
