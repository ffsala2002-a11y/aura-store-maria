import { fetchCatalog, extractCategories, totalStock, coverImage, galleryImages, } from "../catalog.js";
import { initCartBadge, initContactLink, showToast, formatBRL } from "../ui.js";
import { mountGallery } from "../gallery.js";
import { addToCart } from "../cart.js";

initCartBadge();
initContactLink();

const grid = document.getElementById("product-grid");
const filtersEl = document.getElementById("filters");
const emptyState = document.getElementById("empty-state");
const searchBar = document.getElementById("search-bar");
const searchInput = document.getElementById("search-input");

let allProducts = [];
let activeCategory = "Todos";
let searchTerm = "";
let sortMode = "recent"; // recent | price-asc | price-desc

function stockPill(product) {
  const stock = totalStock(product);
  if (stock <= 0) return { cls: "out", text: "Esgotado" };
  if (stock <= 3) return { cls: "low", text: `Últimas ${stock} peças` };
  return { cls: "ok", text: "Em estoque" };
}

function effectivePrice(product) {
  return product.promo_price ?? product.price;
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

function getFilteredSorted() {
  let list =
    activeCategory === "Todos"
      ? allProducts
      : allProducts.filter((p) => p.category === activeCategory);

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    list = list.filter(
      (p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
    );
  }

  list = list.slice();
  if (sortMode === "price-asc") {
    list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  } else if (sortMode === "price-desc") {
    list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
  } else {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return list;
}

function firstAvailableVariant(product) {
  const variants = product.product_variants ?? [];
  const inStock = variants.filter((v) => v.stock_quantity > 0);
  return { variants, inStock };
}

function renderGrid() {
  const filtered = getFilteredSorted();

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
    const { inStock } = firstAvailableVariant(product);

    const card = document.createElement("a");
    card.className = "product-card";
    card.href = `produto.html?id=${product.id}`;

    const priceHtml = product.promo_price
      ? `<span class="old price-mono">${formatBRL(product.price)}</span>
         <span class="now price-mono">${formatBRL(product.promo_price)}</span>`
      : `<span class="now price-mono">${formatBRL(product.price)}</span>`;

    card.innerHTML = `
      <div class="thumb">
        ${discountPct ? `<span class="discount-badge">${discountPct}% OFF</span>` : ""}
        <button type="button" class="quick-view-btn" data-quick-view="${product.id}" aria-label="Visualização rápida">👁</button>
        ${cover
        ? `<img src="${cover}" alt="${product.name}" loading="lazy" />`
        : `<span class="placeholder">SEM FOTO</span>`
      }
      </div>
      <span class="eyebrow cat">${product.category}</span>
      <h3>${product.name}</h3>
      <div class="price-cart-row">
        <div class="price-row">${priceHtml}</div>
        <button type="button" class="mini-cart-btn" data-quick-add="${product.id}" aria-label="Adicionar ao carrinho" ${inStock.length === 0 ? "disabled" : ""}>🛒</button>
      </div>
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

  grid.querySelectorAll("[data-quick-add]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const product = allProducts.find((p) => p.id === btn.dataset.quickAdd);
      if (!product) return;

      const { inStock } = firstAvailableVariant(product);
      if (inStock.length === 0) return;

      if (inStock.length === 1) {
        const v = inStock[0];
        addToCart(
          {
            variantId: v.id,
            productId: product.id,
            name: product.name,
            size: v.size,
            color: v.color,
            price: effectivePrice(product),
            imageUrl: coverImage(product),
          },
          1
        );
        showToast("Adicionado ao carrinho ✓");
      } else {
        // Mais de uma opção de tamanho/cor — abre visualização rápida pra escolher
        openQuickView(product);
      }
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
        ${product.promo_price
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

// --- Cabeçalho: busca, atualizar, ordenar, menu ---

document.getElementById("search-btn")?.addEventListener("click", () => {
  searchBar.classList.toggle("show");
  if (searchBar.classList.contains("show")) searchInput.focus();
});

document.getElementById("nav-search")?.addEventListener("click", (e) => {
  e.preventDefault();
  searchBar.classList.add("show");
  searchInput.focus();
});

searchInput?.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  renderGrid();
});

document.getElementById("refresh-btn")?.addEventListener("click", async () => {
  await init(true);
});

document.getElementById("sort-btn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  openSortMenu();
});

document.getElementById("filter-btn")?.addEventListener("click", () => {
  openSortMenu();
});

function openSortMenu() {
  document.querySelector(".sort-menu")?.remove();

  const menu = document.createElement("div");
  menu.className = "drawer-overlay sort-menu";
  menu.innerHTML = `
    <div class="drawer-panel" style="margin-left:auto;width:70%;max-width:260px">
      <div style="font-weight:800;margin-bottom:16px">Ordenar por</div>
      <button type="button" class="drawer-link" data-sort="recent">Mais recentes</button>
      <button type="button" class="drawer-link" data-sort="price-asc">Menor preço</button>
      <button type="button" class="drawer-link" data-sort="price-desc">Maior preço</button>
  `;
  document.body.appendChild(menu);

  menu.querySelectorAll("[data-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      sortMode = btn.dataset.sort;
      renderGrid();
      menu.remove();
    });
  });
  menu.addEventListener("click", (e) => {
    if (e.target === menu) menu.remove();
  });
}

document.getElementById("menu-btn")?.addEventListener("click", () => {
  openDrawer();
});

function openDrawer() {
  document.querySelector(".drawer-overlay.main-drawer")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "drawer-overlay main-drawer";
  overlay.innerHTML = `
    <div class="drawer-panel">
      <div class="logo">Aura <span>Store</span></div>
      <div class="drawer-section-title">Categorias</div>
      ${extractCategories(allProducts)
      .map((c) => `<button type="button" class="drawer-link" data-cat="${c}">${c}</button>`)
      .join("")}
      <div class="drawer-section-title">Ajuda</div>
      <button type="button" class="drawer-link" id="drawer-contact">💬 Falar no WhatsApp</button>

      <div class="box-dev">
         <p>© 2026 Aura Store. Todos os direitos reservados.</p>
      </div>
    </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll("[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderFilters(extractCategories(allProducts));
      renderGrid();
      overlay.remove();
    });
  });

  overlay.querySelector("#drawer-contact").addEventListener("click", async () => {
    const { openWhatsAppContact } = await import("../whatsapp.js");
    openWhatsAppContact();
    overlay.remove();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

async function init(isRefresh = false) {
  try {
    allProducts = await fetchCatalog();
    renderFilters(extractCategories(allProducts));
    renderGrid();
    if (isRefresh) showToast("Catálogo atualizado ✓");
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state">Não deu pra carregar o catálogo agora. Tenta de novo em instantes.</div>`;
  }
}

init();
