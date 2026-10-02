# GEM: cambio de apariencia gradual

El tema claro, oscuro y sincronizado con el sistema conserva las paletas y la distribución de GEM. Al cambiar la apariencia, los colores se interpolan durante 420 ms con entrada y salida suaves. La transición también se aplica cuando cambia la preferencia del sistema operativo.

La preferencia guardada se aplica en la cabecera HTML antes de cargar React o mostrar el contenido. Esto evita presentar primero una pantalla clara cuando se ha elegido el tema oscuro. No se anima la carga inicial.

## Comportamiento

- Se interpolan los colores compartidos de superficies, texto, bordes, estados, SVG y gradientes mediante propiedades CSS registradas. Las transiciones habituales de botones y paneles se conservan.
- Si el navegador carece de `CSS.registerProperty`, se usa una transición temporal de propiedades de color.
- Los cambios rápidos redirigen la transición hacia el último tema seleccionado. No se bloquean los controles ni se superpone una captura de pantalla.
- El tema manual prevalece sobre el sistema. La sincronización reacciona a los cambios del sistema mientras esa opción está seleccionada.
- La reducción de movimiento de la aplicación, `prefers-reduced-motion` y `update: slow` omiten la transición. Si se activa durante una transición, esta termina inmediatamente.
- Los temporizadores y las suscripciones se eliminan al desmontar el controlador. El almacenamiento corrupto o bloqueado no impide usar la apariencia durante la sesión.

## Validación

- 19 pruebas unitarias y compilación de producción.
- 7 pruebas de navegador nuevas: interpolación en ambos sentidos, alternativa compatible, sincronización y elección manual, cambios rápidos en escritorio y celular, tema antes de cargar React, reducción de movimiento y almacenamiento inaccesible.
- Se mantienen las 5 pruebas de navegador de los flujos de reclutamiento.
- Comparación de seis capturas a 1440 × 1000: Convocatorias, Mejores candidatos y Ajustes, en claro y oscuro. La distribución y los píxeles coinciden con la versión anterior una vez aplicado el tema.

## Referencias

- [Google Material Design: transiciones y accesibilidad](https://m3.material.io/styles/motion/transitions/applying-transitions).
- [W3C: respetar la preferencia de movimiento reducido](https://www.w3.org/WAI/WCAG22/Techniques/css/C39).
- [MDN: propiedades CSS registradas e interpolación](https://developer.mozilla.org/en-US/docs/Web/API/CSS/registerProperty_static).

Estas referencias orientan la implementación; no constituyen una certificación de accesibilidad del sistema completo.
