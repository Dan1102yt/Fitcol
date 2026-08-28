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
    entrenamiento: { dias_semana: p.trainingDays, objetivo: p.trainingGoal, distribucion: p.distribution },
    lesiones_y_restricciones: {
      notas: p.injuryNotes || null,
      grupos_a_evitar: p.avoidGroups || [],
      ejercicios_a_evitar: p.avoidExercises || []
    }
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
  const result = await callWorker({ message, contexto_usuario, onChunk });
  // Se registra solo si la llamada terminó bien — un intento fallido (sin red, error
  // del Worker) no cuenta como "usó el asistente". Ver cloudLogChatEvent en cloud-sync.js.
  if (typeof cloudLogChatEvent === "function") cloudLogChatEvent("chat");
  return result;
}

// -----------------------------------------------------
// Análisis de foto de comida
// -----------------------------------------------------
async function analyzeFoodPhoto(dataUrl) {
  // Cadenas que existen en RESTAURANT_FOODS (restaurant-foods.js) — se las
  // listamos a la IA para que, si reconoce el plato como de una de ellas,
  // lo diga explícitamente en "restaurante". Eso nos permite después buscar
  // el valor REAL en nuestra base de datos en vez de confiar solo en la
  // estimación visual (ver findReferenceFoodMatch más abajo).
  const cadenasConocidas = typeof RESTAURANT_FOODS !== "undefined"
    ? Object.keys(RESTAURANT_FOODS).join(", ")
    : "";

  const message = `Eres un nutricionista experto con conocimiento de comida colombiana e internacional. Analiza esta foto de comida con precisión.

INSTRUCCIONES:
1. Identifica QUÉ ES exactamente lo que ves en la foto — sin asumir que es comida colombiana si claramente es otra cosa.
2. Si ves una hamburguesa, di hamburguesa. Si ves pizza, di pizza. Si ves arepa, di arepa. Sé específico con el nombre real.
3. Si por el empaque, envoltorio, vasos, logos o el plato/plato en el que está servida reconoces que es de una cadena de comida específica${cadenasConocidas ? ` — en particular alguna de estas, muy comunes en centros comerciales colombianos: ${cadenasConocidas}` : ""} — indícalo en el campo "restaurante". Si no estás razonablemente seguro, deja "restaurante" en null; no adivines.
4. Si ves un PRODUCTO EMPACADO/INDUSTRIALIZADO con marca visible en el empaque (ej: un ponqué Gansito, un Chocorramo, una bolsa de Doritos, un Milo, una Coca-Cola) — sea que esté cerrado o ya abierto/mordido — lee el nombre tal como aparece impreso (marca + producto, ej: "Gansito Marinela", "Doritos Nacho Queso") y ponlo en el campo "producto_empacado". Esto es más confiable que estimar sus calorías a ojo, porque después lo buscamos en una base de datos real. Si no es un producto empacado (comida preparada, plato de restaurante, comida casera), deja este campo en null.
5. Estima los macros basándote en lo que VES visualmente — porción, ingredientes visibles, tamaño aproximado. Esta estimación se usa como respaldo si no logramos identificar el producto/plato exacto en nuestras bases de datos.
6. Si la foto es poco clara o no puedes identificar bien, indícalo en el campo "confianza".

Si la foto NO contiene comida, devuelve EXCLUSIVAMENTE: {"error":"no_food"}

Si la foto SÍ contiene comida, devuelve EXCLUSIVAMENTE este JSON sin markdown, sin texto adicional:
{
  "nombre": "nombre específico y real del plato o producto (ej: Sandwich Subway de pollo, Bandeja paisa, Pizza margarita, Gansito Marinela)",
  "restaurante": "nombre de la cadena si la reconoces con confianza, o null",
  "producto_empacado": "marca + nombre del producto tal como aparece impreso en el empaque, o null si no es un producto empacado",
  "calorias": número entero,
  "proteina": número en gramos,
  "carbos": número en gramos,
  "grasa": número en gramos,
  "porcion": "descripción de la porción estimada (ej: 1 unidad mediana ~300g)",
  "confianza": "alta|media|baja",
  "nota": "observación breve si algo no está claro o si los valores son estimados"
}`;

  const text = await callWorker({ message, image: dataUrl });
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La IA no devolvió un JSON parseable.");
  const json = JSON.parse(match[0]);
  if (json.error === "no_food") throw new Error("No detecté comida en la foto. Intenta otra imagen.");
  if (typeof cloudLogChatEvent === "function") cloudLogChatEvent("foto");

  const visual = {
    nombre: json.nombre || "Comida analizada",
    kcal: Math.max(0, Math.round(Number(json.calorias) || 0)),
    p: Math.max(0, Math.round(Number(json.proteina) || 0)),
    c: Math.max(0, Math.round(Number(json.carbos) || 0)),
    f: Math.max(0, Math.round(Number(json.grasa) || 0)),
    porcion: json.porcion || "",
    confianza: json.confianza || "media",
    nota: json.nota || ""
  };

  // Prioridad 1: producto empacado con marca legible (ej. "Gansito
  // Marinela"). Es el caso más confiable de todos — no es una estimación
  // de un plato preparado, es un producto específico que casi seguro está
  // en Open Food Facts con datos reales del empaque.
  if (json.producto_empacado && typeof buscarProductoEmpacado === "function") {
    const prod = await buscarProductoEmpacado(json.producto_empacado);
    if (prod) {
      return {
        nombre: prod.nombre,
        kcal: prod.kcal, p: prod.p, c: prod.c, f: prod.f,
        porcion: `${prod.porcion_gramos}g (porción de referencia del producto)`,
        confianza: "alta",
        nota: [`Ajustado con datos reales de Open Food Facts (${prod.nombre}).`, visual.nota].filter(Boolean).join(" ")
      };
    }
    // No lo encontramos en Open Food Facts — seguimos probando por nombre
    // de plato normal antes de rendirnos a la estimación visual.
  }

  // Prioridad 2: si la IA reconoció el plato (con o sin cadena) y hace
  // match razonable contra nuestra base de datos de referencia, preferimos
  // ese valor real sobre la estimación visual — es el mismo principio que
  // usan apps como Fitia: ancla el resultado a datos conocidos en vez de
  // "adivinar" siempre desde cero. Si no hay match confiable, se queda la
  // estimación visual tal cual.
  if (typeof findReferenceFoodMatch === "function") {
    const ref = findReferenceFoodMatch(json.nombre, json.restaurante || null);
    if (ref) {
      const fuenteTxt = ref.restaurante
        ? `Ajustado con datos reales de ${ref.restaurante} (${ref.name}).`
        : `Ajustado con la base de datos de comida colombiana de Fitcol (${ref.name}).`;
      return {
        nombre: json.nombre || ref.name,
        kcal: ref.kcal, p: ref.p, c: ref.c, f: ref.f,
        porcion: visual.porcion,
        confianza: "alta",
        nota: [fuenteTxt, visual.nota].filter(Boolean).join(" ")
      };
    }
  }

  return visual;
}
