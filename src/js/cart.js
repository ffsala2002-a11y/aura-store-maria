// ========================================================
// CARRINHO (localStorage — não é venda real, é só uma lista
// que vira mensagem de WhatsApp na hora de finalizar)
// ========================================================

const CART_KEY = "aug_moda_cart";

// Formato de cada item guardado:
// {
//   variantId, productId, name, size, color,
//   price, imageUrl, qty
// }

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Carrinho corrompido, resetando.", err);
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  notifyCartChanged(items);
}

// Permite que qualquer página (ex: cabeçalho com contador)
// escute mudanças no carrinho sem recarregar
function notifyCartChanged(items) {
  window.dispatchEvent(
    new CustomEvent("cart:changed", { detail: { items } })
  );
}

export function getCart() {
  return readCart();
}

export function addToCart(item, qty = 1) {
  const items = readCart();
  const existing = items.find((i) => i.variantId === item.variantId);

  if (existing) {
    existing.qty += qty;
  } else {
    items.push({ ...item, qty });
  }

  writeCart(items);
  return items;
}

export function updateQty(variantId, qty) {
  let items = readCart();

  if (qty <= 0) {
    items = items.filter((i) => i.variantId !== variantId);
  } else {
    const item = items.find((i) => i.variantId === variantId);
    if (item) item.qty = qty;
  }

  writeCart(items);
  return items;
}

export function removeFromCart(variantId) {
  const items = readCart().filter((i) => i.variantId !== variantId);
  writeCart(items);
  return items;
}

export function clearCart() {
  writeCart([]);
}

export function getCartCount() {
  return readCart().reduce((total, item) => total + item.qty, 0);
}

export function getCartTotal() {
  return readCart().reduce((total, item) => total + item.qty * item.price, 0);
}
