// =====================================================
// ai.js — Cliente del Worker fitcol-api
// El frontend NO conoce la API key; toda llamada pasa por el proxy.
// =====================================================

const WORKER_URL = "https://fitcol-api.davidroa1102.workers.dev/chat";

function hasApiKey() { return true; }

// -----------------------------------------------------
// callWorker — POST a /chat con streaming SSE
// Body: { message, image?, contexto_usuario? }
// -----------------------------------------------------
async function callWorker({ message, image, contexto_usuario, onChunk } = {}) {
  const body = { message };
  if (image) body.image = image;
  if (contexto_usuario) body.contexto_usuario = contexto_usuario;

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
      } catch { /* ignorar JSON parcial */ }
    }
  }
  return fullText;
}

// -----------------------------------------------------
// Recolecta contexto desde Supabase (si hay sesión) o de
// localStorage (state) si no.
// -----------------------------------------------------
async function fetchUserContext() {
  // Datos básicos del perfil + cálculos
  const p = state.profile;
  const n = calcNutrition(p);
  const perfil = {
    nombre: p.name || null,
    edad: p.age, sexo: p.sex,
    altura_cm: p.height, peso_kg: p.weight, peso_meta_kg: p.targetWeight, plazo_semanas: p.weeks,
    objetivo: p.goal, actividad: p.activity,
    meta_diaria: { kcal: n.kcal, proteina: n.protein, carbos: n.carbs, grasa: n.fat },
    entrenamiento: { dias_semana: p.trainingDays, objetivo: p.trainingGoal, distribucion: p.distribution }
  };

  let entrenamientos = [];
  let pesos = [];
  let comidas = [];

  if (typeof cloudAvailable === "function" && cloudAvailable()) {
    try {
      const [entr, pes, com] = await Promise.all([
        window.supabaseClient.from("entrenamientos").select("fecha,ejercicio,series,repeticiones,peso_kg,notas").order("fecha", { ascending: false }).limit(10),
        window.supabaseClient.from("registros_peso").select("fecha,peso,porcentaje_grasa,pecho,cintura,cadera,bicep").order("fecha", { ascending: false }).limit(5),
        window.supabaseClient.from("comidas").select("fecha,nombre,calorias,proteina,carbohidratos,grasas").order("fecha", { ascending: false }).limit(10)
      ]);
      entrenamientos = entr.data || [];
      pesos = pes.data || [];
      comidas = com.data || [];
    } catch (e) { console.warn("fetchUserContext cloud:", e); }
  }

  // Fallback / complemento desde state local si faltan datos cloud
  if (!entrenamientos.length && state.setLog?.length) {
    entrenamientos = state.setLog.slice(-10).reverse().map(s => ({
      fecha: s.date, ejercicio: s.exerciseName, series: 1,
      repeticiones: s.reps, peso_kg: s.unit === "lb" ? Math.round(s.weight * 0.4536 * 10) / 10 : s.weight,
      notas: s.unit === "lb" ? `original: ${s.weight} lb` : null
    }));
  }
  if (!pesos.length && state.weightLog?.length) {
    pesos = state.weightLog.slice(-5).reverse().map(w => ({ fecha: w.date, peso: w.weight }));
  }
  if (!comidas.length && state.dietLog?.length) {
    comidas = state.dietLog.slice(-10).reverse().map(d => ({
      fecha: d.date, nombre: `[${d.slot}] ${d.name}`,
      calorias: d.kcal, proteina: d.p, carbohidratos: d.c, grasas: d.f
    }));
  }

  return { perfil, entrenamientos, pesos, comidas };
}

// -----------------------------------------------------
// Chat con contexto de usuario + historial
// -----------------------------------------------------
async function sendChatMessage(userText, onChunk) {
  const contexto_usuario = await fetchUserContext();
  const history = (state.chat?.messages || []).slice(-6);
  const historyText = history.length
    ? "\n\nConversación previa:\n" + history.map(m => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`).join("\n") + "\n"
    : "";
  const message = `${historyText}\nPregunta actual: ${userText}`;
  return await callWorker({ message, contexto_usuario, onChunk });
}

// -----------------------------------------------------
// Análisis de foto de comida
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
