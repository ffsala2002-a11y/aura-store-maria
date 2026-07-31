import { getCart, updateQty, removeFromCart, getCartTotal } from "../cart.js";
import { openWhatsAppWithCart } from "../whatsapp.js";
import { initCartBadge, initContactLink, formatBRL } from "../ui.js";

initCartBadge();
initContactLink();

const itemsEl = document.getElementById("cart-items");
const emptyEl = document.getElementById("cart-empty");
const summaryEl = document.getElementById("cart-summary");
const totalEl = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");

function render() {
  const items = getCart();
  itemsEl.innerHTML = "";

  if (items.length === 0) {
    emptyEl.hidden = false;
    summaryEl.hidden = true;
    return;
  }

  emptyEl.hidden = true;
  summaryEl.hidden = false;

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="thumb">
        ${
          item.imageUrl
            ? `<img src="${item.imageUrl}" alt="${item.name}" />`
            : ""
        }
      </div>
      <div>
        <h3>${item.name}</h3>
        <div class="meta">Tam ${item.size} · ${item.color}</div>
        <div class="meta price-mono">${formatBRL(item.price)} / un.</div>
        <button class="remove-btn" type="button" data-remove="${item.variantId}">Remover</button>
      </div>
      <div class="qty-controls">
        <button type="button" data-minus="${item.variantId}" aria-label="Diminuir">−</button>
        <span class="price-mono">${item.qty}</span>
        <button type="button" data-plus="${item.variantId}" aria-label="Aumentar">+</button>
      </div>
    `;
    itemsEl.appendChild(row);
  }

  totalEl.textContent = formatBRL(getCartTotal()).replace("R$", "").trim();

  itemsEl.querySelectorAll("[data-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.minus;
      const item = getCart().find((i) => i.variantId === id);
      if (item) updateQty(id, item.qty - 1);
      render();
    });
  });

  itemsEl.querySelectorAll("[data-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.plus;
      const item = getCart().find((i) => i.variantId === id);
      if (item) updateQty(id, item.qty + 1);
      render();
    });
  });

  itemsEl.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(btn.dataset.remove);
      render();
    });
  });
}

checkoutBtn.addEventListener("click", () => {
  openWhatsAppWithCart(getCart());
});

render();
