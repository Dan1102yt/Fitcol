// =====================================================
// ai.js — Cliente del Worker fitcol-api
// El frontend NO conoce la API key; toda llamada pasa por el proxy.
// =====================================================

const WORKER_URL = "https://fitcol-api.davidroa1102.workers.dev/chat";

// Compatibilidad: la app sigue consultando hasApiKey() en varios puntos.
// Como ahora la auth está en el Worker, siempre estamos "listos".
function hasApiKey() { return true; }

// -----------------------------------------------------
// Llamada al Worker con streaming SSE
// -----------------------------------------------------
async function callWorker({ message, image, onChunk } = {}) {
  const body = { message };
  if (image) body.image = image;

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { err = { error: `HTTP ${res.status}` }; }
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  if (!res.body) throw new Error("La respuesta no contiene stream.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const block of parts) {
      const dataLine = block.split("\n").find(l => l.startsWith("data: "));
      if (!dataLine) continue;
      const json = dataLine.slice(6).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json);
        if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          const chunk = parsed.delta.text;
          fullText += chunk;
          if (onChunk) onChunk(chunk, fullText);
        }
      } catch {
        // ignorar JSON parcial / no-data lines
      }
    }
  }
  return fullText;
}

// -----------------------------------------------------
// Construye el contexto del usuario para el chat
// Como el Worker es single-turn con system prompt fijo,
// inyectamos los datos del usuario dentro del propio mensaje.
// -----------------------------------------------------
function buildUserContext(state) {
  const p = state.profile;
  const n = calcNutrition(p);
  const sinceISO = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);

  const recentWeights = (state.weightLog || [])
    .filter(w => w.date >= sinceISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10);

  const recentSets = (state.setLog || []).filter(s => s.date >= sinceISO);
  const byExercise = {};
  recentSets.forEach(s => {
    if (!byExercise[s.exerciseName]) byExercise[s.exerciseName] = [];
    byExercise[s.exerciseName].push(s);
  });
  const exerciseLines = Object.entries(byExercise).map(([name, sets]) => {
    const sorted = sets.slice().sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    const maxW = Math.max(...sets.map(s => +s.weight || 0));
    return `- ${name}: ${sorted.length} series. Máx: ${maxW}${last.unit}. Última: ${last.weight}${last.unit} × ${last.reps} reps (${last.date}).`;
  });

  const dietByDay = {};
  (state.dietLog || []).filter(d => d.date >= sinceISO).forEach(d => {
    if (!dietByDay[d.date]) dietByDay[d.date] = { kcal: 0, p: 0, c: 0, f: 0 };
    dietByDay[d.date].kcal += d.kcal;
    dietByDay[d.date].p += d.p;
    dietByDay[d.date].c += d.c;
    dietByDay[d.date].f += d.f;
  });
  const dietLines = Object.entries(dietByDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5)
    .map(([date, t]) => `- ${date}: ${Math.round(t.kcal)} kcal, ${Math.round(t.p)}g P, ${Math.round(t.c)}g C, ${Math.round(t.f)}g G`);

  const workoutsByWeek = {};
  (state.workouts || []).filter(w => w.date >= sinceISO).forEach(w => {
    const d = new Date(w.date);
    const key = `${d.getFullYear()}-W${Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7)}`;
    workoutsByWeek[key] = (workoutsByWeek[key] || 0) + 1;
  });
  const weekLines = Object.entries(workoutsByWeek)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5)
    .map(([k, c]) => `- ${k}: ${c} sesiones`);

  return `Mis datos:
- Sexo ${p.sex}, ${p.age} años, ${p.height} cm, ${p.weight} kg → meta ${p.targetWeight} kg en ${p.weeks} sem
- Objetivo: ${({ bajar: "perder", subir: "ganar", mantener: "mantener" })[p.goal]} peso
- Actividad fuera del gym: ${p.activity}
- Meta diaria calculada: ${n.kcal} kcal · ${n.protein}g P · ${n.carbs}g C · ${n.fat}g G
- Entrenamiento: ${p.trainingDays} días/sem · objetivo ${p.trainingGoal} · distribución ${p.distribution}

Pesos registrados recientemente:
${recentWeights.length ? recentWeights.map(w => `- ${w.date}: ${w.weight} kg`).join("\n") : "(sin registros)"}

Series por ejercicio (últimos 60 días):
${exerciseLines.length ? exerciseLines.join("\n") : "(aún no registra series)"}

Sesiones por semana:
${weekLines.length ? weekLines.join("\n") : "(sin sesiones)"}

Últimos días de dieta:
${dietLines.length ? dietLines.join("\n") : "(sin comidas registradas)"}`;
}

// -----------------------------------------------------
// Chat con contexto + historial
// -----------------------------------------------------
async function sendChatMessage(userText, onChunk) {
  const context = buildUserContext(state);
  const history = (state.chat?.messages || []).slice(-8);
  const historyText = history.length
    ? "\n\nConversación previa:\n" + history.map(m => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`).join("\n")
    : "";

  const fullMessage = `${context}${historyText}\n\nPregunta actual del usuario: ${userText}`;
  return await callWorker({ message: fullMessage, onChunk });
}

// -----------------------------------------------------
// Análisis de foto de comida
// El Worker tiene system prompt general; pedimos JSON estricto en el mensaje.
// -----------------------------------------------------
async function analyzeFoodPhoto(dataUrl) {
  const message = `Analiza esta foto de comida (preferiblemente colombiana) y estima sus macros con la mayor precisión posible.

Si la foto NO contiene comida, devuelve EXCLUSIVAMENTE: {"error":"no_food"}

Si la foto SÍ contiene comida, devuelve EXCLUSIVAMENTE un JSON con esta forma exacta — sin markdown, sin explicaciones, sin texto adicional:
{
  "nombre": "nombre breve del plato",
  "descripcion": "alimentos visibles, 1 línea",
  "kcal": numero entero,
  "p": gramos de proteína (entero),
  "c": gramos de carbohidratos (entero),
  "f": gramos de grasa (entero)
}

Sé realista; estima porciones con referencias típicas (arepa media ~70g, taza de arroz cocido ~150g, presa de pollo ~120g, huevo ~50g, cucharada de aceite ~14g).`;

  const text = await callWorker({ message, image: dataUrl });
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La IA no devolvió un JSON parseable.");
  const json = JSON.parse(match[0]);
  if (json.error === "no_food") throw new Error("No detecté comida en la foto. Intenta otra imagen.");
  return {
    nombre: json.nombre || "Comida analizada",
    descripcion: json.descripcion || "",
    kcal: Math.max(0, Math.round(Number(json.kcal) || 0)),
    p: Math.max(0, Math.round(Number(json.p) || 0)),
    c: Math.max(0, Math.round(Number(json.c) || 0)),
    f: Math.max(0, Math.round(Number(json.f) || 0))
  };
}
