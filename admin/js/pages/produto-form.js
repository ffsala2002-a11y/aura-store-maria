import { requireAuth, signOut } from "../auth.js";
import {
  fetchProduct,
  createProduct,
  updateProduct,
  replaceVariants,
  replaceProductImages,
  uploadImageToGithub,
} from "../adminData.js";

await requireAuth();
document.getElementById("logout-btn").addEventListener("click", signOut);

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
const isEditing = Boolean(productId);

document.getElementById("form-title").textContent = isEditing ? "Editar produto" : "Novo produto";
document.getElementById("submit-btn").textContent = isEditing ? "Salvar alterações" : "Criar produto";

const form = document.getElementById("product-form");
const errorEl = document.getElementById("form-error");
const toast = document.getElementById("toast");
const variantsContainer = document.getElementById("variants-container");
const photoGallery = document.getElementById("photo-gallery");
const imageFileInput = document.getElementById("image-file");
const uploadStatus = document.getElementById("upload-status");

let variantIdCounter = 0;

// Lista de fotos em memória, na ordem em que vão pro carrossel.
// A primeira é sempre a capa. Só vira product_images quando salvar.
let photos = []; // array de URLs (string)

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// --- Galeria de fotos ---

function renderPhotoGallery() {
  photoGallery.innerHTML = photos
    .map(
      (url, index) => `
      <div class="photo-item" data-index="${index}">
        ${index === 0 ? `<span class="cover-tag">CAPA</span>` : ""}
        <div class="photo-thumb"><img src="${url}" alt="Foto ${index + 1}" /></div>
        <div class="photo-actions">
          <button type="button" data-move-left="${index}" ${index === 0 ? "disabled" : ""}>◀</button>
          <button type="button" class="remove-photo" data-remove="${index}">Remover</button>
          <button type="button" data-move-right="${index}" ${index === photos.length - 1 ? "disabled" : ""}>▶</button>
        </div>
      </div>
    `
    )
    .join("");

  photoGallery.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      photos.splice(Number(btn.dataset.remove), 1);
      renderPhotoGallery();
    });
  });
  photoGallery.querySelectorAll("[data-move-left]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.moveLeft);
      [photos[i - 1], photos[i]] = [photos[i], photos[i - 1]];
      renderPhotoGallery();
    });
  });
  photoGallery.querySelectorAll("[data-move-right]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.moveRight);
      [photos[i + 1], photos[i]] = [photos[i], photos[i + 1]];
      renderPhotoGallery();
    });
  });
}

imageFileInput.addEventListener("change", async () => {
  const files = Array.from(imageFileInput.files);
  if (files.length === 0) return;

  uploadStatus.textContent = `Enviando ${files.length} foto(s) pro GitHub...`;

  for (const [i, file] of files.entries()) {
    try {
      uploadStatus.textContent = `Enviando foto ${i + 1} de ${files.length}...`;
      const url = await uploadImageToGithub(file);
      photos.push(url);
      renderPhotoGallery();
    } catch (err) {
      console.error(err);
      uploadStatus.textContent = `Erro ao enviar "${file.name}": ${err.message}`;
      return;
    }
  }

  uploadStatus.textContent = "A primeira foto da lista vira a capa no catálogo. Pode enviar mais de uma de uma vez.";
  imageFileInput.value = "";
});

// --- Variações (tamanho/cor/estoque) ---

function addVariantRow(variant = {}) {
  variantIdCounter += 1;
  const rowId = `v${variantIdCounter}`;

  const row = document.createElement("div");
  row.className = "variant-row";
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <div class="field" style="margin:0">
      <label>Tamanho</label>
      <input type="text" data-field="size" value="${variant.size ?? ""}" placeholder="P, M, G..." required />
    </div>
    <div class="field" style="margin:0">
      <label>Cor</label>
      <input type="text" data-field="color" value="${variant.color ?? ""}" placeholder="Azul" required />
    </div>
    <div class="field" style="margin:0">
      <label>Cor (visual)</label>
      <input type="color" data-field="color_hex" value="${variant.color_hex ?? "#2d6ae3"}" />
    </div>
    <div class="field" style="margin:0">
      <label>Estoque</label>
      <input type="number" min="0" data-field="stock_quantity" value="${variant.stock_quantity ?? 0}" required />
    </div>
    <button type="button" class="remove-variant" data-remove-row>Remover</button>
  `;

  row.querySelector("[data-remove-row]").addEventListener("click", () => row.remove());
  variantsContainer.appendChild(row);
}

document.getElementById("add-variant-btn").addEventListener("click", () => addVariantRow());

function readVariantRows() {
  return Array.from(variantsContainer.querySelectorAll(".variant-row")).map((row) => ({
    size: row.querySelector('[data-field="size"]').value.trim(),
    color: row.querySelector('[data-field="color"]').value.trim(),
    color_hex: row.querySelector('[data-field="color_hex"]').value,
    stock_quantity: Number(row.querySelector('[data-field="stock_quantity"]').value) || 0,
  }));
}

// --- Carregar produto existente (modo edição) ---

async function loadExisting() {
  if (!isEditing) {
    addVariantRow(); // começa com uma linha em branco pra facilitar
    return;
  }
  try {
    const product = await fetchProduct(productId);
    document.getElementById("name").value = product.name;
    document.getElementById("category").value = product.category;
    document.getElementById("description").value = product.description ?? "";
    document.getElementById("price").value = product.price;
    document.getElementById("promo_price").value = product.promo_price ?? "";
    document.getElementById("active").checked = product.active;

    const existingImages = (product.product_images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => img.url);

    photos = existingImages.length > 0 ? existingImages : product.image_url ? [product.image_url] : [];
    renderPhotoGallery();

    const variants = product.product_variants ?? [];
    if (variants.length === 0) {
      addVariantRow();
    } else {
      variants.forEach((v) => addVariantRow(v));
    }
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Não deu pra carregar esse produto.";
  }
}

// --- Salvar ---

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Salvando...";

  try {
    const variants = readVariantRows();

    if (variants.some((v) => !v.size || !v.color)) {
      throw new Error("Preencha tamanho e cor de todas as variações, ou remova as linhas vazias.");
    }

    const productPayload = {
      name: document.getElementById("name").value.trim(),
      category: document.getElementById("category").value.trim(),
      description: document.getElementById("description").value.trim() || null,
      price: Number(document.getElementById("price").value),
      promo_price: document.getElementById("promo_price").value
        ? Number(document.getElementById("promo_price").value)
        : null,
      active: document.getElementById("active").checked,
      image_url: photos[0] ?? null, // mantém compatibilidade com o campo antigo
    };

    let id = productId;
    if (isEditing) {
      await updateProduct(productId, productPayload);
    } else {
      const created = await createProduct(productPayload);
      id = created.id;
    }

    await replaceVariants(id, variants);
    await replaceProductImages(id, photos);

    showToast("Produto salvo ✓");
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message ?? "Não deu pra salvar o produto agora.";
    submitBtn.disabled = false;
    submitBtn.textContent = isEditing ? "Salvar alterações" : "Criar produto";
  }
});

loadExisting();
