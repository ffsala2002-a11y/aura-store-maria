// ========================================================
// CAMADA DE DADOS DO CATÁLOGO (consultas ao Supabase)
// ========================================================

import { supabase } from "./supabaseClient.js";

// Busca todos os produtos ativos com suas variações (tam/cor/estoque)
export async function fetchCatalog() {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, name, description, category, price, promo_price, image_url, created_at,
      product_variants ( id, size, color, color_hex, stock_quantity, sku ),
      product_images ( id, url, sort_order )
      `
    )
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Busca um único produto (usado na página de detalhe)
export async function fetchProductById(id) {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, name, description, category, price, promo_price, image_url, created_at,
      product_variants ( id, size, color, color_hex, stock_quantity, sku ),
      product_images ( id, url, sort_order )
      `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// Todas as fotos de um produto, em ordem. Se não houver
// nenhuma em product_images, cai pro image_url antigo (legado).
export function galleryImages(product) {
  const images = (product.product_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => img.url);

  if (images.length > 0) return images;
  return product.image_url ? [product.image_url] : [];
}

// Primeira foto — usada como capa no card do catálogo
export function coverImage(product) {
  return galleryImages(product)[0] ?? null;
}

// Lista de categorias distintas, pra montar os filtros
export function extractCategories(products) {
  const set = new Set(products.map((p) => p.category).filter(Boolean));
  return ["Todos", ...Array.from(set).sort()];
}

// Estoque total somando todas as variações de um produto
export function totalStock(product) {
  return (product.product_variants ?? []).reduce(
    (sum, v) => sum + v.stock_quantity,
    0
  );
}

// Tamanhos disponíveis (com estoque > 0), sem repetir
export function availableSizes(product) {
  const sizes = (product.product_variants ?? [])
    .filter((v) => v.stock_quantity > 0)
    .map((v) => v.size);
  return Array.from(new Set(sizes));
}
