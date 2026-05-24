import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const isProduction = process.env.NODE_ENV === 'production';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || (isProduction ? '' : bcrypt.hashSync('Admin123!', 10));
const PUBLIC_DIR = __dirname;
const RESET_TOKEN_EXPIRES = Number(process.env.RESET_TOKEN_EXPIRES || 3600) * 1000;

// ── MongoDB ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('ERROR: falta la variable de entorno MONGO_URI');
  process.exit(1);
}
await mongoose.connect(MONGO_URI);
console.log('MongoDB conectado');

// Esquema catálogo
const CatalogSchema = new mongoose.Schema({
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  categories: { type: [mongoose.Schema.Types.Mixed], default: [] },
  products: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { collection: 'catalogo' });
const Catalog = mongoose.model('Catalog', CatalogSchema);

// Esquema usuarios
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  email: { type: String, default: '' }
}, { collection: 'users' });
const User = mongoose.model('User', UserSchema);

// Esquema tokens de reset
const ResetTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { collection: 'resetTokens' });
const ResetToken = mongoose.model('ResetToken', ResetTokenSchema);

// Valor por defecto del catálogo
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

// Helper: obtener o crear el documento único de catálogo
const getCatalogDoc = async () => {
  let doc = await Catalog.findOne();
  if (!doc) {
    doc = await Catalog.create(DEFAULT_CATALOG);
  }
  return doc;
};

// ── Normalización ────────────────────────────────────────────────────────────
const normalizeProduct = (p = {}) => ({
  id: String(p.id || crypto.randomUUID()),
  name: String(p.name || '').trim(),
  price: String(p.price || '').trim(),
  description: String(p.description || '').trim(),
  category: String(p.category || '').trim(),
  image: String(p.image || '').trim(),
  imageAlt: String(p.imageAlt || '').trim(),
  badge: String(p.badge || '').trim(),
  whatsappText: String(p.whatsappText || '').trim(),
  featured: Boolean(p.featured)
});

const normalizeCategory = (c = {}) => ({
  name: String(c.name || '').trim(),
  image: String(c.image || '').trim(),
  imageAlt: String(c.imageAlt || '').trim(),
  description: String(c.description || '').trim()
});

const normalizeCatalog = (data = {}) => ({
  meta: data.meta || DEFAULT_CATALOG.meta,
  categories: (Array.isArray(data.categories) ? data.categories : []).map(normalizeCategory),
  products: (Array.isArray(data.products) ? data.products : []).map(normalizeProduct)
});

// ── Nodemailer ───────────────────────────────────────────────────────────────
let mailTransport = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

// ── Middlewares ──────────────────────────────────────────────────────────────
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
    secure: isProduction,
    maxAge: 8 * 60 * 60 * 1000
  }
}));
app.use(express.static(PUBLIC_DIR));

// ── Auth middleware ──────────────────────────────────────────────────────────
const ensureAdminAuth = (req, res, next) => {
  if (req.session?.adminLoggedIn) return next();
  res.status(401).json({ error: 'No autenticado' });
};

// ── Rutas API ────────────────────────────────────────────────────────────────

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Sesión
app.get('/api/auth/session', (req, res) => {
  res.json({ loggedIn: Boolean(req.session?.adminLoggedIn), username: req.session?.adminUser || null });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });
    if (username !== ADMIN_USERNAME) return res.status(401).json({ error: 'Credenciales incorrectas' });
    if (!ADMIN_PASSWORD_HASH) return res.status(500).json({ error: 'Sin hash configurado' });
    const ok = await bcrypt.compare(String(password), ADMIN_PASSWORD_HASH);
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
    req.session.adminLoggedIn = true;
    req.session.adminUser = username;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Forgot password
app.post('/api/auth/forgot', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Falta el email' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ ok: true }); // No revelar si existe
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES);
    await ResetToken.deleteMany({ username: user.username });
    await ResetToken.create({ token, username: user.username, expiresAt });
    if (mailTransport) {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:' + PORT}/admin.html?reset=${token}`;
      await mailTransport.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Restablecer contraseña - Motos Sonia',
        html: `<p>Usa este enlace para restablecer tu contraseña (expira en 1 hora):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
      });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// Reset password
app.post('/api/auth/reset', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'Faltan datos' });
    const record = await ResetToken.findOne({ token });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }
    const hash = await bcrypt.hash(String(password), 10);
    await User.findOneAndUpdate({ username: record.username }, { passwordHash: hash });
    await ResetToken.deleteOne({ token });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET catálogo (público)
app.get('/api/catalogo', async (_req, res) => {
  try {
    const doc = await getCatalogDoc();
    res.json({ meta: doc.meta, categories: doc.categories, products: doc.products });
  } catch (e) {
    res.status(500).json({ error: 'Error leyendo catálogo' });
  }
});

// PUT catálogo (solo admin)
app.put('/api/catalogo', ensureAdminAuth, async (req, res) => {
  try {
    const normalized = normalizeCatalog(req.body);
    await Catalog.findOneAndUpdate({}, normalized, { upsert: true, new: true });
    res.json({ ok: true, catalog: normalized });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando catálogo' });
  }
});

// Fallback SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ── Inicio ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Servidor Motos Sonia en http://localhost:${PORT}`));
