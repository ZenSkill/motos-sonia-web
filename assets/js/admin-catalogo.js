(() => {
  const core = window.MotosSoniaCatalogoCore;

  if (!core) {
    return;
  }

  const form = document.querySelector('#catalogAdminForm');
  const status = document.querySelector('#catalogAdminStatus');
  const list = document.querySelector('#catalogAdminList');
  const importInput = document.querySelector('#catalogAdminImport');
  const exportButton = document.querySelector('#catalogAdminExport');
  const clearButton = document.querySelector('#catalogAdminClear');
  const resetButton = document.querySelector('#catalogAdminReset');
  const newButton = document.querySelector('#catalogAdminNew');

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

  if (!form || !status || !list || !importInput) {
    return;
  }

  const state = {
    catalog: core.defaultData
  };

  const setStatus = (message) => {
    status.textContent = message;
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
    return `<img src="${imageUrl}" alt="${product.imageAlt || product.name}" loading="lazy" />`;
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
          <p class="card-tag ${product.featured ? 'is-primary' : 'is-accent'}">${product.category || 'Sin categoría'}</p>
          <h3>${product.name}</h3>
          <p class="catalog-price">${product.price || 'Consultar'}</p>
          <p>${product.description || ''}</p>
          <div class="admin-item-meta">
            ${product.badge ? `<span class="card-tag is-primary">${product.badge}</span>` : ''}
            ${product.featured ? '<span class="card-tag is-accent">Destacado</span>' : ''}
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="button button-secondary" type="button" data-action="edit" data-id="${product.id}">Editar</button>
          <button class="button button-whatsapp" type="button" data-action="delete" data-id="${product.id}">Eliminar</button>
        </div>
      `;
      list.appendChild(item);
    });
  };

  const syncCatalog = () => {
    state.catalog = core.saveCatalog(state.catalog);
    renderList();
  };

  const upsertProduct = (product) => {
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

    syncCatalog();
  };

  const removeProduct = (id) => {
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

    syncCatalog();
    setStatus(`Se eliminó ${product.name}.`);
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

  const submitForm = (event) => {
    event.preventDefault();
    const product = getFormValue();

    if (!product.name || !product.category) {
      setStatus('Completa al menos el nombre y la categoría.');
      return;
    }

    upsertProduct(product);
    setStatus(`Guardado: ${product.name}.`);
    emptyForm();
  };

  const handleImport = async (file) => {
    if (!file) {
      return;
    }

    const text = await file.text();
    const parsed = JSON.parse(text);
    state.catalog = core.saveCatalog(parsed);
    renderList();
    emptyForm();
    setStatus('Catálogo importado correctamente.');
  };

  const init = async () => {
    state.catalog = await core.loadCatalog();
    state.catalog = core.saveCatalog(state.catalog);
    renderList();
    emptyForm();
    setStatus('Catálogo cargado. Puedes editar, exportar o importar JSON.');
  };

  form.addEventListener('submit', submitForm);

  list.addEventListener('click', (event) => {
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
      removeProduct(id);
    }
  });

  exportButton?.addEventListener('click', () => {
    core.downloadCatalog(state.catalog);
    setStatus('Se descargó catalogo.json. Reemplaza el archivo publicado con ese contenido.');
  });

  clearButton?.addEventListener('click', () => {
    const confirmed = window.confirm('Esto eliminará la versión guardada localmente y volverá al catálogo base. Continuar?');
    if (!confirmed) {
      return;
    }

    core.clearCatalog();
    state.catalog = core.normalizeCatalog(core.defaultData);
    state.catalog = core.saveCatalog(state.catalog);
    renderList();
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
    } catch (error) {
      setStatus('No se pudo importar el JSON. Verifica el formato del archivo.');
    } finally {
      importInput.value = '';
    }
  });

  init();
})();
