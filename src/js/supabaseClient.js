// ========================================================
// CLIENTE SUPABASE (compartilhado por site e admin)
// Importa a lib direto do CDN via ESM, sem precisar de npm.
// ========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
