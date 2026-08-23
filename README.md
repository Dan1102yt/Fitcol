# Fitcol

App web fitness con foco en cocina colombiana, planificación de dieta y entrenamiento, y un asistente IA personal.

Funciona offline en PC y móvil — un solo `index.html`, sin build step. Los datos se guardan en `localStorage`.

## Funcionalidades

### Dashboard
- Peso actual vs meta, calorías y proteína consumidas hoy, sesiones de la semana.
- Gráficas: progreso de peso, macros consumidos vs meta, sesiones por semana.
- Filtro por ejercicio: ve la evolución del peso máximo y reps de cualquier ejercicio que registres.

### Dieta
- Cálculos automáticos de BMR, TDEE, calorías y macros (Mifflin-St Jeor + factor de actividad).
- Menú diario que **suma** la meta de calorías: cada comida (desayuno, almuerzo, snack, cena) viene con porción ajustada.
- Tres preferencias: saludable / balanceado / chatarra. Recetas con ingredientes y preparación.
- **Construye tu propia comida** (CRUD de comidas personales).
- **Registro de comidas** estilo Fitia: marca lo que comiste o sube una foto y la IA estima kcal y macros.
- Total diario consumido vs meta, con barras visuales.

### Entrenamiento
- Genera rutina según objetivo (hipertrofia, fuerza, resistencia, potencia) y distribución (Full Body, Upper/Lower, PPL, Bro Split).
- Sets, reps y descanso recomendados según el objetivo.
- **Sesión de hoy**: registra cada set con peso (kg/lb) y reps reales. Botón de check por set.
- **Construye tu propia rutina** (días, ejercicios, series y reps).
- Banco de ejercicios incluido + ejercicios personales.

### Progreso
- Registro semanal de peso con gráfica.
- 8 medidas corporales (pecho, cintura, cadera, brazos, muslos, cuello).
- Subida de fotos comprimidas (almacenadas localmente).

### Asistente IA
- Chat tipo WhatsApp contra Claude (Anthropic), a través de un proxy propio (Cloudflare Worker) que oculta la API key — no necesitas configurar nada de tu parte.
- Tiene contexto completo de tus datos: objetivo, peso, sesiones, sets registrados por ejercicio, dieta de los últimos días, y tus lesiones/restricciones si las configuraste en Perfil.
- Responde preguntas tipo *"¿cómo voy en press banca?"* con números reales o sobre alimentación general.
- Análisis de fotos de comida con vision — pasa por el mismo Worker.

### Generales
- Tema claro/oscuro con toggle.
- Responsive (sidebar en PC, bottom nav en móvil).
- Exportar/importar todo el estado en JSON.

## Cómo correr la app

Abre `index.html` directamente en el navegador. No necesita servidor.

## Cuentas y auth

La app funciona sin cuenta (todo en `localStorage`) si Supabase no está configurado. Con Supabase configurado (ver `SETUP.md`), pide login (Google o email/password) y sincroniza perfil, pesos, entrenamientos y comidas en la nube — así puedes entrar desde el celular y el computador y ver lo mismo.

## Stack

- HTML + CSS + JavaScript vanilla (sin frameworks, sin build step)
- [Chart.js](https://www.chartjs.org/) y [SheetJS](https://sheetjs.com/) por CDN
- Supabase (auth + base de datos con Row Level Security)
- Cloudflare Worker como proxy seguro a la API de Anthropic (Claude) — la API key nunca toca el navegador
- Service Worker + manifest para funcionar como PWA instalable, con modo offline básico

## Estructura

```
Fitcol/
├── index.html          # Estructura principal + nav
├── styles.css          # Tema oscuro/claro, responsive
├── manifest.json        # Metadata PWA
├── sw.js                # Service Worker (cache/offline)
├── install-prompt.js    # Banner de "instalar como app"
├── data.js               # Base de comidas colombianas + ejercicios + plantillas
├── ai.js                 # Cliente del Worker (chat + análisis de fotos)
├── app.js                # Estado, cálculos, todas las vistas
├── auth.js               # Login/registro + sesión Supabase
├── cloud-sync.js          # Sincronización con las 4 tablas de Supabase
├── food-search.js         # Buscador Open Food Facts
├── excel-importer.js      # Importador de historial de entrenamientos
├── gamification.js        # Racha, niveles y logros
├── supabase-config.js     # Credenciales e inicialización de Supabase
├── SETUP.md               # Guía de configuración (Supabase, Worker, hosting)
└── README.md
```
