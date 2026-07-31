// ========================================================
// CAMADA DE DADOS DO ADMIN (CRUD completo — exige login)
// ========================================================

import { supabase } from "../../src/js/supabaseClient.js";
import { SUPABASE_URL } from "../../src/js/config.js";

// Lista TODOS os produtos (ativos e inativos), com variações e fotos
export async function fetchAllProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, description, category, price, promo_price, image_url, active, created_at,
       product_variants ( id, size, color, color_hex, stock_quantity, sku ),
       product_images ( id, url, sort_order )`
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchProduct(id) {
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, description, category, price, promo_price, image_url, active,
       product_variants ( id, size, color, color_hex, stock_quantity, sku ),
       product_images ( id, url, sort_order )`
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createProduct(product) {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, product) {
  const { error } = await supabase.from("products").update(product).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleActive(id, active) {
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) throw error;
}

// --- Variações (tamanho/cor/estoque) ---

export async function replaceVariants(productId, variants) {
  // Estratégia simples: apaga as antigas e insere as novas.
  // Suficiente pro volume de um catálogo de loja.
  const { error: deleteError } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);
  if (deleteError) throw deleteError;

  if (variants.length === 0) return;

  const rows = variants.map((v) => ({ ...v, product_id: productId }));
  const { error: insertError } = await supabase.from("product_variants").insert(rows);
  if (insertError) throw insertError;
}

// Dá baixa / repõe estoque de uma variação específica
export async function setVariantStock(variantId, quantity) {
  const { error } = await supabase
    .from("product_variants")
    .update({ stock_quantity: Math.max(0, quantity) })
    .eq("id", variantId);
  if (error) throw error;
}

// --- Galeria de fotos (product_images) ---

export async function fetchProductImages(productId) {
  const { data, error } = await supabase
    .from("product_images")
    .select("id, url, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addProductImage(productId, url, sortOrder) {
  const { data, error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, url, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProductImage(imageId) {
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) throw error;
}

// Substitui todas as fotos de um produto pela lista atual (na ordem
// em que aparecem no formulário). Mesma estratégia usada nas variações.
export async function replaceProductImages(productId, urls) {
  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);
  if (deleteError) throw deleteError;

  if (urls.length === 0) return;

  const rows = urls.map((url, index) => ({
    product_id: productId,
    url,
    sort_order: index,
  }));
  const { error: insertError } = await supabase.from("product_images").insert(rows);
  if (insertError) throw insertError;
}

// Grava a ordem final de todas as fotos de um produto de uma vez
export async function reorderProductImages(images) {
  // images: [{ id, sort_order }, ...]
  for (const img of images) {
    const { error } = await supabase
      .from("product_images")
      .update({ sort_order: img.sort_order })
      .eq("id", img.id);
    if (error) throw error;
  }
}

// --- Upload de foto pro GitHub (via Edge Function — token fica só no servidor) ---

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result vem como "data:image/png;base64,AAAA..."
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToGithub(file) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Sessão expirada, faça login de novo.");

  const contentBase64 = await fileToBase64(file);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      fileName: file.name,
      contentBase64,
      contentType: file.type,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error ?? "Falha no upload da foto");
  }
  return result.url;
}
