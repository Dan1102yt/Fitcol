// =====================================================
// Fitcol — app.js
// State, routing, calculations, all view renderers
// =====================================================
const STORAGE_KEY = "fitcol.state.v1";

const defaultState = {
  profile: {
    name: "",
    age: 25,
    sex: "masculino",
    height: 175,
    weight: 75,
    targetWeight: 75,
    weeks: 12,
    activity: "moderado",
    goal: "mantener",
    foodPreference: "saludable",
    trainingDays: 4,
    trainingGoal: "hipertrofia",
    distribution: "auto",
    avoidGroups: [],
    avoidExercises: [],
    injuryNotes: "",
  },
  apiKey: "",
  units: "kg",
  weightLog: [],
  measurements: [],
  photos: [],
  customFoods: [],
  customExercises: [],
  customRoutines: [],
  activeCustomRoutineId: null,
  useCustomRoutine: false,
  dailyMenu: { date: null, meals: null, target: null },
  dietLog: [],
  setLog: [],
  workouts: [],
  chat: { messages: [] },
  theme: "dark",
  setupComplete: false
};

let state = loadState();
let charts = {};
let currentView = "dashboard";
// Referencia a la función que reposiciona el bottom-nav cuando cambia el
// visualViewport (teclado abierto/cerrado, barra de direcciones de Android
// que aparece/desaparece al hacer scroll). Se asigna en initFitcolApp().
// Se expone aquí para poder forzar un recálculo al cambiar de vista — antes
// solo se recalculaba cuando el visualViewport emitía su propio evento, así
// que si quedabas con un offset aplicado (p.ej. saliste de un campo de texto
// con teclado abierto) y navegabas a otra sección, el nav podía quedar
// visualmente desplazado del área que en verdad recibe el tap.
let _adjustBottomNav = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return deepMerge(structuredClone(defaultState), JSON.parse(raw));
  } catch {
    return structuredClone(defaultState);
  }
}
function deepMerge(base, override) {
  for (const k in override) {
    if (override[k] && typeof override[k] === "object" && !Array.isArray(override[k]) && base[k] && typeof base[k] === "object") {
      base[k] = deepMerge(base[k], override[k]);
    } else {
      base[k] = override[k];
    }
  }
  return base;
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { toast("No se pudo guardar (storage lleno)"); }
}
// Antes, "Importar datos" aceptaba cualquier JSON válido sin revisar su forma — un archivo
// con, por ejemplo, "profile" como string en vez de objeto, dejaba el estado corrupto y
// rompía la app en la siguiente vista hasta borrar el localStorage a mano.
function validateImportedState(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "Ese archivo no es un backup válido de Fitcol.";
  if (obj.profile !== undefined && (typeof obj.profile !== "object" || obj.profile === null || Array.isArray(obj.profile))) {
    return "El archivo no tiene el formato esperado (perfil inválido).";
  }
  const arrayFields = ["weightLog", "measurements", "photos", "customFoods", "customExercises", "customRoutines", "dietLog", "setLog", "workouts"];
  for (const f of arrayFields) {
    if (obj[f] !== undefined && !Array.isArray(obj[f])) return `El archivo no tiene el formato esperado (campo "${f}" inválido).`;
  }
  return null;
}
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
// Fecha actualmente seleccionada en la vista Dieta (no se persiste: cada recarga vuelve a hoy)
let _dietDate = "";
function diaSel() { if (!_dietDate) _dietDate = todayISO(); return _dietDate; }

function toast(msg, ms = 2200) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), ms);
}

// =====================================================
// CALCULATIONS
// =====================================================
const ACTIVITY_FACTORS = { sedentario: 1.2, ligero: 1.375, moderado: 1.55, activo: 1.725, muy_activo: 1.9 };

function calcBMR(p) {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.sex === "femenino" ? base - 161 : base + 5;
}
function calcTDEE(p) { return calcBMR(p) * (ACTIVITY_FACTORS[p.activity] || 1.55); }

function calcNutrition(p) {
  const bmr = calcBMR(p);
  const tdee = calcTDEE(p);
  const deltaKg = (p.targetWeight - p.weight);
  const weeks = Math.max(1, Number(p.weeks) || 1);
  const dailyDelta = (deltaKg * 7700) / (weeks * 7);
  let kcal = tdee + dailyDelta;
  kcal = Math.max(tdee * 0.75, Math.min(tdee * 1.25, kcal));
  if (p.goal === "mantener") kcal = tdee;
  // Piso absoluto de seguridad: el límite de arriba es relativo al TDEE, así que alguien
  // con TDEE bajo (poca estatura/actividad) podía terminar con una meta diaria peligrosamente
  // baja. Esto es un tope conservador de producto, no un consejo médico — cuando se activa,
  // se lo avisamos al usuario en Perfil.
  const safetyFloor = p.sex === "femenino" ? 1200 : 1500;
  let cappedForSafety = false;
  if (kcal < safetyFloor) { kcal = safetyFloor; cappedForSafety = true; }
  const proteinPerKg = p.goal === "mantener" ? 1.8 : 2.0;
  const protein = Math.round(p.weight * proteinPerKg);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  const weeklyDeltaKg = Math.round((deltaKg / weeks) * 100) / 100;
  // El piso de arriba solo cubre déficits demasiado agresivos (bajar de peso muy rápido).
  // Un objetivo de SUBIR de peso muy rápido no activaba ningún aviso — se sentía "sin
  // validar" aunque el cálculo internamente sí limitaba las calorías al +25% del TDEE.
  const aggressiveRate = p.goal !== "mantener" && Math.abs(weeklyDeltaKg) > 1;
  return {
    bmr: Math.round(bmr), tdee: Math.round(tdee), kcal: Math.round(kcal),
    protein, carbs: Math.max(0, carbs), fat,
    weeklyDeltaKg,
    dailyDeltaKcal: Math.round(dailyDelta),
    cappedForSafety, aggressiveRate
  };
}

// =====================================================
// SMART MENU — meals match target macros
// =====================================================
const SLOT_FRACTIONS = [
  { name: "desayuno", frac: 0.25 },
  { name: "almuerzo", frac: 0.40 },
  { name: "snack",    frac: 0.10 },
  { name: "cena",     frac: 0.25 }
];

function generateBalancedMenu(profile, target) {
  const meals = {};
  SLOT_FRACTIONS.forEach(s => {
    const targetKcal = target.kcal * s.frac;
    const list = (FOODS[s.name][profile.foodPreference] || FOODS[s.name].saludable);
    const sorted = list.slice().sort((a, b) => Math.abs(a.kcal - targetKcal) - Math.abs(b.kcal - targetKcal));
    const food = sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
    const mult = Math.max(0.5, Math.min(2.5, targetKcal / food.kcal));
    meals[s.name] = {
      ...food,
      multiplier: Math.round(mult * 100) / 100,
      adjusted: {
        kcal: Math.round(food.kcal * mult),
        p: Math.round(food.p * mult),
        c: Math.round(food.c * mult),
        f: Math.round(food.f * mult)
      }
    };
  });
  return meals;
}

function ensureDailyMenu(force) {
  const today = todayISO();
  const target = calcNutrition(state.profile);
  const stale = !state.dailyMenu || state.dailyMenu.date !== today
              || !state.dailyMenu.target || state.dailyMenu.target.kcal !== target.kcal
              || state.dailyMenu.preference !== state.profile.foodPreference;
  if (force || stale) {
    state.dailyMenu = {
      date: today, target,
      preference: state.profile.foodPreference,
      meals: generateBalancedMenu(state.profile, target)
    };
    saveState();
  }
  return state.dailyMenu;
}

// =====================================================
// DAILY TOTALS
// =====================================================
function dailyTotals(dateISO) {
  const d = dateISO || todayISO();
  return state.dietLog.filter(e => e.date === d).reduce((a, e) => {
    a.kcal += e.kcal; a.p += e.p; a.c += e.c; a.f += e.f; a.count++;
    return a;
  }, { kcal: 0, p: 0, c: 0, f: 0, count: 0 });
}

function logMeal(entry) {
  const full = { id: uid(), date: diaSel(), source: "plan", ...entry };
  state.dietLog.push(full);
  saveState();
  // cloudInsertComida crea la fila en Supabase con su propio id (UUID) distinto del
  // id local generado por uid(). Guardamos ese id de nube en la entrada local
  // (full.cloudId) para poder editar/borrar esta comida en Supabase más adelante.
  if (typeof cloudInsertComida === "function") {
    Promise.resolve(cloudInsertComida(full)).then(cloudId => {
      if (!cloudId) return;
      const e = state.dietLog.find(x => x.id === full.id);
      if (e) { e.cloudId = cloudId; saveState(); }
    });
  }
  if (typeof gamiOnActivity === "function") gamiOnActivity("meal");
}

// =====================================================
// ROUTINE
// =====================================================
function getActiveRoutine() {
  if (state.useCustomRoutine && state.activeCustomRoutineId) {
    const cr = state.customRoutines.find(r => r.id === state.activeCustomRoutineId);
    if (cr) return {
      isCustom: true, name: cr.name, days: cr.days,
      goal: state.profile.trainingGoal,
      goalParams: TRAINING_PARAMS[state.profile.trainingGoal] || TRAINING_PARAMS.hipertrofia,
      daysPerWeek: cr.days.length
    };
  }
  return generateRoutine(state.profile);
}

function generateRoutine(profile) {
  const days = Math.max(0, Math.min(7, Number(profile.trainingDays) || 0));
  if (days === 0) return { days: [], note: "Sin entrenamientos.", goal: profile.trainingGoal };
  let distKey = profile.distribution;
  if (!distKey || distKey === "auto") distKey = recommendDistribution(days);
  const dist = DISTRIBUTIONS[distKey];
  let split = dist.daysSplit[days];
  if (!split) {
    const keys = Object.keys(dist.daysSplit).map(Number).sort((a, b) => Math.abs(a - days) - Math.abs(b - days));
    split = dist.daysSplit[keys[0]];
  }
  const params = TRAINING_PARAMS[profile.trainingGoal] || TRAINING_PARAMS.hipertrofia;
  const exercisesPerGroup = profile.trainingGoal === "fuerza" ? 1 : 2;
  // Lesiones/restricciones: excluye grupos musculares completos y/o ejercicios puntuales
  // que el usuario marcó en Perfil, para que la rutina automática nunca los sugiera.
  const avoidGroups = new Set(profile.avoidGroups || []);
  const avoidExercises = new Set(profile.avoidExercises || []);
  const dayList = split.map((muscleGroups, idx) => {
    const activeGroups = muscleGroups.filter(g => !avoidGroups.has(g));
    const exercises = [];
    const used = new Set();
    activeGroups.forEach(g => {
      const pool = (EXERCISES[g] || [])
        .concat(state.customExercises.filter(e => e.group === g))
        .filter(ex => !avoidExercises.has(ex.name));
      pickN(pool, Math.min(exercisesPerGroup, pool.length), used, idx, g).forEach(ex => {
        used.add(ex.name);
        exercises.push({ ...ex, group: g, sets: params.sets, reps: params.reps, rest: params.rest });
      });
    });
    return { label: `Día ${idx + 1}`, muscleGroups: activeGroups, exercises };
  });
  return {
    distribution: distKey, distributionName: dist.name, distributionDesc: dist.desc,
    goal: profile.trainingGoal, goalParams: params, daysPerWeek: days, days: dayList
  };
}

function pickN(pool, n, used, dayIdx, groupKey) {
  const seed = (dayIdx * 13 + (groupKey || "").length * 7) % Math.max(1, pool.length);
  const result = [];
  for (let i = 0; i < pool.length && result.length < n; i++) {
    const ex = pool[(seed + i) % pool.length];
    if (!used.has(ex.name)) result.push(ex);
  }
  for (let i = 0; i < pool.length && result.length < n; i++) {
    const ex = pool[i];
    if (!result.find(e => e.name === ex.name)) result.push(ex);
  }
  return result;
}

// =====================================================
// ROUTING
// =====================================================
const views = {};
function showView(name) {
  currentView = name;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  document.getElementById("modal-root").innerHTML = "";
  Object.values(charts).forEach(c => { try { c.destroy(); } catch {} });
  charts = {};
  document.querySelectorAll(".nav-item, .bottom-nav button").forEach(b => {
    b.classList.toggle("active", b.dataset.view === name);
  });
  // El bottom-nav se reposiciona con el teclado/la barra de direcciones del
  // navegador (ver initFitcolApp). Si quedó desplazado desde la vista
  // anterior, este es el momento de recalcularlo — evita que el botón se
  // vea en un lugar pero el área que responde al toque quede desfasada.
  if (typeof _adjustBottomNav === "function") _adjustBottomNav();
  try {
    if (!state.setupComplete && name !== "profile") return renderOnboarding();
    (views[name] || views.dashboard)();
  } catch (err) {
    // Antes, si algo fallaba a mitad de un render, la vista quedaba a medio
    // pintar y no pasaba nada visible — se sentía como que el botón "no
    // respondía". Ahora se ve un aviso y queda registrado en consola, y el
    // usuario puede reintentar sin quedar atascado.
    console.error(`Error al mostrar la vista "${name}":`, err);
    toast("Algo falló al cargar esta sección. Intenta de nuevo.");
  }
  window.scrollTo(0, 0);
  if (typeof _adjustBottomNav === "function") _adjustBottomNav();
}

// =====================================================
// HELPERS
// =====================================================
function startOfWeek(d) {
  const date = new Date(d); date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}
function formatDate(iso) { const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"}); }
function formatDateShort(iso) { const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString("es-CO",{day:"numeric",month:"short"}); }
function greetingByHour() { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; }
function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ""; }
function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function trainingGoalLabel(g) {
  return ({ hipertrofia: "Hipertrofia", fuerza: "Fuerza máxima", resistencia: "Resistencia muscular", potencia: "Potencia / Explosividad" })[g] || g;
}
function preferenceDescription(pref) {
  return ({
    saludable: "Recetas con cocción ligera, abundancia de proteína magra y vegetales. Ideal para perder grasa o comer limpio.",
    balanceado: "Platos típicos colombianos en porciones razonables. Buen balance entre sabor y aporte calórico.",
    chatarra: "Comida procesada y muy calórica. Úsala con moderación; sirve para días de antojo o de surplus."
  })[pref] || "";
}
function sourceLabel(s) { return ({ plan: "del plan", custom: "personal", photo: "vía foto IA", manual: "manual", openfoodfacts: "Open Food Facts" })[s] || ""; }

function normText(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

// Repositorio local de alimentos: base de datos colombiana (data.js) + comidas personales.
// Deduplica por nombre. Cada item: { name, kcal, p, c, f, slot }
function getFoodRepository() {
  const out = [];
  const seen = new Set();
  const add = (f, slot) => {
    const key = normText(f.name);
    if (!f.name || seen.has(key)) return;
    seen.add(key);
    out.push({ name: f.name, kcal: f.kcal || 0, p: f.p || 0, c: f.c || 0, f: f.f || 0, slot: slot || f.slot || "snack" });
  };
  try {
    Object.keys(FOODS || {}).forEach(slot => {
      Object.keys(FOODS[slot] || {}).forEach(pref => {
        (FOODS[slot][pref] || []).forEach(f => add(f, slot));
      });
    });
  } catch {}
  (state.customFoods || []).forEach(f => add(f, f.slot));
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function searchFoodRepository(query, limit) {
  const q = normText(query).trim();
  const repo = getFoodRepository();
  if (!q) return repo.slice(0, limit || 12);
  return repo.filter(f => normText(f.name).includes(q)).slice(0, limit || 12);
}

// Fila visual de una comida registrada (usada en pestaña Registro y bajo cada slot del Plan)
function dietLogRowHtml(e, opts = {}) {
  const _sl = sourceLabel(e.source);
  const _metaParts = [...(opts.showSlot ? [e.slot] : []), ...(_sl ? [_sl] : []), ...(e.porcion_gramos ? [`${e.porcion_gramos}g`] : [])];
  const meta = _metaParts.join(" · ");
  return `
    <div class="diet-log-row" data-row-id="${e.id}">
      <div style="display:flex; gap:10px; align-items:center; min-width:0;">
        ${e.photo ? `<img src="${e.photo}" alt="" style="width:46px;height:46px;border-radius:8px;object-fit:cover;flex-shrink:0;">` : ""}
        <div style="min-width:0;">
          <div style="font-weight:500; overflow-wrap:anywhere;">${escapeHtml(e.name)}</div>
          <div class="card-meta">${escapeHtml(meta)}</div>
        </div>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-shrink:0;">
        <div class="ex-meta"><strong>${e.kcal}</strong> kcal · ${e.p}P / ${e.c}C / ${e.f}G</div>
        <button class="btn btn-sm diet-edit" data-id="${e.id}" title="Editar">✎</button>
        <button class="delete-btn diet-del" data-id="${e.id}" title="Eliminar">×</button>
      </div>
    </div>`;
}

function bindDietLogRowEvents(rootEl) {
  (rootEl || document).querySelectorAll(".diet-edit").forEach(b => b.addEventListener("click", () => openEditLogger(b.dataset.id)));
  (rootEl || document).querySelectorAll(".diet-del").forEach(b => b.addEventListener("click", () => {
    const removed = state.dietLog.find(e => e.id === b.dataset.id);
    state.dietLog = state.dietLog.filter(e => e.id !== b.dataset.id);
    saveState(); views.diet();
    if (removed && typeof cloudDeleteComida === "function") cloudDeleteComida(removed.cloudId || removed.id);
  }));
}

// Editar una comida ya registrada (estilo Fitia: ajustar nombre, slot y macros)
function openEditLogger(entryId) {
  const e = state.dietLog.find(x => x.id === entryId);
  if (!e) { toast("No se encontró la comida"); return; }
  const html = `
    <h2>Editar comida</h2>
    ${e.photo ? `<img src="${e.photo}" alt="" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin-bottom:14px;">` : ""}
    <div class="field"><label>Nombre</label><input type="text" id="el-name" value="${escapeHtml(e.name)}"></div>
    <div class="field"><label>Comida</label>
      <select id="el-slot">
        ${["desayuno","almuerzo","snack","cena"].map(s => `<option value="${s}" ${e.slot===s?"selected":""}>${capitalize(s)}</option>`).join("")}
      </select>
    </div>
    <div class="field-row">
      <div class="field"><label>Kcal</label><input type="number" id="el-kcal" value="${e.kcal}"></div>
      <div class="field"><label>Prot (g)</label><input type="number" id="el-p" value="${e.p}"></div>
      <div class="field"><label>Carb (g)</label><input type="number" id="el-c" value="${e.c}"></div>
      <div class="field"><label>Grasa (g)</label><input type="number" id="el-f" value="${e.f}"></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn btn-primary btn-block" id="el-save">Guardar cambios</button>
      <button class="btn btn-block" id="el-cancel">Cancelar</button>
    </div>
  `;
  const m = modal(html);
  m.root.querySelector("#el-cancel").addEventListener("click", m.close);
  m.root.querySelector("#el-save").addEventListener("click", () => {
    const v = sel => m.root.querySelector(sel).value;
    const name = v("#el-name").trim();
    const kcal = parseInt(v("#el-kcal"));
    if (!name || isNaN(kcal)) { toast("Faltan nombre o kcal"); return; }
    e.name = name; e.slot = v("#el-slot");
    e.kcal = kcal; e.p = parseInt(v("#el-p")) || 0; e.c = parseInt(v("#el-c")) || 0; e.f = parseInt(v("#el-f")) || 0;
    saveState();
    if (typeof cloudUpdateComida === "function") cloudUpdateComida(e.cloudId || e.id, e);
    toast("Comida actualizada"); m.close(); views.diet();
  });
}

async function compressImage(file, maxDim) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Modales apilables: cada modal() añade su propio overlay (no reemplaza los anteriores),
// para que un modal pueda abrir otro encima sin destruirlo (p.ej. editor de rutina -> elegir ejercicio).
// m.root es el overlay propio del modal; querySelector(...) sobre él alcanza su contenido.
function modal(html) {
  const root = document.getElementById("modal-root");
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  root.appendChild(overlay);
  const close = () => { overlay.remove(); };
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  return { close, root: overlay };
}

// =====================================================
// DASHBOARD
// =====================================================
views.dashboard = function () {
  const p = state.profile;
  const n = calcNutrition(p);
  const log = state.weightLog.slice().sort((a, b) => a.date.localeCompare(b.date));
  const currentWeight = log.length ? log[log.length - 1].weight : p.weight;
  const remaining = p.targetWeight - currentWeight;
  const weekStart = startOfWeek(new Date());
  const sessionsThisWeek = state.workouts.filter(w => { const [y,m,d]=w.date.split('-').map(Number); return new Date(y,m-1,d) >= weekStart; }).length;
  const tot = dailyTotals();
  const goalLabel = { bajar: "Perder peso", subir: "Ganar peso", mantener: "Mantener peso" }[p.goal];
  const greeting = greetingByHour();
  const name = p.name || "Atleta";
  const exerciseNames = Array.from(new Set(state.setLog.map(s => s.exerciseName))).sort();
  const filterEx = state._dashboardExFilter || exerciseNames[0] || "";

  document.getElementById("content").innerHTML = `
    <div class="view-header">
      <div>
        <h1>¡Buenas, ${escapeHtml(name)}! El cóndor no descansa.</h1>
        <p>Objetivo: <strong>${goalLabel}</strong> · ${p.weeks} semanas · ${p.trainingDays} días/semana</p>
      </div>
      <button class="btn btn-primary" id="quick-log-weight">+ Registrar peso</button>
    </div>

    <div class="grid-4" style="margin-bottom: 18px;">
      <div class="stat-card accent">
        <div class="label">Peso actual</div>
        <div class="value">${currentWeight}<span class="unit">kg</span></div>
        <div class="delta">Meta: ${p.targetWeight} kg ${remaining !== 0 ? `(${remaining > 0 ? "+" : ""}${remaining.toFixed(1)} kg)` : ""}</div>
      </div>
      <div class="stat-card">
        <div class="label">Calorías hoy</div>
        <div class="value">${Math.round(tot.kcal)}<span class="unit">/${n.kcal}</span></div>
        <div class="delta ${tot.kcal > n.kcal ? "down" : ""}">${Math.max(0, n.kcal - Math.round(tot.kcal))} kcal restantes</div>
      </div>
      <div class="stat-card">
        <div class="label">Proteína hoy</div>
        <div class="value">${Math.round(tot.p)}<span class="unit">/${n.protein}g</span></div>
        <div class="delta">${Math.max(0, n.protein - Math.round(tot.p))} g por consumir</div>
      </div>
      <div class="stat-card">
        <div class="label">Sesiones esta semana</div>
        <div class="value">${sessionsThisWeek}<span class="unit">/${p.trainingDays}</span></div>
        <div class="delta">${sessionsThisWeek >= p.trainingDays ? "Meta cumplida" : `Faltan ${p.trainingDays - sessionsThisWeek}`}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom: 18px;">
      <div class="card">
        <div class="card-title">Progreso de peso <span class="card-meta">${log.length} registros</span></div>
        <div class="chart-container"><canvas id="chart-weight"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">Macros del día</div>
        <div class="chart-container"><canvas id="chart-macros"></canvas></div>
        <div style="margin-top: 16px;">
          ${macroBar("Proteína", "protein", tot.p, n.protein, "g")}
          ${macroBar("Carbos", "carbs", tot.c, n.carbs, "g")}
          ${macroBar("Grasa", "fat", tot.f, n.fat, "g")}
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom: 18px;">
      <div class="card">
        <div class="card-title">Sesiones por semana (último mes)</div>
        <div class="chart-container"><canvas id="chart-workouts"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">
          Progreso por ejercicio
          ${exerciseNames.length ? `
            <select id="ex-filter" class="card-select">
              ${exerciseNames.map(e => `<option value="${escapeHtml(e)}" ${e === filterEx ? "selected" : ""}>${escapeHtml(e)}</option>`).join("")}
            </select>` : ""}
        </div>
        ${exerciseNames.length ?
          `<div class="chart-container"><canvas id="chart-exercise"></canvas></div>
           <div id="ex-summary" style="margin-top:12px;"></div>` :
          `<div class="empty-state"><p>El cóndor no nació volando — marca tus sets en Entrenamiento y aquí verás tu progreso.</p></div>`
        }
      </div>
    </div>

    <div class="card">
      <div class="card-title">Comidas registradas hoy <span class="card-meta">${tot.count} entradas</span></div>
      ${state.dietLog.filter(e => e.date === todayISO()).length === 0 ? `
        <div class="empty-state"><p>Sin combustible no hay vuelo. Ve a Dieta para añadir tu desayuno, almuerzo, snack o cena.</p></div>
      ` : `
        <div class="diet-log-list">
          ${state.dietLog.filter(e => e.date === todayISO()).slice().reverse().map(e => `
            <div class="diet-log-row">
              <div>
                <div style="font-weight:500">${escapeHtml(e.name)}</div>
                <div class="card-meta">${e.slot}${sourceLabel(e.source) ? ` · ${sourceLabel(e.source)}` : ''}</div>
              </div>
              <div class="ex-meta"><strong>${e.kcal}</strong> kcal · ${e.p}P / ${e.c}C / ${e.f}G</div>
            </div>
          `).join("")}
        </div>
      `}
    </div>
  `;

  drawWeightChart("chart-weight", log, p.targetWeight);
  drawMacrosChart("chart-macros", tot, n);
  drawWorkoutsChart("chart-workouts", state.workouts);
  if (exerciseNames.length) drawExerciseChart("chart-exercise", filterEx);
  document.getElementById("quick-log-weight").addEventListener("click", quickLogWeight);
  const exFilter = document.getElementById("ex-filter");
  if (exFilter) exFilter.addEventListener("change", e => { state._dashboardExFilter = e.target.value; showView("dashboard"); });
};

function macroBar(label, key, current, total, unit = "%") {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const klass = key === "protein" ? "protein" : key === "carbs" ? "carbs" : "fat";
  return `<div class="macro-row">
    <span class="macro-label">${label}</span>
    <div class="macro-bar"><div class="macro-fill ${klass}" style="width:${pct}%"></div></div>
    <span class="macro-value">${Math.round(current)}/${total}${unit}</span>
  </div>`;
}

function dietMacroBar(label, current, total, unit, color) {
  const cur = Math.round(current);
  const pct = total > 0 ? Math.min(100, Math.round((cur / total) * 100)) : 0;
  const over = total > 0 && cur > total;
  return `<div class="macro-bar-wrap">
    <div class="macro-bar-header">
      <span>${label}</span>
      <span style="color:${over ? "#C0392B" : "var(--text-muted)"}">${cur.toLocaleString("es-CO")} / ${total.toLocaleString("es-CO")} ${unit} · ${pct}%</span>
    </div>
    <div class="macro-bar-track">
      <div class="macro-bar-fill" style="width:${pct}%; background:${over ? "#C0392B" : color};"></div>
    </div>
  </div>`;
}

function quickLogWeight() { openWeightModal(); }

// Modal completo: peso obligatorio + medidas opcionales + foto opcional
function openWeightModal() {
  let fotoBase64 = null;
  const today = todayISO();
  const html = `
    <h2>Registrar peso</h2>
    <p style="color:var(--text-muted); font-size:13px;">Los campos con * son obligatorios.</p>
    <div class="field-row">
      <div class="field"><label>Fecha *</label><input type="date" id="wm-fecha" value="${today}" required></div>
      <div class="field"><label>Peso (kg) *</label><input type="number" id="wm-peso" step="0.1" placeholder="ej: 75.5" required></div>
    </div>
    <details class="wm-details">
      <summary>Medidas opcionales</summary>
      <div class="field-row">
        <div class="field"><label>% Grasa corporal</label><input type="number" id="wm-grasa" step="0.1" placeholder="18.5"></div>
        <div class="field"><label>Pecho (cm)</label><input type="number" id="wm-pecho" step="0.5"></div>
        <div class="field"><label>Cintura (cm)</label><input type="number" id="wm-cintura" step="0.5"></div>
        <div class="field"><label>Cadera (cm)</label><input type="number" id="wm-cadera" step="0.5"></div>
        <div class="field"><label>Bícep (cm)</label><input type="number" id="wm-bicep" step="0.5"></div>
      </div>
      <label class="card-title" style="margin-top: 10px;">Foto corporal (opcional)</label>
      ${photoPickerHtml("wm-foto")}
    </details>
    <div style="display:flex; gap:8px; margin-top:14px;">
      <button class="btn btn-primary btn-block" id="wm-save">Guardar registro</button>
      <button class="btn btn-block" id="wm-cancel">Cancelar</button>
    </div>
  `;
  const m = modal(html);
  m.root.querySelector("#wm-cancel").addEventListener("click", m.close);
  bindPhotoPicker(m.root, "wm-foto", dataUrl => { fotoBase64 = dataUrl; });

  m.root.querySelector("#wm-save").addEventListener("click", async () => {
    const v = sel => m.root.querySelector(sel).value;
    const fecha = v("#wm-fecha");
    const peso = parseFloat(v("#wm-peso"));
    if (!fecha || !peso || peso < 20 || peso > 400) { toast("Indica una fecha y un peso válido."); return; }
    const grasa = parseFloat(v("#wm-grasa")) || null;
    const pecho = parseFloat(v("#wm-pecho")) || null;
    const cintura = parseFloat(v("#wm-cintura")) || null;
    const cadera = parseFloat(v("#wm-cadera")) || null;
    const bicep = parseFloat(v("#wm-bicep")) || null;

    state.weightLog = state.weightLog.filter(e => e.date !== fecha);
    state.weightLog.push({ date: fecha, weight: peso });
    state.profile.weight = peso;

    if (pecho || cintura || cadera || bicep || grasa) {
      state.measurements = state.measurements.filter(e => e.date !== fecha);
      const meas = { date: fecha };
      if (pecho)   meas.chest = pecho;
      if (cintura) meas.waist = cintura;
      if (cadera)  meas.hips = cadera;
      if (bicep)   meas.leftArm = bicep;
      if (grasa)   meas.bodyFat = grasa;
      state.measurements.push(meas);
    }
    if (fotoBase64) state.photos.push({ id: uid(), date: fecha, dataUrl: fotoBase64 });
    saveState();

    if (typeof cloudInsertRegistroPeso === "function") {
      await cloudInsertRegistroPeso({
        fecha, peso,
        porcentaje_grasa: grasa, pecho, cintura, cadera, bicep,
        foto_url: fotoBase64
      });
    }

    toast("Peso registrado");
    m.close();
    showView(currentView);
  });
}

// =====================================================
// Photo picker reutilizable (cámara o galería)
// =====================================================
function photoPickerHtml(idBase) {
  return `
    <div class="foto-opciones">
      <button type="button" class="btn btn-sm" data-pick-cam="${idBase}">Tomar foto</button>
      <button type="button" class="btn btn-sm" data-pick-gal="${idBase}">Elegir de galería</button>
      <input type="file" id="${idBase}-cam" accept="image/*" capture="environment" style="display:none">
      <input type="file" id="${idBase}-gal" accept="image/*" style="display:none">
      <div id="${idBase}-preview" class="foto-preview" style="display:none;">
        <img id="${idBase}-img">
        <button type="button" class="btn btn-sm" data-pick-clear="${idBase}">Quitar foto</button>
      </div>
    </div>
  `;
}
function bindPhotoPicker(root, idBase, onPick) {
  const cam = root.querySelector(`#${idBase}-cam`);
  const gal = root.querySelector(`#${idBase}-gal`);
  const preview = root.querySelector(`#${idBase}-preview`);
  const img = root.querySelector(`#${idBase}-img`);
  root.querySelector(`[data-pick-cam="${idBase}"]`).addEventListener("click", () => cam.click());
  root.querySelector(`[data-pick-gal="${idBase}"]`).addEventListener("click", () => gal.click());
  root.querySelector(`[data-pick-clear="${idBase}"]`).addEventListener("click", () => {
    preview.style.display = "none"; img.src = "";
    cam.value = ""; gal.value = "";
    onPick(null);
  });
  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(file instanceof Blob)) {
      toast("No se pudo leer la foto. Intenta de nuevo.");
      return;
    }
    const dataUrl = await compressImage(file, 1024);
    img.src = dataUrl;
    preview.style.display = "flex";
    onPick(dataUrl);
  };
  cam.addEventListener("change", handle);
  gal.addEventListener("change", handle);
}

// =====================================================
// DIETA
// =====================================================
views.diet = function () {
  const p = state.profile;
  const n = calcNutrition(p);
  ensureDailyMenu();
  const meals = state.dailyMenu.meals;
  const dia = diaSel();
  const esHoy = dia === todayISO();
  const tot = dailyTotals(dia);
  const tab = state._dietTab || "plan";

  document.getElementById("content").innerHTML = `
    <div class="view-header">
      <div>
        <h1>Tu plan de alimentación</h1>
        <p>Comida colombiana adaptada a tu objetivo</p>
      </div>
      <button class="btn" id="regen-menu">Generar otro menú</button>
    </div>

    <div class="card" style="margin-bottom: 16px; display:flex; gap:10px; align-items:end; flex-wrap:wrap;">
      <div class="field" style="margin:0; flex:1 1 150px;"><label>Día</label><input type="date" id="diet-date" value="${dia}"></div>
      ${!esHoy ? `<button class="btn btn-sm" id="diet-today" style="flex:0 0 auto;">Ir a hoy</button>` : ""}
      <span class="card-meta" style="padding-bottom:10px;">${esHoy ? "Estás viendo hoy" : "Viendo " + formatDate(dia)}</span>
    </div>

    <div class="card" style="margin-bottom: 18px; padding: 18px 22px;">
      ${dietMacroBar("Calorías", tot.kcal, n.kcal, "kcal", "#D4A017")}
      ${dietMacroBar("Proteína", tot.p, n.protein, "g", "#1B4F8A")}
      ${dietMacroBar("Carbos", tot.c, n.carbs, "g", "#2E9E4F")}
      ${dietMacroBar("Grasa", tot.f, n.fat, "g", "#C0392B")}
    </div>

    <div class="tabbar">
      <button class="tab ${tab === "plan" ? "active" : ""}" data-tab="plan">Plan del día</button>
      <button class="tab ${tab === "log" ? "active" : ""}" data-tab="log">${esHoy ? "Registro de hoy" : "Registro del día"}</button>
      <button class="tab ${tab === "custom" ? "active" : ""}" data-tab="custom">Mis comidas</button>
    </div>
    <div id="tab-content"></div>
  `;

  document.querySelectorAll(".tab[data-tab]").forEach(t =>
    t.addEventListener("click", () => { state._dietTab = t.dataset.tab; views.diet(); }));
  document.getElementById("regen-menu").addEventListener("click", () => {
    ensureDailyMenu(true); views.diet(); toast("Nuevo menú generado");
  });
  document.getElementById("diet-date").addEventListener("change", e => {
    _dietDate = e.target.value || todayISO(); views.diet();
  });
  const dietTodayBtn = document.getElementById("diet-today");
  if (dietTodayBtn) dietTodayBtn.addEventListener("click", () => { _dietDate = todayISO(); views.diet(); });

  if (tab === "plan") renderDietPlanTab(p, n, meals);
  else if (tab === "log") renderDietLogTab(n);
  else renderDietCustomTab();
};

function renderDietPlanTab(p, n, meals) {
  const tabEl = document.getElementById("tab-content");
  tabEl.innerHTML = `
    <div class="card" style="margin-bottom: 18px;">
      <div class="card-title">Tipo de comida</div>
      <div class="pill-group">
        ${["saludable","balanceado","chatarra"].map(t =>
          `<button class="pill ${p.foodPreference === t ? "active" : ""}" data-pref="${t}">${capitalize(t)}</button>`
        ).join("")}
      </div>
      <p style="margin-top:14px; color:var(--text-muted); font-size:13px;">${preferenceDescription(p.foodPreference)}</p>
      <p style="margin-top:6px; color:var(--text-dim); font-size:12px;">El menú se ajusta automáticamente para sumar ~${n.kcal} kcal totales según tu objetivo. Las porciones pueden estar escaladas.</p>
    </div>

    ${["desayuno","almuerzo","snack","cena"].map(slot => {
      const m = meals[slot];
      const adj = m.adjusted;
      const dia = diaSel();
      const already = state.dietLog.find(e => e.date === dia && e.slot === slot && e.name === m.name);
      const logged = state.dietLog.filter(e => e.date === dia && e.slot === slot);
      const slotTot = logged.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { kcal: 0, p: 0, c: 0, f: 0 });
      const photoEntry = logged.slice().reverse().find(e => e.source === "photo" && e.photo);
      const nonPhotoLogged = logged.filter(e => !(e.source === "photo" && e.photo));

      let mainBlock, extraBlock = "";
      if (photoEntry) {
        mainBlock = `
        <div class="recipe-card open">
          <img src="${photoEntry.photo}" alt="" style="width:100%; max-height:240px; object-fit:cover; border-radius:10px; margin-bottom:10px;">
          <div class="recipe-name">${escapeHtml(photoEntry.name)} <span class="card-meta">(tu foto · analizado por IA)</span></div>
          <div class="recipe-meta">
            <span><strong>${photoEntry.kcal}</strong> kcal</span>
            <span><strong>${photoEntry.p}</strong>g prot</span>
            <span><strong>${photoEntry.c}</strong>g carb</span>
            <span><strong>${photoEntry.f}</strong>g grasa</span>
          </div>
          ${photoEntry.descripcion ? `<div class="recipe-detail"><h4>Lo que detectó la IA</h4><p style="color:var(--text-muted)">${escapeHtml(photoEntry.descripcion)}</p></div>` : ""}
        </div>`;
        if (nonPhotoLogged.length) extraBlock = `
        <div class="diet-log-list" style="margin-top:12px; border-top:1px solid var(--border); padding-top:12px;">
          <div class="card-meta" style="margin-bottom:6px;">También en ${slot}:</div>
          ${nonPhotoLogged.slice().reverse().map(e => dietLogRowHtml(e)).join("")}
        </div>`;
      } else if (logged.length > 0) {
        mainBlock = `
        <div class="diet-log-list" style="margin-bottom:4px;">
          ${logged.slice().reverse().map(e => dietLogRowHtml(e)).join("")}
        </div>
        <div style="margin-top:10px; padding-top:8px; border-top:1px solid var(--border); font-size:12px; color:var(--text-dim);">
          ≈ Plan sugerido: <em>${escapeHtml(m.name)}</em> &nbsp;·&nbsp; ${adj.kcal} kcal · porción ${m.multiplier}x
        </div>`;
      } else {
        mainBlock = `
        <div class="recipe-card open">
          <div class="recipe-name">${escapeHtml(m.name)} <span class="card-meta">(sugerencia · porción ${m.multiplier}x)</span></div>
          <div class="recipe-meta">
            <span><strong>${adj.kcal}</strong> kcal</span>
            <span><strong>${adj.p}</strong>g prot</span>
            <span><strong>${adj.c}</strong>g carb</span>
            <span><strong>${adj.f}</strong>g grasa</span>
          </div>
          <div class="recipe-detail">
            <h4>Ingredientes</h4>
            <ul>${m.ingredientes.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
            <h4>Preparación</h4>
            <p style="color:var(--text-muted)">${escapeHtml(m.preparacion)}</p>
          </div>
        </div>`;
      }
      return `
      <div class="card meal-card" style="margin-bottom: 18px;">
        <div class="card-title">${capitalize(slot)} <span class="card-meta">objetivo ~${adj.kcal} kcal${logged.length ? ` · llevas ${Math.round(slotTot.kcal)} kcal` : ""}</span></div>
        ${mainBlock}
        ${extraBlock}
        <div class="meal-actions">
          ${already
            ? `<button class="btn btn-sm btn-success-soft" disabled>✓ Comí la sugerencia</button>`
            : `<button class="btn btn-sm btn-primary log-meal" data-slot="${slot}">Comí esto</button>`}
          <button class="btn btn-sm log-photo" data-slot="${slot}">📷 Subir foto del plato</button>
          <button class="btn btn-sm log-manual" data-slot="${slot}">+ Registrar comida</button>
        </div>
      </div>`;
    }).join("")}
  `;

  document.querySelectorAll(".pill[data-pref]").forEach(b => b.addEventListener("click", () => {
    state.profile.foodPreference = b.dataset.pref; ensureDailyMenu(true); views.diet();
  }));
  document.querySelectorAll(".log-meal").forEach(b => b.addEventListener("click", () => {
    const slot = b.dataset.slot;
    const m = state.dailyMenu.meals[slot];
    logMeal({ slot, name: m.name, kcal: m.adjusted.kcal, p: m.adjusted.p, c: m.adjusted.c, f: m.adjusted.f, source: "plan" });
    toast(`${capitalize(slot)} registrado`); views.diet();
  }));
  document.querySelectorAll(".log-photo").forEach(b => b.addEventListener("click", () => openPhotoLogger(b.dataset.slot)));
  document.querySelectorAll(".log-manual").forEach(b => b.addEventListener("click", () => openManualLogger(b.dataset.slot)));
  bindDietLogRowEvents(document.getElementById("tab-content"));
}

function renderDietLogTab(n) {
  const today = diaSel();
  const todays = state.dietLog.filter(e => e.date === today);
  const tot = dailyTotals(today);
  const tabEl = document.getElementById("tab-content");
  tabEl.innerHTML = `
    <div class="card" style="margin-bottom: 18px;">
      <div class="card-title">${today === todayISO() ? "Hoy " : ""}${formatDate(today)}</div>
      ${macroBar("Calorías", "kcal", tot.kcal, n.kcal, " kcal")}
      ${macroBar("Proteína", "protein", tot.p, n.protein, "g")}
      ${macroBar("Carbos", "carbs", tot.c, n.carbs, "g")}
      ${macroBar("Grasa", "fat", tot.f, n.fat, "g")}
    </div>
    <div class="card" style="margin-bottom: 18px;">
      <div class="card-title">Registrar comida adicional</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-primary" id="add-search">Buscar alimento</button>
        <button class="btn" id="add-from-custom">Desde mis comidas</button>
        <button class="btn" id="add-photo">Foto + IA</button>
        <button class="btn" id="add-manual">Manual</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Comidas de hoy</div>
      ${todays.length === 0 ? `<div class="empty-state"><p>Sin combustible no hay vuelo. Registra tu primera comida.</p></div>` :
        ["desayuno","almuerzo","snack","cena"].map(slot => {
          const rows = todays.filter(e => e.slot === slot);
          if (!rows.length) return "";
          return `<div class="card-meta" style="margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px;">${slot}</div>` +
            rows.slice().reverse().map(e => dietLogRowHtml(e)).join("");
        }).join("")
      }
    </div>
  `;
  document.getElementById("add-search").addEventListener("click", () => openFoodSearch("snack"));
  document.getElementById("add-from-custom").addEventListener("click", openCustomFoodPicker);
  document.getElementById("add-photo").addEventListener("click", () => openPhotoLogger("snack"));
  document.getElementById("add-manual").addEventListener("click", () => openManualLogger("snack"));
  bindDietLogRowEvents(tabEl);
}

function renderDietCustomTab() {
  const tabEl = document.getElementById("tab-content");
  tabEl.innerHTML = `
    <div class="card" style="margin-bottom: 18px;">
      <div class="card-title">Crear comida personal</div>
      <div class="field-row">
        <div class="field"><label>Nombre</label><input type="text" id="cf-name" placeholder="Ej: Mi avena especial"></div>
        <div class="field"><label>Slot</label>
          <select id="cf-slot">
            <option value="desayuno">Desayuno</option><option value="almuerzo">Almuerzo</option>
            <option value="snack">Snack</option><option value="cena">Cena</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Calorías</label><input type="number" id="cf-kcal"></div>
        <div class="field"><label>Proteína (g)</label><input type="number" id="cf-p"></div>
        <div class="field"><label>Carbos (g)</label><input type="number" id="cf-c"></div>
        <div class="field"><label>Grasa (g)</label><input type="number" id="cf-f"></div>
      </div>
      <div class="field"><label>Ingredientes (uno por línea)</label><textarea id="cf-ing" rows="4"></textarea></div>
      <div class="field"><label>Preparación (opcional)</label><textarea id="cf-prep" rows="3"></textarea></div>
      <button class="btn btn-primary" id="cf-save">Guardar comida</button>
    </div>
    <div class="card">
      <div class="card-title">Mis comidas <span class="card-meta">${state.customFoods.length}</span></div>
      ${state.customFoods.length === 0 ? `<div class="empty-state"><p>Aún no has creado comidas personales.</p></div>` :
        `<div class="recipe-grid">
          ${state.customFoods.map(f => `
            <div class="recipe-card open">
              <div class="recipe-name">${escapeHtml(f.name)}</div>
              <div class="recipe-meta">
                <span><strong>${f.kcal}</strong> kcal</span>
                <span><strong>${f.p}</strong>P</span>
                <span><strong>${f.c}</strong>C</span>
                <span><strong>${f.f}</strong>G</span>
              </div>
              <div class="meal-actions">
                <button class="btn btn-sm btn-primary cf-log" data-id="${f.id}">Registrar hoy</button>
                <button class="btn btn-sm cf-del" data-id="${f.id}">Eliminar</button>
              </div>
            </div>
          `).join("")}
        </div>`
      }
    </div>
  `;
  document.getElementById("cf-save").addEventListener("click", () => {
    const v = id => document.getElementById(id).value;
    const name = v("cf-name").trim();
    const kcal = parseInt(v("cf-kcal"));
    if (!name || !kcal) { toast("Faltan nombre o kcal"); return; }
    state.customFoods.push({
      id: uid(), name, slot: v("cf-slot"), kcal,
      p: parseInt(v("cf-p")) || 0, c: parseInt(v("cf-c")) || 0, f: parseInt(v("cf-f")) || 0,
      ingredientes: v("cf-ing").split("\n").map(s => s.trim()).filter(Boolean),
      preparacion: v("cf-prep")
    });
    saveState(); toast("Comida creada"); views.diet();
  });
  document.querySelectorAll(".cf-log").forEach(b => b.addEventListener("click", () => {
    const f = state.customFoods.find(x => x.id === b.dataset.id); if (!f) return;
    logMeal({ slot: f.slot || "snack", name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, source: "custom" });
    toast(`${f.name} registrado`);
  }));
  document.querySelectorAll(".cf-del").forEach(b => b.addEventListener("click", () => {
    if (!confirm("¿Eliminar esta comida?")) return;
    state.customFoods = state.customFoods.filter(x => x.id !== b.dataset.id);
    saveState(); views.diet();
  }));
}

function openCustomFoodPicker() {
  if (state.customFoods.length === 0) {
    toast("No tienes comidas personales aún");
    state._dietTab = "custom"; views.diet(); return;
  }
  const html = `
    <h2>Elegir de mis comidas</h2>
    <div class="field"><label>Slot</label>
      <select id="pick-slot">
        <option value="desayuno">Desayuno</option><option value="almuerzo">Almuerzo</option>
        <option value="snack" selected>Snack</option><option value="cena">Cena</option>
      </select>
    </div>
    <div style="max-height:300px; overflow-y:auto;">
      ${state.customFoods.map(f => `
        <div class="diet-log-row pick-food" data-id="${f.id}" style="cursor:pointer">
          <div>
            <div style="font-weight:500">${escapeHtml(f.name)}</div>
            <div class="card-meta">${f.kcal} kcal</div>
          </div>
          <div class="ex-meta">${f.p}P · ${f.c}C · ${f.f}G</div>
        </div>`).join("")}
    </div>
    <button class="btn btn-block" id="pick-cancel" style="margin-top:14px;">Cancelar</button>
  `;
  const m = modal(html);
  m.root.querySelector("#pick-cancel").addEventListener("click", m.close);
  m.root.querySelectorAll(".pick-food").forEach(el => el.addEventListener("click", () => {
    const f = state.customFoods.find(x => x.id === el.dataset.id); if (!f) return;
    const slot = m.root.querySelector("#pick-slot").value;
    logMeal({ slot, name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, source: "custom" });
    toast(`${f.name} registrado`); m.close(); views.diet();
  }));
}

function openManualLogger(slot) {
  const html = `
    <h2>Registrar comida</h2>
    <p>Escribe el nombre y elige de la lista (se autocompletan las calorías y macros), o ingresa los datos a mano.</p>
    <div class="field">
      <label>Buscar alimento</label>
      <input type="text" id="ml-search" placeholder="Ej: arepa, pollo, sancocho, bandeja paisa…" autocomplete="off">
    </div>
    <div id="ml-results" style="max-height:200px; overflow-y:auto; margin:-4px 0 10px;"></div>
    <div style="margin-bottom:14px; padding:12px; background:var(--bg-elev-2); border:1px solid var(--border); border-radius:8px;">
      <div style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:8px;">O describe tu comida libremente</div>
      <textarea id="ml-ai-text" rows="2" placeholder='Ej: "comí un plato de arroz con pollo y ensalada, más una gaseosa"' style="width:100%; background:var(--bg-elev); border:1px solid var(--border); color:var(--text); padding:9px 11px; border-radius:6px; font-size:13px; resize:none; outline:none; font-family:inherit; margin-bottom:8px;"></textarea>
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <button type="button" class="btn btn-sm" id="ml-ai-btn">Analizar con IA</button>
        <span id="ml-ai-status" style="font-size:12px; color:var(--text-muted);"></span>
      </div>
    </div>
    <div class="field-row">
      <div class="field" style="flex:2;"><label>Nombre</label><input type="text" id="ml-name"></div>
      <div class="field"><label>Comida</label>
        <select id="ml-slot">
          <option value="desayuno" ${slot==="desayuno"?"selected":""}>Desayuno</option>
          <option value="almuerzo" ${slot==="almuerzo"?"selected":""}>Almuerzo</option>
          <option value="snack" ${slot==="snack"?"selected":""}>Snack</option>
          <option value="cena" ${slot==="cena"?"selected":""}>Cena</option>
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Porción (x)</label><input type="number" id="ml-mult" value="1" step="0.25" min="0.25"></div>
      <div class="field"><label>Kcal</label><input type="number" id="ml-kcal"></div>
      <div class="field"><label>Prot (g)</label><input type="number" id="ml-p"></div>
      <div class="field"><label>Carb (g)</label><input type="number" id="ml-c"></div>
      <div class="field"><label>Grasa (g)</label><input type="number" id="ml-f"></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn btn-primary btn-block" id="ml-save">Registrar</button>
      <button class="btn btn-block" id="ml-cancel">Cancelar</button>
    </div>
  `;
  const m = modal(html);
  const q = sel => m.root.querySelector(sel);
  let base = null; // alimento elegido del repositorio: { kcal, p, c, f } por 1 porción

  function renderResults(list) {
    const box = q("#ml-results");
    if (!list.length) { box.innerHTML = `<div class="card-meta" style="padding:8px 2px;">Sin resultados. Puedes registrarlo manualmente abajo.</div>`; return; }
    box.innerHTML = list.map((f, i) => `
      <div class="diet-log-row ml-pick" data-i="${i}" style="cursor:pointer;">
        <div style="min-width:0;"><div style="font-weight:500;overflow-wrap:anywhere;">${escapeHtml(f.name)}</div><div class="card-meta">${capitalize(f.slot)}</div></div>
        <div class="ex-meta"><strong>${f.kcal}</strong> kcal · ${f.p}P/${f.c}C/${f.f}G</div>
      </div>`).join("");
    box.querySelectorAll(".ml-pick").forEach(el => el.addEventListener("click", () => {
      const f = list[parseInt(el.dataset.i)];
      base = { kcal: f.kcal, p: f.p, c: f.c, f: f.f };
      q("#ml-name").value = f.name;
      if (f.slot) q("#ml-slot").value = f.slot;
      q("#ml-mult").value = "1";
      applyMult();
      q("#ml-results").innerHTML = "";
      q("#ml-search").value = "";
    }));
  }
  function applyMult() {
    if (!base) return;
    const k = Math.max(0.25, parseFloat(q("#ml-mult").value) || 1);
    q("#ml-kcal").value = Math.round(base.kcal * k);
    q("#ml-p").value = Math.round(base.p * k);
    q("#ml-c").value = Math.round(base.c * k);
    q("#ml-f").value = Math.round(base.f * k);
  }
  renderResults(searchFoodRepository("", 12));
  q("#ml-search").addEventListener("input", () => renderResults(searchFoodRepository(q("#ml-search").value, 12)));
  q("#ml-ai-btn").addEventListener("click", async () => {
    const text = q("#ml-ai-text").value.trim();
    if (!text) { toast("Describe la comida primero"); return; }
    const statusEl = q("#ml-ai-status");
    const btn = q("#ml-ai-btn");
    statusEl.textContent = "Analizando tu comida...";
    statusEl.style.color = "var(--text-muted)";
    btn.disabled = true;
    try {
      const prompt = `Eres un nutricionista experto en comida colombiana. El usuario describe lo que comió: "${text.replace(/"/g, "'")}". Responde SOLO con JSON válido, sin texto adicional, sin markdown:\n{"nombre":"nombre descriptivo","calorias":numero,"proteina":numero,"carbos":numero,"grasa":numero,"porcion":"descripcion de la porcion estimada"}`;
      const result = await callWorker({ message: prompt });
      const match = result.match(/\{[\s\S]*?\}/);
      if (!match) throw new Error("JSON inválido");
      const data = JSON.parse(match[0]);
      if (!data.nombre || typeof data.calorias !== "number") throw new Error("Datos incompletos");
      q("#ml-name").value = data.nombre;
      q("#ml-kcal").value = data.calorias;
      q("#ml-p").value = data.proteina || 0;
      q("#ml-c").value = data.carbos || 0;
      q("#ml-f").value = data.grasa || 0;
      base = null;
      statusEl.textContent = `✓ Estimado por IA${data.porcion ? " · " + data.porcion : ""} — puedes ajustar`;
      statusEl.style.color = "var(--success)";
    } catch {
      statusEl.textContent = "No pude analizar eso. Intenta ser más específico o usa el buscador.";
      statusEl.style.color = "var(--danger)";
    } finally {
      btn.disabled = false;
    }
  });
  q("#ml-mult").addEventListener("input", applyMult);
  // si el usuario edita los macros a mano, dejamos de escalar desde 'base'
  ["#ml-kcal","#ml-p","#ml-c","#ml-f"].forEach(sel => q(sel).addEventListener("input", () => { base = null; }));

  q("#ml-cancel").addEventListener("click", m.close);
  q("#ml-save").addEventListener("click", () => {
    const name = q("#ml-name").value.trim();
    const kcal = parseInt(q("#ml-kcal").value);
    if (!name || isNaN(kcal)) { toast("Faltan nombre o kcal"); return; }
    logMeal({ slot: q("#ml-slot").value, name, kcal, p: parseInt(q("#ml-p").value) || 0, c: parseInt(q("#ml-c").value) || 0, f: parseInt(q("#ml-f").value) || 0, source: "manual" });
    toast("Comida registrada"); m.close(); views.diet();
  });
}

function openPhotoLogger(slot) {
  let currentDataUrl = null;
  const html = `
    <h2>Foto del plato</h2>
    <p>Subiré la foto a la IA y estimaré las calorías y macros automáticamente.</p>
    <div class="field"><label>Comida</label>
      <select id="ph-slot">
        <option value="desayuno" ${slot==="desayuno"?"selected":""}>Desayuno</option>
        <option value="almuerzo" ${slot==="almuerzo"?"selected":""}>Almuerzo</option>
        <option value="snack" ${slot==="snack"||!slot?"selected":""}>Snack</option>
        <option value="cena" ${slot==="cena"?"selected":""}>Cena</option>
      </select>
    </div>
    ${photoPickerHtml("ph-foto")}
    <div id="ph-result" style="display:none; margin-top:14px;"></div>
    <button class="btn btn-block" id="ph-cancel" style="margin-top:14px;">Cancelar</button>
  `;
  const m = modal(html);
  m.root.querySelector("#ph-cancel").addEventListener("click", m.close);
  bindPhotoPicker(m.root, "ph-foto", async (dataUrl) => {
    currentDataUrl = dataUrl;
    const result = m.root.querySelector("#ph-result");
    if (!dataUrl) { result.style.display = "none"; result.innerHTML = ""; return; }
    result.style.display = "block";
    result.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">Analizando con IA…</div>`;
    try {
      const r = await analyzeFoodPhoto(dataUrl);
      const confColor = r.confianza === "alta" ? "#4CAF50" : r.confianza === "media" ? "#FFC107" : "#F44336";
      const confLabel = r.confianza === "alta"
        ? "✓ Identificado con alta confianza"
        : r.confianza === "media"
        ? "⚠ Revisa el nombre y los valores"
        : "⚠ Foto poco clara — por favor corrige los datos";
      result.innerHTML = `
        <div class="recipe-card open" style="margin:0;">
          <div class="recipe-name">${escapeHtml(r.nombre)}</div>
          ${r.porcion ? `<div class="card-meta" style="margin-bottom:8px;">${escapeHtml(r.porcion)}</div>` : ""}
          <div class="recipe-meta">
            <span><strong>${r.kcal}</strong> kcal</span>
            <span><strong>${r.p}</strong>g prot</span>
            <span><strong>${r.c}</strong>g carb</span>
            <span><strong>${r.f}</strong>g grasa</span>
          </div>
        </div>
        <div style="color:${confColor}; font-size:13px; margin-top:10px;">${confLabel}</div>
        ${r.nota ? `<div style="color:var(--text-dim); font-size:12px; margin-top:4px;">${escapeHtml(r.nota)}</div>` : ""}
        <button class="btn btn-primary btn-block" id="ph-confirm" style="margin-top:12px;">Registrar esta comida</button>
      `;
      m.root.querySelector("#ph-confirm").addEventListener("click", () => {
        const s = m.root.querySelector("#ph-slot").value;
        const mc = modal(`
          <h2 style="margin:0 0 4px;">🦅 ¿Esto es lo que comiste?</h2>
          <p style="margin:0 0 14px;">Puedes editar el nombre y los valores antes de guardar</p>
          <div style="color:${confColor}; font-size:13px; margin-bottom:14px;">${confLabel}</div>
          <div class="field" style="margin-bottom:12px;">
            <label>Nombre del plato</label>
            <input type="text" id="cf-nombre" value="${escapeHtml(r.nombre)}" style="width:100%; min-width:0; box-sizing:border-box;">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
            <div class="field"><label>Calorías</label><input type="number" id="cf-kcal" value="${r.kcal}" min="0" style="width:100%; min-width:0; box-sizing:border-box;"></div>
            <div class="field"><label>Proteína (g)</label><input type="number" id="cf-p" value="${r.p}" min="0" style="width:100%; min-width:0; box-sizing:border-box;"></div>
            <div class="field"><label>Carbos (g)</label><input type="number" id="cf-c" value="${r.c}" min="0" style="width:100%; min-width:0; box-sizing:border-box;"></div>
            <div class="field"><label>Grasa (g)</label><input type="number" id="cf-f" value="${r.f}" min="0" style="width:100%; min-width:0; box-sizing:border-box;"></div>
          </div>
          ${r.porcion ? `<div style="color:var(--text-muted); font-size:12px; margin-bottom:6px;">Porción estimada: ${escapeHtml(r.porcion)}</div>` : ""}
          ${r.nota ? `<div style="color:var(--text-dim); font-size:12px; margin-bottom:12px;">${escapeHtml(r.nota)}</div>` : ""}
          <div style="display:flex; gap:10px; margin-top:8px;">
            <button id="cf-save" style="flex:1; background:#D4A017; color:#000; border:none; border-radius:8px; padding:12px; font-weight:600; font-size:14px; cursor:pointer;">✓ Guardar así</button>
            <button id="cf-cancel" style="flex:1; background:transparent; color:var(--text-muted); border:1px solid #555; border-radius:8px; padding:12px; font-size:14px; cursor:pointer;">✗ Cancelar</button>
          </div>
        `);
        mc.root.querySelector(".modal").style.background = "#1A1A18";
        mc.root.querySelector(".modal").style.borderColor = "#D4A017";
        mc.root.querySelector("#cf-cancel").addEventListener("click", mc.close);
        mc.root.querySelector("#cf-save").addEventListener("click", () => {
          const nombre = mc.root.querySelector("#cf-nombre").value.trim() || r.nombre;
          const kcal = Math.max(0, Math.round(Number(mc.root.querySelector("#cf-kcal").value) || 0));
          const p = Math.max(0, Math.round(Number(mc.root.querySelector("#cf-p").value) || 0));
          const c = Math.max(0, Math.round(Number(mc.root.querySelector("#cf-c").value) || 0));
          const f = Math.max(0, Math.round(Number(mc.root.querySelector("#cf-f").value) || 0));
          logMeal({ slot: s, name: nombre, descripcion: r.porcion || "", kcal, p, c, f, source: "photo", photo: currentDataUrl });
          toast("Comida registrada por IA");
          mc.close();
          m.close();
          views.diet();
        });
      });
    } catch (err) {
      result.innerHTML = `<div style="color:var(--danger); font-size:13px;">${escapeHtml(err.message || String(err))}</div>`;
    }
  });
}

// =====================================================
// WORKOUT
// =====================================================
views.workout = function () {
  const p = state.profile;
  const tab = state._workoutTab || "today";
  const r = getActiveRoutine();

  document.getElementById("content").innerHTML = `
    <div class="view-header">
      <div>
        <h1>Tu rutina de entrenamiento</h1>
        <p>${r.isCustom ? `Rutina personal: ${escapeHtml(r.name)}` : `${r.distributionName || ""} · ${trainingGoalLabel(p.trainingGoal)} · ${p.trainingDays} días/semana`}</p>
      </div>
      <button class="btn" id="regen-routine">Usar rutina automática</button>
    </div>

    <div class="grid-3" style="margin-bottom: 18px;">
      <div class="stat-card"><div class="label">Series</div><div class="value">${r.goalParams ? r.goalParams.sets : "—"}</div></div>
      <div class="stat-card"><div class="label">Reps</div><div class="value">${r.goalParams ? r.goalParams.reps : "—"}</div></div>
      <div class="stat-card"><div class="label">Descanso</div><div class="value">${r.goalParams ? r.goalParams.rest : "—"}</div></div>
    </div>

    <div class="tabbar">
      <button class="tab ${tab==="today"?"active":""}" data-wtab="today">Sesión de hoy</button>
      <button class="tab ${tab==="plan"?"active":""}" data-wtab="plan">Plan completo</button>
      <button class="tab ${tab==="config"?"active":""}" data-wtab="config">Configuración</button>
      <button class="tab ${tab==="custom"?"active":""}" data-wtab="custom">Mis rutinas</button>
    </div>
    <div id="wtab-content"></div>
  `;
  document.querySelectorAll(".tab[data-wtab]").forEach(t => t.addEventListener("click", () => {
    state._workoutTab = t.dataset.wtab; views.workout();
  }));
  document.getElementById("regen-routine").addEventListener("click", () => {
    state.useCustomRoutine = false; saveState(); views.workout(); toast("Rutina automática activa");
  });

  if (tab === "today") renderWorkoutToday(r);
  else if (tab === "plan") renderWorkoutPlan(r);
  else if (tab === "config") renderWorkoutConfig(p, r);
  else renderWorkoutCustom();
};

function renderWorkoutToday(r) {
  const tabEl = document.getElementById("wtab-content");
  if (r.days.length === 0) {
    tabEl.innerHTML = `<div class="rest-day"><h3 style="color:var(--text)">Sin entrenamientos programados</h3><p>Tu objetivo se alcanzará con dieta. Si quieres entrenar, configura los días en la pestaña Configuración.</p></div>`;
    return;
  }
  const week = state.workouts.filter(w => { const [y,m,d]=w.date.split('-').map(Number); return new Date(y,m-1,d) >= startOfWeek(new Date()); });
  const todayIdx = week.length % r.days.length;
  state._wActiveDay = state._wActiveDay ?? todayIdx;

  tabEl.innerHTML = `
    <div class="card" style="margin-bottom: 14px;">
      <div class="card-title">Selecciona el día a entrenar</div>
      <div class="pill-group" id="day-picker">
        ${r.days.map((d, i) => `<button class="pill ${state._wActiveDay === i ? "active" : ""}" data-i="${i}">${d.label}</button>`).join("")}
      </div>
    </div>
    <div id="active-day"></div>
  `;
  document.querySelectorAll("#day-picker .pill").forEach(b => b.addEventListener("click", () => {
    state._wActiveDay = parseInt(b.dataset.i);
    renderWorkoutToday(r);
  }));
  renderActiveDay(r, state._wActiveDay);
}

function renderActiveDay(r, dayIdx) {
  const day = r.days[dayIdx]; if (!day) return;
  const today = todayISO();
  const sessionId = `${today}-d${dayIdx}`;
  const containerEl = document.getElementById("active-day");
  containerEl.innerHTML = `
    <div class="workout-day">
      <div class="workout-day-header">
        <h3>${day.label}</h3>
        <div class="muscle-tags">${day.muscleGroups.map(g => `<span class="muscle-tag">${g}</span>`).join("")}</div>
      </div>
      ${day.exercises.length === 0
        ? `<div class="empty-state"><p>Este día no tiene ejercicios porque evitas todos sus grupos musculares. Ajusta tus restricciones en Perfil o añade un ejercicio extra abajo.</p></div>`
        : day.exercises.map(ex => exerciseLogBlock(ex, sessionId)).join("")}
      <div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;">
        <button class="btn btn-primary" id="finish-session">Finalizar sesión</button>
        <button class="btn" id="add-extra-ex">+ Añadir ejercicio extra</button>
      </div>
    </div>
  `;
  wireRowElements(document);
  document.querySelectorAll(".add-set-btn").forEach(b => b.addEventListener("click", () => addExtraSet(b.dataset.exname, b.dataset.group, b.dataset.equipo, sessionId)));
  document.getElementById("finish-session").addEventListener("click", () => {
    if (state.workouts.find(w => w.date === today && w.dayIndex === dayIdx)) {
      toast("Esta sesión ya está marcada como completada"); return;
    }
    state.workouts.push({ id: uid(), date: today, dayIndex: dayIdx, sessionLabel: day.label });
    saveState(); toast("¡Sesión completada!"); views.workout();
    if (typeof gamiOnActivity === "function") gamiOnActivity("workout");
  });
  document.getElementById("add-extra-ex").addEventListener("click", () => openExtraExercisePicker(sessionId));
}

function exerciseLogBlock(ex, sessionId) {
  const setsCount = parseInt((ex.sets || "3").toString().split("-")[0]) || 3;
  // Antes esto exigía sessionId EXACTO ("<fecha>-d<idx>"). El problema: los sets
  // que cloudHydrate() reconstruye desde Supabase después de cerrar y reabrir la
  // app llevan un sessionId distinto ("<fecha>-cloud"), porque la tabla
  // "entrenamientos" no guarda a qué día del split pertenecía cada set. Con el
  // match exacto, esos sets SÍ estaban guardados (se veían en Supabase) pero
  // nunca calzaban con el filtro, así que la pantalla los mostraba vacíos —
  // parecía que "no se guardaba" aunque el dato sí existía. Ahora se matchea
  // por fecha + nombre del ejercicio, que es lo que en verdad define "ya hice
  // esto hoy", sin importar bajo qué sessionId haya quedado guardado.
  const today = todayISO();
  const allToday = state.setLog.filter(s => s.date === today && s.exerciseName === ex.name);
  // Las "gotas" de un dropset (dropsetStage > 0) no forman su propia fila
  // numerada — se muestran anidadas bajo el set principal del mismo grupo
  // (mismo dropsetGroupId, dropsetStage 0). Solo el set principal cuenta
  // para la numeración "Set 1, 2, 3…".
  const existingSets = allToday.filter(s => !(s.dropsetGroupId && s.dropsetStage > 0));
  const rows = [];
  for (let i = 0; i < Math.max(setsCount, existingSets.length); i++) {
    const main = existingSets[i];
    const drops = main && main.dropsetGroupId
      ? allToday.filter(s => s.dropsetGroupId === main.dropsetGroupId && s.dropsetStage > 0).sort((a, b) => a.dropsetStage - b.dropsetStage)
      : [];
    rows.push(setRowHtml(ex, sessionId, i, main, drops));
  }
  return `
    <div class="exercise-log-block">
      <div class="exercise-log-header">
        <div>
          <div class="ex-name">${escapeHtml(ex.name)}</div>
          <div class="ex-equip">${ex.group} · ${ex.equipo} · ${ex.sets} series · ${ex.reps} reps · descanso ${ex.rest}</div>
        </div>
      </div>
      <div class="set-table">
        <div class="set-table-head"><span>Set</span><span>Peso</span><span>Reps</span><span>Hecho</span></div>
        ${rows.join("")}
      </div>
      <button class="btn btn-sm add-set-btn" data-exname="${escapeHtml(ex.name)}" data-group="${ex.group}" data-equipo="${escapeHtml(ex.equipo || "")}">+ Añadir set</button>
    </div>
  `;
}

function setRowHtml(ex, sessionId, idx, existing, drops) {
  drops = drops || [];
  const unit = (existing && existing.unit) || state.units || "kg";
  const weight = existing ? existing.weight : "";
  const reps = existing ? existing.reps : "";
  const done = !!existing;
  const mainRow = `
    <div class="set-row ${done?"done":""}" data-exname="${escapeHtml(ex.name)}" data-group="${ex.group}" data-equipo="${escapeHtml(ex.equipo || "")}" data-session="${sessionId}" data-idx="${idx}" ${existing ? `data-id="${existing.id}"` : ""}>
      <span class="set-num">${idx + 1}</span>
      <div class="set-weight">
        <input type="number" step="0.5" class="weight-input" value="${weight}" placeholder="0">
        <select class="unit-select">
          <option value="kg" ${unit==="kg"?"selected":""}>kg</option>
          <option value="lb" ${unit==="lb"?"selected":""}>lb</option>
        </select>
      </div>
      <input type="number" class="reps-input" value="${reps}" placeholder="${ex.reps}">
      <button class="set-check ${done?"done":""}" title="Marcar set">✓</button>
    </div>
  `;
  // Gotas YA guardadas (el set principal ya se marcó con dropset) — se ven y
  // se editan igual que un set normal ya hecho, solo que anidadas.
  const savedDropRows = drops.map(d => `
    <div class="drop-row done" data-exname="${escapeHtml(ex.name)}" data-group="${ex.group}" data-equipo="${escapeHtml(ex.equipo || "")}" data-session="${sessionId}" data-id="${d.id}">
      <span class="set-num">↳ gota ${d.dropsetStage}</span>
      <div class="set-weight">
        <input type="number" step="0.5" class="weight-input" value="${d.weight}" placeholder="0">
        <select class="unit-select">
          <option value="kg" ${d.unit==="kg"?"selected":""}>kg</option>
          <option value="lb" ${d.unit==="lb"?"selected":""}>lb</option>
        </select>
      </div>
      <input type="number" class="reps-input" value="${d.reps}" placeholder="${ex.reps}">
      <button class="set-check done" title="Marcar gota">✓</button>
    </div>
  `).join("");
  // Mientras el set principal no se haya marcado, se puede tocar "🔻 Añadir
  // dropset" para abrir uno o más inputs de "gota" — todos se guardan JUNTO
  // con el set principal al presionar su ✓ (un solo dropsetGroupId nuevo
  // para todos). Una vez marcado no se puede agregar retroactivamente,
  // porque "entrenamientos" no tiene hoy una función para editar una fila
  // ya subida a la nube — más simple y confiable que intentarlo.
  const pendingUi = done ? "" : `
    <div class="drop-slots"></div>
    <button type="button" class="btn btn-sm btn-ghost add-drop-toggle" data-repsph="${escapeHtml(String(ex.reps || ""))}">🔻 Añadir dropset</button>
  `;
  return `<div class="set-group">${mainRow}${savedDropRows}${pendingUi}</div>`;
}

// Agrega un input de "gota" pendiente (sin guardar todavía) debajo del set
// principal — se llena el peso reducido + reps y se guarda junto con el set
// principal cuando se presiona su ✓.
function addDropSlot(btn) {
  const group = btn.closest(".set-group");
  const slots = group ? group.querySelector(".drop-slots") : null;
  if (!slots) return;
  const stage = slots.children.length + 1;
  const unit = state.units || "kg";
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="drop-row drop-slot">
      <span class="set-num">↳ gota ${stage}</span>
      <div class="set-weight">
        <input type="number" step="0.5" class="weight-input" placeholder="0">
        <select class="unit-select">
          <option value="kg" ${unit==="kg"?"selected":""}>kg</option>
          <option value="lb" ${unit==="lb"?"selected":""}>lb</option>
        </select>
      </div>
      <input type="number" class="reps-input" placeholder="${escapeHtml(btn.dataset.repsph || "")}">
      <button type="button" class="drop-remove" title="Quitar esta gota">✕</button>
    </div>
  `;
  const row = wrapper.firstElementChild;
  row.querySelector(".drop-remove").addEventListener("click", () => {
    row.remove();
    Array.from(slots.children).forEach((el, i) => {
      el.querySelector(".set-num").textContent = `↳ gota ${i + 1}`;
    });
  });
  slots.appendChild(row);
}

// Conecta los listeners de todas las filas de set/gota y botones "Añadir
// dropset" dentro de container que todavía no tengan listener (data-wired) —
// se puede llamar sobre document entero o sobre un contenedor puntual sin
// riesgo de duplicar listeners en filas ya conectadas antes.
function wireRowElements(container) {
  container.querySelectorAll(".set-row, .drop-row").forEach(row => {
    if (row.dataset.wired) return;
    row.dataset.wired = "1";
    attachSetRowListeners(row);
  });
  container.querySelectorAll(".add-drop-toggle").forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", () => addDropSlot(btn));
  });
}

function attachSetRowListeners(row) {
  const check = row.querySelector(".set-check");
  if (!check) return; // gotas pendientes sin guardar: no tienen check propio
  check.addEventListener("click", () => {
    const isBodyweight = row.dataset.equipo === "peso corporal";
    const w = parseFloat(row.querySelector(".weight-input").value) || 0;
    const r = parseInt(row.querySelector(".reps-input").value);
    const u = row.querySelector(".unit-select").value;
    // Ejercicios de peso corporal (flexiones, dominadas, plancha…) no tienen "peso" que
    // registrar — antes esto bloqueaba marcar el set salvo que el usuario inventara un peso falso.
    if (!r || (!isBodyweight && !w)) {
      toast(isBodyweight ? "Indica las repeticiones antes de marcar" : "Indica peso y reps antes de marcar");
      return;
    }
    const id = row.dataset.id;
    if (id) {
      const item = state.setLog.find(s => s.id === id);
      if (item) { item.weight = w; item.reps = r; item.unit = u; }
      state.units = u; saveState();
      row.classList.add("done"); check.classList.add("done");
      toast("Set guardado");
      if (typeof gamiOnActivity === "function") gamiOnActivity("workout");
      return;
    }

    // Set nuevo. Si el usuario agregó "gotas" (🔻 Añadir dropset) antes de
    // marcar, las guardamos todas juntas con un dropsetGroupId compartido —
    // una sola operación, en vez de depender de poder "editar" en la nube
    // un set que ya se insertó.
    const group = row.closest(".set-group");
    const slots = group ? group.querySelector(".drop-slots") : null;
    const dropInputs = slots ? Array.from(slots.children).map(dr => ({
      w: parseFloat(dr.querySelector(".weight-input").value) || 0,
      r: parseInt(dr.querySelector(".reps-input").value),
      u: dr.querySelector(".unit-select").value,
      el: dr
    })).filter(d => d.r && (isBodyweight || d.w)) : []; // gotas incompletas (sin reps, o sin peso salvo peso corporal) se ignoran

    const groupId = dropInputs.length ? uid() : null;
    const item = { id: uid(), date: todayISO(), sessionId: row.dataset.session, exerciseName: row.dataset.exname, group: row.dataset.group, weight: w, reps: r, unit: u, synced: false };
    if (groupId) { item.dropsetGroupId = groupId; item.dropsetStage = 0; }
    state.setLog.push(item);
    row.dataset.id = item.id;
    // "synced" queda en false hasta que el insert a Supabase confirme —
    // así cloudHydrate() sabe que este set todavía no debe pisarse si la
    // app se cierra antes de que la petición termine (ver cloud-sync.js).
    if (typeof cloudInsertSet === "function") {
      Promise.resolve(cloudInsertSet(item)).then(ok => { if (ok) { item.synced = true; saveState(); } });
    }

    dropInputs.forEach((d, i) => {
      const dItem = { id: uid(), date: todayISO(), sessionId: row.dataset.session, exerciseName: row.dataset.exname, group: row.dataset.group, weight: d.w, reps: d.r, unit: d.u, synced: false, dropsetGroupId: groupId, dropsetStage: i + 1 };
      state.setLog.push(dItem);
      if (typeof cloudInsertSet === "function") {
        Promise.resolve(cloudInsertSet(dItem)).then(ok => { if (ok) { dItem.synced = true; saveState(); } });
      }
      d.el.classList.add("done");
      d.el.dataset.id = dItem.id;
      const removeBtn = d.el.querySelector(".drop-remove");
      if (removeBtn) removeBtn.outerHTML = `<button class="set-check done" title="Gota guardada">✓</button>`;
    });

    // Ya se guardó todo — quita cualquier slot que haya quedado vacío/sin
    // usar y el botón de "añadir dropset" (ya no se puede seguir agregando).
    if (group) {
      if (slots) Array.from(slots.children).forEach(el => { if (!el.classList.contains("done")) el.remove(); });
      const toggle = group.querySelector(".add-drop-toggle");
      if (toggle) toggle.remove();
    }

    state.units = u; saveState();
    row.classList.add("done"); check.classList.add("done");
    toast(groupId ? `Dropset guardado (${1 + dropInputs.length} pasos)` : "Set guardado");
    if (typeof gamiOnActivity === "function") gamiOnActivity("workout");
  });
  ["weight-input", "reps-input", "unit-select"].forEach(cls => {
    const el = row.querySelector("." + cls);
    el.addEventListener("change", () => {
      if (!row.dataset.id) return;
      const item = state.setLog.find(s => s.id === row.dataset.id); if (!item) return;
      item.weight = parseFloat(row.querySelector(".weight-input").value) || 0;
      item.reps = parseInt(row.querySelector(".reps-input").value) || 0;
      item.unit = row.querySelector(".unit-select").value;
      state.units = item.unit; saveState();
    });
  });
}

function addExtraSet(exname, group, equipo, sessionId) {
  const block = Array.from(document.querySelectorAll(".exercise-log-block"))
    .find(b => b.querySelector(".ex-name").textContent === exname);
  if (!block) return;
  const table = block.querySelector(".set-table");
  const idx = block.querySelectorAll(".set-row").length;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = setRowHtml({ name: exname, group, equipo, reps: "" }, sessionId, idx, null, []);
  Array.from(wrapper.children).forEach(el => table.appendChild(el));
  wireRowElements(table);
}

function openExtraExercisePicker(sessionId) {
  const all = [];
  Object.entries(EXERCISES).forEach(([g, list]) => list.forEach(e => all.push({ ...e, group: g })));
  state.customExercises.forEach(e => all.push(e));
  const html = `
    <h2>Añadir ejercicio extra</h2>
    <div class="field"><label>Buscar</label><input type="text" id="extra-search" placeholder="press, sentadilla…"></div>
    <div id="extra-list" style="max-height: 360px; overflow-y: auto;">
      ${all.map(e => `<div class="extra-ex-item" data-name="${escapeHtml(e.name)}" data-group="${e.group}" data-equipo="${escapeHtml(e.equipo)}" style="padding:10px; border-bottom:1px solid var(--border); cursor:pointer;">
        <div style="font-weight:500">${escapeHtml(e.name)}</div>
        <div class="card-meta">${e.group} · ${e.equipo}</div>
      </div>`).join("")}
    </div>
    <button class="btn btn-block" id="extra-cancel" style="margin-top:14px;">Cancelar</button>
  `;
  const m = modal(html);
  m.root.querySelector("#extra-cancel").addEventListener("click", m.close);
  m.root.querySelector("#extra-search").addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    m.root.querySelectorAll(".extra-ex-item").forEach(it => {
      it.style.display = it.dataset.name.toLowerCase().includes(q) || it.dataset.group.includes(q) ? "block" : "none";
    });
  });
  m.root.querySelectorAll(".extra-ex-item").forEach(el => el.addEventListener("click", () => {
    const name = el.dataset.name, group = el.dataset.group, equipo = el.dataset.equipo;
    const fakeEx = { name, group, equipo, sets: "3", reps: "8-12", rest: "60-90s" };
    const container = document.getElementById("active-day");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = exerciseLogBlock(fakeEx, sessionId);
    const finishBtn = container.querySelector("#finish-session").parentElement;
    container.querySelector(".workout-day").insertBefore(wrapper.firstElementChild, finishBtn);
    wireRowElements(container);
    container.querySelectorAll(".add-set-btn").forEach(b => b.addEventListener("click", () => addExtraSet(b.dataset.exname, b.dataset.group, b.dataset.equipo, sessionId)));
    m.close();
  }));
}

function renderWorkoutPlan(r) {
  const tabEl = document.getElementById("wtab-content");
  if (r.days.length === 0) { tabEl.innerHTML = `<div class="rest-day"><p>Sin entrenamientos programados.</p></div>`; return; }
  tabEl.innerHTML = r.days.map(day => `
    <div class="workout-day">
      <div class="workout-day-header">
        <h3>${day.label}</h3>
        <div class="muscle-tags">${day.muscleGroups.map(g => `<span class="muscle-tag">${g}</span>`).join("")}</div>
      </div>
      ${day.exercises.length === 0 ? `<div class="empty-state"><p>Sin ejercicios este día (grupos musculares evitados).</p></div>` : ""}
      ${day.exercises.map(ex => `
        <div class="exercise-row">
          <div>
            <span class="ex-name">${escapeHtml(ex.name)}</span>
            <span class="ex-equip">${ex.group} · ${ex.equipo}</span>
          </div>
          <div class="ex-meta"><strong>${ex.sets}</strong> series</div>
          <div class="ex-meta"><strong>${ex.reps}</strong> reps</div>
          <div class="ex-meta">descanso <strong>${ex.rest}</strong></div>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function renderWorkoutConfig(p, r) {
  const tabEl = document.getElementById("wtab-content");
  tabEl.innerHTML = `
    <div class="card">
      <div class="card-title">Configuración del entrenamiento</div>
      <div class="field-row">
        <div class="field"><label>Objetivo</label>
          <select id="w-goal">
            ${["hipertrofia","fuerza","resistencia","potencia"].map(g =>
              `<option value="${g}" ${p.trainingGoal===g?"selected":""}>${trainingGoalLabel(g)}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>Días por semana</label><input type="number" id="w-days" min="0" max="7" value="${p.trainingDays}"></div>
        <div class="field"><label>Distribución</label>
          <select id="w-dist">
            <option value="auto" ${p.distribution==="auto"?"selected":""}>Automática (recomendada)</option>
            <option value="fullbody" ${p.distribution==="fullbody"?"selected":""}>Full Body</option>
            <option value="upperlower" ${p.distribution==="upperlower"?"selected":""}>Upper / Lower</option>
            <option value="ppl" ${p.distribution==="ppl"?"selected":""}>Push / Pull / Legs</option>
            <option value="brosplit" ${p.distribution==="brosplit"?"selected":""}>Bro Split</option>
          </select>
        </div>
      </div>
      <p style="color:var(--text-muted); font-size:13px; margin-top:8px;">
        ${r.distributionDesc || ""} ${r.goalParams ? "<br><strong style='color:var(--text)'>Sobre el objetivo:</strong> " + r.goalParams.desc : ""}
      </p>
    </div>
  `;
  document.getElementById("w-goal").addEventListener("change", e => { state.profile.trainingGoal = e.target.value; saveState(); views.workout(); });
  document.getElementById("w-days").addEventListener("change", e => {
    state.profile.trainingDays = Math.max(0, Math.min(7, parseInt(e.target.value) || 0));
    saveState(); views.workout();
  });
  document.getElementById("w-dist").addEventListener("change", e => { state.profile.distribution = e.target.value; saveState(); views.workout(); });
}

function renderWorkoutCustom() {
  const tabEl = document.getElementById("wtab-content");
  tabEl.innerHTML = `
    <div class="card" style="margin-bottom: 18px;">
      <div class="card-title">Mis rutinas <span class="card-meta">${state.customRoutines.length}</span></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom: 14px;">
        <button class="btn btn-primary" id="new-routine">+ Nueva rutina</button>
        <button class="btn" id="import-excel">Importar historial Excel</button>
      </div>
      ${state.customRoutines.length === 0 ?
        `<div class="empty-state"><p>El cóndor no nació volando — crea tu primera rutina personalizada.</p></div>` :
        state.customRoutines.map(cr => `
          <div class="custom-routine-row ${state.useCustomRoutine && state.activeCustomRoutineId === cr.id ? "active" : ""}">
            <div>
              <div style="font-weight:600">${escapeHtml(cr.name)}</div>
              <div class="card-meta">${cr.days.length} días · ${cr.days.reduce((a,d)=>a+d.exercises.length,0)} ejercicios</div>
            </div>
            <div style="display:flex; gap:8px;">
              ${state.useCustomRoutine && state.activeCustomRoutineId === cr.id ?
                `<span class="muscle-tag">Activa</span>` :
                `<button class="btn btn-sm cr-activate" data-id="${cr.id}">Activar</button>`}
              <button class="btn btn-sm cr-edit" data-id="${cr.id}">Editar</button>
              <button class="btn btn-sm cr-del" data-id="${cr.id}">Eliminar</button>
            </div>
          </div>
        `).join("")
      }
    </div>

    <div class="card">
      <div class="card-title">Mis ejercicios personales <span class="card-meta">${state.customExercises.length}</span></div>
      <div class="field-row">
        <div class="field"><label>Nombre</label><input type="text" id="ce-name"></div>
        <div class="field"><label>Grupo</label>
          <select id="ce-group">
            ${["pecho","espalda","piernas","hombros","brazos","core"].map(g => `<option value="${g}">${g}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>Equipo</label><input type="text" id="ce-equipo" placeholder="barra, mancuernas…"></div>
      </div>
      <button class="btn btn-primary" id="ce-save">Crear ejercicio</button>
      <div style="margin-top: 14px;">
        ${state.customExercises.map(e => `
          <div class="diet-log-row">
            <div>
              <div style="font-weight:500">${escapeHtml(e.name)}</div>
              <div class="card-meta">${e.group} · ${e.equipo}</div>
            </div>
            <button class="delete-btn ce-del" data-id="${e.id}">×</button>
          </div>`).join("")}
      </div>
    </div>
  `;
  document.getElementById("new-routine").addEventListener("click", () => openRoutineEditor(null));
  const importBtn = document.getElementById("import-excel");
  if (importBtn) importBtn.addEventListener("click", () => openExcelImporter());
  document.querySelectorAll(".cr-activate").forEach(b => b.addEventListener("click", () => {
    state.useCustomRoutine = true; state.activeCustomRoutineId = b.dataset.id; saveState(); views.workout();
    const r = state.customRoutines.find(c => c.id === b.dataset.id);
    if (r && r.cloudId && typeof cloudSetRutinaActiva === "function") cloudSetRutinaActiva(r.cloudId);
  }));
  document.querySelectorAll(".cr-edit").forEach(b => b.addEventListener("click", () => openRoutineEditor(b.dataset.id)));
  document.querySelectorAll(".cr-del").forEach(b => b.addEventListener("click", () => {
    if (!confirm("¿Eliminar rutina?")) return;
    const removed = state.customRoutines.find(c => c.id === b.dataset.id);
    state.customRoutines = state.customRoutines.filter(c => c.id !== b.dataset.id);
    if (state.activeCustomRoutineId === b.dataset.id) { state.activeCustomRoutineId = null; state.useCustomRoutine = false; }
    saveState(); views.workout();
    if (removed && removed.cloudId && typeof cloudDeleteRutina === "function") cloudDeleteRutina(removed.cloudId);
  }));
  document.getElementById("ce-save").addEventListener("click", () => {
    const name = document.getElementById("ce-name").value.trim();
    const group = document.getElementById("ce-group").value;
    const equipo = document.getElementById("ce-equipo").value.trim() || "—";
    if (!name) { toast("Ingresa un nombre"); return; }
    state.customExercises.push({ id: uid(), name, group, equipo });
    saveState(); views.workout();
  });
  document.querySelectorAll(".ce-del").forEach(b => b.addEventListener("click", () => {
    state.customExercises = state.customExercises.filter(e => e.id !== b.dataset.id);
    saveState(); views.workout();
  }));
}

function openRoutineEditor(routineId) {
  const editing = routineId ? state.customRoutines.find(r => r.id === routineId) : null;
  const data = editing ? structuredClone(editing) : { id: uid(), name: "", days: [{ label: "Día 1", muscleGroups: [], exercises: [] }] };

  function dayHtml(d, di) {
    return `
      <div class="re-day" data-di="${di}" style="border:1px solid var(--border); border-radius:10px; padding:12px; margin-top:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
          <input type="text" class="re-day-label" value="${escapeHtml(d.label)}" style="background:transparent; border:none; color:var(--text); font-weight:600; font-size:15px; flex:1;">
          <button class="btn btn-sm btn-danger re-del-day">Eliminar día</button>
        </div>
        <div style="margin-bottom:8px;">
          ${d.exercises.map((ex, ei) => `
            <div class="re-ex" data-ei="${ei}" style="display:flex; gap:8px; align-items:center; padding:6px 0; border-bottom:1px solid var(--border);">
              <div style="flex:1;">
                <div style="font-weight:500">${escapeHtml(ex.name)}</div>
                <div class="card-meta">${ex.group} · ${ex.sets} series · ${ex.reps} reps · descanso ${ex.rest}</div>
              </div>
              <button class="btn btn-sm re-del-ex">×</button>
            </div>
          `).join("")}
        </div>
        <button class="btn btn-sm re-add-ex">+ Añadir ejercicio</button>
      </div>
    `;
  }
  function html() {
    return `
      <h2 style="margin-bottom:6px;">${editing ? "Editar rutina" : "Nueva rutina"}</h2>
      <div class="field"><label>Nombre</label><input type="text" id="re-name" value="${escapeHtml(data.name)}" placeholder="Ej: Mi PPL"></div>
      <div id="re-days">${data.days.map((d, di) => dayHtml(d, di)).join("")}</div>
      <button class="btn" id="re-add-day" style="margin-top:8px;">+ Añadir día</button>
      <div style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn btn-primary btn-block" id="re-save">Guardar rutina</button>
        <button class="btn btn-block" id="re-cancel">Cancelar</button>
      </div>
    `;
  }
  function refresh() { m.root.querySelector(".modal").innerHTML = html(); attachListeners(); }
  function attachListeners() {
    m.root.querySelector("#re-cancel").addEventListener("click", m.close);
    m.root.querySelector("#re-add-day").addEventListener("click", () => {
      data.days.push({ label: `Día ${data.days.length + 1}`, muscleGroups: [], exercises: [] }); refresh();
    });
    m.root.querySelector("#re-name").addEventListener("input", e => { data.name = e.target.value; });
    m.root.querySelectorAll(".re-day").forEach(de => {
      const di = parseInt(de.dataset.di);
      de.querySelector(".re-day-label").addEventListener("input", e => { data.days[di].label = e.target.value; });
      de.querySelector(".re-del-day").addEventListener("click", () => { data.days.splice(di, 1); refresh(); });
      de.querySelector(".re-add-ex").addEventListener("click", () => openExerciseChooser(ex => { data.days[di].exercises.push(ex); refresh(); }));
      de.querySelectorAll(".re-ex").forEach(exEl => {
        const ei = parseInt(exEl.dataset.ei);
        exEl.querySelector(".re-del-ex").addEventListener("click", () => { data.days[di].exercises.splice(ei, 1); refresh(); });
      });
    });
    m.root.querySelector("#re-save").addEventListener("click", () => {
      if (!data.name.trim()) { toast("Ponle un nombre a la rutina"); return; }
      data.days.forEach(d => { d.muscleGroups = Array.from(new Set(d.exercises.map(e => e.group))); });
      if (editing) {
        const idx = state.customRoutines.findIndex(r => r.id === editing.id);
        state.customRoutines[idx] = data;
      } else state.customRoutines.push(data);
      saveState(); m.close(); toast("Rutina guardada"); views.workout();

      // Sube la rutina a Supabase para que se vea igual en cualquier
      // dispositivo — antes "Mis rutinas" solo vivía en este navegador.
      // Mismo patrón que logMeal: no bloquea el guardado local, y si es una
      // rutina nueva guardamos el cloudId que devuelve Supabase para poder
      // editarla/borrarla ahí después.
      const activa = state.activeCustomRoutineId === data.id;
      if (data.cloudId && typeof cloudUpdateRutina === "function") {
        cloudUpdateRutina(data.cloudId, { ...data, activa });
      } else if (typeof cloudInsertRutina === "function") {
        Promise.resolve(cloudInsertRutina({ ...data, activa })).then(cloudId => {
          if (!cloudId) return;
          const r = state.customRoutines.find(x => x.id === data.id);
          if (r) { r.cloudId = cloudId; saveState(); }
        });
      }
    });
  }
  const m = modal(html()); attachListeners();
}

function openExerciseChooser(onPick) {
  const params = TRAINING_PARAMS[state.profile.trainingGoal] || TRAINING_PARAMS.hipertrofia;
  const all = [];
  Object.entries(EXERCISES).forEach(([g, list]) => list.forEach(e => all.push({ ...e, group: g })));
  state.customExercises.forEach(e => all.push(e));
  const html = `
    <h2 style="margin-bottom:6px;">Elegir ejercicio</h2>
    <div class="field"><label>Buscar</label><input type="text" id="ex-search" placeholder="press, sentadilla…"></div>
    <div class="field-row">
      <div class="field"><label>Series</label><input type="text" id="ex-sets" value="${params.sets}"></div>
      <div class="field"><label>Reps</label><input type="text" id="ex-reps" value="${params.reps}"></div>
      <div class="field"><label>Descanso</label><input type="text" id="ex-rest" value="${params.rest}"></div>
    </div>
    <div id="ex-list" style="max-height: 280px; overflow-y: auto; margin-bottom: 14px;">
      ${all.map(e => `<div class="ex-pick" data-name="${escapeHtml(e.name)}" data-group="${e.group}" data-equipo="${escapeHtml(e.equipo)}" style="padding:10px; border-bottom:1px solid var(--border); cursor:pointer;">
        <div style="font-weight:500">${escapeHtml(e.name)}</div>
        <div class="card-meta">${e.group} · ${e.equipo}</div>
      </div>`).join("")}
    </div>
    <button class="btn btn-block" id="ex-cancel">Cancelar</button>
  `;
  const m = modal(html);
  m.root.querySelector("#ex-cancel").addEventListener("click", m.close);
  m.root.querySelector("#ex-search").addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    m.root.querySelectorAll(".ex-pick").forEach(it => {
      it.style.display = it.textContent.toLowerCase().includes(q) ? "block" : "none";
    });
  });
  m.root.querySelectorAll(".ex-pick").forEach(el => el.addEventListener("click", () => {
    const data = { name: el.dataset.name, group: el.dataset.group, equipo: el.dataset.equipo };
    const sets = m.root.querySelector("#ex-sets").value;
    const reps = m.root.querySelector("#ex-reps").value;
    const rest = m.root.querySelector("#ex-rest").value;
    onPick({ ...data, sets, reps, rest });
    m.close();
  }));
}

// =====================================================
// PROGRESO
// =====================================================
views.progress = function () {
  const log = state.weightLog.slice().sort((a, b) => a.date.localeCompare(b.date));
  const measurements = state.measurements.slice().sort((a, b) => a.date.localeCompare(b.date));
  const lastMeas = measurements[measurements.length - 1] || {};

  document.getElementById("content").innerHTML = `
    <div class="view-header">
      <div>
        <h1>Tu progreso</h1>
        <p>Registra peso, medidas y fotos para ver tu evolución</p>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom: 18px;">
      <div class="card">
        <div class="card-title">Peso semanal</div>
        <div style="display:flex; gap:10px; align-items:end; margin-bottom: 16px; flex-wrap:wrap;">
          <div class="field" style="flex:1 1 130px; margin:0;"><label>Fecha</label><input type="date" id="weight-date" value="${todayISO()}"></div>
          <div class="field" style="flex:1 1 110px; margin:0;"><label>Peso (kg)</label><input type="number" id="weight-input" step="0.1" placeholder="${state.profile.weight}"></div>
          <button class="btn btn-primary" id="add-weight" style="flex:0 0 auto;">Agregar</button>
        </div>
        <div class="chart-container" style="margin-bottom: 14px;"><canvas id="chart-weight-progress"></canvas></div>
        <div class="weight-entry-list">
          ${log.length === 0 ? `<div class="empty-state"><p>Registra tu primer peso arriba.</p></div>` :
            log.slice().reverse().map(e => `
              <div class="weight-entry">
                <span class="date">${formatDate(e.date)}</span>
                <span class="weight-val">${e.weight} kg</span>
                <button class="delete-btn weight-del" data-date="${e.date}">×</button>
              </div>`).join("")
          }
        </div>
      </div>

      <div class="card">
        <div class="card-title">Medidas corporales (cm)</div>
        <div class="measurement-grid">
          ${measurementField("Pecho","chest", lastMeas.chest)}
          ${measurementField("Cintura","waist", lastMeas.waist)}
          ${measurementField("Cadera","hips", lastMeas.hips)}
          ${measurementField("Brazo izq","leftArm", lastMeas.leftArm)}
          ${measurementField("Brazo der","rightArm", lastMeas.rightArm)}
          ${measurementField("Muslo izq","leftThigh", lastMeas.leftThigh)}
          ${measurementField("Muslo der","rightThigh", lastMeas.rightThigh)}
          ${measurementField("Cuello","neck", lastMeas.neck)}
        </div>
        <button class="btn btn-primary btn-block" id="save-measurements" style="margin-top: 16px;">Guardar medidas de hoy</button>
        ${measurements.length > 1 ? `<div class="chart-container" style="margin-top: 16px;"><canvas id="chart-measurements"></canvas></div>` : ""}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Fotos de progreso <span class="card-meta">${state.photos.length} fotos</span></div>
      <div class="photo-grid">
        <div class="photo-upload photo-upload-actions">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><circle cx="12" cy="12" r="9"/><path d="M12 8v8 M8 12h8"/></svg>
          <span>Añadir foto</span>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-sm" id="photo-cam">Cámara</button>
            <button type="button" class="btn btn-sm" id="photo-gal">Galería</button>
          </div>
          <input type="file" accept="image/*" capture="environment" id="photo-input-cam" style="display:none">
          <input type="file" accept="image/*" id="photo-input-gal" style="display:none">
        </div>
        ${state.photos.slice().reverse().map(ph => `
          <div class="photo-card">
            <img src="${ph.dataUrl}" alt="">
            <button class="delete-photo" data-id="${ph.id}">×</button>
            <div class="photo-info"><span class="photo-date">${formatDate(ph.date)}</span></div>
          </div>`).join("")}
      </div>
    </div>
  `;
  if (log.length > 0) drawWeightChart("chart-weight-progress", log, state.profile.targetWeight);
  if (measurements.length > 1) drawMeasurementsChart("chart-measurements", measurements);
  document.getElementById("add-weight").addEventListener("click", () => {
    const date = document.getElementById("weight-date").value;
    const weight = parseFloat(document.getElementById("weight-input").value);
    if (!date || !weight || weight < 20 || weight > 400) { toast("Ingresa fecha y peso válidos"); return; }
    state.weightLog = state.weightLog.filter(e => e.date !== date);
    state.weightLog.push({ date, weight });
    state.profile.weight = weight; saveState(); toast("Registro agregado"); views.progress();
    if (typeof gamiOnWeightSave === "function") gamiOnWeightSave();
  });
  document.querySelectorAll(".weight-del").forEach(b => b.addEventListener("click", () => {
    state.weightLog = state.weightLog.filter(e => e.date !== b.dataset.date);
    saveState(); views.progress();
  }));
  document.getElementById("save-measurements").addEventListener("click", () => {
    const today = todayISO();
    const m = { date: today };
    ["chest","waist","hips","leftArm","rightArm","leftThigh","rightThigh","neck"].forEach(k => {
      const v = parseFloat(document.getElementById("m-" + k).value);
      if (!isNaN(v)) m[k] = v;
    });
    state.measurements = state.measurements.filter(e => e.date !== today);
    state.measurements.push(m); saveState(); toast("Medidas guardadas"); views.progress();
  });
  const handlePhotoFile = async file => {
    if (!file) return;
    if (!(file instanceof Blob)) {
      toast("No se pudo leer la foto. Intenta de nuevo.");
      return;
    }
    const dataUrl = await compressImage(file, 800);
    state.photos.push({ id: uid(), date: todayISO(), dataUrl });
    saveState(); toast("Foto subida"); views.progress();
  };
  document.getElementById("photo-cam").addEventListener("click", () => document.getElementById("photo-input-cam").click());
  document.getElementById("photo-gal").addEventListener("click", () => document.getElementById("photo-input-gal").click());
  document.getElementById("photo-input-cam").addEventListener("change", e => handlePhotoFile(e.target.files[0]));
  document.getElementById("photo-input-gal").addEventListener("change", e => handlePhotoFile(e.target.files[0]));
  document.querySelectorAll(".delete-photo").forEach(b => b.addEventListener("click", () => {
    if (!confirm("¿Eliminar esta foto?")) return;
    state.photos = state.photos.filter(p => p.id !== b.dataset.id);
    saveState(); views.progress();
  }));
};

function measurementField(label, key, value) {
  return `<div class="field"><label>${label}</label><input type="number" step="0.1" id="m-${key}" value="${value || ""}" placeholder="—"></div>`;
}

// =====================================================
// CHAT
// =====================================================
views.chat = function () {
  const messages = state.chat?.messages || [];
  document.getElementById("content").innerHTML = `
    <div class="view-header">
      <div>
        <h1>Asistente IA</h1>
        <p>Conversa sobre tu progreso, alimentación o entrenamiento</p>
      </div>
      <button class="btn" id="chat-clear">Limpiar conversación</button>
    </div>
    <div class="card chat-card">
      <div class="chat-messages" id="chat-messages">
        ${messages.length === 0 ? `
          <div class="empty-state">
            <h3>Hola</h3>
            <p>Pregúntame lo que quieras: tu progreso en algún ejercicio, qué comer para tu objetivo, qué rutina te conviene…</p>
            <div style="margin-top: 14px; display:flex; flex-wrap:wrap; gap:8px; justify-content:center;">
              <button class="pill chat-suggestion">¿Cómo voy en press banca?</button>
              <button class="pill chat-suggestion">¿Qué desayuno me recomiendas hoy?</button>
              <button class="pill chat-suggestion">¿Cuántos días debería entrenar?</button>
              <button class="pill chat-suggestion">¿Estoy comiendo suficiente proteína?</button>
            </div>
          </div>
        ` : messages.map(m => chatBubble(m)).join("")}
      </div>
      <form class="chat-input-bar" id="chat-form">
        <textarea id="chat-input" rows="1" placeholder="Escribe un mensaje…"></textarea>
        <button type="submit" class="btn btn-primary" id="chat-send">Enviar</button>
      </form>
    </div>
  `;
  const goProfile = document.querySelector("[data-go-profile]");
  if (goProfile) goProfile.addEventListener("click", () => showView("profile"));
  document.getElementById("chat-clear").addEventListener("click", () => {
    if (!confirm("¿Borrar toda la conversación?")) return;
    state.chat.messages = []; saveState(); views.chat();
  });
  document.querySelectorAll(".chat-suggestion").forEach(b => b.addEventListener("click", () => {
    const ta = document.getElementById("chat-input"); ta.value = b.textContent; ta.focus();
  }));
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = input.value.trim(); if (!text) return;
    input.value = ""; input.disabled = true;
    document.getElementById("chat-send").disabled = true;

    state.chat.messages.push({ role: "user", content: text, ts: Date.now() });
    saveState();
    appendBubble({ role: "user", content: text });

    // Burbuja del asistente que se va llenando con cada chunk
    appendBubble({ role: "assistant", content: "" });
    const ms = document.getElementById("chat-messages");
    const streamBubble = ms.lastElementChild;
    streamBubble.classList.add("streaming");
    streamBubble.innerHTML = `<span style="color:var(--text-muted)">…</span>`;
    scrollChatToBottom();

    try {
      const reply = await sendChatMessage(text, (_chunk, full) => {
        streamBubble.innerHTML = formatChat(full);
        scrollChatToBottom();
      });
      streamBubble.classList.remove("streaming");
      streamBubble.innerHTML = formatChat(reply);
      state.chat.messages.push({ role: "assistant", content: reply, ts: Date.now() });
      saveState();
    } catch (err) {
      streamBubble.classList.remove("streaming");
      streamBubble.innerHTML = formatChat(`Error: ${err.message || err}`);
    } finally {
      input.disabled = false;
      document.getElementById("chat-send").disabled = false;
      scrollChatToBottom();
    }
  });
  scrollChatToBottom();
};

function chatBubble(m) {
  return `<div class="chat-bubble ${m.role} ${m.typing ? "typing" : ""}">${formatChat(m.content)}</div>`;
}
function appendBubble(m) {
  const ms = document.getElementById("chat-messages");
  const empty = ms.querySelector(".empty-state");
  if (empty) ms.innerHTML = "";
  const div = document.createElement("div");
  div.className = `chat-bubble ${m.role}${m.typing ? " typing" : ""}`;
  div.innerHTML = formatChat(m.content);
  ms.appendChild(div);
}
function formatChat(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}
function scrollChatToBottom() {
  const ms = document.getElementById("chat-messages"); if (ms) ms.scrollTop = ms.scrollHeight;
}

// =====================================================
// PROFILE
// =====================================================
views.profile = function () {
  const p = state.profile;
  const n = calcNutrition(p);
  document.getElementById("content").innerHTML = `
    <div class="view-header">
      <div><h1>Tu perfil</h1><p>Ajusta tus datos para recalcular calorías y rutina</p></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Datos personales</div>
        <div class="field"><label>Nombre</label><input type="text" id="pf-name" value="${escapeHtml(p.name)}" placeholder="Tu nombre"></div>
        <div class="field-row">
          <div class="field"><label>Edad</label><input type="number" id="pf-age" value="${p.age}" min="13" max="100"></div>
          <div class="field"><label>Sexo</label>
            <select id="pf-sex">
              <option value="masculino" ${p.sex==="masculino"?"selected":""}>Masculino</option>
              <option value="femenino" ${p.sex==="femenino"?"selected":""}>Femenino</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Estatura (cm)</label><input type="number" id="pf-height" value="${p.height}" min="100" max="230"></div>
          <div class="field"><label>Peso actual (kg)</label><input type="number" id="pf-weight" step="0.1" value="${p.weight}" min="30" max="300"></div>
        </div>
        <div class="field"><label>Nivel de actividad fuera del gym</label>
          <select id="pf-activity">
            <option value="sedentario" ${p.activity==="sedentario"?"selected":""}>Sedentario (oficina, poco movimiento)</option>
            <option value="ligero" ${p.activity==="ligero"?"selected":""}>Ligero (camina algo, 1-2 días/sem)</option>
            <option value="moderado" ${p.activity==="moderado"?"selected":""}>Moderado (3-4 días activo)</option>
            <option value="activo" ${p.activity==="activo"?"selected":""}>Activo (5+ días movimiento)</option>
            <option value="muy_activo" ${p.activity==="muy_activo"?"selected":""}>Muy activo (trabajo físico)</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Objetivo</div>
        <div class="field"><label>¿Qué quieres lograr?</label>
          <div class="pill-group">
            ${[["bajar","Bajar de peso"],["mantener","Mantener"],["subir","Subir de peso"]].map(([v,l]) =>
              `<button class="pill goal-pill ${p.goal===v?"active":""}" data-v="${v}">${l}</button>`).join("")}
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Peso objetivo (kg)</label><input type="number" id="pf-target" step="0.5" value="${p.targetWeight}"></div>
          <div class="field"><label>En cuántas semanas</label><input type="number" id="pf-weeks" value="${p.weeks}" min="1" max="104"></div>
        </div>
        <div class="card-title" style="margin-top: 18px;">Entrenamiento</div>
        <div class="field-row">
          <div class="field"><label>Días por semana</label><input type="number" id="pf-tdays" value="${p.trainingDays}" min="0" max="7"></div>
          <div class="field"><label>Objetivo de entrenamiento</label>
            <select id="pf-tgoal">
              ${["hipertrofia","fuerza","resistencia","potencia"].map(g =>
                `<option value="${g}" ${p.trainingGoal===g?"selected":""}>${trainingGoalLabel(g)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field"><label>Distribución</label>
          <select id="pf-dist">
            <option value="auto" ${p.distribution==="auto"?"selected":""}>Automática</option>
            <option value="fullbody" ${p.distribution==="fullbody"?"selected":""}>Full Body</option>
            <option value="upperlower" ${p.distribution==="upperlower"?"selected":""}>Upper / Lower</option>
            <option value="ppl" ${p.distribution==="ppl"?"selected":""}>Push / Pull / Legs</option>
            <option value="brosplit" ${p.distribution==="brosplit"?"selected":""}>Bro Split</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 18px;">
      <div class="card-title">Lesiones y restricciones</div>
      <p style="color:var(--text-muted); font-size:13px; margin-bottom:12px;">
        La rutina automática nunca sugerirá ejercicios de los grupos o los ejercicios puntuales que marques aquí. El Asistente IA también ve estas notas al responderte.
      </p>
      <div class="field">
        <label>Notas (lesiones, condiciones, lo que quieras que sepamos)</label>
        <textarea id="pf-injury-notes" rows="2" placeholder="Ej: dolor de rodilla derecha, evitar impacto">${escapeHtml(p.injuryNotes || "")}</textarea>
      </div>
      <div class="field">
        <label>Evitar estos grupos musculares por completo</label>
        <div class="pill-group">
          ${["pecho","espalda","piernas","hombros","brazos","core"].map(g => `
            <button type="button" class="pill avoid-group-pill ${(p.avoidGroups || []).includes(g) ? "active" : ""}" data-g="${g}">${capitalize(g)}</button>
          `).join("")}
        </div>
      </div>
      <div class="field">
        <label>Evitar ejercicios específicos</label>
        <div class="pf-avoid-ex-list">
          ${Object.entries(EXERCISES).map(([g, list]) => `
            <details class="wm-details pf-avoid-group">
              <summary style="text-transform:capitalize;">${g}</summary>
              <div class="pf-avoid-ex-group">
                ${list.map(ex => `
                  <label class="pf-avoid-ex-label">
                    <input type="checkbox" class="pf-avoid-ex" value="${escapeHtml(ex.name)}" ${(p.avoidExercises || []).includes(ex.name) ? "checked" : ""}>
                    ${escapeHtml(ex.name)}
                  </label>
                `).join("")}
              </div>
            </details>
          `).join("")}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 18px;">
      <div class="card-title">Cálculos automáticos</div>
      <div class="grid-4">
        <div class="stat-card"><div class="label">BMR</div><div class="value">${n.bmr}<span class="unit">kcal</span></div><div class="delta">Calorías en reposo</div></div>
        <div class="stat-card"><div class="label">TDEE</div><div class="value">${n.tdee}<span class="unit">kcal</span></div><div class="delta">Gasto total diario</div></div>
        <div class="stat-card"><div class="label">Meta diaria</div><div class="value">${n.kcal}<span class="unit">kcal</span></div><div class="delta">${n.dailyDeltaKcal>=0?"+":""}${n.dailyDeltaKcal} kcal</div></div>
        <div class="stat-card"><div class="label">Cambio semanal</div><div class="value">${n.weeklyDeltaKg>=0?"+":""}${n.weeklyDeltaKg}<span class="unit">kg</span></div><div class="delta" style="${n.aggressiveRate ? "color:var(--danger); font-weight:600;" : ""}">${Math.abs(n.weeklyDeltaKg) > 1 ? "Ritmo agresivo" : "Ritmo seguro"}</div></div>
      </div>
      ${n.cappedForSafety ? `<p style="color:var(--danger); font-size:13px; margin-top:10px;">Tu objetivo actual (peso meta / plazo) pediría menos calorías que un mínimo seguro, así que ajustamos tu meta diaria a ${n.kcal} kcal. Si buscas bajar de peso muy rápido, te recomendamos hablarlo con un profesional de salud.</p>` : ""}
      ${!n.cappedForSafety && n.aggressiveRate ? `<p style="color:var(--danger); font-size:13px; margin-top:10px;">${n.weeklyDeltaKg > 0 ? "Ganar" : "Bajar"} ${Math.abs(n.weeklyDeltaKg)} kg por semana es un ritmo agresivo (lo recomendado es no más de 1 kg/semana). Considera un plazo más largo o hablarlo con un profesional de salud.</p>` : ""}
    </div>

    <div class="card" style="margin-top: 18px;">
      <div class="card-title">Preferencias</div>
      <div class="field-row">
        <div class="field"><label>Unidades de peso por defecto</label>
          <select id="pf-units">
            <option value="kg" ${state.units==="kg"?"selected":""}>Kilogramos (kg)</option>
            <option value="lb" ${state.units==="lb"?"selected":""}>Libras (lb)</option>
          </select>
        </div>
      </div>
      <p style="color:var(--success); font-size:13px; margin-top: 8px;">✓ Asistente IA conectado vía servidor seguro. No necesitas configurar API key.</p>
    </div>

    <div style="display:flex; gap:10px; margin-top:18px; flex-wrap:wrap;">
      <button class="btn btn-primary" id="save-profile">Guardar cambios</button>
      <button class="btn" id="export-data">Exportar datos</button>
      <button class="btn" id="import-data">Importar datos</button>
      <button class="btn btn-danger" id="reset-data">Borrar todo</button>
      <input type="file" id="import-file" accept=".json,application/json,text/plain" style="display:none">
    </div>
  `;
  document.querySelectorAll(".goal-pill").forEach(b => b.addEventListener("click", () => {
    state.profile.goal = b.dataset.v;
    document.querySelectorAll(".goal-pill").forEach(x => x.classList.toggle("active", x.dataset.v === b.dataset.v));
    saveState();
  }));
  document.querySelectorAll(".avoid-group-pill").forEach(b => b.addEventListener("click", () => {
    b.classList.toggle("active");
  }));
  document.getElementById("save-profile").addEventListener("click", () => {
    const v = id => document.getElementById(id).value;
    const newWeight = parseFloat(v("pf-weight")) || 70;
    const newTarget = parseFloat(v("pf-target")) || 70;
    const goal = state.profile.goal;
    if (goal === "bajar" && newTarget >= newWeight) {
      toast("Para bajar de peso, el peso meta debe ser menor al peso actual"); return;
    }
    if (goal === "subir" && newTarget <= newWeight) {
      toast("Para subir de peso, el peso meta debe ser mayor al peso actual"); return;
    }
    if (goal === "mantener" && Math.abs(newTarget - newWeight) > 2) {
      toast("Para mantener el peso, la meta debe estar a máximo ±2 kg del peso actual"); return;
    }
    const avoidGroups = Array.from(document.querySelectorAll(".avoid-group-pill.active")).map(b => b.dataset.g);
    const avoidExercises = Array.from(document.querySelectorAll(".pf-avoid-ex:checked")).map(cb => cb.value);
    const injuryNotes = document.getElementById("pf-injury-notes").value.trim();
    Object.assign(state.profile, {
      name: v("pf-name"), age: parseInt(v("pf-age")) || 25, sex: v("pf-sex"),
      height: parseFloat(v("pf-height")) || 170, weight: newWeight,
      activity: v("pf-activity"), targetWeight: newTarget,
      weeks: parseInt(v("pf-weeks")) || 12, trainingDays: Math.max(0, Math.min(7, parseInt(v("pf-tdays")) || 0)),
      trainingGoal: v("pf-tgoal"), distribution: v("pf-dist"),
      avoidGroups, avoidExercises, injuryNotes
    });
    state.units = v("pf-units");
    state.setupComplete = true;
    saveState();
    if (typeof cloudUpsertPerfil === "function") cloudUpsertPerfil(state.profile);
    toast("Perfil guardado"); views.profile();
  });
  document.getElementById("export-data").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fitcol-backup-${todayISO()}.json`; a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("import-data").addEventListener("click", () => document.getElementById("import-file").click());
  document.getElementById("import-file").addEventListener("change", async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      const err = validateImportedState(obj);
      if (err) { toast(err, 3200); e.target.value = ""; return; }
      state = deepMerge(structuredClone(defaultState), obj);
      saveState(); toast("Datos importados"); showView("dashboard");
    } catch { toast("Archivo inválido"); }
    e.target.value = "";
  });
  document.getElementById("reset-data").addEventListener("click", async () => {
    const cloudActive = typeof cloudAvailable === "function" && cloudAvailable();
    const cloudWarn = cloudActive
      ? " Esto también borrará tu información en la nube (perfil, pesos, entrenamientos y comidas)."
      : "";
    if (!confirm(`¿Borrar TODOS los datos?${cloudWarn} No se puede deshacer.`)) return;

    const btn = document.getElementById("reset-data");
    const originalLabel = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "Borrando…"; }

    if (cloudActive && typeof cloudDeleteAllUserData === "function") {
      const res = await cloudDeleteAllUserData();
      if (!res.ok) {
        console.warn("cloudDeleteAllUserData:", res.errors);
        toast("Se borró lo local, pero hubo un error borrando la nube. Revisa tu conexión e inténtalo de nuevo.", 3500);
      }
    }

    localStorage.removeItem(STORAGE_KEY);
    if (typeof gamiReset === "function") gamiReset();
    state = structuredClone(defaultState);
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
    showView("dashboard"); toast("Datos eliminados");
  });
};

// =====================================================
// ONBOARDING
// =====================================================
function renderOnboarding() {
  document.getElementById("content").innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <h2>¡Bienvenido a Fitcol!</h2>
        <p>Cuéntanos un poco sobre ti para crear tu plan personalizado.</p>
        <div class="field"><label>¿Cómo te llamas?</label><input type="text" id="o-name" placeholder="Tu nombre"></div>
        <div class="field-row">
          <div class="field"><label>Edad</label><input type="number" id="o-age" value="25" min="13" max="100"></div>
          <div class="field"><label>Sexo</label>
            <select id="o-sex"><option value="masculino">Masculino</option><option value="femenino">Femenino</option></select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Estatura (cm)</label><input type="number" id="o-height" value="170"></div>
          <div class="field"><label>Peso (kg)</label><input type="number" id="o-weight" step="0.1" value="70"></div>
        </div>
        <div class="field"><label>Tu objetivo</label>
          <select id="o-goal">
            <option value="bajar">Bajar de peso</option>
            <option value="mantener">Mantener peso</option>
            <option value="subir">Subir de peso</option>
          </select>
        </div>
        <div class="field-row">
          <div class="field"><label>Peso objetivo (kg)</label><input type="number" id="o-target" step="0.5" value="70"></div>
          <div class="field"><label>En cuántas semanas</label><input type="number" id="o-weeks" value="12" min="1"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Días de entrenamiento</label><input type="number" id="o-days" value="4" min="0" max="7"></div>
          <div class="field"><label>Tipo de entrenamiento</label>
            <select id="o-tgoal">
              <option value="hipertrofia">Hipertrofia</option>
              <option value="fuerza">Fuerza máxima</option>
              <option value="resistencia">Resistencia muscular</option>
              <option value="potencia">Potencia / Explosividad</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary btn-block" id="o-submit" style="margin-top: 8px;">Empezar</button>
      </div>
    </div>
  `;
  document.getElementById("o-submit").addEventListener("click", () => {
    const v = id => document.getElementById(id).value;
    Object.assign(state.profile, {
      name: v("o-name"), age: parseInt(v("o-age")) || 25, sex: v("o-sex"),
      height: parseFloat(v("o-height")) || 170, weight: parseFloat(v("o-weight")) || 70,
      goal: v("o-goal"), targetWeight: parseFloat(v("o-target")) || 70,
      weeks: parseInt(v("o-weeks")) || 12, trainingDays: parseInt(v("o-days")) || 0,
      trainingGoal: v("o-tgoal")
    });
    state.setupComplete = true;
    const today = todayISO();
    if (!state.weightLog.find(e => e.date === today)) state.weightLog.push({ date: today, weight: state.profile.weight });
    saveState();
    if (typeof cloudUpsertPerfil === "function") cloudUpsertPerfil(state.profile);
    if (typeof cloudInsertRegistroPeso === "function") cloudInsertRegistroPeso({ fecha: today, peso: state.profile.weight });
    showView("dashboard");
  });
}

// =====================================================
// CHARTS
// =====================================================
function chartTextColor() { return getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim(); }
function chartGrid() { return getComputedStyle(document.documentElement).getPropertyValue("--border").trim(); }

function drawWeightChart(canvasId, log, target) {
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  const data = log.length ? log : [{ date: todayISO(), weight: state.profile.weight }];
  charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(e => formatDateShort(e.date)),
      datasets: [
        { label: "Peso", data: data.map(e => e.weight), borderColor: "#00d2a8", backgroundColor: "rgba(0,210,168,0.15)", fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5 },
        { label: "Meta", data: data.map(() => target), borderColor: "#00a3ff", borderDash: [6,4], fill: false, pointRadius: 0, borderWidth: 1.5 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: chartTextColor() } } },
      scales: { x: { grid: { color: chartGrid() }, ticks: { color: chartTextColor() } }, y: { grid: { color: chartGrid() }, ticks: { color: chartTextColor() } } }
    }
  });
}

function drawMacrosChart(canvasId, current, target) {
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Proteína","Carbos","Grasa"],
      datasets: [
        { label: "Consumido", data: [Math.round(current.p), Math.round(current.c), Math.round(current.f)], backgroundColor: ["#00d2a8","#ffb547","#ff5470"], borderRadius: 6 },
        { label: "Meta", data: [target.protein, target.carbs, target.fat], backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 6 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: chartTextColor() } } },
      scales: { x: { grid: { display: false }, ticks: { color: chartTextColor() } }, y: { grid: { color: chartGrid() }, ticks: { color: chartTextColor() }, beginAtZero: true } }
    }
  });
}

function drawWorkoutsChart(canvasId, workouts) {
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const start = startOfWeek(new Date(Date.now() - i * 7 * 86400000));
    const end = new Date(start.getTime() + 7 * 86400000);
    const count = workouts.filter(w => { const d = new Date(w.date); return d >= start && d < end; }).length;
    weeks.push({ label: `Sem ${4 - i}`, count });
  }
  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: { labels: weeks.map(w => w.label), datasets: [{ label: "Sesiones", data: weeks.map(w => w.count), backgroundColor: "#00d2a8", borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false }, ticks: { color: chartTextColor() } }, y: { grid: { color: chartGrid() }, ticks: { color: chartTextColor(), stepSize: 1 }, beginAtZero: true } }
    }
  });
}

function drawMeasurementsChart(canvasId, measurements) {
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  const labels = measurements.map(m => formatDateShort(m.date));
  const fields = [
    { key: "chest", label: "Pecho", color: "#00d2a8" },
    { key: "waist", label: "Cintura", color: "#ffb547" },
    { key: "hips", label: "Cadera", color: "#00a3ff" }
  ];
  const datasets = fields.map(f => ({ label: f.label, data: measurements.map(m => m[f.key] ?? null), borderColor: f.color, backgroundColor: f.color + "20", tension: 0.3, spanGaps: true, borderWidth: 2 }));
  charts[canvasId] = new Chart(ctx, {
    type: "line", data: { labels, datasets },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: chartTextColor() } } },
      scales: { x: { grid: { color: chartGrid() }, ticks: { color: chartTextColor() } }, y: { grid: { color: chartGrid() }, ticks: { color: chartTextColor() } } }
    }
  });
}

function drawExerciseChart(canvasId, exerciseName) {
  const ctx = document.getElementById(canvasId); if (!ctx) return;
  const sets = state.setLog.filter(s => s.exerciseName === exerciseName).slice().sort((a, b) => a.date.localeCompare(b.date));
  const byDate = {};
  sets.forEach(s => {
    const w = s.unit === "lb" ? s.weight * 0.4536 : s.weight;
    if (!byDate[s.date] || w > byDate[s.date].maxW) byDate[s.date] = { maxW: w, reps: s.reps };
  });
  const dates = Object.keys(byDate).sort();
  const data = dates.map(d => byDate[d].maxW);
  const reps = dates.map(d => byDate[d].reps);
  charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates.map(formatDateShort),
      datasets: [
        { label: "Peso máx (kg)", data, borderColor: "#00d2a8", backgroundColor: "rgba(0,210,168,0.15)", fill: true, tension: 0.3, pointRadius: 4, borderWidth: 2.5, yAxisID: "y" },
        { label: "Reps", data: reps, borderColor: "#ffb547", borderWidth: 2, fill: false, tension: 0.3, pointRadius: 3, yAxisID: "y1" }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: chartTextColor() } } },
      scales: {
        x: { grid: { color: chartGrid() }, ticks: { color: chartTextColor() } },
        y: { type: "linear", position: "left", grid: { color: chartGrid() }, ticks: { color: chartTextColor() }, title: { display: true, text: "kg", color: chartTextColor() } },
        y1: { type: "linear", position: "right", grid: { drawOnChartArea: false }, ticks: { color: chartTextColor() }, title: { display: true, text: "reps", color: chartTextColor() } }
      }
    }
  });
  const summary = document.getElementById("ex-summary");
  if (summary && dates.length) {
    const allW = sets.map(s => s.unit === "lb" ? s.weight * 0.4536 : s.weight);
    const max = Math.max(...allW);
    const last = sets[sets.length - 1];
    const first = sets[0];
    const trend = last.weight - first.weight;
    summary.innerHTML = `
      <div style="display:flex; gap:18px; flex-wrap:wrap; font-size:13px;">
        <div><span class="card-meta">Peso máx:</span> <strong>${max.toFixed(1)} kg</strong></div>
        <div><span class="card-meta">Última serie:</span> <strong>${last.weight}${last.unit} × ${last.reps}</strong></div>
        <div><span class="card-meta">Series totales:</span> <strong>${sets.length}</strong></div>
        <div><span class="card-meta">Cambio:</span> <strong style="color: ${trend >= 0 ? "var(--success)" : "var(--danger)"}">${trend >= 0 ? "+" : ""}${trend.toFixed(1)}${last.unit}</strong></div>
      </div>
    `;
  }
}

// =====================================================
// INIT
// =====================================================
function updateThemeToggle() {
  const dark = state.theme !== "light";
  document.getElementById("theme-label").textContent = dark ? "Modo claro" : "Modo oscuro";
  const icon = document.getElementById("theme-icon");
  if (dark) icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
  else icon.innerHTML = `<circle cx="12" cy="12" r="4"/><path d="M12 2 v2 M12 20 v2 M2 12 h2 M20 12 h2 M4.93 4.93 l1.41 1.41 M17.66 17.66 l1.41 1.41 M4.93 19.07 l1.41 -1.41 M17.66 6.34 l1.41 -1.41"/>`;
}

let _appInitialized = false;
function initFitcolApp() {
  if (_appInitialized) return;
  _appInitialized = true;
  if (typeof gamiInit === "function") gamiInit();
  document.documentElement.setAttribute("data-theme", state.theme || "dark");
  updateThemeToggle();
  document.getElementById("theme-toggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    updateThemeToggle(); saveState(); showView(currentView);
  });
  document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
  if (window.visualViewport) {
    const nav = document.querySelector('.bottom-nav');
    const adjustNav = () => {
      if (!nav) return;
      const offset = window.innerHeight - window.visualViewport.offsetTop - window.visualViewport.height;
      nav.style.bottom = offset > 10 ? `${offset}px` : '';
    };
    _adjustBottomNav = adjustNav;
    window.visualViewport.addEventListener('resize', adjustNav);
    window.visualViewport.addEventListener('scroll', adjustNav);
  }
  showView("dashboard");
}
// La inicialización la dispara auth.js (después de comprobar sesión)
window.initFitcolApp = initFitcolApp;
