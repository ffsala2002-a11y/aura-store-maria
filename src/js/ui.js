// ========================================================
// HELPERS DE INTERFACE COMPARTILHADOS (badge do carrinho, toast)
// ========================================================

import { getCartCount } from "./cart.js";

export function initCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;

  const update = () => {
    badge.textContent = String(getCartCount());
  };

  update();
  window.addEventListener("cart:changed", update);
}

let toastTimer = null;

export function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

export function formatBRL(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
