import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const isProduction = process.env.NODE_ENV === 'production';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || (isProduction ? '' : bcrypt.hashSync('Admin123!', 10));
const DATA_FILE = path.join(__dirname, 'assets', 'data', 'catalogo.json');
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_CATALOG = {
  meta: {
    hero: {
      eyebrow: 'Catálogo comercial',
      title: 'Mototaxis, motocargas y repuestos listos para cotizar.',
      description: 'Encuentra rápidamente lo que necesitas y consulta disponibilidad por WhatsApp con atención local en Huaral.'
    }
  },
  categories: [],
  products: []
};

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  name: 'motos-sonia-admin',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 4
  }
}));

app.use(express.static(PUBLIC_DIR, {
  extensions: ['html']
}));

// Ensure data dir exists
await mkdir(DATA_DIR, { recursive: true });

// Simple JSON store for users and reset tokens
const readStore = async () => {
  try {
    const raw = await readFile(STORE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { users: [], resetTokens: [] };
  }
};

const writeStore = async (store) => {
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2) + '\n', 'utf8');
};

const findUserByUsername = async (username) => {
  const store = await readStore();
  return store.users.find(u => u.username === username) || null;
};

const findUserByEmail = async (email) => {
  const store = await readStore();
  return store.users.find(u => u.email === email) || null;
};

const createUser = async (username, email, passwordHash) => {
  const store = await readStore();
  const id = store.users.length ? Math.max(...store.users.map(u => u.id || 0)) + 1 : 1;
  const user = { id, username, email: email || null, passwordHash, createdAt: Date.now() };
  store.users.push(user);
  await writeStore(store);
  return user;
};

// Create admin user if missing
let adminUser = await findUserByUsername(ADMIN_USERNAME);
if (!adminUser) {
  const hash = ADMIN_PASSWORD_HASH || bcrypt.hashSync('Admin123!', 10);
  adminUser = await createUser(ADMIN_USERNAME, null, hash);
}

// Nodemailer transport (optional)
let mailTransport = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

const safeReadJson = async (filePath, fallback) => {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const slugify = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const normalizeProduct = (product = {}, index = 0) => {
  const name = String(product.name || product.title || `Producto ${index + 1}`).trim();
  const category = String(product.category || 'General').trim();

  return {
    id: String(product.id || slugify(`${category}-${name}`) || `producto-${index + 1}`),
    name,
    price: String(product.price || 'Consultar').trim(),
    description: String(product.description || '').trim(),
    category,
    image: String(product.image || '').trim(),
    imageAlt: String(product.imageAlt || name).trim(),
    badge: String(product.badge || '').trim(),
    whatsappText: String(product.whatsappText || `Hola Motos Sonia, quiero consultar por ${name}`).trim(),
    featured: Boolean(product.featured)
  };
};

const normalizeCategory = (category = {}, index = 0) => {
  const name = String(category.name || category.category || `Categoría ${index + 1}`).trim();
  return {
    id: String(category.id || slugify(name) || `categoria-${index + 1}`),
    name,
    image: String(category.image || '').trim(),
    imageAlt: String(category.imageAlt || name).trim(),
    description: String(category.description || '').trim()
  };
};

const normalizeCatalog = (catalog) => {
  const source = catalog && typeof catalog === 'object' ? catalog : {};
  const heroSource = source.meta?.hero || source.hero || DEFAULT_CATALOG.meta.hero;

  return {
    meta: {
      hero: {
        eyebrow: String(heroSource.eyebrow || DEFAULT_CATALOG.meta.hero.eyebrow),
        title: String(heroSource.title || DEFAULT_CATALOG.meta.hero.title),
        description: String(heroSource.description || DEFAULT_CATALOG.meta.hero.description)
      }
    },
    categories: (Array.isArray(source.categories) && source.categories.length ? source.categories : DEFAULT_CATALOG.categories).map(normalizeCategory),
    products: (Array.isArray(source.products) && source.products.length ? source.products : DEFAULT_CATALOG.products).map(normalizeProduct)
  };
};

const ensureAdminAuth = (request, response, next) => {
  if (request.session?.admin?.authenticated) {
    return next();
  }

  return response.status(401).json({ ok: false, message: 'No autorizado' });
};

app.get('/api/auth/session', (request, response) => {
  if (request.session?.admin?.authenticated) {
    return response.json({ ok: true, authenticated: true, username: request.session.admin.username });
  }

  return response.json({ ok: true, authenticated: false });
});

app.post('/api/auth/login', async (request, response) => {
  const username = String(request.body?.username || '').trim();
  const password = String(request.body?.password || '');

  if (!username || !password) {
    return response.status(400).json({ ok: false, message: 'Faltan credenciales' });
  }

  if (!ADMIN_PASSWORD_HASH) {
    return response.status(500).json({ ok: false, message: 'Falta configurar ADMIN_PASSWORD_HASH' });
  }

  const user = findUserByUsername(username);
  if (!user) {
    return response.status(401).json({ ok: false, message: 'Credenciales incorrectas' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!usernameMatches || !passwordMatches) {
    return response.status(401).json({ ok: false, message: 'Credenciales incorrectas' });
  }

  request.session.admin = {
    authenticated: true,
    username: user.username,
    userId: user.id
  };

  return response.json({ ok: true, authenticated: true, username: ADMIN_USERNAME });
});

app.post('/api/auth/logout', (request, response) => {
  request.session.destroy(() => {
    response.clearCookie('motos-sonia-admin');
    response.json({ ok: true });
  });
});

app.get('/api/catalogo', async (_request, response) => {
  const catalog = normalizeCatalog(await safeReadJson(DATA_FILE, DEFAULT_CATALOG));
  response.json(catalog);
});

app.put('/api/catalogo', ensureAdminAuth, async (request, response) => {
  const normalized = normalizeCatalog(request.body);
  await writeFile(DATA_FILE, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  response.json({ ok: true, catalog: normalized });
});

// Password reset: request token
app.post('/api/auth/forgot', async (request, response) => {
  const email = String(request.body?.email || '').trim().toLowerCase();
  if (!email) return response.status(400).json({ ok: false, message: 'Proporciona un email' });

  const user = await findUserByEmail(email);
  if (!user) return response.json({ ok: true, message: 'Si el email existe, enviaremos instrucciones' });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = Date.now() + (Number(process.env.RESET_TOKEN_EXPIRES || 3600) * 1000);

  const store = await readStore();
  const id = store.resetTokens.length ? Math.max(...store.resetTokens.map(t => t.id || 0)) + 1 : 1;
  store.resetTokens.push({ id, userId: user.id, tokenHash, expiresAt: expires, createdAt: Date.now() });
  await writeStore(store);

  const front = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
  const resetLink = `${front}/admin/reset.html?token=${token}`;

  if (mailTransport) {
    try {
      await mailTransport.sendMail({
        from: `"Motos Sonia" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Restablecer contraseña',
        html: `<p>Haz clic en el enlace para restablecer tu contraseña (válido 1 hora): <a href="${resetLink}">${resetLink}</a></p>`
      });
    } catch (err) {
      console.error('Mail send error', err);
    }
    return response.json({ ok: true, message: 'Instrucciones enviadas si el correo existe' });
  }

  // Dev fallback: return token in response (ONLY dev)
  return response.json({ ok: true, token, message: 'SMTP no configurado - token dev retornado' });
});

// Password reset: verify token and set new password
app.post('/api/auth/reset', async (request, response) => {
  const token = String(request.body?.token || '').trim();
  const password = String(request.body?.password || '');

  if (!token || !password) return response.status(400).json({ ok: false, message: 'Faltan datos' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const store = await readStore();
  const row = store.resetTokens.find(t => t.tokenHash === tokenHash) || null;
  if (!row) return response.status(400).json({ ok: false, message: 'Token inválido o usado' });
  if (Date.now() > row.expiresAt) {
    store.resetTokens = store.resetTokens.filter(t => t.id !== row.id);
    await writeStore(store);
    return response.status(400).json({ ok: false, message: 'Token expirado' });
  }

  const hashed = await bcrypt.hash(password, 10);
  store.users = store.users.map(u => u.id === row.userId ? { ...u, passwordHash: hashed } : u);
  store.resetTokens = store.resetTokens.filter(t => t.id !== row.id);
  await writeStore(store);

  return response.json({ ok: true, message: 'Contraseña actualizada' });
});

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ ok: false, message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  if (!process.env.ADMIN_PASSWORD_HASH) {
    console.warn('Using development admin credentials: admin / Admin123!');
  }

  console.log(`Motos Sonia backend running on http://localhost:${PORT}`);
});
