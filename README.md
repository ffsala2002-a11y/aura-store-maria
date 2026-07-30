# AUG Moda — Catálogo de roupas + Admin

Site completo de roupas: catálogo público com carrinho (finaliza pelo WhatsApp,
sem checkout real) + painel admin pra você cadastrar produtos e dar baixa de
estoque. Tudo em HTML/CSS/JS puro com ES Modules via CDN — sem npm, sem build,
funciona direto no Spck Code Editor.

**Visual:** estilo marketplace moderno (cartões brancos, amarelo de ação, azul
de confiança, preço em destaque, badge de desconto).

**Galeria de fotos:** cada produto pode ter várias fotos, com carrossel na
página do produto e visualização rápida (quick view) direto no card do
catálogo. As fotos são enviadas pelo admin e guardadas num repositório do
GitHub (não usa mais o Supabase Storage).

## Estrutura

```
index.html              → catálogo (home)
produto.html             → página de um produto (escolhe tam/cor, adiciona ao carrinho)
carrinho.html             → carrinho, finaliza pelo WhatsApp
src/css/tokens.css        → cores, fontes, espaçamentos
src/css/style.css         → estilos do site público
src/js/config.js          → ⚠️ ONDE VOCÊ COLA SUAS CHAVES DO SUPABASE E O WHATSAPP
src/js/supabaseClient.js  → cliente Supabase compartilhado
src/js/catalog.js         → busca produtos + fotos (site público)
src/js/cart.js            → carrinho (localStorage)
src/js/whatsapp.js        → monta mensagens e links do WhatsApp (compra e compartilhar)
src/js/gallery.js         → carrossel de fotos reutilizável
src/js/ui.js              → toast e badge do carrinho
src/js/pages/*.js         → lógica de cada página do site

admin/index.html           → login do admin
admin/dashboard.html        → lista de produtos + dar baixa de estoque
admin/produto-form.html     → cadastrar/editar produto, fotos e variações
admin/js/auth.js           → login/logout/checagem de sessão
admin/js/adminData.js       → todas as operações de escrita (CRUD + upload de fotos)
admin/js/pages/*.js         → lógica de cada página do admin

sql/schema.sql              → script original (tabelas de produto + variação)
sql/schema_v2_galeria.sql    → roda DEPOIS do schema.sql — adiciona a galeria de fotos

supabase/functions/upload-image/index.ts → Edge Function que sobe fotos pro GitHub
```

## Passo a passo pra colocar no ar

### 1. Criar o projeto no Supabase
1. Crie um projeto novo em supabase.com (separado do seu outro projeto).
2. Vá em **SQL Editor** → cole o conteúdo de `sql/schema.sql` → **Run**.
   Isso cria as tabelas `products` e `product_variants`, ativa a segurança
   (RLS) e cria o bucket de imagens `produtos`.
3. Vá em **Project Settings → API** e copie a **Project URL** e a
   **anon public key**.

### 2. Configurar o site
Abra `src/js/config.js` e preencha:
- `SUPABASE_URL` e `SUPABASE_ANON_KEY` (do passo anterior)
- `WHATSAPP_NUMBER` — número da loja, só dígitos, com DDI+DDD
  (ex: `5511912345678`)
- `STORE_NAME` — nome que aparece na mensagem do WhatsApp

É o único arquivo que você precisa editar pra funcionar.

### 3. Criar seu usuário admin
No painel do Supabase: **Authentication → Users → Add user** → coloque seu
e-mail e uma senha. Esse é o login que você vai usar em `admin/index.html`.
Qualquer usuário criado ali tem acesso total ao admin (as policies do banco
liberam escrita pra qualquer usuário autenticado nesse projeto).

### 4. Ativar a galeria de fotos (rodar depois do schema.sql)
1. No mesmo **SQL Editor**, cole o conteúdo de `sql/schema_v2_galeria.sql` →
   **Run**. Isso cria a tabela `product_images` (várias fotos por produto).

### 5. Criar o repositório de fotos no GitHub
1. Crie um repositório novo **público** (⚠️ tem que ser público — os links
   das fotos usam `raw.githubusercontent.com`, que só funciona sem login
   pra repositórios públicos; se for privado, as fotos não aparecem pros
   seus clientes), ex: `aug-moda-fotos`. Não precisa colocar nada dentro —
   pode ficar vazio. Como só vão ter fotos de roupa nele, não tem problema
   de privacidade em deixar público.
2. Vá em **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens** na sua conta do GitHub → **Generate new token**.
3. Restrinja o token só a esse repositório (`aug-moda-fotos`) e dê permissão
   **Contents: Read and write**. Nada além disso.
4. Copie o token gerado — ele só aparece uma vez.

### 6. Configurar a Edge Function que faz o upload
1. No painel do Supabase, vá em **Edge Functions → New function**.
2. Nome: `upload-image`.
3. Cole o conteúdo de `supabase/functions/upload-image/index.ts` no editor.
4. Nas variáveis de ambiente/segredos da função, adicione:
   - `GITHUB_TOKEN` → o token que você gerou no passo anterior
   - `GITHUB_OWNER` → seu usuário/organização no GitHub
   - `GITHUB_REPO` → `aug-moda-fotos` (ou o nome que você usou)
   - `GITHUB_BRANCH` → `main`
5. Publique (deploy) pelo próprio painel — tudo pelo navegador, sem terminal.

O token do GitHub fica só aí, guardado pelo Supabase. Ele nunca aparece no
site nem no admin — o navegador só conversa com essa função, e a função
conversa com o GitHub.

### 7. Rodar localmente pelo Spck
Use o servidor local do Spck Code Editor apontando pra pasta raiz do projeto
(`aug-moda/`) e abra `index.html`. Todos os caminhos são relativos, então
funciona tanto localmente quanto depois de publicado, em qualquer subpasta.

### 8. Testar o fluxo
1. Acesse `admin/index.html`, faça login.
2. Clique em **+ Novo produto**, preencha nome/categoria/preço, envie uma ou
   mais fotos (aparecem em miniatura, a primeira é a capa), adicione ao menos
   uma variação (tamanho + cor + estoque) e salve.
3. Abra `index.html` (site público) — o produto deve aparecer no catálogo com
   a foto de capa. Toque no ícone de olho no card pra ver a visualização
   rápida com o carrossel.
4. Abra o produto (página completa), arraste/toque nas setas do carrossel pra
   ver as outras fotos, escolha tamanho/cor, adicione ao carrinho.
5. Toque em **Compartilhar produto** — deve abrir o WhatsApp com o link
   daquela página específica.
6. Vá no carrinho e clique em **Finalizar pelo WhatsApp** — deve abrir o
   WhatsApp com a mensagem detalhada dos itens.
7. Volte no admin, dê baixa no estoque de uma variação (botão **−** ou
   digitando o número) e confirme que o valor mudou no banco.
8. No repositório do GitHub que você criou, confira que as fotos enviadas
   apareceram dentro da pasta `produtos/`.

### 9. Publicar
Como combinado, sem Netlify. Duas opções simples que também não pedem
terminal/npm:

- **GitHub Pages**: suba a pasta pra um repositório (dá pra fazer isso pelo
  app do GitHub no Android, sem terminal) e ative Pages nas configurações do
  repositório. Como os caminhos são relativos, funciona tanto num domínio
  próprio quanto em `usuario.github.io/repositorio`.
- **Cloudflare Pages**: conecta no mesmo repositório Git, sem etapa de build
  (é HTML/CSS/JS puro) — só aponta a pasta raiz.

Qualquer uma delas funciona só arrastando/conectando a pasta, sem comando
nenhum.

## Como o "dar baixa" funciona
- Cada combinação de tamanho + cor de um produto é uma **variação**, com seu
  próprio estoque (`product_variants.stock_quantity`).
- No admin (`dashboard.html`), cada produto mostra uma tabelinha com todas as
  variações. Os botões **−** / **+** ou digitar direto no campo já salva no
  banco na hora.
- No site público, uma variação com estoque 0 aparece riscada e não pode ser
  adicionada ao carrinho — só dá pra mandar mensagem perguntando sobre
  reposição.
- Estoque **não é reservado automaticamente** quando alguém manda WhatsApp —
  como não há checkout real, a baixa final por venda é manual, no admin,
  depois que a venda for combinada pelo WhatsApp.

## Próximos passos possíveis (não incluídos agora)
- Editar o número de WhatsApp pelo admin em vez de mexer no `config.js`.
- Múltiplos usuários admin com permissões diferentes.
- Reordenar produtos manualmente / destacar produtos.
- Cupom ou frete — como não há checkout real, isso ficaria só informativo.

Qualquer uma dessas eu adiciono se quiser — é só falar.
