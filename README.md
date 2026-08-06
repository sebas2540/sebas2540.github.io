# SubnetCalc

Calculadora profesional de subredes IPv4, construida con HTML5, CSS3 y JavaScript puro (sin frameworks). Lista para publicarse en GitHub Pages o cualquier hosting estático.

## Estructura del proyecto

```
subnetcalc/
├── index.html        Página principal (hero, calculadora, tutorial, blog, contacto)
├── styles.css         Estilos (tema oscuro/claro, responsive, animaciones)
├── script.js          Lógica de cálculo de subredes + interacción de UI
├── privacidad.html    Política de privacidad
├── terminos.html      Términos y condiciones
├── favicon.svg         Ícono del sitio
├── robots.txt         Directivas para motores de búsqueda
└── sitemap.xml        Mapa del sitio para SEO
```

## Características

- Cálculo completo de subredes IPv4: red, broadcast, primera/última IP útil, máscara decimal y
  binaria, wildcard, hosts útiles, total de direcciones, clase de IP y tipo (privada/pública).
- Generación de tabla de subredes al dividir una red en un prefijo mayor.
- Historial de los últimos cálculos guardado en `localStorage`.
- Copiar resultados al portapapeles, imprimir y descargar en PDF.
- Modo claro/oscuro con preferencia guardada.
- Totalmente responsive y accesible (foco visible, `aria-live`, `skip link`).
- SEO on-page: metaetiquetas, Open Graph, `robots.txt`, `sitemap.xml` y datos estructurados
  Schema.org (`WebApplication` y `FAQPage`).
- Espacios reservados (sin anuncios reales) para Google AdSense: banner superior, lateral, entre
  artículos y al final de la página.

## Cómo publicarlo en GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube todos los archivos de esta carpeta a la raíz del
   repositorio (o a una carpeta `docs/` si prefieres esa configuración).
2. En GitHub, ve a **Settings → Pages**.
3. En "Source", selecciona la rama (por ejemplo `main`) y la carpeta (`/root` o `/docs`).
4. Guarda los cambios. GitHub Pages publicará el sitio en unos minutos en una URL del tipo
   `https://tu-usuario.github.io/subnetcalc/`.

## Antes de monetizar con Google AdSense

1. Sustituye los dominios de ejemplo (`subnetcalc.example.com`) en `index.html`,
   `privacidad.html`, `terminos.html`, `robots.txt` y `sitemap.xml` por tu dominio real.
2. Solicita tu cuenta en [Google AdSense](https://adsense.google.com/) y espera la aprobación.
3. Reemplaza cada bloque `<div class="ad-placeholder">…</div>` por el código de anuncio real que te
   proporcione AdSense, manteniendo el contenedor `.ad-slot` para conservar el espaciado.
4. Actualiza el correo de contacto y los enlaces de redes sociales del footer.

## Desarrollo local

No requiere build ni dependencias. Basta con abrir `index.html` en el navegador, o servirlo con
cualquier servidor estático, por ejemplo:

```bash
npx serve .
```
