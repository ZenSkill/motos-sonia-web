# Guía de despliegue de Motos Sonia Web

Esta guía sigue la ruta simple elegida para este proyecto:

- Frontend estático en Netlify.
- Backend Node.js aparte, con `server.js`.
- MongoDB Atlas para productos, usuarios y tokens.
- Cloudinary para imágenes del admin.

La clave de esta ruta es que el frontend llama a `/api/*` y Netlify lo redirige al backend con `netlify.toml`.

## 1. Qué se despliega

- Frontend estático: `index.html`, `catalogo.html`, `producto.html`, `admin.html` y los archivos de `assets/`.
- Backend Node.js: `server.js`.
- Base de datos: MongoDB Atlas.
- Catálogo inicial: se carga automáticamente desde `assets/data/catalogo.json` si la colección `products` está vacía.

## 2. Requisitos

Necesitas estas cuentas o servicios:

- Una cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
- Una plataforma para alojar Node.js, como Render, Railway, Fly.io o un VPS.
- Opcional: una cuenta SMTP para correos de recuperación.
- Opcional: una cuenta de Cloudinary para subir imágenes desde el admin.

## 3. Configuración local

### Instalar dependencias

```bash
npm install
```

### Crear `.env`

Copia `.env.example` a `.env` y completa los valores.

Variables importantes:

```env
PORT=3000
SESSION_SECRET=una-clave-larga-y-segura
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=hash-bcrypt
ADMIN_EMAIL=tu-correo@dominio.com
MONGO_URI=mongodb+srv://USUARIO:PASSWORD@cluster.mongodb.net/mototaxi_db?retryWrites=true&w=majority&appName=catalogo-motos
FRONTEND_URL=http://localhost:3000
RESET_TOKEN_EXPIRES=3600
```

### Generar el hash de la contraseña

```bash
npm run hash-password -- "TuClaveSegura"
```

Copia el resultado y pégalo en `ADMIN_PASSWORD_HASH`.

### Ejecutar localmente

```bash
npm start
```

Abrir:

- Sitio público: `http://localhost:3000`
- Admin: `http://localhost:3000/admin.html`

## 4. MongoDB Atlas

### Crear base de datos

En Atlas crea un clúster y usa esta base lógica:

- Base de datos: `mototaxi_db`

No necesitas crear colecciones manualmente si arrancas el proyecto con un `MONGO_URI` válido. El servidor crea:

- `products`
- `catalog_meta`
- `users`
- `resetTokens`

### Crear usuario de base de datos

Crea un usuario con permisos de lectura y escritura sobre `mototaxi_db`.

### Obtener `MONGO_URI`

Atlas te da una cadena parecida a esta:

```text
mongodb+srv://USUARIO:PASSWORD@cluster.mongodb.net/mototaxi_db?retryWrites=true&w=majority&appName=catalogo-motos
```

Pégala en `.env` o en las variables de entorno de tu hosting.

## 5. Cómo funciona el catálogo

Al iniciar el servidor:

- Si la colección `products` está vacía, se carga automáticamente desde `assets/data/catalogo.json`.
- Las categorías se guardan en `catalog_meta`.
- Los productos se guardan en `products`.

Rutas principales:

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/categories`
- `GET /api/catalogo`
- `PUT /api/catalogo` para el admin autenticado

## 6. Ruta simple elegida

### Arquitectura

- **Netlify**: hospeda el frontend estático.
- **Backend Node**: hospeda la API y el panel autenticado.
- **MongoDB Atlas**: guarda catálogo, usuarios y tokens.
- **Cloudinary**: guarda las imágenes que subes desde el admin.

### Qué hace Netlify

Netlify sirve el HTML/CSS/JS y además redirige `/api/*` al backend. Eso evita reescribir el frontend para CORS o tokens.

### Archivo de proxy

El repo ya incluye [netlify.toml](netlify.toml). Solo tienes que cambiar esta línea:

```toml
to = "https://TU-BACKEND-URL/api/:splat"
```

Pon ahí la URL pública real de tu backend.

### Pasos de despliegue

1. Sube el proyecto a GitHub.
2. Despliega el backend Node en Render o Railway.
3. Copia la URL pública del backend.
4. Reemplaza `TU-BACKEND-URL` en [netlify.toml](netlify.toml).
5. Despliega el frontend en Netlify.
6. Agrega las variables de entorno del backend en Render o Railway.

### Variables del backend

- `PORT`
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_EMAIL`
- `MONGO_URI`
- `FRONTEND_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `RESET_TOKEN_EXPIRES`

### Importante

- No dependas del sistema de archivos local para guardar datos en producción.
- El frontend ya puede hablar con el backend a través del proxy de Netlify.
- Si cambias la URL del backend, solo actualiza `netlify.toml`.

## 7. Despliegue en VPS

Si prefieres tener control total, usa un VPS.

### Instalar Node.js

En el servidor:

```bash
node -v
npm -v
```

Si no existen, instala Node.js LTS con el método recomendado por tu sistema operativo.

### Instalar y arrancar

```bash
git clone <tu-repo>
cd motos-sonia-web
npm install
npm start
```

### Recomendación para producción

Usa `pm2` o `systemd` para mantener el proceso vivo.

```bash
npm install -g pm2
pm2 start server.js --name motos-sonia
pm2 save
```

### Nginx + HTTPS

Pon Nginx como proxy reverso delante de Node.js y luego usa Certbot para HTTPS.

## 8. Cloudinary para imágenes del admin

Si quieres subir imágenes desde el panel admin:

1. Crea un *unsigned upload preset* en Cloudinary.
1. Define en `admin.html` estas variables globales:

```html
<script>
  window.CLOUDINARY_CLOUD = 'tu_cloud_name';
  window.CLOUDINARY_PRESET = 'tu_unsigned_preset';
</script>
```

1. El botón de subida guardará la URL final en el campo de imagen.

## 9. SMTP para reset de contraseña

Si vas a usar recuperación por correo:

- Usa una cuenta SMTP real.
- Si usas Gmail con 2FA, crea una App Password.
- Define:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=tu-app-password
```

## 10. Checklist rápido antes de publicar

- [ ] `npm install` funciona.
- [ ] `.env` está completo.
- [ ] `MONGO_URI` apunta a `mototaxi_db`.
- [ ] `ADMIN_PASSWORD_HASH` está definido.
- [ ] `ADMIN_EMAIL` está definido si usarás reset por correo.
- [ ] El backend arranca con `npm start`.
- [ ] `GET /api/products` responde desde el backend.
- [ ] `netlify.toml` apunta al backend correcto.
- [ ] `admin.html` permite iniciar sesión.
- [ ] El catálogo se ve con datos reales.

## 11. Problemas comunes

### No conecta a MongoDB

- Revisa que el usuario de Atlas tenga permisos.
- Revisa que tu IP esté permitida en Atlas.
- Verifica que la URI esté bien copiada.

### El admin no entra

- Confirma que `ADMIN_PASSWORD_HASH` corresponde a la contraseña que estás usando.
- Asegúrate de que `ADMIN_USERNAME` coincida.

### No llegan correos de reset

- Revisa SMTP, usuario y contraseña.
- Si usas Gmail, casi siempre necesitas App Password.

### Las imágenes no suben a Cloudinary

- Confirma el `upload preset` unsigned.
- Verifica `window.CLOUDINARY_CLOUD` y `window.CLOUDINARY_PRESET`.

---

Si quieres, el siguiente paso puede ser dejar una guía aún más corta, tipo "paso a paso para Render", o una guía específica para VPS con Nginx y dominio.
