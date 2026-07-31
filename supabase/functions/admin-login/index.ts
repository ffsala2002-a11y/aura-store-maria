// ========================================================
// Edge Function: admin-login
// Faz login do admin com um limite de tentativas embutido.
// O bloqueio é decidido aqui dentro (servidor), então não
// dá pra burlar editando o JavaScript do site.
//
// Como publicar (sem terminal):
// 1. No painel do Supabase, vá em "Edge Functions" → "New function"
// 2. Nome da função: admin-login
// 3. Cole este arquivo inteiro no editor → Deploy
//
// Não precisa configurar nenhuma variável de ambiente — o
// Supabase já injeta SUPABASE_URL, SUPABASE_ANON_KEY e
// SUPABASE_SERVICE_ROLE_KEY automaticamente em toda função.
//
// ⚠️ Essa função precisa ser chamável SEM estar logado (afinal
// é o login). No painel, em "Edge Functions" → admin-login →
// configurações, deixe "Enforce JWT Verification" DESLIGADO.
// ========================================================

// -------- Ajuste esses dois números se quiser mudar o limite --------
const MAX_ATTEMPTS = 5; // tentativas com falha permitidas
const WINDOW_MINUTES = 15; // dentro desse período de tempo
// ----------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return json({ error: "Preencha e-mail e senha." }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    // 1) Checa quantas falhas recentes esse e-mail já teve
    //    (usa a Service Role — só essa função enxerga essa tabela)
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/login_attempts?email=eq.${encodeURIComponent(
        normalizedEmail
      )}&success=eq.false&created_at=gte.${encodeURIComponent(windowStart)}&select=id,created_at&order=created_at.asc`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    const recentFailures = await countRes.json();

    if (Array.isArray(recentFailures) && recentFailures.length >= MAX_ATTEMPTS) {
      const oldest = new Date(recentFailures[0].created_at);
      const unlockAt = new Date(oldest.getTime() + WINDOW_MINUTES * 60 * 1000);
      const minutesLeft = Math.max(1, Math.ceil((unlockAt.getTime() - Date.now()) / 60000));
      return json(
        {
          error: `Muitas tentativas erradas. Tente de novo em ${minutesLeft} minuto(s).`,
          locked: true,
        },
        429
      );
    }

    // 2) Tenta autenticar de fato, usando o endpoint padrão do Supabase Auth
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
    const authData = await authRes.json();
    const success = authRes.ok && Boolean(authData.access_token);

    // 3) Registra a tentativa (sucesso ou falha) — usado pro próximo cálculo
    await fetch(`${SUPABASE_URL}/rest/v1/login_attempts`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email: normalizedEmail, success }),
    });

    if (!success) {
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - (recentFailures.length + 1));
      return json(
        {
          error:
            attemptsLeft > 0
              ? `E-mail ou senha incorretos. Restam ${attemptsLeft} tentativa(s).`
              : `E-mail ou senha incorretos. Login bloqueado por ${WINDOW_MINUTES} minutos.`,
        },
        401
      );
    }

    // Login certo: devolve a sessão pro navegador poder usá-la
    return json({
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
      user: authData.user,
    });
  } catch (err) {
    return json({ error: err.message ?? String(err) }, 400);
  }
});
