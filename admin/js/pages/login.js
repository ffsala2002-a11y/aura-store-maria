import { signIn, getSession } from "../auth.js";

const form = document.getElementById("login-form");
const errorEl = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");

// Se já estiver logado, pula direto pro dashboard
getSession().then((session) => {
  if (session) window.location.href = "dashboard.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Entrando...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signIn(email, password);
    window.location.href = "dashboard.html";
  } catch (err) {
    errorEl.textContent = err.message ?? "E-mail ou senha incorretos.";
    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";
  }
});
