// ========================================================
// AUTENTICAÇÃO DO ADMIN
// O login passa pela Edge Function "admin-login", que aplica
// um limite de tentativas antes de falar com o Supabase Auth.
// ========================================================

import { supabase } from "../../src/js/supabaseClient.js";
import { SUPABASE_URL } from "../../src/js/config.js";

export async function signIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();

  if (!response.ok) {
    const err = new Error(result.error ?? "Não deu pra entrar agora.");
    err.locked = Boolean(result.locked);
    throw err;
  }

  // Login aprovado pela função — agora registra a sessão aqui
  // no navegador, pra o Supabase Auth reconhecer o usuário.
  const { error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });
  if (error) throw error;

  return result;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
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
    window.location.href = "index.html";
    return null;
  }
  return session;
}
