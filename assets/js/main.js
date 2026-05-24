(() => {
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const siteNav = document.querySelector('[data-nav]');
  const cookieKey = 'motos-sonia-cookie-consent';

  if (menuToggle && siteNav) {
    const mobileQuery = window.matchMedia('(max-width: 980px)');

    const syncAriaState = (isOpen) => {
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    };

    const openMenu = () => {
      siteNav.classList.add('open');
      syncAriaState(true);
    };

    const closeMenu = () => {
      siteNav.classList.remove('open');
      syncAriaState(false);
    };

    const toggleMenu = () => {
      if (siteNav.classList.contains('open')) {
        closeMenu();
        return;
      }

      openMenu();
    };

    menuToggle.addEventListener('click', toggleMenu);

    siteNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        closeMenu();
      }
    });

    document.addEventListener('click', (event) => {
      if (!mobileQuery.matches || !siteNav.classList.contains('open')) {
        return;
      }

      if (!event.target.closest('.nav-wrap')) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    const handleViewportChange = () => {
      if (!mobileQuery.matches) {
        closeMenu();
      }
    };

    if (typeof mobileQuery.addEventListener === 'function') {
      mobileQuery.addEventListener('change', handleViewportChange);
    } else {
      mobileQuery.addListener(handleViewportChange);
    }

    handleViewportChange();
  }

  const existingConsent = window.localStorage.getItem(cookieKey);

  if (!existingConsent) {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `
      <div class="cookie-banner__content">
        <p class="cookie-banner__title">Usamos cookies técnicas</p>
        <p class="cookie-banner__text">Al continuar navegando por este sitio aceptas el uso de cookies necesarias para recordar preferencias y mejorar la experiencia. <a class="cookie-banner__link" href="./privacy.html">Ver política de privacidad</a>.</p>
      </div>
      <div class="cookie-banner__actions">
        <button type="button" class="button button-secondary cookie-banner__button" data-cookie-dismiss>Cerrar</button>
        <button type="button" class="button button-primary cookie-banner__button" data-cookie-accept>Aceptar</button>
      </div>
    `;

    document.body.appendChild(banner);

    const hideBanner = (consentValue) => {
      window.localStorage.setItem(cookieKey, consentValue);
      banner.classList.add('cookie-banner--hide');
      window.setTimeout(() => banner.remove(), 240);
    };

    banner.querySelector('[data-cookie-accept]')?.addEventListener('click', () => hideBanner('accepted'));
    banner.querySelector('[data-cookie-dismiss]')?.addEventListener('click', () => hideBanner('dismissed'));

    window.setTimeout(() => {
      if (document.body.contains(banner)) {
        hideBanner('accepted');
      }
    }, 8000);
  }
})();
