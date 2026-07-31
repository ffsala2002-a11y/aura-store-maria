// ========================================================
// HELPERS DE INTERFACE COMPARTILHADOS (badge do carrinho, toast)
// ========================================================

import { getCartCount } from "./cart.js";

export function initCartBadge() {
  const badge = document.getElementById("cart-count");
  const navBadge = document.getElementById("nav-cart-count");

  const update = () => {
    const count = getCartCount();
    if (badge) badge.textContent = String(count);
    if (navBadge) {
      navBadge.textContent = String(count);
      navBadge.hidden = count === 0;
    }
  };

  update();
  window.addEventListener("cart:changed", update);
}

export function initContactLink() {
  const link = document.getElementById("nav-contact");
  if (!link) return;
  link.addEventListener("click", async (e) => {
    e.preventDefault();
    const { openWhatsAppContact } = await import("./whatsapp.js");
    openWhatsAppContact();
  });
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
