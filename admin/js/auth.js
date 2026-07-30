// ========================================================
// AUTENTICAÇÃO DO ADMIN (usa Supabase Auth de verdade)
// ========================================================

import { supabase } from "../../src/js/supabaseClient.js";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/admin/index.html";
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Chame no topo de qualquer página protegida do admin.
// Se não houver sessão, redireciona pro login.
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = "/admin/index.html";
    return null;
  }
  return session;
}
