(() => {
  const core = window.MotosSoniaCatalogoCore;

  if (!core) {
    return;
  }

  const searchInput = document.querySelector('[data-product-search]');
  const categorySelect = document.querySelector('[data-product-category]');
  const grid = document.querySelector('[data-product-grid]');
  const emptyState = document.querySelector('[data-product-empty]');
  const countNode = document.querySelector('[data-product-count]');
  const categoryCountNode = document.querySelector('[data-product-category-count]');
  const detail = {
    title: document.querySelector('[data-product-detail-title]'),
    image: document.querySelector('[data-product-detail-image]'),
    badge: document.querySelector('[data-product-detail-badge]'),
    category: document.querySelector('[data-product-detail-category]'),
    price: document.querySelector('[data-product-detail-price]'),
    status: document.querySelector('[data-product-detail-status]'),
    description: document.querySelector('[data-product-detail-description]'),
    whatsapp: document.querySelector('[data-product-detail-whatsapp]')
  };

  if (!grid || !searchInput || !categorySelect) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const initialProductId = params.get('product') || '';

  const state = {
    products: [],
    categories: [],
    filteredProducts: [],
    selectedId: initialProductId,
    searchTerm: '',
    category: 'all'
  };

  const categoryImageMap = {
    motocargueros: './img/categorias/motocarga_plt.png',
    mototaxis: './img/categorias/mototaxi_plt.png',
    'motos lineales': './img/categorias/moto_lineal_plt.png',
    repuestos: './img/categorias/repuestos_plt.png'
  };

  const resolveProductImage = (product) => {
    if (typeof core.resolveProductImage === 'function') {
      return core.resolveProductImage(product, state.categories);
    }

    const categoryName = String(product?.category || '').toLowerCase();
    return product?.image || categoryImageMap[categoryName] || core.placeholderImage(product?.category || product?.name);
  };

  const createCard = (product) => {
    const article = document.createElement('article');
    article.className = `product-card catalog-card${state.selectedId === product.id ? ' is-selected' : ''}`;

    const image = document.createElement('img');
    image.src = resolveProductImage(product);
    image.alt = product.imageAlt || product.name;
    image.loading = 'lazy';
    article.appendChild(image);

    const tag = document.createElement('p');
    tag.className = `card-tag ${product.featured ? 'is-primary' : 'is-accent'}`;
    tag.textContent = product.badge || product.category || 'Producto';
    article.appendChild(tag);

    const title = document.createElement('h3');
    title.textContent = product.name;
    article.appendChild(title);

    const meta = document.createElement('p');
    meta.className = 'catalog-price';
    meta.textContent = `${product.category} · ${product.price || 'Consultar'}`;
    article.appendChild(meta);

    const description = document.createElement('p');
    description.textContent = product.description || 'Consulta más detalles en el panel lateral.';
    article.appendChild(description);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button-secondary';
    button.textContent = 'Ver detalles';
    button.addEventListener('click', () => selectProduct(product.id, true));
    article.appendChild(button);

    return article;
  };

  const renderDetail = (product) => {
    if (!product) {
      return;
    }

    if (detail.title) detail.title.textContent = product.name;
    if (detail.image) {
      detail.image.src = resolveProductImage(product);
      detail.image.alt = product.imageAlt || product.name;
    }
    if (detail.badge) detail.badge.textContent = product.badge || product.category || 'Producto';
    if (detail.category) detail.category.textContent = product.category || 'General';
    if (detail.price) detail.price.textContent = product.price || 'Consultar';
    if (detail.status) detail.status.textContent = product.featured ? 'Producto destacado' : 'Disponible para consulta';
    if (detail.description) detail.description.textContent = product.description || '';
    if (detail.whatsapp) {
      detail.whatsapp.href = core.whatsappUrl(product.whatsappText || `Hola Motos Sonia, quiero consultar por ${product.name}`);
    }
  };

  const updateUrl = (productId) => {
    const nextUrl = new URL(window.location.href);
    if (productId) {
      nextUrl.searchParams.set('product', productId);
    } else {
      nextUrl.searchParams.delete('product');
    }
    window.history.replaceState({}, '', nextUrl);
  };

  const render = () => {
    const normalizedSearch = state.searchTerm.trim().toLowerCase();
    state.filteredProducts = state.products.filter((product) => {
      const matchesSearch = !normalizedSearch || [product.name, product.category, product.description, product.badge]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesCategory = state.category === 'all' || core.slugify(product.category) === state.category;
      return matchesSearch && matchesCategory;
    });

    grid.innerHTML = '';
    if (emptyState) {
      emptyState.hidden = state.filteredProducts.length > 0;
    }

    state.filteredProducts.forEach((product) => {
      grid.appendChild(createCard(product));
    });

    if (countNode) {
      countNode.textContent = String(state.products.length);
    }

    if (categoryCountNode) {
      categoryCountNode.textContent = String(state.categories.length);
    }

    if (state.filteredProducts.length) {
      const selected = state.filteredProducts.find((product) => product.id === state.selectedId) || state.filteredProducts[0];
      state.selectedId = selected.id;
      renderDetail(selected);
      updateUrl(selected.id);
    }
  };

  const selectProduct = (productId, shouldRender = false) => {
    state.selectedId = productId;
    if (shouldRender) {
      render();
      document.querySelector('[data-product-detail]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const populateCategories = () => {
    const options = state.categories.map((category) => {
      const option = document.createElement('option');
      option.value = core.slugify(category.name);
      option.textContent = category.name;
      return option;
    });

    options.forEach((option) => categorySelect.appendChild(option));
  };

  const init = async () => {
    const data = await core.loadCatalog();
    state.products = Array.isArray(data.products) ? data.products : [];
    state.categories = Array.isArray(data.categories) ? data.categories : [];

    populateCategories();

    const initialCategory = params.get('category');
    if (initialCategory) {
      state.category = core.slugify(initialCategory);
      categorySelect.value = state.category;
    }

    searchInput.addEventListener('input', (event) => {
      state.searchTerm = event.target.value;
      render();
    });

    categorySelect.addEventListener('change', (event) => {
      state.category = event.target.value || 'all';
      render();
    });

    render();

    if (initialProductId) {
      const initialProduct = state.products.find((product) => product.id === initialProductId);
      if (initialProduct) {
        state.selectedId = initialProduct.id;
        renderDetail(initialProduct);
      }
    }
  };

  init();
})();