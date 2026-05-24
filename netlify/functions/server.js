const { getModels } = require('./_shared/models');
const { sign, verify } = require('./_shared/jwt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
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

    // POST /api/login
    if (parts[0] === 'login' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { username, password } = body;
      const user = await models.User.findOne({ username }).exec();
      if (!user) return jsonResponse(401, { error: 'invalid' });
      // passwordHash stored as bcrypt
      const bcrypt = require('bcryptjs');
      const ok = await bcrypt.compare(password || '', user.passwordHash || '');
      if (!ok) return jsonResponse(401, { error: 'invalid' });
      const token = sign({ sub: String(user._id), username: user.username });
      return jsonResponse(200, { token });
    }

    // POST /api/forgot
    if (parts[0] === 'forgot' && method === 'POST') {
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
      const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
      if (!auth || !auth.startsWith('Bearer ')) return jsonResponse(401, { error: 'unauthorized' });
      const token = auth.replace('Bearer ', '');
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

    return jsonResponse(404, { error: 'not found' });
  } catch (err) {
    console.error('Function error', err);
    return jsonResponse(500, { error: String(err) });
  }
};
