# PROYECTO: Fitcol

App web fitness para usuarios colombianos (dieta + entrenamiento + progreso + asistente IA).
Repo raíz local: `C:\Users\VICTUS\CLAUDE` → contiene `/Fitcol` (frontend) y `/fitcol-api` (backend Worker).
GitHub: `Dan1102yt/Fitcol` y `Dan1102yt/fitcol-api`. Owner: David Roa (davidroa1102@gmail.com).

---

## 🎯 Objetivo Actual

SPA en español, tema oscuro/claro, PC + móvil. Funciones núcleo:
- **Dieta:** calcula calorías/macros (Mifflin-St Jeor + factor actividad + objetivo), genera menú diario con recetas colombianas que **suma a las metas**, registro de comidas estilo Fitia (plan / foto+IA / manual con repositorio de alimentos / Open Food Facts / comidas personales), comidas editables y agrupadas por slot (desayuno/almuerzo/snack/cena).
- **Entrenamiento:** rutinas auto por objetivo (hipertrofia/fuerza/resistencia/potencia) × distribución (Full Body, Upper/Lower, PPL, Bro Split), rutinas personalizadas, registro set por set (check + peso kg/lb + reps), importador de historial desde Excel.
- **Progreso:** peso semanal, medidas corporales, fotos (cámara o galería), gráficas (incl. progresión por ejercicio filtrable).
- **Asistente IA:** chat tipo WhatsApp que conoce los datos del propio usuario + responde dudas generales de nutrición/ejercicio.

---

## 🛠️ Arquitectura y Stack

**Frontend — `/Fitcol`** (HTML/CSS/JS vanilla, sin frameworks; hosting GitHub Pages → `https://dan1102yt.github.io/Fitcol/`)
- `index.html` — shell: `#auth-root` (login) + `#app-shell` (app). Carga módulos por CDN: Chart.js 4.4.0, SheetJS 0.18.5, `supabase-config.js` (type=module). Scripts clásicos en orden: `data.js, ai.js, app.js, cloud-sync.js, food-search.js, excel-importer.js, auth.js`.
- `app.js` (~2100 líneas) — núcleo. Estado en `localStorage` clave `fitcol.state.v1` (deep-merge con `defaultState`). Router `showView(name)` + objeto `views{}`. Cálculos nutricionales, generación de menú (`SLOT_FRACTIONS` 25/40/10/25%, escala porciones), generación de rutinas, registro de sets, gráficas (`drawWeightChart`, etc., `responsive:true, maintainAspectRatio:false`). Helpers: `normText`, `getFoodRepository`/`searchFoodRepository` (aplana `FOODS` de data.js + `state.customFoods`), `dietLogRowHtml`/`bindDietLogRowEvents`, `openEditLogger`, `openManualLogger` (con buscador del repositorio + multiplicador de porción), `openPhotoLogger` (con selector de slot visible), `openWeightModal`, `photoPickerHtml`/`bindPhotoPicker` (cámara `capture=environment` vs galería). **Dieta por fecha:** variable de módulo `let _dietDate` + `diaSel()` (no se persiste; cada recarga vuelve a hoy); la vista Dieta tiene un `<input type="date" id="diet-date">` + botón "Ir a hoy"; `views.diet`/`renderDietPlanTab`/`renderDietLogTab`/`logMeal` operan sobre `diaSel()` (no `todayISO()`); el Dashboard sigue mostrando siempre hoy. `modal(html)` es **apilable** (cada llamada añade su propio `.modal-overlay` y devuelve `{close, root:overlay}`; `close()` solo quita ese overlay) → un modal puede abrir otro encima sin destruirlo. Init: `initFitcolApp()` con guard `_appInitialized`, expuesto en `window`; lo dispara `auth.js`, no `DOMContentLoaded`.
- `data.js` — BD estática: `FOODS` (por slot × preferencia saludable/balanceado/chatarra, cada item `{name,kcal,p,c,f,ingredientes,preparacion}`), `EXERCISES` (por grupo muscular), `TRAINING_PARAMS`, `DISTRIBUTIONS`, `recommendDistribution(days)`, `recommendDays(objective)`.
- `ai.js` — cliente del Worker. `WORKER_URL`, `callWorker({message,image,contexto_usuario,onChunk})` (parsea SSE), `fetchUserContext()` (perfil + últimos 10 entrenamientos / 5 pesos / 10 comidas desde Supabase, fallback a `state`), `sendChatMessage()` (prepende últimos 6 mensajes del historial), `analyzeFoodPhoto(dataUrl)` (pide JSON estricto de macros). `hasApiKey()` siempre `true` (stub de compat).
- `auth.js` — `window.currentUser`. `renderLoginScreen()` (Google + email/password + toggle registro; banner si Supabase no configurado), `showAppUI()`, `updateUserBadge()`, `initAuth()` (si no configurado → app directa en localStorage; si hay sesión → hidrata; si no → login), `onAuthStateChange`. Espera evento `supabase-ready`.
- `cloud-sync.js` — `cloudAvailable()` = `!!(supabaseClient && currentUser)`. Funciones `cloudUpsertPerfil`, `cloudInsertRegistroPeso` (upsert onConflict user_id,fecha), `cloudInsertSet` (1 fila/set), `cloudBulkInsertEntrenamientos` (Excel), `cloudInsertComida`, `cloud*Load*`, `cloudHydrate()` (carga las 4 tablas → mapea a `state` → `saveState()` → re-render). Mapeos: objetivo `bajar/subir/mantener` ↔ `perder_peso/ganar_peso/mantener`; slot de comida = prefijo `[slot]` en `comidas.nombre`; unidad lb/kg en `entrenamientos.notas`.
- `food-search.js` — `buscarComida(query)` (Open Food Facts `world.openfoodfacts.org/cgi/search.pl` con `&lc=es`, fallback sin él), `macrosPorPorcion`, `openFoodSearch(slot)` (modal con búsqueda + tarjetas + porción + "Agregar").
- `excel-importer.js` — `normalize`, `COLUMN_ALIASES` (fecha/ejercicio/series/repeticiones/peso/notas), `mapHeaders`, `parseFecha`/`parseNumber`, `openExcelImporter()` (drag&drop, SheetJS, requiere columnas fecha+ejercicio, inserción por chunks de 200, fallback a `state.setLog` si no hay nube).
- `supabase-config.js` — constantes `SUPABASE_URL` / `SUPABASE_ANON_KEY` (ya rellenadas: proyecto `vooelhxkmidmbqsehmax`). `isConfigured` valida formato. Importa `createClient` vía `await import("https://esm.sh/@supabase/supabase-js@2")` dentro de try/catch (si falla → `supabaseConfigured=false`). Siempre dispara `window.dispatchEvent(new Event("supabase-ready"))`.
- `styles.css` — variables de tema (dark + `[data-theme="light"]`), layout `.app` (grid 240px sidebar + content), `.bottom-nav` (móvil), modales, etc. Fixes responsive al final: `html,body{overflow-x:hidden}`, `.content{min-width:0}`, `.chart-container{height:280px}` (220px en móvil), `touch-action:manipulation` en nav, media query `max-width:480px` colapsa grids a columna.

**Backend — `/fitcol-api`** (Cloudflare Worker, TypeScript estricto sin `any`; desplegado en `https://fitcol-api.davidroa1102.workers.dev`)
- `src/index.ts` — proxy seguro a Anthropic. `interface Env { ANTHROPIC_API_KEY; RATE_LIMITER }`. Constantes: `ALLOWED_ORIGIN="https://dan1102yt.github.io"`, `MODEL="claude-haiku-4-5"`, `MAX_TOKENS=1000`, `MAX_MESSAGE_CHARS=4000`, `MAX_IMAGE_CHARS=6_700_000`, `MAX_CONTEXT_CHARS=20_000`, `SYSTEM_PROMPT` (asistente fitness colombiano, español). Capas: (1) CORS — OPTIONS→204 si origin ok / 403 si no; 403 si origin≠allowed; 404 si no es POST /chat. (2) rate limit por `CF-Connecting-IP` (429). (3) validación body (message string no vacío ≤4000; contexto_usuario serializable ≤20k; image `data:image/` ≤~5MB). (4) construye body Anthropic: parsea image data URL, `system` = [SYSTEM_PROMPT con `cache_control:ephemeral`] + [si hay contexto: 2º bloque "Contexto del usuario: ..."], `stream:true`. (5) passthrough del stream SSE (502 si Anthropic≠200). (6) catch global → 500.
- `wrangler.toml` (config + binding `RATE_LIMITER` unsafe ratelimit), `package.json` (wrangler ^3, scripts `dev`/`deploy`), `tsconfig.json`, `.dev.vars` (`ANTHROPIC_API_KEY=` solo dev, gitignored), `README.md`. Secret de producción: `wrangler secret put ANTHROPIC_API_KEY` (ya hecho).

**Base de datos / Auth — Supabase** (proyecto `vooelhxkmidmbqsehmax`)
- Auth: Google OAuth + email/password. 4 tablas con RLS (`auth.uid()` = dueño): `perfiles` (id=auth.users), `registros_peso` (UNIQUE user_id,fecha; peso + medidas opcionales + foto_url), `entrenamientos` (1 fila por set: fecha/ejercicio/series/repeticiones/peso_kg/notas), `comidas` (fecha/nombre/calorias/proteina/carbohidratos/grasas/porcion_gramos). SQL completo en `Fitcol/SETUP.md`.
- **Modelo híbrido:** lo crítico (perfil, peso, entrenamientos, comidas) → Supabase; el resto del estado → `localStorage`. Doble escritura al guardar. Al iniciar sesión, `cloudHydrate()` sobrescribe el estado local con la nube. Si Supabase no está configurado o el CDN falla → app funciona 100% en localStorage sin login.

**Despliegue:** GitHub Pages (frontend, auto-redeploy ~1-2 min al hacer push), Cloudflare Workers (`wrangler deploy`), Supabase free tier. Único costo: Claude API (Haiku, fracciones de centavo por chat, con prompt caching).

---

## ✅ Estado de Implementación

- [x] Cálculo calorías/macros (Mifflin-St Jeor + actividad + objetivo + plazo)
- [x] Generación de menú diario que suma a las metas (recetas colombianas escaladas)
- [x] "Arma tu propia dieta" (comidas personales) y "arma tu rutina" (rutinas personalizadas)
- [x] Registro de comidas: plan / foto+IA / manual con repositorio de alimentos / Open Food Facts / comidas personales
- [x] Comidas registradas editables (`openEditLogger`) y agrupadas por slot bajo cada comida del plan
- [x] **Dieta por fecha**: selector de día en la vista Dieta; cada día tiene su propio registro; "Ir a hoy" vuelve al día actual (slots vacíos / plan sugerido)
- [x] **Foto reemplaza el menú recomendado**: si hay una foto subida para un slot, la card de ese slot muestra la foto + lo que detectó la IA en vez de la receta sugerida; la comida es editable (✎) como en Fitia; el `openPhotoLogger` permite elegir el slot
- [x] Prompt de análisis de imágenes de comida mejorado en el Worker (desglose por componente + referencias de porción colombianas)
- [x] **Modales apilables** (`modal()` añade overlays en vez de reemplazar) → corregido el bug de "+ Añadir ejercicio" que cerraba el editor de rutina y volvía al menú
- [x] Fixes responsive en Entreno (set-table: columnas `minmax(0,...)`, inputs `min-width:0`, unit-select angosto) y en formularios (`.field input{width:100%;min-width:0}`); fila de "Peso semanal" en Progreso con `flex-wrap`
- [x] Registro de entrenamiento set por set (check + peso kg/lb + reps), sesión finalizable, ejercicios extra
- [x] Importador de historial desde Excel/CSV (autodetección de columnas, inserción por chunks)
- [x] Dashboard con gráficas (peso, macros consumidos vs meta, entrenamientos, progresión por ejercicio filtrable, comidas de hoy)
- [x] Progreso: peso semanal, medidas corporales, fotos (cámara/galería)
- [x] Modal limpio de "+ Registrar peso" (fecha + peso obligatorios, medidas y foto opcionales)
- [x] Chat IA con contexto del usuario (perfil + métricas recientes) + historial
- [x] Análisis de foto de comida por IA (devuelve macros estimados)
- [x] Worker proxy desplegado (oculta API key, CORS, rate limit, validación, streaming SSE, contexto_usuario)
- [x] Auth con login gate (Google OAuth + email/password) + badge de usuario + logout
- [x] Cloud-sync de las 4 tablas + `cloudHydrate()` al login + fallback localStorage
- [x] Fixes responsive móvil (sin scroll horizontal / sin necesidad de zoom-out)
- [x] `SETUP.md` (guía Supabase) y `README.md` escritos
- [x] `supabase-config.js` con URL + anon key del proyecto, commiteado
- [ ] **Ejecutar el SQL de las 4 tablas en Supabase** (pendiente del usuario)
- [ ] **Activar Email auth + configurar Site URL / Redirect URLs en Supabase** (pendiente del usuario)
- [ ] **Configurar Google OAuth** (credenciales en Google Cloud Console → pegar en Supabase) (pendiente del usuario)
- [ ] Update/delete en la nube para `comidas` (hoy editar/borrar una comida solo toca localStorage)
- [ ] Tests / CI
- [ ] Verificar en dispositivo real que los fixes de zoom y doble-toque quedaron bien

---

## ⚠️ Decisiones Críticas y Notas

**No cambiar sin motivo:**
- Idioma **español**, tema oscuro + acento (toggle a claro), localStorage como base + Supabase encima.
- El menú diario **debe sumar** a las calorías/macros calculados (no romper `SLOT_FRACTIONS` ni el escalado de porciones, clamp 0.5–2.5x).
- El **frontend nunca tiene la API key de Anthropic** — todo pasa por el Worker. `ALLOWED_ORIGIN` en `src/index.ts` **debe coincidir** con el dominio de GitHub Pages (`https://dan1102yt.github.io`); si cambia el dominio, actualizar y redeploy.
- El Worker es **single-turn con system prompt fijo**: el contexto del usuario va por el campo `contexto_usuario` (lo inyecta el Worker como 2º bloque de system); el historial del chat (últimos 6 msgs) se prepende dentro de `message`.
- TypeScript del Worker es **estricto, sin `any`**.
- `supabase-config.js` importa el SDK con `await import()` dentro de try/catch y **siempre** dispara `supabase-ready` — un fallo del CDN no debe colgar la app.
- Mapeos de `cloud-sync.js` (no romper): objetivo `bajar/subir/mantener` ↔ `perder_peso/ganar_peso/mantener`; slot de comida = prefijo `[slot]` en `comidas.nombre`; unidad lb/kg en `entrenamientos.notas`; sets = 1 fila por set en `entrenamientos`.
- `initFitcolApp()` lo dispara `auth.js` (no `DOMContentLoaded`); tiene guard `_appInitialized`.
- La anon key de Supabase **es segura de publicar** (la seguridad real son las políticas RLS).
- **Dieta es por fecha**: `logMeal()` usa `diaSel()` (la fecha seleccionada en la vista Dieta), NO `todayISO()`. `_dietDate` es una variable de módulo, **no se persiste** (recargar vuelve a hoy). El Dashboard siempre usa `todayISO()`/`dailyTotals()` sin argumento.
- **`modal()` es apilable**: cada llamada hace `appendChild` de un nuevo `.modal-overlay` y `m.close()`/backdrop solo quita ESE overlay. No reintroducir `root.innerHTML = "..."` en `modal()` (rompería los modales anidados como editor de rutina → elegir ejercicio).
- Entradas de comida con `source:"photo"` llevan también un campo `descripcion` (lo que detectó la IA) y `photo` (data URL) en `state.dietLog`.
- **No tocar los selectores `.set-*` pensando en la dieta** y viceversa: `.set-table/.set-row/.set-weight/.set-check` son solo de Entreno; `.field*` es compartido (dieta, perfil, onboarding, modales).

**Dependencias clave:** Chart.js 4.4.0, SheetJS 0.18.5, `@supabase/supabase-js@2` (esm.sh) — todas por CDN. `wrangler ^3` en el Worker. Open Food Facts y la API de Anthropic son servicios externos sin SDK.

**Entorno Windows (advertencias técnicas):**
- PowerShell ExecutionPolicy bloquea `npm.ps1`/`npx.ps1` → usar `& "C:\Program Files\nodejs\npm.cmd"` y `npx.cmd`.
- `git` y `gh` no están en el PATH de sesiones nuevas → prependear `$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;" + $env:Path` en cada comando PowerShell.
- `git commit -m` con here-string de PowerShell se rompe → escribir el mensaje a un archivo y `git commit -F archivo` (o usar comillas simples en una línea).
- `git push` escribe a stderr y PowerShell lo reporta como `NativeCommandError` aunque haya tenido éxito — no es error real.
- Node v24.x en `C:\Program Files\nodejs`; wrangler ya autenticado (`davidroa1102@gmail.com`).
- Las herramientas Write/Edit requieren haber hecho Read del archivo antes en la sesión.

---

## 🚀 Siguientes Pasos Exactos

1. **(Usuario)** En Supabase (`vooelhxkmidmbqsehmax`): ejecutar el bloque SQL de `Fitcol/SETUP.md` (4 tablas + RLS + índices), activar **Email** provider (desactivar "Confirm email" mientras prueba), y en URL Configuration poner Site URL = `https://dan1102yt.github.io/Fitcol/` + añadirlo a Redirect URLs. Verificar que la app pide login y que el onboarding crea fila en `perfiles`.
2. **(Usuario)** Configurar **Google OAuth**: crear OAuth Client ID (tipo Web) en Google Cloud Console con origin `https://dan1102yt.github.io` y redirect URI `https://vooelhxkmidmbqsehmax.supabase.co/auth/v1/callback`; pegar Client ID + Secret en Supabase → Authentication → Providers → Google → habilitar.
3. Añadir **update/delete en la nube para `comidas`** en `cloud-sync.js` (`cloudUpdateComida`, `cloudDeleteComida`) y llamarlas desde `openEditLogger`/`openPhotoLogger` (al editar) y el handler `.diet-del` en `app.js` — hoy editar/borrar comidas y la foto solo afectan localStorage. Idealmente que `cloudInsertComida` también mande/recupere `fecha` correcta (ahora `logMeal` ya guarda `date: diaSel()`).
4. **Probar en móvil real**: (a) fixes de scroll horizontal / zoom-out; (b) el bug del doble-toque en "Entreno"; (c) que el editor de rutina ya no se cierra al añadir ejercicio; (d) set-table sin desbordes en pantallas chicas. Ajustar `styles.css` si algo sigue desbordando.
5. Considerar persistir la foto de comida en **Supabase Storage** (hoy se guarda el data URL completo, que puede ser pesado para la tabla `comidas`) o no subirla a la nube. También: el "menú recomendado" del Plan es el mismo para cualquier fecha (`ensureDailyMenu` solo para hoy) — evaluar si debe ser por día.
