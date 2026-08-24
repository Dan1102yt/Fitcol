# Bugs resueltos — sesión 21–24 agosto 2026

Registro de lo corregido en Fitcol con ayuda de Claude en esta ronda de trabajo. Sirve de referencia si algo similar vuelve a pasar.

## Fase 1 — bugs críticos

- **"Borrar todo" no borraba la nube ni la gamificación** — solo limpiaba localStorage. Ahora borra las 4 tablas de Supabase (incluida `chat_events`) y el estado de racha/logros.
- **Importador de Excel no convertía libras a kilos** — guardaba el valor crudo. Ahora detecta la unidad por el encabezado de columna y convierte.
- **Ejercicios de peso corporal no se podían marcar sin inventar un peso falso** — el check exigía peso > 0 siempre. Ahora no bloquea cuando `equipo === "peso corporal"`.

## Campo de lesiones/restricciones + sync de comidas

- Nuevo campo en Perfil (notas + grupos/ejercicios a evitar), filtra `generateRoutine()` y el contexto que recibe el Asistente IA.
- Editar/borrar una comida ahora sincroniza con Supabase (antes solo local).
- Corregido un insert duplicado al agregar comida desde el buscador de Open Food Facts.

## Bug del nav "Perfil" ausente en móvil

- El bottom-nav nunca tuvo botón de Perfil (solo el sidebar de PC). Agregado.

## Ronda de 6 reportes de testing

- Aviso en rojo cuando el ritmo de cambio de peso pedido es agresivo (antes solo cubría déficits, no ganancias rápidas).
- Rediseño visual de la lista de "ejercicios a evitar" (heredaba mayúsculas/espaciado pensado para otro tipo de campo).
- `accept` del input de importar datos, muy estricto, no dejaba elegir archivo en algunos celulares.

## El bug grande: sincronización de entrenamiento

Encadenado en varias capas — cada una se sentía como "la última" hasta que apareció la siguiente:

1. `cloudHydrate()` (se corre cada vez que abres la app con sesión activa) **reemplazaba** por completo el entrenamiento/dieta local con lo de la nube — si un registro no había llegado a subir a tiempo, se perdía. Arreglado: ahora mezcla en vez de reemplazar, y reintenta subir lo pendiente.
2. Los sets reconstruidos desde la nube quedaban con un `sessionId` distinto al que usa "Sesión de hoy" para reconocerlos — se veían vacíos aunque sí estaban guardados en Supabase. Arreglado: ahora se matchea por fecha + nombre del ejercicio en vez de por sessionId exacto.
3. **La causa raíz real:** el Service Worker servía el código propio (`app.js`, `cloud-sync.js`, etc.) desde caché sin revisar si había una versión nueva — así que ningún fix anterior llegaba de verdad a los celulares/PCs que ya tenían la app cacheada, sin importar cuántas veces se publicara. Arreglado: el código propio ahora va "red primero, caché solo como respaldo offline" (`CACHE_NAME` subió a `fitcol-v4`).

Verificado de punta a punta controlando el navegador real: se registró un set, se hizo un refresh real (F5), y el dato sobrevivió.

## Bug del bottom-nav "trabado"

- El reposicionamiento del bottom-nav (por teclado / barra de direcciones de Android) solo se recalculaba con eventos del propio navegador, nunca al cambiar de vista dentro de la app — podía quedar desfasado del área real que recibe el toque. Se agregó recálculo en cada cambio de vista, más manejo de errores para que un fallo de render no deje la pantalla trabada sin avisar.

## Fase 2 — tracking del Asistente IA

- No existía forma de medir cuántos testers usan el chat o el análisis de fotos — el chat vive solo en local y las llamadas al Worker no quedaban registradas. Se agregó la tabla `chat_events` + registro automático en cada uso exitoso (chat o foto).
