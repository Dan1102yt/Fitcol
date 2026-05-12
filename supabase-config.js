// =====================================================
// supabase-config.js — Inicialización del cliente Supabase
// IMPORTANTE: reemplaza SUPABASE_URL y SUPABASE_ANON_KEY con
// los valores de tu proyecto (ver SETUP.md). La anon key es
// segura de publicar; la seguridad real vive en RLS.
// =====================================================

// TODO developer: poner aquí los valores de tu proyecto Supabase
const SUPABASE_URL      = "https://vooelhxkmidmbqsehmax.supabase.co";  // tu Project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvb2VsaHhrbWlkbWJxc2VobWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDgyMTEsImV4cCI6MjA5NDAyNDIxMX0.iYbvqGt_Ww3sLM_lMMrAS9dyYAPAeTSHutJUtRRGni8";  // anon public key

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
