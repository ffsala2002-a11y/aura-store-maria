// ========================================================
// Edge Function: upload-image
// Recebe uma foto do admin (já autenticado) e sobe pro
// repositório do GitHub configurado nas variáveis de
// ambiente da função. O token do GitHub NUNCA chega no
// navegador — só existe aqui dentro, no servidor.
//
// Como publicar (sem terminal):
// 1. No painel do Supabase, vá em "Edge Functions" → "New function"
// 2. Nome da função: upload-image
// 3. Cole este arquivo inteiro no editor
// 4. Em "Secrets" / "Environment variables" da função, adicione:
//      GITHUB_TOKEN   -> um Personal Access Token (fine-grained,
//                         só com permissão "Contents: Read and write"
//                         no repositório de fotos)
//      GITHUB_OWNER   -> seu usuário ou organização no GitHub
//      GITHUB_REPO    -> nome do repositório de fotos (ex: aug-moda-fotos)
//      GITHUB_BRANCH  -> normalmente "main"
// 5. Deploy pelo próprio painel.
//
// A verificação de login (JWT do Supabase Auth) já é feita
// automaticamente pelo Supabase antes da função rodar —
// só usuário autenticado (seu admin) consegue chamar isso.
// ========================================================

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { fileName, contentBase64, contentType } = await req.json();

    if (!fileName || !contentBase64) {
      throw new Error("Faltou fileName ou contentBase64 no corpo da requisição");
    }

    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
    const GITHUB_OWNER = Deno.env.get("GITHUB_OWNER");
    const GITHUB_REPO = Deno.env.get("GITHUB_REPO");
    const GITHUB_BRANCH = Deno.env.get("GITHUB_BRANCH") ?? "main";

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      throw new Error("Variáveis de ambiente do GitHub não configuradas na função");
    }

    // Nome de arquivo único, evita sobrescrever fotos com nome igual
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `produtos/${Date.now()}-${safeName}`;

    const githubResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Upload de foto de produto: ${safeName}`,
          content: contentBase64,
          branch: GITHUB_BRANCH,
        }),
      }
    );

    if (!githubResponse.ok) {
      const errText = await githubResponse.text();
      throw new Error(`GitHub recusou o upload: ${errText}`);
    }

    const publicUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
