(() => {
  const DATA_URL = './api/catalogo';
  const PHONE_NUMBER = '5116931840';

  const placeholderImage = (label, size = '1200x900') => {
    const safeLabel = encodeURIComponent(String(label || 'Motos Sonia'));
    return `https://placehold.co/${size}/f5f3ee/1f5a4a?text=${safeLabel}`;
  };

  const categoryImageMap = {
    'motocargueros': './img/categorias/motocarga_plt.png',
    'mototaxis': './img/categorias/mototaxi_plt.png',
    'motos lineales': './img/categorias/moto_lineal_plt.png',
    'repuestos': './img/categorias/repuestos_plt.png'
  };

  const localCategoryImage = (name) => {
    const key = slugify(name).replace(/-/g, ' ');
    return categoryImageMap[key] || '';
  };

  const DEFAULT_DATA = {
    meta: {
      hero: {
        eyebrow: 'Catálogo comercial',
        title: 'Mototaxis, motocargas y repuestos listos para cotizar.',
        description: 'Encuentra rápidamente lo que necesitas y consulta disponibilidad por WhatsApp con atención local en Huaral.'
      }
    },
    categories: [
      {
        name: 'Motocargueros',
        image: './img/categorias/motocarga_plt.png',
        imageAlt: 'Motocargueros',
        description: 'Motocargueros para reparto urbano y trabajo diario.'
      },
      {
        name: 'Mototaxis',
        image: './img/categorias/mototaxi_plt.png',
        imageAlt: 'Mototaxis',
        description: 'Mototaxis comerciales listas para consulta.'
      },
      {
        name: 'Motos lineales',
        image: './img/categorias/moto_lineal_plt.png',
        imageAlt: 'Motos lineales',
        description: 'Motos lineales para movilidad y trabajo mixto.'
      },
      {
        name: 'Repuestos',
        image: './img/categorias/repuestos_plt.png',
        imageAlt: 'Repuestos',
        description: 'Repuestos y consumibles para mantenimiento.'
      }
    ],
    products: [
      {
        id: 'tvs-king-cargo-3s',
        name: 'TVS King Cargo 3S',
        price: 'Consultar',
        description: 'Motocarguero de trabajo para reparto urbano, carga ligera y recorridos diarios.',
        category: 'Motocargueros',
        image: '',
        imageAlt: 'TVS King Cargo 3S',
        badge: 'Consulta disponibilidad',
        whatsappText: 'Hola Motos Sonia, quiero consultar por la TVS King Cargo 3S',
        featured: true
      },
      {
        id: 'bajaj-re-cargo',
        name: 'Bajaj RE Cargo',
        price: 'Consultar',
        description: 'Solución de carga compacta para negocios que necesitan maniobrabilidad y resistencia.',
        category: 'Motocargueros',
        image: '',
        imageAlt: 'Bajaj RE Cargo',
        badge: 'Trabajo pesado',
        whatsappText: 'Hola Motos Sonia, quiero consultar por la Bajaj RE Cargo',
        featured: false
      },
      {
        id: 'tvs-king-deluxe',
        name: 'TVS King Deluxe',
        price: 'Consultar',
        description: 'Mototaxi comercial para transporte urbano con foco en economía y rendimiento.',
        category: 'Mototaxis',
        image: '',
        imageAlt: 'TVS King Deluxe',
        badge: 'Alta rotación',
        whatsappText: 'Hola Motos Sonia, quiero consultar por la TVS King Deluxe',
        featured: true
      },
      {
        id: 'piaggio-ape-city',
        name: 'Piaggio Ape City',
        price: 'Consultar',
        description: 'Mototaxi pensada para uso comercial con una presencia sólida y conocida en el mercado.',
        category: 'Mototaxis',
        image: '',
        imageAlt: 'Piaggio Ape City',
        badge: 'Referencia comercial',
        whatsappText: 'Hola Motos Sonia, quiero consultar por la Piaggio Ape City',
        featured: false
      },
      {
        id: 'honda-xr150l',
        name: 'Honda XR150L',
        price: 'Consultar',
        description: 'Moto lineal confiable para trabajo ligero, trayectos mixtos y movilidad diaria.',
        category: 'Motos lineales',
        image: '',
        imageAlt: 'Honda XR150L',
        badge: 'Todo terreno',
        whatsappText: 'Hola Motos Sonia, quiero consultar por la Honda XR150L',
        featured: true
      },
      {
        id: 'yamaha-fz-s-fi-v4',
        name: 'Yamaha FZ-S FI V4',
        price: 'Consultar',
        description: 'Alternativa urbana con estilo comercial y desempeño equilibrado para el día a día.',
        category: 'Motos lineales',
        image: '',
        imageAlt: 'Yamaha FZ-S FI V4',
        badge: 'Urbana',
        whatsappText: 'Hola Motos Sonia, quiero consultar por la Yamaha FZ-S FI V4',
        featured: false
      },
      {
        id: 'kit-de-arrastre-428h',
        name: 'Kit de arrastre 428H',
        price: 'Consultar',
        description: 'Kit de transmisión para mantenimiento y reposición de motos y mototaxis de trabajo.',
        category: 'Repuestos',
        image: '',
        imageAlt: 'Kit de arrastre 428H',
        badge: 'Mantenimiento',
        whatsappText: 'Hola Motos Sonia, quiero consultar por un kit de arrastre 428H',
        featured: true
      },
      {
        id: 'motul-5100-20w50',
        name: 'Motul 5100 20W-50',
        price: 'Consultar',
        description: 'Aceite semisintético para mantenimiento preventivo y buen rendimiento del motor.',
        category: 'Repuestos',
        image: '',
        imageAlt: 'Motul 5100 20W-50',
        badge: 'Lubricantes',
        whatsappText: 'Hola Motos Sonia, quiero consultar por el Motul 5100 20W-50',
        featured: false
      }
    ]
  };

  const slugify = (value) => {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const safeParse = (value, fallback = null) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const normalizeHero = (hero = {}) => {
    const defaultHero = DEFAULT_DATA.meta.hero;
    return {
      eyebrow: hero.eyebrow || defaultHero.eyebrow,
      title: hero.title || defaultHero.title,
      description: hero.description || defaultHero.description
    };
  };

  const normalizeCategory = (category, index = 0) => {
    const name = String(category?.name || category?.category || `Categoría ${index + 1}`).trim();
    const defaultImage = localCategoryImage(name);
    const currentImage = String(category?.image || '').trim();
    const image = currentImage && !currentImage.includes('placehold.co') ? currentImage : defaultImage;

    return {
      id: String(category?.id || slugify(name) || `categoria-${index + 1}`),
      name,
      image,
      imageAlt: String(category?.imageAlt || name).trim(),
      description: String(category?.description || '').trim()
    };
  };

  const normalizeProduct = (product, index = 0) => {
    const name = String(product?.name || product?.title || `Producto ${index + 1}`).trim();
    const category = String(product?.category || 'General').trim();
    const price = String(product?.price || 'Consultar').trim();

    return {
      id: String(product?.id || slugify(`${category}-${name}`) || `producto-${index + 1}`),
      name,
      price,
      description: String(product?.description || '').trim(),
      category,
      image: String(product?.image || '').trim(),
      imageAlt: String(product?.imageAlt || name).trim(),
      badge: String(product?.badge || '').trim(),
      whatsappText: String(product?.whatsappText || `Hola Motos Sonia, quiero consultar por ${name}`).trim(),
      featured: Boolean(product?.featured)
    };
  };

  const normalizeCatalog = (catalog) => {
    const source = catalog && typeof catalog === 'object' ? catalog : {};
    const metaSource = source.meta && typeof source.meta === 'object' ? source.meta : {};
    const hero = normalizeHero(metaSource.hero || source.hero || {});
    const productsSource = Array.isArray(source.products) ? source.products : DEFAULT_DATA.products;
    const categoriesSource = Array.isArray(source.categories) && source.categories.length
      ? source.categories
      : DEFAULT_DATA.categories;

    return {
      meta: { hero },
      categories: categoriesSource.map((category, index) => normalizeCategory(category, index)),
      products: productsSource.map((product, index) => normalizeProduct(product, index))
    };
  };

  const loadCatalog = async () => {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const raw = await response.json();
      return normalizeCatalog(raw);
    } catch {
      return normalizeCatalog(DEFAULT_DATA);
    }
  };

  const saveCatalog = (catalog) => {
    return normalizeCatalog(catalog);
  };

  const clearCatalog = () => {
    return true;
  };

  const downloadCatalog = (catalog) => {
    const normalized = normalizeCatalog(catalog);
    const blob = new Blob([`${JSON.stringify(normalized, null, 2)}\n`], {
      type: 'application/json;charset=utf-8'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'catalogo.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    return normalized;
  };

  const whatsappUrl = (text) => {
    return `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  const findCategory = (categories, categoryName) => {
    const target = slugify(categoryName);
    return (Array.isArray(categories) ? categories : []).find((category) => slugify(category.name) === target) || null;
  };

  const resolveProductImage = (product, categories, size = '1200x900') => {
    const category = findCategory(categories, product?.category);
    return product?.image || category?.image || localCategoryImage(product?.category) || placeholderImage(product?.category || product?.name, size);
  };

  const resolveCategoryImage = (category, size = '900x700') => {
    const name = typeof category === 'string' ? category : category?.name;
    return (typeof category === 'object' && category?.image && !category.image.includes('placehold.co'))
      ? category.image
      : localCategoryImage(name) || placeholderImage(name, size);
  };

  const groupProductsByCategory = (products) => {
    const groups = new Map();

    products.forEach((product) => {
      const category = product.category || 'General';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category).push(product);
    });

    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items,
      count: items.length
    }));
  };

  window.MotosSoniaCatalogoCore = {
    defaultData: DEFAULT_DATA,
    loadCatalog,
    saveCatalog,
    clearCatalog,
    downloadCatalog,
    whatsappUrl,
    findCategory,
    resolveProductImage,
    resolveCategoryImage,
    groupProductsByCategory,
    slugify,
    normalizeCatalog,
    placeholderImage
  };
})();
