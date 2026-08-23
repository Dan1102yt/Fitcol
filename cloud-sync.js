// =====================================================
// cloud-sync.js — Wrappers Supabase para las 4 tablas
// Se llama desde app.js cuando hay sesión activa.
// Si no hay sesión o Supabase no está configurado, las
// funciones devuelven silenciosamente sin escribir.
// =====================================================

function cloudAvailable() {
  return !!(window.supabaseClient && window.currentUser);
}

function lbToKg(weight) { return Math.round(weight * 0.4536 * 100) / 100; }

// ---------- PERFILES ----------
async function cloudUpsertPerfil(profile) {
  if (!cloudAvailable()) return;
  const goalMap = { bajar: "perder_peso", subir: "ganar_peso", mantener: "mantener" };
  try {
    const { error } = await window.supabaseClient.from("perfiles").upsert({
      id: window.currentUser.id,
      nombre: profile.name || null,
      edad: profile.age || null,
      peso_inicial: profile.weight || null,
      altura: profile.height || null,
      objetivo: goalMap[profile.goal] || profile.goal || null
    });
    if (error) console.warn("cloudUpsertPerfil:", error.message);
  } catch (e) { console.warn("cloudUpsertPerfil exception:", e); }
}

async function cloudLoadPerfil() {
  if (!cloudAvailable()) return null;
  try {
    const { data, error } = await window.supabaseClient
      .from("perfiles").select("*").eq("id", window.currentUser.id).maybeSingle();
    if (error) { console.warn("cloudLoadPerfil:", error.message); return null; }
    return data;
  } catch (e) { console.warn(e); return null; }
}

// ---------- REGISTROS_PESO ----------
// Devuelve true/false para que quien llama sepa si de verdad llegó a la nube
// (antes no devolvía nada: un fallo de red quedaba invisible y luego
// cloudHydrate() podía perder el dato igual, ver más abajo).
async function cloudInsertRegistroPeso(record) {
  if (!cloudAvailable()) return false;
  try {
    const { error } = await window.supabaseClient.from("registros_peso").upsert({
      user_id: window.currentUser.id,
      fecha: record.fecha,
      peso: record.peso,
      porcentaje_grasa: record.porcentaje_grasa ?? null,
      pecho: record.pecho ?? null,
      cintura: record.cintura ?? null,
      cadera: record.cadera ?? null,
      bicep: record.bicep ?? null,
      foto_url: record.foto_url ?? null
    }, { onConflict: "user_id,fecha" });
    if (error) { console.warn("cloudInsertRegistroPeso:", error.message); return false; }
    return true;
  } catch (e) { console.warn(e); return false; }
}

async function cloudLoadRegistrosPeso() {
  if (!cloudAvailable()) return [];
  try {
    const { data, error } = await window.supabaseClient
      .from("registros_peso").select("*").order("fecha", { ascending: true });
    if (error) { console.warn(error.message); return []; }
    return data || [];
  } catch (e) { console.warn(e); return []; }
}

async function cloudDeleteRegistroPeso(fecha) {
  if (!cloudAvailable()) return;
  try {
    await window.supabaseClient.from("registros_peso").delete()
      .eq("user_id", window.currentUser.id).eq("fecha", fecha);
  } catch (e) { console.warn(e); }
}

// ---------- ENTRENAMIENTOS (1 fila por set) ----------
// Devuelve true/false — igual que arriba, para que quien llama pueda marcar
// el set como "sincronizado" solo si de verdad llegó a Supabase.
async function cloudInsertSet(set) {
  if (!cloudAvailable()) return false;
  const peso_kg = set.unit === "lb" ? lbToKg(set.weight) : set.weight;
  try {
    const { error } = await window.supabaseClient.from("entrenamientos").insert({
      user_id: window.currentUser.id,
      fecha: set.date,
      ejercicio: set.exerciseName,
      series: 1,
      repeticiones: set.reps,
      peso_kg,
      notas: set.unit === "lb" ? `Ingresado en lb: ${set.weight}` : null
    });
    if (error) { console.warn("cloudInsertSet:", error.message); return false; }
    return true;
  } catch (e) { console.warn(e); return false; }
}

async function cloudLoadEntrenamientos() {
  if (!cloudAvailable()) return [];
  try {
    const { data, error } = await window.supabaseClient
      .from("entrenamientos").select("*").order("fecha", { ascending: false }).limit(500);
    if (error) { console.warn(error.message); return []; }
    return data || [];
  } catch (e) { console.warn(e); return []; }
}

async function cloudBulkInsertEntrenamientos(rows) {
  if (!cloudAvailable()) return { inserted: 0, errors: [] };
  const payload = rows.map(r => ({ ...r, user_id: window.currentUser.id }));
  try {
    const { error } = await window.supabaseClient.from("entrenamientos").insert(payload);
    if (error) return { inserted: 0, errors: [error.message] };
    return { inserted: payload.length, errors: [] };
  } catch (e) { return { inserted: 0, errors: [String(e)] }; }
}

// ---------- COMIDAS ----------
// Devuelve el id (UUID) de la fila creada en Supabase — distinto del id local que genera
// uid() — para que quien llama pueda guardarlo y luego editar/borrar esa fila puntual.
async function cloudInsertComida(comida) {
  if (!cloudAvailable()) return null;
  // Prefijamos slot al nombre para preservarlo (la tabla no tiene slot)
  const nombre = comida.slot ? `[${comida.slot}] ${comida.name}` : comida.name;
  try {
    const { data, error } = await window.supabaseClient.from("comidas").insert({
      user_id: window.currentUser.id,
      fecha: comida.date,
      nombre,
      calorias: comida.kcal,
      proteina: comida.p,
      carbohidratos: comida.c,
      grasas: comida.f,
      porcion_gramos: comida.porcion_gramos ?? null
    }).select("id").single();
    if (error) { console.warn("cloudInsertComida:", error.message); return null; }
    return data ? data.id : null;
  } catch (e) { console.warn(e); return null; }
}

async function cloudUpdateComida(id, comida) {
  if (!cloudAvailable() || !id) return;
  const nombre = comida.slot ? `[${comida.slot}] ${comida.name}` : comida.name;
  try {
    const { error } = await window.supabaseClient.from("comidas").update({
      fecha: comida.date,
      nombre,
      calorias: comida.kcal,
      proteina: comida.p,
      carbohidratos: comida.c,
      grasas: comida.f,
      porcion_gramos: comida.porcion_gramos ?? null
    }).eq("id", id).eq("user_id", window.currentUser.id);
    if (error) console.warn("cloudUpdateComida:", error.message);
  } catch (e) { console.warn(e); }
}

async function cloudDeleteComida(id) {
  if (!cloudAvailable() || !id) return;
  try {
    const { error } = await window.supabaseClient.from("comidas").delete()
      .eq("id", id).eq("user_id", window.currentUser.id);
    if (error) console.warn("cloudDeleteComida:", error.message);
  } catch (e) { console.warn(e); }
}

async function cloudLoadComidas() {
  if (!cloudAvailable()) return [];
  try {
    const { data, error } = await window.supabaseClient
      .from("comidas").select("*").order("fecha", { ascending: false }).limit(500);
    if (error) { console.warn(error.message); return []; }
    return data || [];
  } catch (e) { console.warn(e); return []; }
}

// ---------- BORRAR TODO (privacidad / reset de cuenta) ----------
// Borra las 4 tablas para el usuario actual. Se usa desde "Borrar todo" en Perfil,
// que antes solo limpiaba localStorage y dejaba intacta la copia en la nube.
async function cloudDeleteAllUserData() {
  if (!cloudAvailable()) return { ok: true, errors: [] };
  const uid = window.currentUser.id;
  const tables = [
    { name: "registros_peso", col: "user_id" },
    { name: "entrenamientos", col: "user_id" },
    { name: "comidas", col: "user_id" },
    { name: "perfiles", col: "id" }
  ];
  const errors = [];
  for (const t of tables) {
    try {
      const { error } = await window.supabaseClient.from(t.name).delete().eq(t.col, uid);
      if (error) errors.push(`${t.name}: ${error.message}`);
    } catch (e) { errors.push(`${t.name}: ${e}`); }
  }
  return { ok: errors.length === 0, errors };
}

// ---------- HYDRATE ----------
// Se llama CADA VEZ que se abre la app con sesión activa (no solo la primera
// vez que inicias sesión) — ver auth.js. Antes esto REEMPLAZABA por completo
// weightLog/measurements/setLog/dietLog con lo que hubiera en la nube.
//
// El bug real: registrar un set o una comida guarda local al instante, pero
// el insert a Supabase (cloudInsertSet / cloudInsertComida) se dispara sin
// esperar a que termine. Si cierras la pestaña o la app pasa a segundo plano
// justo después (muy común en celular: el navegador puede cortar la
// petición en curso), ese insert nunca llega a completarse — pero
// localStorage sí quedó con el dato. La próxima vez que abrías la app, esta
// función bajaba de la nube (que nunca recibió ese set/comida) y lo pisaba
// por completo, borrando justo lo que acababas de registrar. Por fuera se
// veía como "no se guarda lo que lleno", y coincide con que solo pasaba al
// cerrar y reabrir — nunca mientras la pestaña seguía abierta.
//
// Fix: en vez de reemplazar, MEZCLA. Todo lo que ya está confirmado en la
// nube se toma de ahí (fuente de verdad para lo sincronizado); lo que sigue
// local y sin confirmar (sin cloudId / sin flag "synced") se conserva y
// además se reintenta subir en este mismo hydrate.
async function cloudHydrate() {
  if (!cloudAvailable() || typeof state === "undefined") return;
  try {
    const [perfil, pesos, entrenos, comidas] = await Promise.all([
      cloudLoadPerfil(), cloudLoadRegistrosPeso(), cloudLoadEntrenamientos(), cloudLoadComidas()
    ]);

    if (perfil) {
      if (perfil.nombre)       state.profile.name = perfil.nombre;
      if (perfil.edad)         state.profile.age = perfil.edad;
      if (perfil.altura)       state.profile.height = Number(perfil.altura);
      if (perfil.peso_inicial) state.profile.weight = Number(perfil.peso_inicial);
      const objMap = { perder_peso: "bajar", ganar_peso: "subir", mantener: "mantener" };
      if (perfil.objetivo && objMap[perfil.objetivo]) state.profile.goal = objMap[perfil.objetivo];
      state.setupComplete = true;
    }

    // --- Peso y medidas: clave natural = fecha (la tabla ya hace upsert por fecha) ---
    const cloudDates = new Set(pesos.map(r => r.fecha));
    const localOnlyWeights = (state.weightLog || []).filter(w => !cloudDates.has(w.date));
    const cloudWeightLog = pesos
      .filter(r => r.peso != null)
      .map(r => ({ date: r.fecha, weight: Number(r.peso) }));
    state.weightLog = cloudWeightLog.concat(localOnlyWeights)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const measRows = pesos.filter(r => r.pecho || r.cintura || r.cadera || r.bicep || r.porcentaje_grasa);
    const localOnlyMeasurements = (state.measurements || []).filter(m => !cloudDates.has(m.date));
    const cloudMeasurements = measRows.map(r => ({
      date: r.fecha,
      chest: r.pecho ? Number(r.pecho) : undefined,
      waist: r.cintura ? Number(r.cintura) : undefined,
      hips: r.cadera ? Number(r.cadera) : undefined,
      leftArm: r.bicep ? Number(r.bicep) : undefined,
      bodyFat: r.porcentaje_grasa ? Number(r.porcentaje_grasa) : undefined
    }));
    state.measurements = cloudMeasurements.concat(localOnlyMeasurements);

    // Reintenta subir lo que quedó solo local antes de perderlo de vista.
    for (const w of localOnlyWeights) {
      const ok = await cloudInsertRegistroPeso({ fecha: w.date, peso: w.weight });
      if (ok) cloudDates.add(w.date); // ya no hace falta seguir tratándolo como "solo local"
    }

    // --- Entrenamientos: los sets locales llevan flag synced (true tras cloudInsertSet ok) ---
    const cloudSetLog = entrenos.map(e => ({
      id: e.id, date: e.fecha,
      sessionId: `${e.fecha}-cloud`,
      exerciseName: e.ejercicio,
      group: "",
      weight: Number(e.peso_kg) || 0,
      unit: "kg",
      reps: e.repeticiones || 0,
      synced: true
    }));
    const pendingSets = (state.setLog || []).filter(s => !s.synced);
    for (const s of pendingSets) {
      const ok = await cloudInsertSet(s);
      if (ok) s.synced = true;
    }
    state.setLog = cloudSetLog.concat(pendingSets);

    // --- Comidas: las locales llevan cloudId una vez confirmadas (ver logMeal en app.js) ---
    const slotMatch = (nombre) => {
      const m = nombre.match(/^\[(desayuno|almuerzo|snack|cena)\]\s*(.*)$/i);
      return m ? { slot: m[1].toLowerCase(), name: m[2] } : { slot: "snack", name: nombre };
    };
    const cloudDietLog = comidas.map(c => {
      const { slot, name } = slotMatch(c.nombre);
      return {
        id: c.id, cloudId: c.id, date: c.fecha, slot, name,
        kcal: Number(c.calorias) || 0,
        p: Number(c.proteina) || 0,
        c: Number(c.carbohidratos) || 0,
        f: Number(c.grasas) || 0,
        source: "cloud"
      };
    });
    const pendingMeals = (state.dietLog || []).filter(e => !e.cloudId);
    for (const meal of pendingMeals) {
      const cloudId = await cloudInsertComida(meal);
      if (cloudId) meal.cloudId = cloudId;
    }
    state.dietLog = cloudDietLog.concat(pendingMeals);

    saveState();
    if (typeof showView === "function" && typeof currentView !== "undefined") showView(currentView);
  } catch (err) {
    console.warn("cloudHydrate error:", err);
  }
}
