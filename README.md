# SubnetCalc

Calculadora profesional de subredes IPv4, construida con HTML5, CSS3 y JavaScript puro (sin frameworks)

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
