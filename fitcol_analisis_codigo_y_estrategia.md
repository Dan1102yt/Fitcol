# Fitcol — Análisis del código real + UX + Plan de lanzamiento de 90 días

Leí el proyecto completo en `C:\Users\Usuario\DAVIDCLAUDE\Fitcol` (index.html, app.js, ai.js, auth.js, cloud-sync.js, data.js, food-search.js, excel-importer.js, gamification.js, supabase-config.js, sw.js, manifest.json, install-prompt.js, CLAUDE.md, README.md, SETUP.md) antes de escribir esto. Todo lo que sigue está basado en lo que el código realmente hace hoy, no en suposiciones — cuando cito un archivo o función es porque la revisé línea por línea.

**Lo que ya tienes construido** (para que el resto del documento tenga contexto): una PWA vanilla JS/HTML/CSS sin frameworks ni build step, desplegada en GitHub Pages (`dan1102yt.github.io/Fitcol`), con auth y base de datos en Supabase (perfiles, pesos, entrenamientos, comidas con RLS), un asistente IA (Claude Haiku vía un Worker de Cloudflare que oculta la API key), integración con Open Food Facts, importador de historial desde Excel, sistema de gamificación (rachas, niveles, logros), y modo offline con Service Worker. Es un proyecto real y bastante completo — no un concepto en papel. Esto cambia el enfoque de todo lo que pediste: en vez de diseñar desde cero, la UX y el QA parten de auditar lo que existe, y el plan de 90 días parte de "terminar de configurar y arreglar lo que ya está" antes de "reclutar usuarios".

---

## Parte 1 — Auditoría de UX (sobre la app real, no una idealizada)

### 1.1 Navegación actual

Sidebar en PC / bottom-nav en móvil con: Dashboard, Dieta, Entrenamiento, Progreso, Asistente IA, Perfil, Mis Logros (`index.html`). Es una arquitectura de información razonable y ya sigue el patrón de tabs que recomendaría para una app de este tipo. El bottom-nav muestra la racha (🦅 + contador) en vez del ícono de Perfil, lo cual es una buena decisión de retención: hace visible el progreso de racha en todo momento sin ocupar espacio con un ítem extra.

### 1.2 Onboarding: hoy es un formulario largo, no un flujo por pasos

`renderOnboarding()` en `app.js` (línea ~2073) muestra **una sola pantalla con diez campos** (nombre, edad, sexo, estatura, peso, objetivo, peso meta, semanas, días de entrenamiento, tipo de entrenamiento) de una vez, dentro de un modal. No hay progreso por pasos, ni explicación de por qué se pide cada dato, ni un momento de "aquí está tu plan" antes de pedir todos los datos.

Esto es exactamente el patrón que más abandono genera en onboarding de apps de fitness. Te recomiendo dividirlo en 3 pantallas cortas (objetivo+experiencia → datos físicos → entrenamiento), con barra de progreso, y terminar mostrando el menú/rutina generados en vivo como primer momento de valor — antes de pedir login si es que el gate de auth llega a activarse antes del onboarding (hoy, según `initAuth()` en `auth.js`, si Supabase está configurado el login ocurre *antes* del onboarding; vale la pena decidir conscientemente ese orden, porque pedir cuenta antes de mostrar cualquier valor es fricción adicional).

### 1.3 El asistente IA es reactivo, nunca inicia conversación

Confirmé en `app.js` (`views.chat`) y `ai.js` que el chat es 100% "usuario pregunta → IA responde" — no hay ningún mecanismo que dispare un mensaje del asistente cuando detecta un patrón (racha rota, estancamiento de peso, pocos días de entrenamiento esta semana). Dado que `fetchUserContext()` en `ai.js` ya recolecta todo lo necesario (perfil, últimos entrenamientos, pesos, comidas), técnicamente ya tienes los datos para esto — falta el disparador proactivo. Sigue siendo, en mi opinión, la mejora de UX con mayor impacto en retención que podrías construir: un `gamiOnActivity`-style hook que, al detectar por ejemplo peso estancado 3 semanas o cero sesiones registradas en 5 días, muestre una tarjeta en el Dashboard invitando a hablar con el asistente sobre eso, en vez de esperar a que el usuario lo pregunte.

### 1.4 Fricciones concretas que encontré revisando el código

- **Marcar un set de ejercicio de peso corporal es más difícil de lo que debería.** En `attachSetRowListeners` (`app.js` ~línea 1347), el botón de check exige `if (!w || !r) { toast("Indica peso y reps antes de marcar"); return; }` — y `!w` es `true` cuando el peso es `0`. Pero varios ejercicios del banco (`data.js`) son explícitamente `equipo: "peso corporal"` (flexiones, dominadas, plancha, fondos, mountain climbers, hiperextensiones). Un usuario haciendo flexiones no tiene "peso" que registrar — hoy tiene que inventar un número falso (ej. escribir "1") solo para poder marcar el set como hecho. Vale la pena que el check no bloquee por peso cuando `ex.equipo === "peso corporal"`.
- **Un ejercicio "extra" añadido a mitad de sesión desaparece al salir de la vista.** `openExtraExercisePicker` inserta el bloque del ejercicio directamente en el DOM (`app.js` ~línea 1418) pero nunca lo guarda en `state` — no se añade a `day.exercises` de la rutina activa. Si el usuario marca un set de ese ejercicio extra y luego cambia de pestaña o recarga, el registro del set sigue existiendo en `state.setLog` (y en Supabase), pero el bloque visual del ejercicio ya no reaparece en "Sesión de hoy". El dato no se pierde, pero *parece* perdido — es un caso claro de UX que no coincide con el modelo mental del usuario.
- **Registrar peso desde el Dashboard no cuenta para el logro "En la balanza".** Hay dos caminos para registrar peso: el modal rápido del Dashboard (`openWeightModal`) y el formulario de la pestaña Progreso. Ambos guardan el peso correctamente, pero solo el segundo llama a `gamiOnWeightSave()` (compáralo tú mismo: el handler `#add-weight` en `views.progress` sí la llama, el handler `#wm-save` en `openWeightModal` no). Un usuario que solo usa el botón rápido del Dashboard nunca desbloqueará el logro de pesarse 5 veces, aunque cumpla la condición.
- **La fecha de Dieta se resetea silenciosamente al recargar.** `_dietDate` es una variable de módulo no persistida (documentado así intencionalmente en `CLAUDE.md`), así que si el usuario está revisando o registrando comida de un día pasado y la PWA se recarga (algo común en móvil al volver de segundo plano), vuelve a "hoy" sin aviso. Es una decisión consciente del desarrollo anterior, pero vale la pena evaluar si debería persistirse — especialmente porque nada en la UI avisa que ese estado no sobrevive un refresh.

---

## Parte 2 — Revisión de ingeniería / QA (bugs reales encontrados en el código)

Esto no es una lista genérica de "cosas que podrían pasar" — son bugs concretos que verifiqué leyendo la implementación.

### 2.1 Bugs de datos (los más importantes)

1. **"Borrar todo" no borra todo.** El botón de Perfil (`reset-data` en `views.profile`, `app.js` ~línea 2062) solo hace `localStorage.removeItem(STORAGE_KEY)`. No toca: (a) los datos en Supabase — `perfiles`, `registros_peso`, `entrenamientos`, `comidas` — no existe siquiera una función `cloudDeleteAll` en `cloud-sync.js`; y (b) la clave de gamificación `fitcol.gami.v1` (`gamification.js`), que vive en un `localStorage` completamente separado de `fitcol.state.v1`. Resultado: un usuario logueado que pulsa "Borrar TODOS los datos" (así dice el `confirm()`) ve la app vacía un momento, pero su racha/logros siguen intactos y, si vuelve a iniciar sesión, `cloudHydrate()` trae de vuelta todo su historial de la nube. Esto es engañoso para el usuario y, si alguna vez alguien pide borrar sus datos por privacidad, hoy la app no cumple esa promesa.
2. **El importador de Excel puede guardar libras como si fueran kilos.** `COLUMN_ALIASES.peso` en `excel-importer.js` incluye explícitamente `"lbs"` y `"lb"` como alias de columna de peso — pero el código nunca convierte: `peso_kg: peso` guarda el valor crudo de la celda directo en el campo `peso_kg`, sin importar si la columna se llamaba "kg" o "lbs". Si alguien importa un historial donde registró sus pesos en libras, esos números quedan guardados como si fueran kilos (más del doble del valor real), y de ahí se propagan a los gráficos de progreso por ejercicio.
3. **El resumen de progreso por ejercicio mezcla kg y lb sin convertir.** En `drawExerciseChart` (`app.js` ~línea 2246), el gráfico principal sí convierte correctamente (`s.unit === "lb" ? s.weight * 0.4536 : s.weight`), pero el resumen de texto debajo (`last.weight`, `first.weight`, `trend = last.weight - first.weight`) usa los valores **sin convertir**. Si un usuario registró su primera serie en libras y cambió a kilos más adelante (algo que la app permite libremente, set por set, vía el selector de unidad en cada fila), el "Cambio" mostrado puede ser un número sin sentido — por ejemplo, restar 61 kg menos 135 lb da "-74", que se muestra como si fuera una caída brutal de peso levantado, cuando en realidad el peso real subió.

### 2.2 Casos límite

- `generateBalancedMenu` (`app.js` ~línea 125) hace `sorted[Math.floor(Math.random() * Math.min(3, sorted.length))]` sin comprobar que la lista no esté vacía — hoy no se rompe porque todas las combinaciones slot×preferencia en `data.js` tienen contenido, pero es una función frágil: si en algún momento agregas una preferencia nueva o filtras la lista por algún criterio (alergias, por ejemplo) y una combinación queda vacía, esto lanza una excepción no controlada y rompe la vista Dieta completa.
- La importación de datos JSON (`import-file` en `views.profile`) hace `state = deepMerge(structuredClone(defaultState), obj)` con el único chequeo de que el archivo sea JSON válido — no valida que `obj.profile` sea un objeto, que `obj.dietLog` sea un arreglo, etc. Un archivo JSON válido pero con forma incorrecta puede dejar `state.profile` como un string o número, y la primera vista que intente leer `state.profile.weight` rompe toda la app hasta que el usuario borre el localStorage manualmente.
- El Service Worker (`sw.js`) precachea una lista fija de archivos que **no incluye `cloud-sync.js` ni `excel-importer.js`**. La estrategia "cache first" los cachea en cuanto se cargan exitosamente una vez online, pero en la primerísima sesión offline (antes de esa primera carga exitosa) esos dos scripts podrían fallar a cargar.

### 2.3 Rendimiento

- **Fotos guardadas como base64 dentro del `state` completo.** Cada foto de progreso (`state.photos`) y cada foto de comida analizada por IA (`entry.photo` en `dietLog`) se guarda como data URL directamente dentro del objeto `state`, que se serializa entero en cada `saveState()`. Esto tiene dos consecuencias: (1) `localStorage` tiene un límite típico de 5-10MB por origen, y varias docenas de fotos comprimidas pueden agotarlo — el único manejo de ese caso es un `toast("No se pudo guardar (storage lleno)")` genérico, sin explicar qué falló ni prevenir que el usuario siga "agregando" cosas que en realidad nunca se guardaron; (2) cada `saveState()` — que se llama en casi cualquier interacción, no solo al subir fotos — hace `JSON.stringify` de todo el estado, incluidas todas las fotos en base64, lo cual se vuelve notablemente más lento a medida que el historial de fotos crece. El propio `CLAUDE.md` ya señala esto como pendiente ("considerar persistir la foto en Supabase Storage") — coincido en que es la corrección de rendimiento con más impacto disponible ahora mismo.
- Ninguna vista implementa paginación o límite de renderizado sobre `dietLog`/`setLog` — hoy no es un problema real (Supabase limita las cargas a 500 filas en `cloudLoadEntrenamientos`/`cloudLoadComidas`), pero conforme un usuario acumule meses de historial, renderizar listas completas en el DOM en cada cambio de vista empezará a notarse, especialmente en gama baja de Android.

### 2.4 Seguridad y privacidad

- **El Worker de IA solo se protege por el header `Origin`, no por autenticación de usuario.** Según `CLAUDE.md`, el Worker valida `ALLOWED_ORIGIN` y aplica rate limit por `CF-Connecting-IP` — pero no exige ningún token de sesión de Supabase. La app tampoco lo envía (`callWorker` en `ai.js` no adjunta ningún JWT). El header `Origin` es una protección eficaz solo contra llamadas hechas *desde un navegador*; una llamada hecha con `curl` o cualquier cliente HTTP directo puede fijar el header `Origin` manualmente y llegar al Worker sin pasar por tu login en absoluto. Esto importa porque el costo de cada llamada lo pagas tú (tu API key de Anthropic detrás del Worker) — hoy nada impide que alguien fuera de tu app consuma ese endpoint si conoce la URL, más allá del rate limit por IP (que un atacante distribuido puede evadir). Vale la pena, cuando tengas tiempo, exigir que el Worker verifique un JWT de Supabase válido en cada request, no solo el Origin.
- **"Borrar todo" no cumple lo que promete** (ver 2.1 #1) — lo repito aquí porque además de ser un bug de datos, es un problema de privacidad: si algún usuario alguna vez te pide eliminar su información (y con datos de peso, medidas corporales y fotos, es información sensible), hoy la función que debería cumplir eso no borra la copia en la nube.
- Fotos corporales y de comida viajan y se guardan como base64 en columnas `TEXT` de Supabase (`foto_url`, y el `photo` embebido dentro del JSON de `comidas`/local `dietLog`). Estando protegidas por RLS (`auth.uid() = user_id`) esto no es una fuga de datos hoy, pero es más pesado y menos auditable que usar Supabase Storage con URLs firmadas — mismo punto que el de rendimiento, doble motivo para resolverlo.
- La documentación está desalineada con la implementación real, lo cual es en sí un riesgo (para ti como mantenedor, y para cualquier colaborador futuro): `README.md` todavía describe un modelo antiguo donde "la API key se guarda en el navegador" y "las llamadas se hacen directo desde el browser" — pero el código real (`ai.js`, confirmado también por el texto en pantalla dentro de `views.profile`: *"Asistente IA conectado vía servidor seguro. No necesitas configurar API key"*) usa el Worker proxy. Si algún colaborador nuevo (o tú mismo en unos meses) lee el README primero, va a buscar dónde configurar una API key que ya no hace falta. Vale la pena actualizar el README para que coincida con `CLAUDE.md`.

### 2.5 Usabilidad / seguridad de contenido — el vacío más importante para una app de salud

No encontré, en ningún punto del código (onboarding, perfil, contexto que se envía a la IA en `fetchUserContext`), ningún campo para lesiones, condiciones médicas o restricciones físicas. El generador de rutinas (`generateRoutine` en `app.js`) elige ejercicios únicamente por objetivo de entrenamiento y distribución de días — no tiene ningún mecanismo para excluir un ejercicio por una lesión reportada. Esto significa que, hoy, no hay forma estructurada de que la app evite sugerir, por ejemplo, sentadilla con barra a alguien con una lesión de rodilla — la única vía sería que el usuario lo mencione al asistente de IA en el chat, y aun así el asistente no tiene ninguna conexión con el generador de rutinas real (son sistemas completamente separados: uno genera la rutina determinísticamente, el otro solo conversa). Antes de cualquier lanzamiento público, yo priorizaría al menos un campo de "lesiones o zonas a evitar" en el perfil que filtre el banco de ejercicios en `generateRoutine`, aunque sea de forma simple (excluir por grupo muscular o por ejercicio específico).

---

## Parte 3 — Plan de lanzamiento de 90 días

A diferencia de un plan genérico de "construir y lanzar", Fitcol ya está construido y desplegado — el plan real es: terminar de configurar lo que falta, corregir los bugs de la Parte 2 que más dañarían la confianza de un usuario nuevo, y solo después escalar adquisición. Nota importante: **la base de código no tiene ninguna infraestructura de monetización** (no hay Stripe, RevenueCat, ni ningún gate de pago en ninguna vista) — el modelo de negocio de este plan parte de cero en ese frente, no de algo ya implementado a medias.

### Fase 1 — Terminar la base y arreglar lo crítico (días 1–20)

Tareas ya identificadas por el propio proyecto en `CLAUDE.md` ("Siguientes Pasos Exactos") que deberían ir primero, porque sin ellas ni siquiera puedes probar el flujo completo con un beta tester real:
- Ejecutar el SQL de las 4 tablas en Supabase, activar Email auth, configurar Google OAuth y las URLs de redirección.
- Añadir `cloudUpdateComida`/`cloudDeleteComida` (hoy editar o borrar una comida solo afecta `localStorage`, así que en un dispositivo distinto esa comida "editada" sigue viendo la versión vieja).
- Probar en un dispositivo Android e iPhone reales el scroll horizontal, el doble-toque en Entreno y el set-table en pantallas chicas (pendientes ya anotados en el proyecto).

De la Parte 2 de este documento, priorizaría corregir antes de cualquier beta externa: el bug de "Borrar todo" (2.1 #1 — un beta tester que pruebe esa función y luego vea sus datos "regresar" perderá confianza de inmediato), el bloqueo de ejercicios de peso corporal (1.4 — afecta a cualquiera que entrene calistenia, common en principiantes), y el problema de unidades lb/kg en el importador y en el resumen de progreso (2.1 #2 y #3 — silenciosamente corrompe datos de forma difícil de detectar después).

### Fase 2 — Beta cerrada real (días 20–45)

Con la base estable, reclutar 30–80 beta testers reales — no solo amigos. Dado que el producto ya está en español y con identidad 100% colombiana (comida, marca "Cóndor", "Vuela más alto cada día"), tiene sentido reclutar directamente en Colombia: grupos de Facebook/WhatsApp de gimnasios locales, subreddits o foros de fitness colombianos, y perfiles pequeños de fitness en Instagram/TikTok colombianos dispuestos a probar a cambio de acceso anticipado. Instrumenta desde el día 1 (aunque sea manualmente, revisando la tabla `entrenamientos`/`comidas`/`perfiles` en Supabase): cuántos completan el onboarding, cuántos registran al menos una comida y un entrenamiento en la primera semana, y cuántos usan el chat del asistente al menos una vez.

Entrevista a 10–15 beta testers a la semana 4, con foco específico en si el análisis de fotos de comida (una de las funciones más diferenciadoras y más propensas a error de la app) acierta con comida colombiana real — es la función más nueva y menos probada en producción del set de features.

### Fase 3 — Definir y construir monetización (días 40–60, en paralelo a la beta)

Como no existe ninguna infraestructura de pago hoy, esta fase es de construcción, no solo de decisión de precio. Dado el volumen de uso esperado en fase temprana y que el único costo variable real hoy es la API de Claude (Haiku, con prompt caching — costo bajísimo por conversación según tu propio `CLAUDE.md`), el modelo freemium más simple de implementar sería: registro de comidas/entrenamientos y rutina automática gratis siempre, y el asistente IA (chat + análisis de fotos, que son las dos funciones que generan costo variable) limitado a N interacciones/mes gratis y desbloqueado con una suscripción. Técnicamente esto requiere: un campo de plan/límites en `perfiles` (Supabase), un contador de uso mensual, y que el Worker rechace o degrade la respuesta si el usuario superó su cuota — construcción moderada, no trivial, pero acotada.

### Fase 4 — Beta abierta / soft launch en Colombia (días 55–75)

Ampliar el acceso sin restricción de invitación pero sin campaña de prensa aún. Canales a probar en paralelo con presupuesto acotado para comparar costo de adquisición: contenido orgánico en TikTok/Reels mostrando el análisis de foto de comida colombiana en vivo (es el momento más "wow" y más fácil de mostrar en 15 segundos de video), micro-influencers fitness colombianos con enlaces/códigos rastreables, y ASO en las tiendas con capturas que muestren el chat de IA y el análisis de fotos como diferenciador visual.

### Fase 5 — Lanzamiento público (días 75–90)

Escalar el canal que mejor costo de adquisición mostró en la fase 4, activar la suscripción construida en la Fase 3, y poner en marcha las tácticas de retención que dependen de trabajo de producto pendiente: notificaciones push (hoy no vi ningún código de push notifications en el proyecto — es infraestructura nueva a construir, no algo ya implementado) y, si hay tiempo, el asistente proactivo descrito en la Parte 1.3, que sigue siendo la palanca de retención de mayor apalancamiento porque los datos para activarla ya existen.

### Hitos sugeridos

| Día | Hito |
|---|---|
| 20 | Supabase completamente configurado, cloud-sync de comidas completo, bugs críticos de la Parte 2 corregidos |
| 45 | Beta cerrada completa con datos reales de retención D7/D30 desde Supabase |
| 60 | Sistema de límites/suscripción construido y probado con al menos un ciclo de cobro |
| 75 | Beta abierta con costo de adquisición medido por canal |
| 90 | Lanzamiento público; revisión de KPIs reales (no estimados) contra los objetivos de esta fase |

---

*Puedo profundizar en cualquier punto — por ejemplo, escribir el parche concreto para el bug de "Borrar todo" o el de las unidades lb/kg, diseñar el esquema de límites de uso del asistente, o revisar `styles.css`/el backend `fitcol-api` si me das acceso a esa carpeta también.*
