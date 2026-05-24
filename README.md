# Motos Sonia Web

Sitio web estático con backend simple en Node.js para catálogo y panel de administración con sesión real.

## Arranque local

1. Instala dependencias:

```bash
npm install
```

1. Copia `.env.example` a `.env` y completa los valores, especialmente `MONGO_URI`.

1. Asegúrate de que tu URI apunte a la base `mototaxi_db`:

```text
MONGO_URI=mongodb+srv://USUARIO:PASSWORD@cluster.mongodb.net/mototaxi_db?retryWrites=true&w=majority&appName=catalogo-motos
```

1. Inicia el servidor:

```bash
npm start
```

## Datos y seed

Al arrancar, si la colección `products` está vacía, el servidor carga automáticamente el catálogo inicial desde [assets/data/catalogo.json](assets/data/catalogo.json).

## Variables de entorno

- `PORT`: puerto del servidor.
- `SESSION_SECRET`: secreto de sesión de Express.
- `ADMIN_USERNAME`: usuario del panel.
- `ADMIN_PASSWORD_HASH`: hash bcrypt del password del panel.
- `ADMIN_EMAIL`: email del admin para recuperación de contraseña.
- `MONGO_URI`: conexión a MongoDB Atlas con la base `mototaxi_db`.
- `SMTP_*`: credenciales para correo de recuperación.
- `FRONTEND_URL`: URL pública usada en enlaces de reset.
- `RESET_TOKEN_EXPIRES`: tiempo de vida del token en segundos.

## Endpoints del catálogo

- `GET /api/products` devuelve todos los productos.
- `GET /api/products/:id` devuelve un producto por `id`.
- `GET /api/categories` devuelve las categorías.
- `GET /api/catalogo` devuelve el catálogo completo por compatibilidad.
- `PUT /api/catalogo` guarda el catálogo completo y requiere sesión autenticada.

## Acceso de desarrollo

Si no defines `ADMIN_PASSWORD_HASH`, el servidor usa estas credenciales solo en desarrollo:

- Usuario: `admin`
- Contraseña: `Admin123!`

## Cloudinary (subida de imágenes desde Admin)

Recomendado: usar un *unsigned upload preset* para subir imágenes directamente desde `admin.html` al Cloudinary sin pasar las credenciales por el navegador.

Pasos:

1. Crea una cuenta en Cloudinary y ve a *Settings > Upload*.
1. Crea un *Upload preset* y márcalo como *Unsigned*.
1. En `admin.html` define las variables globales:

```html
<script>
  window.CLOUDINARY_CLOUD = 'tu_cloud_name';
  window.CLOUDINARY_PRESET = 'tu_unsigned_preset';
</script>
```

1. En el admin usa el archivo y el botón *Subir a Cloudinary*; el `secure_url` se escribe en el campo de imagen.

Notas de seguridad:

- El preset unsigned es práctico, pero limita qué puedes subir desde el cliente.
- Si quieres mayor control, luego podemos cambiar a uploads firmados desde el backend.
