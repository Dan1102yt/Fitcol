// =====================================================
// ai.js — Anthropic Claude API integration
// Browser-direct via x-api-key + anthropic-dangerous-direct-browser-access
// =====================================================

const AI_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

function getApiKey() {
  return (state && state.apiKey) || "";
}

function hasApiKey() {
  const k = getApiKey();
  return typeof k === "string" && k.startsWith("sk-ant-");
}

async function callClaude({ system, messages, maxTokens = 1024, model = AI_MODEL }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error("Falta API key de Anthropic. Agrégala en Perfil → Asistente IA.");
    err.code = "NO_API_KEY";
    throw err;
  }

  // Cache the system prompt (often static across calls in a conversation).
  let sysBlocks;
  if (typeof system === "string") {
    sysBlocks = [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];
  } else if (Array.isArray(system)) {
    sysBlocks = system;
  }

  const body = {
    model,
    max_tokens: maxTokens,
    messages
  };
  if (sysBlocks) body.system = sysBlocks;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    let msg = `Error ${res.status}`;
    try { msg = JSON.parse(t).error?.message || msg; } catch {}
    throw new Error(msg);
  }
  return await res.json();
}

function extractText(resp) {
  return (resp.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
}

// =====================================================
// Photo analysis — comida colombiana
// Returns { nombre, kcal, p, c, f, descripcion }
// =====================================================
async function analyzeFoodPhoto(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const mediaType = (dataUrl.match(/data:(.*?);/) || [])[1] || "image/jpeg";

  const sys = `Eres un nutricionista experto en comida latinoamericana, especialmente colombiana. Tu trabajo es analizar fotos de comida y estimar sus macronutrientes con la mayor precisión posible.

Cuando analices una foto:
1. Identifica todos los alimentos visibles en el plato.
2. Estima la porción típica con base en el tamaño relativo (referencias: arepa media ~70g, taza de arroz ~150g cocido, presa de pollo ~120g, etc.).
3. Suma kcal y macros del conjunto. Sé realista; no subestimes calorías.
4. Si la foto NO contiene comida, devuelve un objeto con "error": "no_food".

Responde SIEMPRE solo con un JSON válido. No incluyas texto fuera del JSON, ni markdown, ni explicaciones.`;

  const userText = `Analiza esta foto de comida y devuelve ESTRICTAMENTE este JSON:
{
  "nombre": "nombre breve del plato",
  "descripcion": "descripción de los alimentos visibles, 1 línea",
  "kcal": número entero,
  "p": gramos de proteína (entero),
  "c": gramos de carbohidratos (entero),
  "f": gramos de grasa (entero)
}`;

  const resp = await callClaude({
    system: sys,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: userText }
      ]
    }],
    maxTokens: 400
  });

  const text = extractText(resp);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No se pudo interpretar la respuesta de la IA.");
  const json = JSON.parse(match[0]);
  if (json.error === "no_food") throw new Error("No detecté comida en la foto. Intenta con otra imagen.");
  return {
    nombre: json.nombre || "Comida analizada",
    descripcion: json.descripcion || "",
    kcal: Math.max(0, Math.round(Number(json.kcal) || 0)),
    p: Math.max(0, Math.round(Number(json.p) || 0)),
    c: Math.max(0, Math.round(Number(json.c) || 0)),
    f: Math.max(0, Math.round(Number(json.f) || 0))
  };
}

// =====================================================
// Chat con contexto del usuario
// =====================================================
function buildChatSystemPrompt(state) {
  const p = state.profile;
  const n = calcNutrition(p);

  // Resumen de últimos 60 días
  const since = new Date(Date.now() - 60 * 86400000);
  const sinceISO = since.toISOString().slice(0, 10);

  const recentWeights = (state.weightLog || [])
    .filter(w => w.date >= sinceISO)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(-12);

  const recentSets = (state.setLog || []).filter(s => s.date >= sinceISO);
  // Agrupar por ejercicio
  const exerciseSummary = {};
  recentSets.forEach(s => {
    if (!exerciseSummary[s.exerciseName]) exerciseSummary[s.exerciseName] = [];
    exerciseSummary[s.exerciseName].push(s);
  });
  const exerciseLines = Object.entries(exerciseSummary).map(([name, sets]) => {
    const sorted = sets.slice().sort((a,b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const maxWeight = Math.max(...sets.map(s => +s.weight || 0));
    const unit = last.unit || "kg";
    return `- ${name}: ${sorted.length} series registradas (${first.date} → ${last.date}). Máx: ${maxWeight}${unit}. Última: ${last.weight}${unit} x ${last.reps} reps.`;
  });

  const recentDiet = (state.dietLog || []).filter(d => d.date >= sinceISO);
  const last7DietByDay = {};
  recentDiet.forEach(d => {
    if (!last7DietByDay[d.date]) last7DietByDay[d.date] = { kcal: 0, p: 0, c: 0, f: 0, count: 0 };
    last7DietByDay[d.date].kcal += d.kcal;
    last7DietByDay[d.date].p += d.p;
    last7DietByDay[d.date].c += d.c;
    last7DietByDay[d.date].f += d.f;
    last7DietByDay[d.date].count++;
  });
  const dietLines = Object.entries(last7DietByDay)
    .sort((a,b) => b[0].localeCompare(a[0]))
    .slice(0, 7)
    .map(([date, t]) => `- ${date}: ${Math.round(t.kcal)} kcal, ${Math.round(t.p)}g P, ${Math.round(t.c)}g C, ${Math.round(t.f)}g G (${t.count} comidas)`);

  const workouts = (state.workouts || []).filter(w => w.date >= sinceISO);
  const sessionsByWeek = {};
  workouts.forEach(w => {
    const key = isoWeekKey(new Date(w.date));
    sessionsByWeek[key] = (sessionsByWeek[key] || 0) + 1;
  });
  const weekLines = Object.entries(sessionsByWeek)
    .sort((a,b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([k, c]) => `- Semana ${k}: ${c} sesiones`);

  const weightLines = recentWeights.map(w => `- ${w.date}: ${w.weight} kg`);

  return `Eres el asistente personal de Fitcol, una app fitness orientada a Colombia. El usuario te habla en español. Sé directo, motivador y conciso. Usa los datos del usuario para responder preguntas específicas sobre su progreso. Cuando no tengas datos suficientes, dilo y sugiere qué registrar para que en el futuro puedas dar mejores respuestas.

Datos del usuario:
- Nombre: ${p.name || "(sin nombre)"}
- Sexo: ${p.sex} · Edad: ${p.age} años
- Estatura: ${p.height} cm · Peso actual: ${p.weight} kg · Peso objetivo: ${p.targetWeight} kg en ${p.weeks} semanas
- Objetivo: ${({bajar:"perder peso", subir:"ganar peso", mantener:"mantener peso"})[p.goal]}
- Actividad: ${p.activity}
- Calorías diarias objetivo: ${n.kcal} kcal · Proteína: ${n.protein}g · Carbos: ${n.carbs}g · Grasa: ${n.fat}g
- BMR: ${n.bmr} kcal · TDEE: ${n.tdee} kcal
- Entrenamiento: ${p.trainingDays} días/semana, objetivo ${p.trainingGoal}, distribución ${p.distribution}

Registro reciente de peso (últimos 60 días):
${weightLines.length ? weightLines.join("\n") : "(sin registros recientes)"}

Sesiones por semana (últimas):
${weekLines.length ? weekLines.join("\n") : "(sin sesiones registradas)"}

Resumen por ejercicio (series registradas en últimos 60 días):
${exerciseLines.length ? exerciseLines.join("\n") : "(sin series registradas)"}

Últimos 7 días de dieta:
${dietLines.length ? dietLines.join("\n") : "(sin comidas registradas)"}

Reglas de respuesta:
1. Responde como un coach amigable, sin rodeos. Sin emojis salvo que el usuario los use primero.
2. Si la pregunta es sobre progreso (ejemplo: "¿cómo voy en press banca?"), busca en los datos exactamente ese ejercicio (incluye variaciones como "press banca", "press inclinado") y responde con números: peso máximo, evolución, frecuencia.
3. Si te piden recomendaciones de comida o ejercicio, ten en cuenta el objetivo del usuario y la cocina colombiana cuando aplique.
4. Si no hay datos para responder, dilo y propone qué registrar.
5. Sé breve (máximo 6-8 líneas) salvo que pidan explicación detallada.`;
}

function isoWeekKey(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + (firstThursday.getUTCDay() + 6) % 7) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function sendChatMessage(userText) {
  const sys = buildChatSystemPrompt(state);
  // Mantenemos el historial pero recortamos a 16 mensajes para evitar coste creciente.
  const history = (state.chat?.messages || []).slice(-16).map(m => ({ role: m.role, content: m.content }));
  const messages = [...history, { role: "user", content: userText }];
  const resp = await callClaude({ system: sys, messages, maxTokens: 800 });
  const reply = extractText(resp);
  return reply;
}
