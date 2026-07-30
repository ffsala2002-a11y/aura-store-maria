// ========================================================
// MONTA A MENSAGEM DO WHATSAPP A PARTIR DO CARRINHO
// ========================================================

import { WHATSAPP_NUMBER, STORE_NAME } from "./config.js";

function formatBRL(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Gera o texto da mensagem, um produto específico
export function buildSingleProductMessage(product, variant) {
  const lines = [
    `Olá! Vim do site da ${STORE_NAME} e tenho interesse neste produto:`,
    "",
    `• ${product.name}`,
    `  Tamanho: ${variant.size} | Cor: ${variant.color}`,
    `  Valor: ${formatBRL(variant.price ?? product.price)}`,
  ];
  return lines.join("\n");
}

// Gera o texto da mensagem a partir do carrinho inteiro
export function buildCartMessage(items) {
  if (!items.length) {
    return `Olá! Vim do site da ${STORE_NAME}.`;
  }

  const lines = [
    `Olá! Vim do site da ${STORE_NAME} e quero fechar os seguintes itens:`,
    "",
  ];

  let total = 0;
  for (const item of items) {
    const subtotal = item.price * item.qty;
    total += subtotal;
    lines.push(
      `• ${item.qty}x ${item.name} (Tam: ${item.size}, Cor: ${item.color}) — ${formatBRL(subtotal)}`
    );
  }

  lines.push("", `Total: ${formatBRL(total)}`);
  return lines.join("\n");
}

export function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppWithCart(items) {
  const message = buildCartMessage(items);
  window.open(buildWhatsAppUrl(message), "_blank");
}

export function openWhatsAppWithProduct(product, variant) {
  const message = buildSingleProductMessage(product, variant);
  window.open(buildWhatsAppUrl(message), "_blank");
}

// Compartilha só o link da página do produto (além da mensagem
// detalhada acima, que continua existindo separadamente)
export function buildShareMessage(product, productUrl) {
  return [
    `Olha essa peça da ${STORE_NAME}:`,
    "",
    `${product.name}`,
    productUrl,
  ].join("\n");
}

export function openWhatsAppShareProduct(product, productUrl) {
  const message = buildShareMessage(product, productUrl);
  window.open(buildWhatsAppUrl(message), "_blank");
}
