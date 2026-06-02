// =====================================================
// auth.js — Login/registro UI + manejo de sesión Supabase
// =====================================================

window.currentUser = null;

function renderLoginScreen(message, type = "error") {
  const root = document.getElementById("auth-root");
  if (!root) return;
  root.style.display = "flex";
  document.getElementById("app-shell").style.display = "none";

  root.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo"><span class="logo-fit">FIT</span><span class="logo-col">COL</span></div>
      <p class="auth-tag">Vuela más alto cada día.</p>

      ${!window.supabaseConfigured ? `
        <div class="auth-banner">
          Supabase no está configurado. Edita <code>supabase-config.js</code> con tus credenciales para habilitar login. Ver <code>SETUP.md</code>.
        </div>
      ` : `
        <button class="btn-google" id="auth-google">
          <svg viewBox="0 0 48 48" width="20" height="20"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8c1.8-4.3 6-7.5 11.1-7.5 3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3c-1.9 1.4-4.3 2.2-7.3 2.2-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3c-.4.4 6.5-4.8 6.5-14.3 0-1.3-.1-2.4-.4-3.5z"/></svg>
          Continuar con Google
        </button>

        <div class="auth-divider"><span>o</span></div>

        <form id="auth-form" class="auth-form">
          <div id="auth-name-wrap" style="display:none;">
            <label>Nombre</label>
            <input type="text" id="auth-name" placeholder="Tu nombre">
          </div>
          <label>Email</label>
          <input type="email" id="auth-email" placeholder="tu@email.com" required>
          <label>Contraseña</label>
          <input type="password" id="auth-password" placeholder="Mínimo 6 caracteres" required minlength="6">
          <div id="auth-forgot-wrap" style="text-align:right;margin-top:6px;">
            <a href="#" id="auth-forgot" style="font-size:12px;color:var(--accent);">¿Olvidaste tu contraseña?</a>
          </div>
          ${message ? `<div class="auth-${type}">${message}</div>` : ""}
          <button type="submit" class="btn-primary btn-block" id="auth-submit">Iniciar sesión</button>
        </form>

        <p class="auth-toggle">
          <span id="auth-mode-label">¿No tienes cuenta?</span>
          <a href="#" id="auth-toggle">Crear cuenta</a>
        </p>
      `}
    </div>
  `;

  if (!window.supabaseConfigured) return;

  let mode = "signin"; // "signin" | "signup"

  document.getElementById("auth-toggle").addEventListener("click", e => {
    e.preventDefault();
    mode = (mode === "signin") ? "signup" : "signin";
    document.getElementById("auth-name-wrap").style.display = mode === "signup" ? "block" : "none";
    document.getElementById("auth-submit").textContent = mode === "signup" ? "Crear cuenta" : "Iniciar sesión";
    document.getElementById("auth-mode-label").textContent = mode === "signup" ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?";
    document.getElementById("auth-toggle").textContent = mode === "signup" ? "Iniciar sesión" : "Crear cuenta";
    const fw = document.getElementById("auth-forgot-wrap");
    if (fw) fw.style.display = mode === "signup" ? "none" : "block";
  });

  document.getElementById("auth-forgot").addEventListener("click", async e => {
    e.preventDefault();
    if (mode !== "signin") return;
    const email = document.getElementById("auth-email").value.trim();
    if (!email) {
      renderLoginScreen("Escribe tu email primero para recuperar la contraseña.");
      return;
    }
    const link = document.getElementById("auth-forgot");
    if (link) { link.textContent = "Enviando…"; link.style.pointerEvents = "none"; }
    try {
      const { error: resetErr } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: "https://dan1102yt.github.io/Fitcol/"
      });
      if (resetErr) {
        renderLoginScreen(resetErr.message);
      } else {
        renderLoginScreen("Te enviamos un link al correo 🦅", "success");
      }
    } catch (err) {
      renderLoginScreen(err.message || "Error al enviar el correo.");
    }
  });

  document.getElementById("auth-google").addEventListener("click", async () => {
    try {
      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
      if (error) renderLoginScreen(error.message);
    } catch (err) {
      renderLoginScreen(err.message || "Error con Google");
    }
  });

  document.getElementById("auth-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const submitBtn = document.getElementById("auth-submit");
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Procesando…";
    try {
      let result;
      if (mode === "signup") {
        const name = document.getElementById("auth-name").value.trim();
        result = await window.supabaseClient.auth.signUp({
          email, password,
          options: { data: { full_name: name || null } }
        });
        if (!result.error) {
          renderLoginScreen("Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.");
          return;
        }
      } else {
        result = await window.supabaseClient.auth.signInWithPassword({ email, password });
      }
      if (result.error) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        renderLoginScreen(result.error.message);
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      renderLoginScreen(err.message || "Error inesperado");
    }
  });
}

function showAppUI() {
  const root = document.getElementById("auth-root");
  if (root) root.style.display = "none";
  document.getElementById("app-shell").style.display = "grid";
}

function updateUserBadge(user) {
  const badge = document.getElementById("user-badge");
  if (!badge) return;
  const label = user?.user_metadata?.full_name || user?.email || "Usuario";
  badge.innerHTML = `
    <span class="user-email">${label}</span>
    <button class="btn btn-sm" id="logout-btn">Cerrar sesión</button>
  `;
  document.getElementById("logout-btn").addEventListener("click", async () => {
    if (!window.supabaseClient) return;
    await window.supabaseClient.auth.signOut();
  });
}

async function initAuth() {
  // Si Supabase no está configurado, salta el gate y arranca la app
  if (!window.supabaseConfigured) {
    showAppUI();
    if (typeof initFitcolApp === "function") initFitcolApp();
    return;
  }

  // Comprobar sesión existente
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (session?.user) {
    window.currentUser = session.user;
    showAppUI();
    updateUserBadge(session.user);
    if (typeof initFitcolApp === "function") initFitcolApp();
    if (typeof cloudHydrate === "function") await cloudHydrate();
  } else {
    renderLoginScreen();
  }

  // Reactivo: si cambia el estado de auth, refrescamos
  window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      window.currentUser = session.user;
      showAppUI();
      updateUserBadge(session.user);
      if (typeof initFitcolApp === "function") initFitcolApp();
      if (typeof cloudHydrate === "function") await cloudHydrate();
    } else if (event === "SIGNED_OUT") {
      window.currentUser = null;
      renderLoginScreen();
    }
  });
}

// Esperar a que supabase-config.js haya terminado
if (window.supabaseConfigured !== undefined) {
  initAuth();
} else {
  window.addEventListener("supabase-ready", initAuth, { once: true });
}
