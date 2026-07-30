-- ========================================================
-- AUG MODA — Schema do banco (Supabase / PostgreSQL)
-- Rode isso inteiro no SQL Editor do seu projeto Supabase
-- (Projeto novo e separado, conforme combinado)
-- ========================================================

-- Extensão pra gerar UUID automático
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Tabela: products
-- Um produto = uma peça de roupa (ex: "Camisa Social Slim")
-- O preço e a descrição ficam aqui. Tamanho/cor/estoque ficam
-- em product_variants (cada combinação de tam+cor é uma linha).
-- ---------------------------------------------------------
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  category     text not null default 'Geral',
  price        numeric(10,2) not null check (price >= 0),
  promo_price  numeric(10,2) check (promo_price is null or promo_price >= 0),
  image_url    text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column products.active is 'Produto aparece no site só se active = true';
comment on column products.promo_price is 'Se preenchido, mostra preço "de/por" no site';

-- ---------------------------------------------------------
-- Tabela: product_variants
-- Cada combinação de tamanho + cor de um produto, com seu
-- próprio estoque. Ex: Camisa Social Slim / P / Azul / 5un
-- ---------------------------------------------------------
create table if not exists product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  size            text not null,
  color            text not null,
  color_hex        text,               -- opcional, ex: '#1F2E3D' pra mostrar bolinha de cor
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  sku             text,
  created_at      timestamptz not null default now(),
  unique (product_id, size, color)
);

-- Índices pra deixar o catálogo rápido
create index if not exists idx_products_category on products (category);
create index if not exists idx_products_active on products (active);
create index if not exists idx_variants_product on product_variants (product_id);

-- Atualiza "updated_at" sozinho quando o produto muda
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Segurança (RLS)
-- Site público: só pode LER produtos ativos e suas variações.
-- Admin (logado via Supabase Auth): pode ler e escrever tudo.
-- ---------------------------------------------------------
alter table products enable row level security;
alter table product_variants enable row level security;

-- Leitura pública, só produtos ativos
create policy "public_read_active_products"
  on products for select
  using (active = true);

-- Leitura pública das variações (o filtro de "ativo" já
-- acontece na consulta do produto, aqui liberamos tudo
-- pra simplificar o join no site)
create policy "public_read_variants"
  on product_variants for select
  using (true);

-- Admin logado: acesso total a produtos
create policy "admin_all_products"
  on products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Admin logado: acesso total a variações
create policy "admin_all_variants"
  on product_variants for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- Storage (imagens dos produtos)
-- Crie um bucket chamado "produtos" no painel Storage do
-- Supabase, marcado como PÚBLICO. Depois rode isto:
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

create policy "public_read_produtos_bucket"
  on storage.objects for select
  using (bucket_id = 'produtos');

create policy "admin_upload_produtos_bucket"
  on storage.objects for insert
  with check (bucket_id = 'produtos' and auth.role() = 'authenticated');

create policy "admin_update_produtos_bucket"
  on storage.objects for update
  using (bucket_id = 'produtos' and auth.role() = 'authenticated');

create policy "admin_delete_produtos_bucket"
  on storage.objects for delete
  using (bucket_id = 'produtos' and auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- Usuário admin
-- Crie o(s) usuário(s) do admin em Authentication > Users
-- no painel do Supabase (email + senha). Não precisa de
-- tabela extra: qualquer usuário autenticado nesse projeto
-- é considerado admin pelas policies acima.
-- ---------------------------------------------------------

-- ---------------------------------------------------------
-- Dado de exemplo (opcional — apague depois de testar)
-- ---------------------------------------------------------
-- insert into products (name, description, category, price, promo_price, image_url)
-- values ('Camisa Social Slim', 'Camisa social de algodão, corte slim.', 'Camisas', 129.90, 99.90, null)
-- returning id;
--
-- insert into product_variants (product_id, size, color, color_hex, stock_quantity, sku)
-- values
--   ('COLE_O_ID_AQUI', 'P', 'Azul', '#1F2E3D', 5, 'CAM-SLIM-P-AZ'),
--   ('COLE_O_ID_AQUI', 'M', 'Azul', '#1F2E3D', 8, 'CAM-SLIM-M-AZ'),
--   ('COLE_O_ID_AQUI', 'G', 'Branco', '#F3EFE6', 3, 'CAM-SLIM-G-BR');
