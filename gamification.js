// =====================================================
// Fitcol — gamification.js
// Racha diaria, niveles y sistema de logros
// =====================================================
const GAMI_KEY = "fitcol.gami.v1";

const GAMI_LEVELS = [
  { num: 1, min: 0,   name: "Pichón",             emoji: "🐣" },
  { num: 2, min: 7,   name: "Aguilucho",           emoji: "🦅" },
  { num: 3, min: 21,  name: "Cóndor Joven",        emoji: "🦅" },
  { num: 4, min: 50,  name: "Cóndor Andino",       emoji: "🦅" },
  { num: 5, min: 100, name: "Cóndor Legendario",   emoji: "🦅" },
];

const GAMI_ACHIEVEMENTS = {
  primer_vuelo:  { icon: "🦅", name: "Primer vuelo",        desc: "Primer entrenamiento registrado" },
  sin_excusas:   { icon: "🔥", name: "Sin excusas",         desc: "7 días de racha" },
  cima_andina:   { icon: "🏔️", name: "Cima andina",         desc: "30 días de racha" },
  bestia_gym:    { icon: "⚡", name: "Bestia del gym",      desc: "10 sesiones completadas" },
  nutricion:     { icon: "🥗", name: "Nutrición de élite",  desc: "7 días registrando comidas" },
  balanza:       { icon: "⚖️", name: "En la balanza",       desc: "Registrar peso 5 veces" },
  meta_cumplida: { icon: "💪", name: "Meta cumplida",       desc: "Llegar al peso objetivo" },
  orgullo_co:    { icon: "🇨🇴", name: "Orgullo colombiano", desc: "100 días activos totales" },
};

function gamiDefault() {
  return { streak: 0, lastActiveDate: null, totalActiveDays: 0, activeDates: [], achievements: {} };
}

function gamiLoad() {
  try {
    const raw = localStorage.getItem(GAMI_KEY);
    if (!raw) return gamiDefault();
    return Object.assign(gamiDefault(), JSON.parse(raw));
  } catch { return gamiDefault(); }
}

function gamiSave(g) {
  try { localStorage.setItem(GAMI_KEY, JSON.stringify(g)); } catch {}
}

function gamiGetLevel(totalDays) {
  let lvl = GAMI_LEVELS[0];
  for (const l of GAMI_LEVELS) {
    if (totalDays >= l.min) lvl = l;
    else break;
  }
  return lvl;
}

function gamiGetNextLevel(totalDays) {
  for (const l of GAMI_LEVELS) {
    if (l.min > totalDays) return l;
  }
  return null;
}

function gamiStreakMsg(streak) {
  if (streak >= 30) return "¡Leyenda andina! 🦅";
  if (streak >= 14) return "¡Cóndor en vuelo!";
  if (streak >= 7)  return "¡Una semana en las alturas!";
  if (streak > 0)   return "¡Arrancando el vuelo!";
  return "¡Comienza hoy!";
}

function gamiTodayISO() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function gamiYesterdayISO() { const d=new Date(); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function gamiCheckReset(g) {
  const today = gamiTodayISO();
  const yesterday = gamiYesterdayISO();
  if (g.streak > 0 && g.lastActiveDate && g.lastActiveDate !== today && g.lastActiveDate !== yesterday) {
    g.streak = 0;
    gamiSave(g);
  }
  return g;
}

// Called after logging a meal or saving a workout set/session.
// Idempotent per day: multiple calls on the same day only update once.
function gamiOnActivity(type) {
  const g = gamiLoad();
  gamiCheckReset(g);
  const today = gamiTodayISO();
  const yesterday = gamiYesterdayISO();
  const activeDatesSet = new Set(g.activeDates || []);
  const alreadyToday = activeDatesSet.has(today);
  let streakIncremented = false;

  if (!alreadyToday) {
    activeDatesSet.add(today);
    g.activeDates = Array.from(activeDatesSet);
    g.totalActiveDays = (g.totalActiveDays || 0) + 1;
    g.streak = (g.lastActiveDate === yesterday) ? (g.streak || 0) + 1 : 1;
    g.lastActiveDate = today;
    streakIncremented = true;
  }

  gamiSave(g);
  gamiCheckAchievements(g, type);
  gamiRenderStreakBadge(g, streakIncremented);
}

// Called only when saving weight — checks achievements but does NOT affect streak.
function gamiOnWeightSave() {
  const g = gamiLoad();
  gamiCheckReset(g);
  gamiCheckAchievements(g, "weight");
}

function gamiCheckAchievements(g, type) {
  if (typeof state === "undefined") return;
  const toUnlock = [];

  if (!g.achievements.primer_vuelo) {
    if ((state.workouts && state.workouts.length > 0) || (state.setLog && state.setLog.length > 0))
      toUnlock.push("primer_vuelo");
  }
  if (!g.achievements.sin_excusas && g.streak >= 7) toUnlock.push("sin_excusas");
  if (!g.achievements.cima_andina && g.streak >= 30) toUnlock.push("cima_andina");
  if (!g.achievements.bestia_gym && state.workouts && state.workouts.length >= 10) toUnlock.push("bestia_gym");
  if (!g.achievements.nutricion && state.dietLog) {
    const mealDays = new Set(state.dietLog.map(e => e.date));
    if (mealDays.size >= 7) toUnlock.push("nutricion");
  }
  if (!g.achievements.balanza && state.weightLog && state.weightLog.length >= 5) toUnlock.push("balanza");
  if (!g.achievements.meta_cumplida && state.weightLog && state.weightLog.length > 0 && state.profile) {
    const sorted = state.weightLog.slice().sort((a, b) => a.date.localeCompare(b.date));
    const cur = sorted[sorted.length - 1].weight;
    const tgt = state.profile.targetWeight;
    const goal = state.profile.goal;
    const reached = goal === "bajar" ? cur <= tgt : goal === "subir" ? cur >= tgt : Math.abs(cur - tgt) <= 1;
    if (reached) toUnlock.push("meta_cumplida");
  }
  if (!g.achievements.orgullo_co && g.totalActiveDays >= 100) toUnlock.push("orgullo_co");

  const now = gamiTodayISO();
  toUnlock.forEach(key => {
    if (!g.achievements[key]) {
      g.achievements[key] = { unlockedAt: now };
      gamiSave(g);
      gamiShowUnlock(GAMI_ACHIEVEMENTS[key]);
    }
  });
}

function gamiShowUnlock(ach) {
  const el = document.createElement("div");
  el.className = "gami-unlock-toast";
  el.innerHTML = `<span class="gami-unlock-icon">${ach.icon}</span><div><strong>¡Desbloqueado!</strong><div class="gami-unlock-name">${ach.name}</div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 400); }, 3500);
}

function gamiRenderStreakBadge(g, animate) {
  if (!g) { g = gamiLoad(); gamiCheckReset(g); }
  const badge = document.getElementById("streak-badge");
  if (!badge) return;
  badge.innerHTML = `
    <div class="streak-inner">
      <span class="streak-condor">🦅</span>
      <span class="streak-num">${g.streak}</span>
    </div>
    <div class="streak-msg">${gamiStreakMsg(g.streak)}</div>
  `;
  if (animate) {
    badge.querySelector(".streak-condor").classList.add("bump");
    badge.querySelector(".streak-num").classList.add("bump");
  }
  const mobileCount = document.getElementById("streak-count-mobile");
  if (mobileCount) mobileCount.textContent = g.streak;
}

// =====================================================
// Vista "Mis Logros"
// =====================================================
views.achievements = function () {
  const g = gamiLoad();
  gamiCheckReset(g);
  const level = gamiGetLevel(g.totalActiveDays);
  const nextLevel = gamiGetNextLevel(g.totalActiveDays);
  const progress = nextLevel
    ? Math.min(100, Math.round(((g.totalActiveDays - level.min) / (nextLevel.min - level.min)) * 100))
    : 100;

  document.getElementById("content").innerHTML = `
    <div class="view-header">
      <div>
        <h1>Mis Logros</h1>
        <p>Racha, nivel y logros desbloqueados</p>
      </div>
    </div>

    <div class="card gami-level-card" style="margin-bottom:18px;">
      <div class="gami-level-top">
        <div class="gami-level-badge">${level.emoji} Nivel ${level.num}</div>
        <div class="gami-level-name">${level.name}</div>
        <div class="gami-streak-hero">
          <span class="gami-streak-hero-num">${g.streak}</span>
          <span class="gami-streak-hero-lbl">días de racha</span>
        </div>
      </div>
      <div class="gami-streak-msg">${gamiStreakMsg(g.streak)}</div>
      ${nextLevel ? `
        <div class="gami-level-progress">
          <div class="gami-level-progress-labels">
            <span>${level.name}</span>
            <span>${nextLevel.name} · ${nextLevel.min} días</span>
          </div>
          <div class="gami-progress-bar"><div class="gami-progress-fill" style="width:${progress}%"></div></div>
          <div class="gami-level-hint">${Math.max(0, nextLevel.min - g.totalActiveDays)} días activos para el siguiente nivel</div>
        </div>
      ` : `<div class="gami-max-level">¡Nivel máximo alcanzado! 🏆</div>`}
    </div>

    <div class="grid-3" style="margin-bottom:18px;">
      <div class="stat-card">
        <div class="label">Racha actual</div>
        <div class="value" style="color:#D4A017;">${g.streak}<span class="unit"> días</span></div>
        <div class="delta">${gamiStreakMsg(g.streak)}</div>
      </div>
      <div class="stat-card">
        <div class="label">Días activos totales</div>
        <div class="value">${g.totalActiveDays || 0}</div>
        <div class="delta">desde que empezaste</div>
      </div>
      <div class="stat-card">
        <div class="label">Logros</div>
        <div class="value">${Object.keys(g.achievements).length}<span class="unit">/${Object.keys(GAMI_ACHIEVEMENTS).length}</span></div>
        <div class="delta">desbloqueados</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Colección de logros</div>
      <div class="gami-grid">
        ${Object.entries(GAMI_ACHIEVEMENTS).map(([key, ach]) => {
          const unlocked = !!g.achievements[key];
          return `
            <div class="gami-card ${unlocked ? "unlocked" : "locked"}">
              <div class="gami-card-icon">${ach.icon}${!unlocked ? '<span class="gami-lock">🔒</span>' : ''}</div>
              <div class="gami-card-name">${ach.name}</div>
              <div class="gami-card-desc">${ach.desc}</div>
              ${unlocked ? `<div class="gami-card-date">✓ ${g.achievements[key].unlockedAt || ""}</div>` : ""}
            </div>`;
        }).join("")}
      </div>
    </div>
  `;
};

// Called from initFitcolApp() after the DOM is ready.
function gamiInit() {
  const g = gamiLoad();
  gamiCheckReset(g);
  gamiRenderStreakBadge(g, false);
}
