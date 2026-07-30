import { requireAuth, signOut } from "../auth.js";
import {
  fetchAllProducts,
  toggleActive,
  deleteProduct,
  setVariantStock,
} from "../adminData.js";
import { coverImage } from "../../../src/js/catalog.js";

await requireAuth();

document.getElementById("logout-btn").addEventListener("click", signOut);

const listEl = document.getElementById("product-list");
const emptyMsg = document.getElementById("empty-msg");
const searchInput = document.getElementById("search-input");
const toast = document.getElementById("toast");

let allProducts = [];

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

function formatBRL(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function render(products) {
  listEl.innerHTML = "";

  if (products.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  for (const product of products) {
    const card = document.createElement("div");
    card.className = "admin-product";

    const variantRows = (product.product_variants ?? [])
      .map(
        (v) => `
        <tr data-variant-id="${v.id}">
          <td>${v.size}</td>
          <td>${v.color}</td>
          <td>
            <div class="stock-input-row">
              <button type="button" data-stock-minus>−</button>
              <input type="number" min="0" value="${v.stock_quantity}" data-stock-input />
              <button type="button" data-stock-plus>+</button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");

    const cover = coverImage(product);
    card.innerHTML = `
      <div class="admin-product-head">
        <div class="thumb">
          ${cover ? `<img src="${cover}" alt="${product.name}" />` : ""}
        </div>
        <div class="info">
          <h3>${product.name}</h3>
          <div class="meta">${product.category} · ${formatBRL(product.promo_price ?? product.price)}</div>
          <span class="status-badge ${product.active ? "active" : "inactive"}">
            ${product.active ? "Ativo no site" : "Oculto"}
          </span>
        </div>
        <div class="admin-product-actions">
          <a class="icon-btn" href="produto-form.html?id=${product.id}">Editar</a>
          <button class="icon-btn" type="button" data-toggle-active="${product.id}" data-active="${product.active}">
            ${product.active ? "Ocultar" : "Ativar"}
          </button>
          <button class="icon-btn" type="button" data-delete="${product.id}">Excluir</button>
        </div>
      </div>

      ${
        variantRows
          ? `<table class="variant-table">
              <thead><tr><th>Tam.</th><th>Cor</th><th>Estoque</th></tr></thead>
              <tbody>${variantRows}</tbody>
            </table>`
          : `<p class="helper-text">Nenhuma variação de tamanho/cor cadastrada.</p>`
      }
    `;

    listEl.appendChild(card);
  }

  attachHandlers();
}

function attachHandlers() {
  // Estoque: + / - / edição direta
  listEl.querySelectorAll("tr[data-variant-id]").forEach((row) => {
    const variantId = row.dataset.variantId;
    const input = row.querySelector("[data-stock-input]");

    const commit = async (newValue) => {
      const value = Math.max(0, Number(newValue) || 0);
      input.value = value;
      try {
        await setVariantStock(variantId, value);
        showToast("Estoque atualizado ✓");
      } catch (err) {
        console.error(err);
        showToast("Erro ao atualizar estoque");
      }
    };

    row.querySelector("[data-stock-minus]").addEventListener("click", () => {
      commit(Number(input.value) - 1);
    });
    row.querySelector("[data-stock-plus]").addEventListener("click", () => {
      commit(Number(input.value) + 1);
    });
    input.addEventListener("change", () => commit(input.value));
  });

  // Ativar / ocultar
  listEl.querySelectorAll("[data-toggle-active]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.toggleActive;
      const isActive = btn.dataset.active === "true";
      try {
        await toggleActive(id, !isActive);
        showToast(!isActive ? "Produto ativado ✓" : "Produto ocultado ✓");
        await load();
      } catch (err) {
        console.error(err);
        showToast("Erro ao atualizar produto");
      }
    });
  });

  // Excluir
  listEl.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.delete;
      if (!confirm("Excluir esse produto e todas as suas variações? Essa ação não pode ser desfeita.")) {
        return;
      }
      try {
        await deleteProduct(id);
        showToast("Produto excluído");
        await load();
      } catch (err) {
        console.error(err);
        showToast("Erro ao excluir produto");
      }
    });
  });
}

function applySearch() {
  const term = searchInput.value.trim().toLowerCase();
  if (!term) {
    render(allProducts);
    return;
  }
  const filtered = allProducts.filter(
    (p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
  );
  render(filtered);
}

searchInput.addEventListener("input", applySearch);

async function load() {
  try {
    allProducts = await fetchAllProducts();
    applySearch();
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<p class="helper-text">Não deu pra carregar os produtos agora.</p>`;
  }
}

load();
