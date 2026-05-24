# Motos Sonia Web

Sitio web estático con backend simple en Node.js para catálogo y panel de administración con sesión real.

## Arranque rápido

1. Instala dependencias:

```bash
npm install
```

2. Si quieres usar credenciales propias, copia `.env.example` a `.env` y cambia los valores.

3. Genera un hash para la contraseña si lo necesitas:

```bash
npm run hash-password -- "TuClaveSegura"
```

4. Inicia el servidor:

```bash
npm start
```

## Acceso de desarrollo

Si no defines `ADMIN_PASSWORD_HASH`, el servidor usa estas credenciales solo en desarrollo:

- Usuario: `admin`
- Contraseña: `Admin123!`

## Rutas

- `GET /api/catalogo` consulta el catálogo.
- `POST /api/auth/login` inicia sesión.
- `POST /api/auth/logout` cierra la sesión.
- `GET /api/auth/session` verifica la sesión activa.
- `PUT /api/catalogo` guarda el catálogo completo y requiere sesión autenticada.

## Cloudinary (subida de imágenes desde Admin)

Recomendado: usar un *unsigned upload preset* para subir imágenes directamente desde `admin.html` al Cloudinary sin pasar las credenciales por el navegador.

Pasos:
1. Crea una cuenta en Cloudinary y ve a la sección *Settings > Upload*.
2. Crea un *Upload preset* y marca *Unsigned*.
3. En `admin.html` añade las variables globales en un bloque `<script>` cerca del final de la página:

```html
<script>
	window.CLOUDINARY_CLOUD = 'tu_cloud_name';
	window.CLOUDINARY_PRESET = 'tu_unsigned_preset';
</script>
```

4. En el admin usa el campo de archivo y el botón *Subir a Cloudinary*; al subir, el `secure_url` resultante se escribe en el campo `Ruta de imagen`.

Notas de seguridad:
- El preset *unsigned* no requiere clave, pero restringe transformaciones desde el lado del servidor si configuras firmas.
- Para mayor seguridad, considera implementar un endpoint que firme uploads (server-side) y usar uploads firmados.
