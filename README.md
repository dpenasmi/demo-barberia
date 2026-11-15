# La Navaja · Barber Club

Demo en **Astro**, con seis escenas a pantalla completa, fotografía propia generada para esta propuesta y reserva interactiva. Identidad, profesionales, precios, imágenes, horario y localización ficticios.

## Arrancar

Requiere Node.js 22 o posterior.

```bash
npm install
npm run dev
```

Abre la dirección que muestre Astro. Para generar la web estática:

```bash
npm test
npm run build
npm run preview
```

La carpeta `dist/` ya incluye una compilación lista para subir a un hosting estático. Los archivos de `dist/` no se editan: se regeneran con `npm run build`.

## Archivos que editarás

| Archivo | Contenido |
| --- | --- |
| `src/pages/index.astro` | Marcado HTML, textos y estructura de las seis escenas. |
| `src/styles/styles.css` | Todo el CSS: diseño, tipografías, escenas, transiciones y responsive. |
| `src/scripts/main.js` | Navegación, capítulos, FAQ y formulario por pasos. |
| `src/scripts/booking.js` | Catálogo y funciones de fechas, horas y disponibilidad simulada. |
| `public/images/` | Cinco fotografías WebP locales. |
| `astro.config.mjs` | Configuración de compilación y ruta base. |
| `.env.example` | Plantilla para la futura URL de reservas. |
| `docs/WEBHOOK.md` | Contrato de integración del backend con n8n. |

En Astro, el HTML se escribe dentro del archivo `.astro`: es el equivalente a la plantilla HTML, con un bloque superior de configuración. Se han separado los estilos y la lógica en archivos independientes. El único `<script>` de la plantilla importa `main.js`; no contiene la implementación.

## Recorrido

1. **La actitud:** retrato y titular.
2. **Tu sitio:** interior a pantalla completa.
3. **El ritual:** servicios y acceso a reservar con el servicio preseleccionado.
4. **Buenas manos:** equipo y selección de barbero.
5. **Tu cita:** agenda visual en tres pasos.
6. **Nos vemos:** contacto y preguntas en un diálogo.

El scroll es nativo y se ajusta al comienzo de cada escena mediante CSS Scroll Snap. No se bloquea la rueda ni el gesto táctil. Puedes avanzar y volver, usar los capítulos o PageUp/PageDown fuera de los controles. El indicador lateral cambia al entrar en cada sección. Las imágenes tienen un acercamiento suave y el texto aparece al entrar.

En pantallas pequeñas el ajuste es más flexible y las escenas crecen cuando hace falta; el formulario puede ocupar más de una pantalla para que ningún campo quede cortado. `prefers-reduced-motion` desactiva las animaciones y el ajuste forzado.

## Estado de las reservas

**Por defecto es una simulación.** No envía solicitudes, crea citas, manda emails ni guarda datos en el navegador. Los huecos de ejemplo respetan el horario ficticio, la duración, los domingos, una antelación de 30 minutos y la zona Europe/Madrid. No representan ocupación real.

La confirmación distingue explícitamente una simulación de una reserva real. No se usa Google Calendar, Sheets, n8n ni un proveedor de correo hasta que se implemente y configure el backend.

Para la conexión futura, copia `.env.example` a `.env`, configura `PUBLIC_BOOKING_API` con la raíz de tu API y vuelve a compilar. El cliente llamará a `/availability` y `/bookings`; el detalle está en `docs/WEBHOOK.md`. **Configurar una URL no crea el backend ni configura n8n.** No apuntes a un webhook de ejemplo que devuelva éxito sin registrar una cita.

Los valores `PUBLIC_` son visibles en el navegador: utiliza únicamente una URL pública de tu API, nunca tokens, contraseñas o el secreto del webhook. La integración requiere validación y control de concurrencia en servidor. Antes de activar reservas reales, añade la información de privacidad de la barbería y adapta el consentimiento.

## Publicar en subcarpeta / GitHub Pages

Para un repositorio llamado `la-navaja`, configura en `astro.config.mjs`:

```js
export default defineConfig({
  output: 'static',
  base: '/la-navaja/',
  build: { inlineStylesheets: 'never' },
});
```

Los enlaces a imágenes y favicon respetan la ruta base. Las fuentes se empaquetan localmente y no necesitan Google Fonts. La agenda real requerirá una API externa al hosting estático o un servidor con un adaptador de Astro configurado.

## Cambios frecuentes

- Colores y tipografías: variables `:root` al principio del CSS.
- Fotografías: sustituye los WebP conservando sus nombres. Ajusta `object-position` para el recorte en móvil.
- Servicios: actualiza tanto el catálogo de `index.astro` como `SERVICES` en `booking.js`. En producción precio y duración deben validarse de nuevo en servidor.
- Equipo: actualiza nombres y opciones en la plantilla y en `BARBERS`.
- Reserva: `PUBLIC_BOOKING_API` se lee al compilar, no al ejecutar la página estática.

## Verificación

`npm test` comprueba fechas inválidas, horario de Madrid y cambio de día, cierre de domingo, antelación, duración y validación del formato de huecos. `npm run build` compila el proyecto y empaqueta scripts, CSS, fuentes e imágenes.

La compilación y las cinco pruebas automatizadas han pasado. La vista previa del entorno no logró arrancar, por lo que queda pendiente comprobar visualmente en navegador escritorio/móvil y recorrer el formulario completo. No se ha probado una API real.

No se ha publicado esta demo ni se ha conectado una automatización real.

## Referencias técnicas

- [Astro: estilos y CSS](https://docs.astro.build/es/guides/styling/)
- [Astro: scripts y eventos](https://docs.astro.build/en/guides/client-side-scripts/)
- [MDN: CSS Scroll Snap](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap)
