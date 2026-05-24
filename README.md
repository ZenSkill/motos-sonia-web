# Motos Sonia

Sitio web comercial de Motos Sonia en Huaral, Perú.

## Gestión del catálogo

- Panel interno: `admin.html`
- Catálogo público: `catalogo.html`
- Fuente de datos: `assets/data/catalogo.json`
- Imágenes: `img/catalogo/`

### Flujo recomendado

1. Sube la imagen del producto a `img/catalogo/`.
2. Abre `admin.html` y crea o edita el producto.
3. Completa nombre, precio, categoría, descripción y ruta de imagen.
4. Exporta `catalogo.json` desde el panel.
5. Reemplaza el archivo publicado `assets/data/catalogo.json` con el JSON exportado.

### Nota

Si una imagen todavía no existe, deja el campo `image` vacío. El catálogo mostrará una plantilla web temporal con el tamaño correcto sin romper la página.

### Recomendación para imágenes a futuro

Para no depender de tocar el código, lo ideal es mover las fotos a un almacenamiento gestionado por el panel (por ejemplo Cloudinary, Firebase Storage o un CMS liviano) y guardar solo la URL final dentro del JSON.
