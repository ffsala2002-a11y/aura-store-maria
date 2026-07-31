import { fetchProductById, galleryImages } from "../catalog.js";
import { addToCart } from "../cart.js";
import { openWhatsAppWithProduct, openWhatsAppShareProduct } from "../whatsapp.js";
import { initCartBadge, initContactLink, showToast, formatBRL } from "../ui.js";
import { mountGallery } from "../gallery.js";

initCartBadge();
initContactLink();

const root = document.getElementById("product-root");
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let product = null;
let selectedSize = null;
let selectedColor = null;
let qty = 1;

function uniqueBy(arr, key) {
  return Array.from(new Map(arr.map((item) => [item[key], item])).values());
}

function variantsFor(size, color) {
  return product.product_variants.filter(
    (v) => (!size || v.size === size) && (!color || v.color === color)
  );
}

function currentVariant() {
  if (!selectedSize || !selectedColor) return null;
  return product.product_variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  ) ?? null;
}

function render() {
  const variant = currentVariant();
  const price = product.promo_price ?? product.price;
  const sizes = uniqueBy(product.product_variants, "size");
  const colors = uniqueBy(product.product_variants, "color");

  root.innerHTML = `
    <div class="product-detail">
      <div class="product-gallery"></div>
      <div>
        <p class="breadcrumb"><a href="index.html">Catálogo</a> / ${product.category}</p>
        <h1>${product.name}</h1>
        <div class="price-row" style="margin-bottom:16px">
          ${
            product.promo_price
              ? `<span class="old price-mono">${formatBRL(product.price)}</span>
                 <span class="now price-mono" style="font-size:22px">${formatBRL(product.promo_price)}</span>`
              : `<span class="now price-mono" style="font-size:22px">${formatBRL(product.price)}</span>`
          }
        </div>
        ${product.description ? `<p class="description">${product.description}</p>` : ""}

        <div class="selector-group">
          <span class="eyebrow">Tamanho</span>
          <div class="option-row" id="size-row"></div>
        </div>

        <div class="selector-group">
          <span class="eyebrow">Cor</span>
          <div class="option-row" id="color-row"></div>
        </div>

        <div class="qty-row">
          <span class="eyebrow">Qtd.</span>
          <button type="button" id="qty-minus" aria-label="Diminuir quantidade">−</button>
          <span class="qty-value" id="qty-value">${qty}</span>
          <button type="button" id="qty-plus" aria-label="Aumentar quantidade">+</button>
        </div>

        <p class="eyebrow" id="stock-info" style="margin-bottom:16px"></p>

        <div class="action-row">
          <button class="btn btn-primary" id="add-cart-btn" type="button">Adicionar ao carrinho</button>
          <button class="btn btn-whatsapp" id="whatsapp-btn" type="button" style="display: none;">Falar no WhatsApp sobre esta peça</button>
          <button class="btn btn-share" id="share-btn" type="button">Compartilhar produto</button>
        </div>
      </div>
    </div>
  `;

  mountGallery(root.querySelector(".product-gallery"), galleryImages(product), {
    altText: product.name,
  });

  document.getElementById("share-btn").addEventListener("click", () => {
    const productUrl = window.location.href;
    openWhatsAppShareProduct(product, productUrl);
  });

  // Tamanhos
  const sizeRow = document.getElementById("size-row");
  for (const s of sizes) {
    const hasStock = variantsFor(s.size, null).some((v) => v.stock_quantity > 0);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-chip";
    btn.textContent = s.size;
    btn.setAttribute("aria-pressed", String(selectedSize === s.size));
    btn.disabled = !hasStock;
    btn.addEventListener("click", () => {
      selectedSize = s.size;
      // Se a cor escolhida não existir nesse tamanho, limpa
      const stillValid = variantsFor(selectedSize, selectedColor).length > 0;
      if (!stillValid) selectedColor = null;
      render();
    });
    sizeRow.appendChild(btn);
  }

  // Cores
  const colorRow = document.getElementById("color-row");
  for (const c of colors) {
    const candidates = variantsFor(selectedSize, c.color);
    const hasStock = candidates.some((v) => v.stock_quantity > 0);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-chip color-chip";
    btn.setAttribute("aria-pressed", String(selectedColor === c.color));
    btn.disabled = !hasStock;
    btn.innerHTML = `
      ${c.color_hex ? `<span class="color-dot" style="background:${c.color_hex}"></span>` : ""}
      ${c.color}
    `;
    btn.addEventListener("click", () => {
      selectedColor = c.color;
      const stillValid = variantsFor(selectedSize, selectedColor).length > 0;
      if (!stillValid) selectedSize = null;
      render();
    });
    colorRow.appendChild(btn);
  }

  // Estoque / quantidade
  const stockInfo = document.getElementById("stock-info");
  const addBtn = document.getElementById("add-cart-btn");
  const waBtn = document.getElementById("whatsapp-btn");

  if (!variant) {
    stockInfo.textContent = "Escolha tamanho e cor";
    addBtn.disabled = true;
    waBtn.disabled = true;
  } else if (variant.stock_quantity <= 0) {
    stockInfo.textContent = "Sem estoque nessa combinação";
    addBtn.disabled = true;
    waBtn.disabled = false; // ainda pode perguntar sobre reposição
  } else {
    stockInfo.textContent = `${variant.stock_quantity} em estoque`;
    addBtn.disabled = false;
    waBtn.disabled = false;
    qty = Math.min(qty, variant.stock_quantity);
  }

  document.getElementById("qty-value").textContent = String(qty);

  document.getElementById("qty-minus").addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    document.getElementById("qty-value").textContent = String(qty);
  });
  document.getElementById("qty-plus").addEventListener("click", () => {
    const max = variant ? variant.stock_quantity : 99;
    qty = Math.min(max, qty + 1);
    document.getElementById("qty-value").textContent = String(qty);
  });

  addBtn.addEventListener("click", () => {
    const v = currentVariant();
    if (!v) return;
    addToCart(
      {
        variantId: v.id,
        productId: product.id,
        name: product.name,
        size: v.size,
        color: v.color,
        price: product.promo_price ?? product.price,
        imageUrl: galleryImages(product)[0] ?? null,
      },
      qty
    );
    showToast("Adicionado ao carrinho ✓");
  });

  waBtn.addEventListener("click", () => {
    const v = currentVariant() ?? { size: selectedSize ?? "—", color: selectedColor ?? "—", price };
    openWhatsAppWithProduct(product, v);
  });
}

async function init() {
  if (!productId) {
    root.innerHTML = `<div class="empty-state">Produto não encontrado.</div>`;
    return;
  }
  try {
    product = await fetchProductById(productId);
    render();
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="empty-state">Não deu pra carregar esse produto agora.</div>`;
  }
}

init();
