(() => {
  const core = window.MotosSoniaCatalogoCore;

  if (!core) {
    return;
  }

  const adminApp = document.querySelector('[data-admin-app]');
  const accessForm = document.querySelector('#adminAccessForm');
  const accessUsername = document.querySelector('#adminAccessUsername');
  const accessPassword = document.querySelector('#adminAccessPassword');
  const accessMessage = document.querySelector('#adminAccessMessage');
  const accessLogout = document.querySelector('#adminAccessLogout');
  const form = document.querySelector('#catalogAdminForm');
  const status = document.querySelector('#catalogAdminStatus');
  const list = document.querySelector('#catalogAdminList');
  const importInput = document.querySelector('#catalogAdminImport');
  const imageFileInput = document.querySelector('#catalogAdminImageFile');
  const imageUploadButton = document.querySelector('#catalogAdminUploadImage');
  const exportButton = document.querySelector('#catalogAdminExport');
  const clearButton = document.querySelector('#catalogAdminClear');
  const resetButton = document.querySelector('#catalogAdminReset');
  const newButton = document.querySelector('#catalogAdminNew');

  const CLOUDINARY_CLOUD = window.CLOUDINARY_CLOUD || null; // set in admin.html if available
  const CLOUDINARY_PRESET = window.CLOUDINARY_PRESET || null; // unsigned preset

  const uploadToCloudinary = async (file) => {
    if (!file) throw new Error('No file');
    if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) throw new Error('Cloudinary not configured');

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_PRESET);

    const resp = await fetch(url, { method: 'POST', body: fd });
    if (!resp.ok) throw new Error('Upload failed');
    const data = await resp.json();
    return data.secure_url || data.url;
  };

  imageUploadButton?.addEventListener('click', async () => {
    const file = imageFileInput?.files && imageFileInput.files[0];
    if (!file) {
      setStatus('Selecciona una imagen primero.');
      return;
    }

    try {
      setStatus('Subiendo imagen a Cloudinary...');
      const url = await uploadToCloudinary(file);
      document.querySelector('#catalogAdminImage').value = url;
      setStatus('Imagen subida y campo actualizado.');
    } catch (err) {
      setStatus('No se pudo subir la imagen: ' + (err.message || 'error'));
    }
  });

  const fields = {
    id: document.querySelector('#catalogAdminId'),
    name: document.querySelector('#catalogAdminName'),
    category: document.querySelector('#catalogAdminCategory'),
    price: document.querySelector('#catalogAdminPrice'),
    badge: document.querySelector('#catalogAdminBadge'),
    description: document.querySelector('#catalogAdminDescription'),
    image: document.querySelector('#catalogAdminImage'),
    imageAlt: document.querySelector('#catalogAdminImageAlt'),
    whatsappText: document.querySelector('#catalogAdminWhatsapp'),
    featured: document.querySelector('#catalogAdminFeatured')
  };

  if (!form || !status || !list || !importInput || !accessForm) {
    return;
  }

  const state = {
    catalog: core.defaultData,
    authenticated: false,
    loading: false
  };

  const apiFetch = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
  };

  const escapeHtml = (value) => {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const setAccessMessage = (message, tone = '') => {
    accessMessage.textContent = message;
    accessMessage.classList.remove('is-error', 'is-success');

    if (tone) {
      accessMessage.classList.add(tone);
    }
  };

  const setStatus = (message) => {
    status.textContent = message;
  };

  const setAuthUI = (isAuthenticated) => {
    state.authenticated = isAuthenticated;
    adminApp.hidden = !isAuthenticated;
    accessLogout.hidden = !isAuthenticated;

    if (!isAuthenticated) {
      setStatus('Debes iniciar sesión para administrar el catálogo.');
    }
  };

  const emptyForm = () => {
    form.reset();
    fields.id.value = '';
    fields.name.value = '';
    fields.category.value = '';
    fields.price.value = 'Consultar';
    fields.badge.value = '';
    fields.description.value = '';
    fields.image.value = '';
    fields.imageAlt.value = '';
    fields.whatsappText.value = '';
    fields.featured.checked = false;
  };

  const fillForm = (product) => {
    fields.id.value = product.id || '';
    fields.name.value = product.name || '';
    fields.category.value = product.category || '';
    fields.price.value = product.price || 'Consultar';
    fields.badge.value = product.badge || '';
    fields.description.value = product.description || '';
    fields.image.value = product.image || '';
    fields.imageAlt.value = product.imageAlt || product.name || '';
    fields.whatsappText.value = product.whatsappText || '';
    fields.featured.checked = Boolean(product.featured);
  };

  const mediaMarkup = (product) => {
    const categoryImageMap = {
      motocargueros: './img/categorias/motocarga_plt.png',
      mototaxis: './img/categorias/mototaxi_plt.png',
      'motos lineales': './img/categorias/moto_lineal_plt.png',
      repuestos: './img/categorias/repuestos_plt.png'
    };

    const normalizedCategory = core.slugify(product.category).replace(/-/g, ' ');
    const category = (Array.isArray(state.catalog.categories) ? state.catalog.categories : []).find((entry) => core.slugify(entry.name) === core.slugify(product.category));
    const imageUrl = product.image || category?.image || categoryImageMap[normalizedCategory] || core.placeholderImage(product.category || product.name, '480x360');
    return `<img src="${imageUrl}" alt="${escapeHtml(product.imageAlt || product.name)}" loading="lazy" />`;
  };

  const renderList = () => {
    const products = [...state.catalog.products].sort((left, right) => Number(right.featured) - Number(left.featured));
    list.innerHTML = '';

    if (!products.length) {
      list.innerHTML = '<p class="admin-empty">No hay productos cargados todavía. Usa el formulario para crear el primero.</p>';
      return;
    }

    products.forEach((product) => {
      const item = document.createElement('article');
      item.className = 'admin-item';
      item.innerHTML = `
        <div class="catalog-media">${mediaMarkup(product)}</div>
        <div>
          <p class="card-tag ${product.featured ? 'is-primary' : 'is-accent'}">${escapeHtml(product.category || 'Sin categoría')}</p>
          <h3>${escapeHtml(product.name)}</h3>
          <p class="catalog-price">${escapeHtml(product.price || 'Consultar')}</p>
          <p>${escapeHtml(product.description || '')}</p>
          <div class="admin-item-meta">
            ${product.badge ? `<span class="card-tag is-primary">${escapeHtml(product.badge)}</span>` : ''}
            ${product.featured ? '<span class="card-tag is-accent">Destacado</span>' : ''}
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="button button-secondary" type="button" data-action="edit" data-id="${escapeHtml(product.id)}">Editar</button>
          <button class="button button-whatsapp" type="button" data-action="delete" data-id="${escapeHtml(product.id)}">Eliminar</button>
        </div>
      `;
      list.appendChild(item);
    });
  };

  const requireAuth = () => {
    if (state.authenticated) {
      return true;
    }

    setAccessMessage('Inicia sesión para usar el panel.', 'is-error');
    return false;
  };

  const loadCatalog = async () => {
    const catalog = await apiFetch('./api/catalogo');
    state.catalog = core.normalizeCatalog(catalog);
    renderList();
    emptyForm();
    setStatus('Catálogo cargado desde el servidor.');
  };

  const syncCatalog = async () => {
    if (!requireAuth()) {
      return;
    }

    const payload = core.normalizeCatalog(state.catalog);
    const result = await apiFetch('./api/catalogo', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    state.catalog = core.normalizeCatalog(result.catalog || payload);
    renderList();
  };

  const getFormValue = () => {
    const name = fields.name.value.trim();
    const category = fields.category.value.trim();
    const id = fields.id.value.trim() || core.slugify(`${category}-${name}`) || `producto-${Date.now()}`;

    return {
      id,
      name,
      category,
      price: fields.price.value.trim() || 'Consultar',
      badge: fields.badge.value.trim(),
      description: fields.description.value.trim(),
      image: fields.image.value.trim(),
      imageAlt: fields.imageAlt.value.trim() || name,
      whatsappText: fields.whatsappText.value.trim() || `Hola Motos Sonia, quiero consultar por ${name}`,
      featured: fields.featured.checked
    };
  };

  const submitForm = async (event) => {
    event.preventDefault();

    if (!requireAuth()) {
      return;
    }

    const product = getFormValue();

    if (!product.name || !product.category) {
      setStatus('Completa al menos el nombre y la categoría.');
      return;
    }

    const nextProducts = [...state.catalog.products];
    const index = nextProducts.findIndex((entry) => entry.id === product.id);

    if (index >= 0) {
      nextProducts[index] = product;
    } else {
      nextProducts.unshift(product);
    }

    state.catalog = {
      ...state.catalog,
      products: nextProducts
    };

    await syncCatalog();
    setStatus(`Guardado: ${product.name}.`);
    emptyForm();
  };

  const removeProduct = async (id) => {
    if (!requireAuth()) {
      return;
    }

    const product = state.catalog.products.find((entry) => entry.id === id);
    if (!product) {
      return;
    }

    const confirmed = window.confirm(`Eliminar "${product.name}" del catálogo?`);
    if (!confirmed) {
      return;
    }

    state.catalog = {
      ...state.catalog,
      products: state.catalog.products.filter((entry) => entry.id !== id)
    };

    await syncCatalog();
    setStatus(`Se eliminó ${product.name}.`);
  };

  const handleImport = async (file) => {
    if (!requireAuth() || !file) {
      return;
    }

    const text = await file.text();
    const parsed = JSON.parse(text);
    state.catalog = core.normalizeCatalog(parsed);
    await syncCatalog();
    emptyForm();
    setStatus('Catálogo importado correctamente.');
  };

  const login = async (event) => {
    event.preventDefault();

    const username = accessUsername.value.trim();
    const password = accessPassword.value;

    if (!username || !password) {
      setAccessMessage('Escribe usuario y contraseña.', 'is-error');
      return;
    }

    try {
      await apiFetch('./api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      setAuthUI(true);
      setAccessMessage('Acceso concedido.', 'is-success');
      accessPassword.value = '';
      accessPassword.blur();
      await loadCatalog();
    } catch (error) {
      setAccessMessage(error.message || 'No se pudo iniciar sesión.', 'is-error');
    }
  };

  const logout = async () => {
    try {
      await apiFetch('./api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors.
    }

    setAuthUI(false);
    setAccessMessage('Sesión cerrada.');
  };

  const checkSession = async () => {
    try {
      const session = await apiFetch('./api/auth/session');
      setAuthUI(Boolean(session.authenticated));

      if (session.authenticated) {
        setAccessMessage('Sesión activa.', 'is-success');
        await loadCatalog();
      } else {
        setAccessMessage('Panel bloqueado. Inicia sesión para editar.', 'is-error');
      }
    } catch {
      setAuthUI(false);
      setAccessMessage('No se pudo comprobar la sesión.', 'is-error');
    }
  };

  form.addEventListener('submit', submitForm);

  accessForm.addEventListener('submit', login);
  accessLogout.addEventListener('click', logout);

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const id = button.dataset.id;
    const action = button.dataset.action;
    const product = state.catalog.products.find((entry) => entry.id === id);

    if (!product) {
      return;
    }

    if (action === 'edit') {
      fillForm(product);
      setStatus(`Editando: ${product.name}.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (action === 'delete') {
      await removeProduct(id);
    }
  });

  exportButton?.addEventListener('click', () => {
    core.downloadCatalog(state.catalog);
    setStatus('Se descargó catalogo.json.');
  });

  clearButton?.addEventListener('click', async () => {
    if (!requireAuth()) {
      return;
    }

    const confirmed = window.confirm('Esto restaurará el catálogo base en el servidor. Continuar?');
    if (!confirmed) {
      return;
    }

    state.catalog = core.normalizeCatalog(core.defaultData);
    await syncCatalog();
    emptyForm();
    setStatus('Se restauró el catálogo base.');
  });

  resetButton?.addEventListener('click', () => {
    emptyForm();
    setStatus('Formulario limpio.');
  });

  newButton?.addEventListener('click', () => {
    emptyForm();
    setStatus('Listo para crear un producto nuevo.');
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files && importInput.files[0];
    if (!file) {
      return;
    }

    try {
      await handleImport(file);
    } catch {
      setStatus('No se pudo importar el JSON. Verifica el formato del archivo.');
    } finally {
      importInput.value = '';
    }
  });

  checkSession();
})();
