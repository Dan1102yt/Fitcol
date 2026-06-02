(function () {
  const LS_KEY = 'fitcol_install';
  let deferredPrompt = null;

  function getInstallState() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
  }
  function saveInstallState(data) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
  }

  // Track visits
  const state = getInstallState();
  if (!state.installed && !state.dismissed) {
    state.visits = (state.visits || 0) + 1;
    saveInstallState(state);
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    scheduleInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    hideBanner();
    saveInstallState({ ...getInstallState(), installed: true });
    deferredPrompt = null;
  });

  function scheduleInstallBanner() {
    const s = getInstallState();
    if (s.installed || s.dismissed) return;

    // Show immediately on 3rd+ visit, otherwise after 30s
    const delay = (s.visits >= 3) ? 2000 : 30000;
    setTimeout(showInstallBanner, delay);
  }

  function showInstallBanner() {
    const s = getInstallState();
    if (s.installed || s.dismissed || !deferredPrompt) return;
    if (document.getElementById('fitcol-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'fitcol-install-banner';
    banner.innerHTML = `
      <div class="install-banner-icon">🦅</div>
      <div class="install-banner-text">
        <strong>Instala Fitcol en tu celular</strong>
        <span>Úsala como app sin necesidad de Play Store</span>
      </div>
      <div class="install-banner-actions">
        <button id="fitcol-install-btn">Instalar</button>
        <button id="fitcol-install-dismiss">Ahora no</button>
      </div>
    `;

    Object.assign(banner.style, {
      position: 'fixed',
      bottom: '72px',
      left: '12px',
      right: '12px',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 16px',
      background: '#1A1A18',
      border: '1px solid #D4A017',
      borderRadius: '12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      fontFamily: 'Inter, system-ui, sans-serif',
      animation: 'fitcol-slide-up 0.3s ease'
    });

    if (!document.getElementById('fitcol-install-style')) {
      const style = document.createElement('style');
      style.id = 'fitcol-install-style';
      style.textContent = `
        @keyframes fitcol-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        #fitcol-install-banner .install-banner-icon {
          font-size: 1.8rem; flex-shrink: 0;
        }
        #fitcol-install-banner .install-banner-text {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
        }
        #fitcol-install-banner .install-banner-text strong {
          color: #E5E5E0; font-size: 0.9rem; font-weight: 700;
        }
        #fitcol-install-banner .install-banner-text span {
          color: #888; font-size: 0.78rem;
        }
        #fitcol-install-banner .install-banner-actions {
          display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;
        }
        #fitcol-install-btn {
          background: #D4A017; color: #1A1A18; border: none;
          border-radius: 8px; padding: 8px 14px; font-weight: 700;
          font-size: 0.82rem; cursor: pointer; white-space: nowrap;
          font-family: inherit;
        }
        #fitcol-install-btn:active { opacity: 0.85; }
        #fitcol-install-dismiss {
          background: none; border: none; color: #666;
          font-size: 0.78rem; cursor: pointer; text-align: center;
          font-family: inherit; padding: 2px;
        }
        #fitcol-install-dismiss:active { color: #999; }
        @media (min-width: 768px) {
          #fitcol-install-banner {
            left: auto !important; right: 24px !important;
            max-width: 380px; bottom: 24px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(banner);

    document.getElementById('fitcol-install-btn').addEventListener('click', async () => {
      hideBanner();
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        saveInstallState({ ...getInstallState(), installed: true });
      }
      deferredPrompt = null;
    });

    document.getElementById('fitcol-install-dismiss').addEventListener('click', () => {
      hideBanner();
      saveInstallState({ ...getInstallState(), dismissed: true });
    });
  }

  function hideBanner() {
    const banner = document.getElementById('fitcol-install-banner');
    if (banner) banner.remove();
  }
})();
