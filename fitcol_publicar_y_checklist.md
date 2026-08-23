# Fitcol — Cómo publicar los cambios + checklist de verificación

## 1. Cómo publicar (esto lo corres tú, en tu PC)

Yo dejé los archivos editados directamente en tu carpeta `C:\Users\Usuario\DAVIDCLAUDE\Fitcol`, pero no tengo terminal en tu máquina — el `git commit`/`push` que dispara el redeploy de GitHub Pages lo tienes que correr tú. Dos formas:

**Opción A — PowerShell a mano.** Abre PowerShell en esa carpeta y corre (con el ajuste de PATH que ya tenías anotado en tu `CLAUDE.md` para que `git` funcione en sesiones nuevas):

```powershell
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;" + $env:Path
cd C:\Users\Usuario\DAVIDCLAUDE\Fitcol
git add app.js cloud-sync.js gamification.js excel-importer.js ai.js food-search.js sw.js README.md
git status
git commit -F- <<'EOF'
Fase 1: fixes críticos de datos, lesiones/restricciones y sync de comidas

- "Borrar todo" ahora borra Supabase y gamificación, no solo localStorage
- Importador de Excel convierte lb a kg en vez de guardarlo crudo
- Ejercicios de peso corporal ya se pueden marcar sin inventar un peso
- Nuevo campo de lesiones/restricciones en Perfil, filtra la rutina y el contexto de la IA
- Editar/borrar una comida ya sincroniza con Supabase (antes solo local)
- Corregido insert duplicado al agregar comida desde el buscador de Open Food Facts
- README actualizado a la arquitectura real (Worker proxy, no API key de usuario)
- Service Worker precachea los 2 archivos que faltaban (offline más confiable)
- Importar un backup JSON inválido ya no rompe la app
- Piso de seguridad en el cálculo de calorías (mínimo 1200/1500 kcal)
EOF
git push
```

(Nota: si `git commit -F- <<'EOF' ... EOF` te da problemas en PowerShell, usa `git commit -m "Fase 1: fixes críticos"` en una sola línea — más corto pero funciona igual.)

**Opción B — pídeselo a Claude Code.** Abre una terminal en `C:\Users\Usuario\DAVIDCLAUDE\Fitcol`, corre `claude`, y dile algo como *"revisa los cambios con git diff, arma un commit descriptivo y haz push"*. Como el repo ya tiene tu `CLAUDE.md`, Claude Code va a tener todo el contexto que necesita.

Después del push, GitHub Pages tarda **1-2 minutos** en reconstruir (según tu propio `SETUP.md`). Espera ese tiempo antes de revisar en el celular.

## 2. Checklist para revisar en tu celular

Abre `https://dan1102yt.github.io/Fitcol/` en el navegador del celular (o la app instalada) con `Ctrl+Shift+R` / recarga forzada si ya la tenías abierta antes, para asegurarte de que no estás viendo una versión en caché.

**Ejercicios de peso corporal**
- [ ] Entrenamiento → Sesión de hoy → busca un ejercicio como Flexiones, Dominadas o Plancha frontal.
- [ ] Deja el campo de peso vacío, escribe las reps, toca el check (✓).
- [ ] Debe guardar el set sin pedirte un peso. Si sale "Indica peso y reps antes de marcar", algo no se publicó bien.

**Lesiones y restricciones**
- [ ] Perfil → busca la tarjeta "Lesiones y restricciones" → activa "Evitar" en un grupo (ej. Piernas) → Guardar cambios.
- [ ] Ve a Entrenamiento y confirma que ningún día de la rutina sugiere ejercicios de ese grupo.
- [ ] Vuelve a Perfil y desactívalo si era solo una prueba.

**Borrar todo (usa una cuenta de prueba, no la tuya real)**
- [ ] Inicia sesión, registra un peso o una comida.
- [ ] Perfil → Borrar todo → confirma. Debe avisarte que también borra la nube.
- [ ] Cierra sesión y vuelve a iniciar sesión con esa misma cuenta — los datos NO deben reaparecer.
- [ ] Revisa "Mis Logros" — la racha también debe estar en cero.

**Editar/borrar comida sincroniza con la nube**
- [ ] Dieta → Registro → edita o borra una comida ya guardada.
- [ ] Desde el navegador del celular entra a tu proyecto en supabase.com → Table Editor → tabla `comidas` → confirma que el cambio quedó ahí también (no solo en la app).

**Sin duplicados desde el buscador**
- [ ] Dieta → Registro → "Buscar alimento" → agrega uno.
- [ ] En Supabase → `comidas`, debe aparecer **una sola fila** para esa comida, no dos.

**Backup JSON inválido no rompe la app**
- [ ] Perfil → Importar datos → sube cualquier archivo que no sea un backup real de Fitcol (una nota de texto, por ejemplo).
- [ ] Debe salir un mensaje de error corto, y la app debe seguir funcionando normal — no una pantalla en blanco.

**Piso de calorías**
- [ ] Perfil → pon un peso meta muy bajo en pocas semanas (un objetivo poco realista a propósito).
- [ ] Debe aparecer un aviso en rojo bajo "Cálculos automáticos" explicando que se ajustó la meta por seguridad.

**Importador de Excel (si tienes un archivo de prueba a mano)**
- [ ] Entrenamiento → Mis rutinas → Importar historial Excel → sube un archivo con una columna de peso en libras (encabezado con "lb" o "lbs").
- [ ] El resumen final debe decir cuántas filas se convirtieron de libras a kilos.

Si algo de esta lista no se ve como se describe, probablemente el push no llegó a publicarse o GitHub Pages todavía no terminó de reconstruir — vuelve a intentar en un par de minutos antes de avisarme.

## 3. Lo que sigue pendiente de la Fase 1 (no es código, son pasos tuyos)

Esto no lo puedo hacer yo porque requiere tu cuenta/dashboard, no el código:
- Ejecutar el SQL de las 4 tablas en Supabase (si no lo has hecho ya).
- Activar el proveedor de Email en Supabase y configurar Site URL / Redirect URLs.
- Configurar Google OAuth (Google Cloud Console + Supabase).
- Probar en un Android e iPhone reales el scroll horizontal y el set-table en pantallas chicas.
