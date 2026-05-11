// =====================================================
// supabase-config.js — Inicialización del cliente Supabase
// IMPORTANTE: reemplaza SUPABASE_URL y SUPABASE_ANON_KEY con
// los valores de tu proyecto (ver SETUP.md). La anon key es
// segura de publicar; la seguridad real vive en RLS.
// =====================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TODO developer: poner aquí los valores de tu proyecto Supabase
const SUPABASE_URL      = "REPLACE_SUPABASE_URL";       // ej: https://abcd1234.supabase.co
const SUPABASE_ANON_KEY = "REPLACE_SUPABASE_ANON_KEY";  // anon public key

const isConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_URL.includes(".supabase.co") &&
  SUPABASE_ANON_KEY.length > 30;

window.supabaseClient = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;

window.supabaseConfigured = isConfigured;
window.dispatchEvent(new Event("supabase-ready"));
