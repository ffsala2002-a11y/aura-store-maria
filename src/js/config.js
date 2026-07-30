// ========================================================
// CONFIGURAÇÃO DA LOJA
// Preencha estes valores e o site inteiro (admin incluso)
// vai usá-los. É o único lugar que você precisa editar
// pra colocar no ar.
// ========================================================

export const SUPABASE_URL = "https://aazftigtzlrxuxrbromy.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhemZ0aWd0emxyeHV4cmJyb215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTk2MjUsImV4cCI6MjEwMDk3NTYyNX0.wRcxbI4XE8X4VUKp7ZdllqG7yosseb9ou3G-ipa62J8";

// Número de WhatsApp da loja, formato internacional, só dígitos.
// Exemplo: (11) 91234-5678  ->  5511912345678
export const WHATSAPP_NUMBER = "5563999789035";

// Nome da loja, usado nos títulos e na mensagem do WhatsApp
export const STORE_NAME = "AUG Moda";

// As fotos dos produtos são enviadas pro GitHub através de uma
// Edge Function do Supabase (veja supabase/functions/upload-image).
// O token do GitHub fica configurado só lá no servidor, nunca aqui.
// Não precisa de nenhuma variável extra neste arquivo pra isso.
