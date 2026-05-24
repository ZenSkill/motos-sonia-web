const { getModels } = require('./_shared/models');
const { sign, verify } = require('./_shared/jwt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Basic in-memory rate limiter (best-effort for serverless warm instances)
const RATE_LIMIT_STORE = global.__rateLimitStore || (global.__rateLimitStore = new Map());
function checkRateLimit(key, limit = 10, windowSec = 60) {
  const now = Date.now();
  const entry = RATE_LIMIT_STORE.get(key) || { count: 0, resetAt: now + windowSec * 1000 };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowSec * 1000;
  } else {
    entry.count += 1;
  }
  RATE_LIMIT_STORE.set(key, entry);
  return entry.count <= limit;
}

function jsonResponse(status, body) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer-when-downgrade',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://res.cloudinary.com; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;",
  };
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
  return { statusCode: status, headers, body: JSON.stringify(body) };
}

function cookieResponse(status, body, cookie) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer-when-downgrade',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://res.cloudinary.com; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;",
  };
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
  if (cookie) headers['Set-Cookie'] = cookie;
  return { statusCode: status, headers, body: JSON.stringify(body) };
}

async function handleProducts(models, event) {
  const products = await models.Product.find({}).lean().exec();
  return jsonResponse(200, products.map(p => ({ id: p._id, nombre: p.nombre, categoria: p.categoria, precio: p.precio, imagen: p.imagen, destacado: p.destacado, slug: p.slug })));
}

async function handleProductById(models, id) {
  if (!id) return jsonResponse(400, { error: 'missing id' });
  const byId = await models.Product.findOne({ $or: [{ _id: id }, { slug: id }] }).lean().exec();
  if (!byId) return jsonResponse(404, { error: 'not found' });
  return jsonResponse(200, byId);
}

async function handleCategories(models) {
  const products = await models.Product.find({}).lean().exec();
  const categories = {};
  products.forEach(p => {
    const key = p.categoria || 'sin-categoria';
    categories[key] = categories[key] || { nombre: key, items: 0 };
    categories[key].items += 1;
  });
  return jsonResponse(200, Object.values(categories));
}

async function sendMail(to, subject, text) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured, skipping email');
    return false;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text });
  return true;
}

exports.handler = async function (event, context) {
  try {
    const { path = '' } = event.queryStringParameters || {};
    const parts = path.split('/').filter(Boolean);
    const method = event.httpMethod;
    const models = await getModels();

    // Routing
    if (parts.length === 0) {
      return jsonResponse(200, { ok: true });
    }

    // GET /api/products
    if (parts[0] === 'products' && method === 'GET' && parts.length === 1) {
      return await handleProducts(models, event);
    }

    // GET /api/products/:id
    if (parts[0] === 'products' && method === 'GET' && parts.length === 2) {
      return await handleProductById(models, parts[1]);
    }

    // GET /api/categories
    if (parts[0] === 'categories' && method === 'GET') {
      return await handleCategories(models);
    }

    // POST /api/auth/login -> set HttpOnly cookie
    if (parts[0] === 'auth' && parts[1] === 'login' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { username, password } = body;
      const user = await models.User.findOne({ username }).exec();
      if (!user) return jsonResponse(401, { error: 'invalid' });
      // passwordHash stored as bcrypt
      const bcrypt = require('bcryptjs');
      const ok = await bcrypt.compare(password || '', user.passwordHash || '');
      if (!ok) return jsonResponse(401, { error: 'invalid' });
      const token = sign({ sub: String(user._id), username: user.username });
      // cookie attributes: HttpOnly, Secure (required on HTTPS), SameSite=Strict
      const maxAge = 60 * 60; // 1 hour
      const cookie = `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
      return cookieResponse(200, { ok: true }, cookie);
    }

    // POST /api/auth/logout -> clear cookie
    if (parts[0] === 'auth' && parts[1] === 'logout' && method === 'POST') {
      const cookie = `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
      return cookieResponse(200, { ok: true }, cookie);
    }

    // GET /api/auth/session -> check cookie
    if (parts[0] === 'auth' && parts[1] === 'session' && method === 'GET') {
      const cookieHeader = event.headers && (event.headers.cookie || event.headers.Cookie || '');
      const token = (cookieHeader || '').split(';').map(s => s.trim()).find(s => s.startsWith('token='));
      if (!token) return jsonResponse(200, { authenticated: false });
      const value = token.split('=')[1];
      const payload = verify(value);
      if (!payload) return jsonResponse(200, { authenticated: false });
      return jsonResponse(200, { authenticated: true, user: { id: payload.sub, username: payload.username } });
    }

    // POST /api/forgot
    if (parts[0] === 'forgot' && method === 'POST') {
      // rate limit by IP for forgot
      const ip = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp || 'unknown';
      if (!checkRateLimit(`forgot:${ip}`, 5, 60)) return jsonResponse(429, { error: 'rate_limited' });
      const body = JSON.parse(event.body || '{}');
      const { email } = body;
      const user = await models.User.findOne({ email }).exec();
      if (!user) return jsonResponse(200, { ok: true }); // avoid revealing
      const token = crypto.randomBytes(20).toString('hex');
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1h
      await models.ResetToken.create({ userId: user._id, token, expiresAt: expires });
      const resetUrl = `${process.env.FRONTEND_URL || ''}/admin.html?reset=${token}`;
      await sendMail(email, 'Password reset', `Use this link: ${resetUrl}`);
      return jsonResponse(200, { ok: true });
    }

    // POST /api/reset
    if (parts[0] === 'reset' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { token, password } = body;
      const rt = await models.ResetToken.findOne({ token }).exec();
      if (!rt || rt.expiresAt < new Date()) return jsonResponse(400, { error: 'invalid' });
      const user = await models.User.findById(rt.userId).exec();
      if (!user) return jsonResponse(400, { error: 'invalid' });
      const bcrypt = require('bcryptjs');
      user.passwordHash = await bcrypt.hash(password, 10);
      await user.save();
      await models.ResetToken.deleteMany({ userId: user._id }).exec();
      return jsonResponse(200, { ok: true });
    }

    // PUT /api/catalog (admin) - update products list
    if ((parts[0] === 'catalog' || parts[0] === 'catalogo') && (method === 'PUT' || method === 'POST')) {
      // rate limit catalog updates by IP
      const ipCatalog = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp || 'unknown';
      if (!checkRateLimit(`catalog:${ipCatalog}`, 20, 60)) return jsonResponse(429, { error: 'rate_limited' });

      // Accept either Authorization: Bearer <token> or cookie token
      let token = null;
      const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
      if (auth && auth.startsWith('Bearer ')) {
        token = auth.replace('Bearer ', '');
      } else {
        const cookieHeader = event.headers && (event.headers.cookie || event.headers.Cookie || '');
        const cookieToken = (cookieHeader || '').split(';').map(s => s.trim()).find(s => s.startsWith('token='));
        if (cookieToken) token = cookieToken.split('=')[1];
      }
      if (!token) return jsonResponse(401, { error: 'unauthorized' });
      const payload = verify(token);
      if (!payload) return jsonResponse(401, { error: 'unauthorized' });
      const body = JSON.parse(event.body || '{}');
      const products = body.products || [];
      // simple replace: delete all and insert
      await models.Product.deleteMany({}).exec();
      if (products.length) {
        const docs = products.map(p => ({ nombre: p.nombre, descripcion: p.descripcion || '', categoria: p.categoria || '', precio: Number(p.precio || 0), imagen: p.imagen || '', destacado: !!p.destacado, slug: p.slug || '' }));
        await models.Product.insertMany(docs);
      }
      return jsonResponse(200, { ok: true });
    }

    // POST /api/uploads/sign - sign Cloudinary upload parameters
    if (parts[0] === 'uploads' && parts[1] === 'sign' && method === 'POST') {
      // require auth
      const cookieHeader = event.headers && (event.headers.cookie || event.headers.Cookie || '');
      const cookieToken = (cookieHeader || '').split(';').map(s => s.trim()).find(s => s.startsWith('token='));
      const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
      let token = null;
      if (auth && auth.startsWith('Bearer ')) token = auth.replace('Bearer ', '');
      else if (cookieToken) token = cookieToken.split('=')[1];
      if (!token) return jsonResponse(401, { error: 'unauthorized' });
      const payload = verify(token);
      if (!payload) return jsonResponse(401, { error: 'unauthorized' });

      // rate limit signing requests per user
      const ip = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp || payload.sub || 'unknown';
      if (!checkRateLimit(`sign:${ip}`, 30, 60)) return jsonResponse(429, { error: 'rate_limited' });

      const body = JSON.parse(event.body || '{}');
      const { filename = '', size = 0, contentType = 'application/octet-stream', folder = '' } = body;
      const maxBytes = 5 * 1024 * 1024; // 5MB
      if (Number(size) > maxBytes) return jsonResponse(400, { error: 'file_too_large' });
      const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!allowed.includes(contentType)) return jsonResponse(400, { error: 'invalid_type' });

      if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD) return jsonResponse(500, { error: 'cloudinary_not_configured' });
      const ts = Math.floor(Date.now() / 1000);
      const paramsToSign = (folder ? `folder=${folder}&` : '') + `timestamp=${ts}`;
      const signature = crypto.createHash('sha1').update(paramsToSign + process.env.CLOUDINARY_API_SECRET).digest('hex');
      return jsonResponse(200, { signature, timestamp: ts, api_key: process.env.CLOUDINARY_API_KEY, cloud: process.env.CLOUDINARY_CLOUD, folder });
    }

    return jsonResponse(404, { error: 'not found' });
  } catch (err) {
    console.error('Function error', err);
    return jsonResponse(500, { error: String(err) });
  }
};
