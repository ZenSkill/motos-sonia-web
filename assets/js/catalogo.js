(() => {
  const core = window.MotosSoniaCatalogoCore;

  if (!core) {
    return;
  }

  const heroEyebrow = document.querySelector('[data-catalog-hero-eyebrow]');
  const heroTitle = document.querySelector('[data-catalog-hero-title]');
  const heroDescription = document.querySelector('[data-catalog-hero-description]');
  const categoriesContainer = document.querySelector('#catalogCategories');
  const productsContainer = document.querySelector('#catalogProducts');

  if (!categoriesContainer || !productsContainer) {
    return;
  }

  const createMedia = (item, fallbackText, size = '1200x900') => {
    const media = document.createElement('div');
    media.className = 'catalog-media';

    const image = document.createElement('img');
    image.src = item.image || core.placeholderImage(fallbackText || item.name, size);
    image.alt = item.imageAlt || item.name;
    image.loading = 'lazy';
    media.appendChild(image);
    return media;
  };

  const resolveProductImage = (product, categories, size = '1200x900') => {
    if (typeof core.resolveProductImage === 'function') {
      return core.resolveProductImage(product, categories, size);
    }

    const category = (Array.isArray(categories) ? categories : []).find((entry) => core.slugify(entry.name) === core.slugify(product?.category));
    const categoryImageMap = {
      'Motocargueros': './img/categorias/motocarga_plt.png',
      'Mototaxis': './img/categorias/mototaxi_plt.png',
      'Motos lineales': './img/categorias/moto_lineal_plt.png',
      'Repuestos': './img/categorias/repuestos_plt.png'
    };

    return product?.image || category?.image || categoryImageMap[product?.category] || core.placeholderImage(product?.category || product?.name, size);
  };

  const createTag = (text, accent = 'primary') => {
    const tag = document.createElement('p');
    tag.className = accent === 'accent' ? 'card-tag is-accent' : 'card-tag is-primary';
    tag.textContent = text;
    return tag;
  };

  const categoryImageMap = {
    motocargueros: './img/categorias/motocarga_plt.png',
    mototaxis: './img/categorias/mototaxi_plt.png',
    'motos lineales': './img/categorias/moto_lineal_plt.png',
    repuestos: './img/categorias/repuestos_plt.png'
  };

  const getCategoryImage = (name) => {
    const normalizedName = core.slugify(name).replace(/-/g, ' ');
    return categoryImageMap[normalizedName] || './img/categorias/mototaxi_plt.png';
  };

  const createCategoryCard = (category, group, index) => {
    const firstItem = group?.items?.[0] || {};
    const article = document.createElement('article');
    article.className = index === 0 ? 'category-card large catalog-card' : 'category-card catalog-card';

    const mediaSource = {
      image: getCategoryImage(category.name || group.category),
      imageAlt: category.imageAlt || firstItem.imageAlt || category.name,
      name: category.name || group.category
    };

    article.appendChild(createMedia(mediaSource, category.name || group.category, '900x700'));

    const content = document.createElement('div');
    content.appendChild(createTag(`${group.count} producto${group.count === 1 ? '' : 's'}`, firstItem.featured ? 'primary' : 'accent'));

    const title = document.createElement('h2');
    title.textContent = category.name || group.category;
    content.appendChild(title);

    const description = document.createElement('p');
    description.textContent = category.description || `Consulta esta línea con ${group.count} opción${group.count === 1 ? '' : 'es'} publicad${group.count === 1 ? 'a' : 'as'} en el catálogo.`;
    content.appendChild(description);

    const button = document.createElement('a');
    button.className = 'button button-secondary';
    button.href = '#catalogProducts';
    button.textContent = 'Ver productos';
    content.appendChild(button);

    article.appendChild(content);
    return article;
  };

  const createProductCard = (product, categories) => {
    const article = document.createElement('article');
    article.className = 'product-card catalog-card';

    article.appendChild(createMedia({
      ...product,
      image: resolveProductImage(product, categories, '1200x900')
    }, product.category, '1200x900'));
    article.appendChild(createTag(product.badge || product.category || 'Producto', product.featured ? 'primary' : 'accent'));

    const title = document.createElement('h3');
    title.textContent = product.name;
    article.appendChild(title);

    const category = document.createElement('p');
    category.className = 'catalog-price';
    category.textContent = product.price || 'Consultar';
    article.appendChild(category);

    const description = document.createElement('p');
    description.textContent = product.description || '';
    article.appendChild(description);

    const button = document.createElement('a');
    button.className = 'button button-whatsapp';
    button.href = core.whatsappUrl(product.whatsappText || `Hola Motos Sonia, quiero consultar por ${product.name}`);
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.textContent = 'Consultar por WhatsApp';
    article.appendChild(button);

    return article;
  };

  const renderCatalog = async () => {
    const data = await core.loadCatalog();
    const hero = data.meta?.hero || core.defaultData.meta.hero;
    const products = Array.isArray(data.products) ? [...data.products] : [];
    const categories = Array.isArray(data.categories) ? [...data.categories] : [];

    if (heroEyebrow) {
      heroEyebrow.textContent = hero.eyebrow;
    }

    if (heroTitle) {
      heroTitle.textContent = hero.title;
    }

    if (heroDescription) {
      heroDescription.textContent = hero.description;
    }

    const groups = core.groupProductsByCategory(products);
    const groupedBySlug = new Map(groups.map((group) => [core.slugify(group.category), group]));
    categoriesContainer.innerHTML = '';
    productsContainer.innerHTML = '';

    const categoryEntries = categories.length
      ? categories
      : groups.map((group) => ({ name: group.category, description: '', image: '', imageAlt: group.category }));

    categoryEntries.forEach((category, index) => {
      const group = groupedBySlug.get(core.slugify(category.name)) || {
        category: category.name,
        items: [],
        count: 0
      };

      categoriesContainer.appendChild(createCategoryCard(category, group, index));
    });

    products
      .sort((left, right) => Number(right.featured) - Number(left.featured))
      .forEach((product) => {
        productsContainer.appendChild(createProductCard(product, categories));
      });

    if (!products.length) {
      productsContainer.innerHTML = '<p class="admin-empty">Todavía no hay productos cargados. Abre el panel admin para empezar a añadir el catálogo.</p>';
    }
  };

  renderCatalog();
})();
