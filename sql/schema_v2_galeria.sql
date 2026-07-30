-- ========================================================
-- AUG MODA — Schema v2: galeria de fotos (várias fotos por produto)
-- Rode isso DEPOIS do schema.sql original, no mesmo projeto.
-- Não apaga nada que já existe.
-- ========================================================

-- ---------------------------------------------------------
-- Tabela: product_images
-- Cada produto pode ter várias fotos. A ordem (sort_order)
-- define a sequência no carrossel — a de sort_order mais
-- baixo é a "capa" usada no card do catálogo.
-- ---------------------------------------------------------
create table if not exists product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  url          text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_product_images_product on product_images (product_id, sort_order);

alter table product_images enable row level security;

-- Leitura pública (o site precisa mostrar as fotos pra todo mundo)
drop policy if exists "public_read_product_images" on product_images;
create policy "public_read_product_images"
  on product_images for select
  using (true);

-- Admin logado: acesso total
drop policy if exists "admin_all_product_images" on product_images;
create policy "admin_all_product_images"
  on product_images for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- Observação sobre products.image_url
-- Esse campo antigo continua existindo como "capa de
-- reserva" (fallback) caso um produto ainda não tenha
-- nenhuma linha em product_images. Não precisa apagar nada.
-- A partir de agora, as fotos novas vão todas pra
-- product_images (o admin já foi atualizado pra isso).
-- ---------------------------------------------------------

-- ---------------------------------------------------------
-- Você NÃO precisa mais do bucket "produtos" do Supabase
-- Storage a partir de agora — as fotos passam a ir pro
-- GitHub. Pode deixar o bucket antigo aí sem problema
-- (não custa nada vazio) ou apagar depois, se quiser.
-- ---------------------------------------------------------
