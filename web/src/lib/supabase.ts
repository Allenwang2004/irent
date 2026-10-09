import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-side client using the secret key. RLS has no policies yet, so this is
// the only way to read the tables; never import this from a Client Component.
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY (see web/.env.example)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
