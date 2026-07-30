import {
  fetchCatalog,
  extractCategories,
  totalStock,
  coverImage,
  galleryImages,
} from "../catalog.js";
import { initCartBadge, formatBRL } from "../ui.js";
import { mountGallery } from "../gallery.js";

initCartBadge();

const grid = document.getElementById("product-grid");
const filtersEl = document.getElementById("filters");
const emptyState = document.getElementById("empty-state");

let allProducts = [];
let activeCategory = "Todos";

function stockPill(product) {
  const stock = totalStock(product);
  if (stock <= 0) return { cls: "out", text: "Esgotado" };
  if (stock <= 3) return { cls: "low", text: `Últimas ${stock} peças` };
  return { cls: "ok", text: "Em estoque" };
}

function renderFilters(categories) {
  filtersEl.innerHTML = "";
  for (const category of categories) {
    const btn = document.createElement("button");
    btn.className = "filter-chip";
    btn.type = "button";
    btn.textContent = category;
    btn.setAttribute("aria-pressed", String(category === activeCategory));
    btn.addEventListener("click", () => {
      activeCategory = category;
      renderFilters(categories);
      renderGrid();
    });
    filtersEl.appendChild(btn);
  }
}

function renderGrid() {
  const filtered =
    activeCategory === "Todos"
      ? allProducts
      : allProducts.filter((p) => p.category === activeCategory);

  grid.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const product of filtered) {
    const pill = stockPill(product);
    const cover = coverImage(product);
    const discountPct = product.promo_price
      ? Math.round(100 - (product.promo_price / product.price) * 100)
      : null;

    const card = document.createElement("a");
    card.className = "product-card";
    card.href = `./produto.html?id=${product.id}`;

    const priceHtml = product.promo_price
      ? `<span class="old price-mono">${formatBRL(product.price)}</span>
         <span class="now price-mono">${formatBRL(product.promo_price)}</span>`
      : `<span class="now price-mono">${formatBRL(product.price)}</span>`;

    card.innerHTML = `
      <div class="thumb">
        ${discountPct ? `<span class="discount-badge">${discountPct}% OFF</span>` : ""}
        <button type="button" class="quick-view-btn" data-quick-view="${product.id}" aria-label="Visualização rápida">👁</button>
        ${
          cover
            ? `<img src="${cover}" alt="${product.name}" loading="lazy" />`
            : `<span class="placeholder">SEM FOTO</span>`
        }
      </div>
      <span class="eyebrow cat">${product.category}</span>
      <h3>${product.name}</h3>
      <div class="price-row">${priceHtml}</div>
      <span class="stock-pill ${pill.cls}">${pill.text}</span>
    `;
    grid.appendChild(card);
  }

  grid.querySelectorAll("[data-quick-view]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const product = allProducts.find((p) => p.id === btn.dataset.quickView);
      if (product) openQuickView(product);
    });
  });
}

function openQuickView(product) {
  const overlay = document.createElement("div");
  overlay.className = "quick-view-overlay";
  overlay.innerHTML = `
    <div class="quick-view-modal">
      <button type="button" class="quick-view-close" aria-label="Fechar">✕</button>
      <div class="qv-gallery"></div>
      <span class="eyebrow">${product.category}</span>
      <h3>${product.name}</h3>
      <div class="price-row">
        ${
          product.promo_price
            ? `<span class="old price-mono">${formatBRL(product.price)}</span>
               <span class="now price-mono">${formatBRL(product.promo_price)}</span>`
            : `<span class="now price-mono">${formatBRL(product.price)}</span>`
        }
      </div>
      <a href="produto.html?id=${product.id}" class="btn btn-primary" style="margin-top:16px">Ver produto completo</a>
    </div>
  `;

  document.body.appendChild(overlay);
  mountGallery(overlay.querySelector(".qv-gallery"), galleryImages(product), {
    altText: product.name,
  });

  function close() {
    overlay.remove();
  }
  overlay.querySelector(".quick-view-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}

async function init() {
  try {
    allProducts = await fetchCatalog();
    renderFilters(extractCategories(allProducts));
    renderGrid();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state">Não deu pra carregar o catálogo agora. Tenta de novo em instantes.</div>`;
  }
}

init();
