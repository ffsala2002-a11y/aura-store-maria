// ========================================================
// GALERIA / CARROSSEL DE FOTOS (reutilizável)
// Usado na página de produto e no "quick view" do catálogo.
// Sem dependências — swipe por toque + setas + bolinhas.
// ========================================================

// images: array de URLs (string). Se vazio, mostra um placeholder.
export function mountGallery(container, images, { showThumbs = true, altText = "" } = {}) {
  const pics = images && images.length > 0 ? images : [null];
  let current = 0;

  container.classList.add("gallery");
  container.innerHTML = `
    <div class="gallery-viewport">
      <div class="gallery-track">
        ${pics
          .map(
            (url) => `
          <div class="slide">
            ${
              url
                ? `<img src="${url}" alt="${altText}" loading="lazy" />`
                : `<span class="placeholder">SEM FOTO</span>`
            }
          </div>
        `
          )
          .join("")}
      </div>
      ${
        pics.length > 1
          ? `
        <button type="button" class="gallery-arrow prev" aria-label="Foto anterior">‹</button>
        <button type="button" class="gallery-arrow next" aria-label="Próxima foto">›</button>
      `
          : ""
      }
    </div>
    ${
      pics.length > 1
        ? `<div class="gallery-dots">
            ${pics.map((_, i) => `<button type="button" data-dot="${i}" aria-label="Ir pra foto ${i + 1}"></button>`).join("")}
          </div>`
        : ""
    }
    ${
      showThumbs && pics.length > 1
        ? `<div class="gallery-thumbs">
            ${pics
              .map(
                (url, i) => `
              <button type="button" data-thumb="${i}">
                ${url ? `<img src="${url}" alt="Miniatura ${i + 1}" />` : ""}
              </button>
            `
              )
              .join("")}
          </div>`
        : ""
    }
  `;

  const track = container.querySelector(".gallery-track");
  const dots = container.querySelectorAll("[data-dot]");
  const thumbs = container.querySelectorAll("[data-thumb]");

  function goTo(index) {
    current = ((index % pics.length) + pics.length) % pics.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d) => d.setAttribute("aria-current", String(Number(d.dataset.dot) === current)));
    thumbs.forEach((t) => t.setAttribute("aria-current", String(Number(t.dataset.thumb) === current)));
  }

  container.querySelector(".prev")?.addEventListener("click", () => goTo(current - 1));
  container.querySelector(".next")?.addEventListener("click", () => goTo(current + 1));
  dots.forEach((d) => d.addEventListener("click", () => goTo(Number(d.dataset.dot))));
  thumbs.forEach((t) => t.addEventListener("click", () => goTo(Number(t.dataset.thumb))));

  // Swipe por toque
  let startX = 0;
  let dragging = false;
  const viewport = container.querySelector(".gallery-viewport");

  viewport.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      dragging = true;
    },
    { passive: true }
  );

  viewport.addEventListener(
    "touchend",
    (e) => {
      if (!dragging) return;
      dragging = false;
      const deltaX = e.changedTouches[0].clientX - startX;
      if (Math.abs(deltaX) > 40) {
        goTo(deltaX > 0 ? current - 1 : current + 1);
      }
    },
    { passive: true }
  );

  goTo(0);

  return { goTo };
}
