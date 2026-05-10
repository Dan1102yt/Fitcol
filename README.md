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
- Chat tipo WhatsApp contra Claude (Anthropic).
- Tiene contexto completo de tus datos: objetivo, peso, sesiones, sets registrados por ejercicio, dieta de los últimos días.
- Responde preguntas tipo *"¿cómo voy en press banca?"* con números reales o sobre alimentación general.
- API key del usuario (gratis en `console.anthropic.com`), guardada solo en el navegador.
- Análisis de fotos de comida con vision (`claude-sonnet-4-6`) — usa prompt caching.

### Generales
- Tema claro/oscuro con toggle.
- Responsive (sidebar en PC, bottom nav en móvil).
- Exportar/importar todo el estado en JSON.

## Cómo correr la app

Abre `index.html` directamente en el navegador. No necesita servidor.

## API key (opcional, para IA)

Las funciones de chat y análisis de foto requieren una API key de Anthropic:

1. Crea una cuenta en https://console.anthropic.com/
2. Genera una API key (`sk-ant-...`)
3. En la app: ve a **Perfil → Asistente IA · API key** y pégala
4. Listo

La key se guarda únicamente en `localStorage` de tu navegador. Las llamadas a la API se hacen directo desde el browser usando el header `anthropic-dangerous-direct-browser-access`.

## Stack

- HTML + CSS + JavaScript vanilla (sin frameworks)
- [Chart.js](https://www.chartjs.org/) por CDN para las gráficas
- API de Anthropic (Claude) para chat y análisis de fotos

## Estructura

```
Fitcol/
├── index.html      # Estructura principal + nav
├── styles.css      # Tema oscuro/claro, responsive
├── data.js         # Base de comidas colombianas + ejercicios + plantillas
├── ai.js           # Wrapper de Claude API + prompt de chat
├── app.js          # Estado, cálculos, todas las vistas
└── README.md
```
