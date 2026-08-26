// =====================================================
// restaurant-foods.js — Base de datos de referencia para
// mejorar la precisión del análisis de fotos de comida.
//
// Por qué existe: analyzeFoodPhoto() (ver ai.js) le pide a la IA que
// ESTIME los macros solo a partir de lo que ve en la foto, en una sola
// pasada, sin ningún dato real de respaldo. Eso funciona razonable para
// comida casera pero falla justo donde más se usa la app: comida de
// cadenas de centros comerciales, donde SÍ existen valores reales
// publicados. Esta base de datos permite que, cuando la IA reconoce
// (o el usuario confirma) una cadena conocida, se use el valor real en
// vez de la estimación visual.
//
// Cadenas incluidas: las 10 más relevantes en centros comerciales
// colombianos según ranking de facturación 2025 (lanota.com, sobre datos
// de Supersociedades) + presencia confirmada en malls (Centro Andino,
// Centro Mayor, etc.): Frisby, KFC, El Corral, McDonald's,
// Crepes & Waffles, Kokoriko, Papa John's, Archie's, Sándwich Qbano,
// Sr Wok. De cada una se listan sus 3 platos más representativos/pedidos.
//
// fuente: "leanmate.app" = tomado de una base de datos nutricional ya
// publicada para esa cadena. "estimado" = no encontramos una fuente
// publicada para esa cadena puntual; el valor se calculó por
// comparación con platos equivalentes de cadenas similares que sí
// tienen datos reales (mismo tipo de preparación/porción). Como el
// resto de la base de comida colombiana de Fitcol (ver FOODS en
// data.js), son macros aproximados, no un análisis de laboratorio.
// =====================================================

const RESTAURANT_FOODS = {
  "Frisby": [
    { name: "Presa de pollo apanado (pechuga)", kcal: 340, p: 33, c: 14, f: 18, fuente: "leanmate.app" },
    { name: "Apanados de pollo x3", kcal: 360, p: 28, c: 22, f: 18, fuente: "leanmate.app" },
    { name: "Hamburguesa de pollo Frisby", kcal: 520, p: 26, c: 46, f: 26, fuente: "leanmate.app" }
  ],
  "KFC": [
    { name: "Pieza de pollo original (pechuga)", kcal: 320, p: 32, c: 11, f: 17, fuente: "leanmate.app" },
    { name: "Zinger Burger", kcal: 470, p: 22, c: 41, f: 23, fuente: "leanmate.app" },
    { name: "Twister Original", kcal: 530, p: 25, c: 53, f: 24, fuente: "leanmate.app" }
  ],
  "El Corral": [
    { name: "Hamburguesa El Corral clásica", kcal: 560, p: 28, c: 44, f: 30, fuente: "leanmate.app" },
    { name: "Corral Especial", kcal: 680, p: 34, c: 45, f: 40, fuente: "leanmate.app" },
    { name: "Todoterreno (doble + bacon)", kcal: 920, p: 50, c: 47, f: 58, fuente: "leanmate.app" }
  ],
  "McDonald's": [
    { name: "Big Mac", kcal: 540, p: 25, c: 46, f: 28, fuente: "leanmate.app" },
    { name: "Cuarto de Libra con queso", kcal: 520, p: 30, c: 42, f: 26, fuente: "leanmate.app" },
    { name: "McNuggets x10", kcal: 470, p: 24, c: 26, f: 30, fuente: "leanmate.app" }
  ],
  "Crepes & Waffles": [
    { name: "Crepe de pollo y champiñones", kcal: 480, p: 28, c: 42, f: 22, fuente: "leanmate.app" },
    { name: "Ensalada de pollo grillado", kcal: 390, p: 30, c: 22, f: 18, fuente: "leanmate.app" },
    { name: "Waffle con helado y arequipe", kcal: 720, p: 9, c: 96, f: 33, fuente: "leanmate.app" }
  ],
  "Kokoriko": [
    { name: "Cuarto de pollo asado (pierna y muslo)", kcal: 430, p: 38, c: 2, f: 28, fuente: "leanmate.app" },
    { name: "Pollo broaster (presa)", kcal: 480, p: 32, c: 18, f: 30, fuente: "leanmate.app" },
    { name: "Arroz con pollo porción", kcal: 560, p: 24, c: 72, f: 14, fuente: "leanmate.app" }
  ],
  "Papa John's": [
    { name: "Pizza pepperoni (2 tajadas medianas)", kcal: 460, p: 20, c: 52, f: 18, fuente: "leanmate.app" },
    { name: "BBQ Wings x8", kcal: 690, p: 44, c: 28, f: 44, fuente: "leanmate.app" },
    { name: "Cheesesticks x4", kcal: 380, p: 16, c: 40, f: 18, fuente: "leanmate.app" }
  ],
  "Archie's": [
    { name: "Pizza margarita (2 tajadas medianas)", kcal: 520, p: 20, c: 58, f: 22, fuente: "estimado" },
    { name: "Pizza pepperoni (2 tajadas medianas)", kcal: 560, p: 22, c: 56, f: 26, fuente: "estimado" },
    { name: "Calzone relleno de pollo", kcal: 640, p: 28, c: 62, f: 28, fuente: "estimado" }
  ],
  "Sándwich Qbano": [
    { name: "Sandwich cubano regular", kcal: 620, p: 34, c: 58, f: 26, fuente: "estimado" },
    { name: "Sandwich de pollo regular", kcal: 540, p: 30, c: 54, f: 20, fuente: "estimado" },
    { name: "Papas Qbano con salsas", kcal: 450, p: 6, c: 52, f: 22, fuente: "estimado" }
  ],
  "Sr Wok": [
    { name: "Arroz chino con pollo porción", kcal: 560, p: 24, c: 78, f: 16, fuente: "estimado" },
    { name: "Pollo agridulce con arroz", kcal: 620, p: 26, c: 82, f: 18, fuente: "estimado" },
    { name: "Rollitos primavera x4", kcal: 320, p: 8, c: 36, f: 16, fuente: "estimado" }
  ]
};

// -----------------------------------------------------
// Utilidades de coincidencia (mismo criterio de normalización
// que excel-importer.js: minúsculas, sin tildes, solo alfanumérico)
// -----------------------------------------------------
function _rfNormalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// Palabras que no aportan a distinguir un plato de otro ("arroz CON pollo"
// vs "ajiaco CON pollo" comparten "con" y "pollo" pero no son el mismo
// plato) — sin filtrarlas, dos platos cualquiera que compartan un
// conector español pueden alcanzar el umbral de coincidencia por error.
const _RF_STOPWORDS = new Set([
  "con", "de", "del", "la", "el", "los", "las", "y", "en", "a", "al",
  "una", "uno", "sin", "por", "para", "su", "sus", "un", "porcion",
  "mediana", "medianas", "grande", "grandes", "pequena", "pequenas",
  "regular", "personal", "casero", "casera"
]);

function _rfWords(s) {
  return _rfNormalize(s).split(/\s+/).filter(w => w.length > 2 && !_RF_STOPWORDS.has(w));
}

// Puntaje simple por palabras en común (0 a 1). Suficiente para este
// caso de uso: no necesitamos un algoritmo de similitud sofisticado,
// solo distinguir "es básicamente el mismo plato" de "no tiene nada que ver".
function _rfScore(a, b) {
  const wa = new Set(_rfWords(a));
  const wb = new Set(_rfWords(b));
  if (!wa.size || !wb.size) return 0;
  let shared = 0;
  wa.forEach(w => { if (wb.has(w)) shared++; });
  return shared / Math.max(wa.size, wb.size);
}

// Devuelve todos los platos de referencia como lista plana
// { name, kcal, p, c, f, fuente, restaurante }
function getAllReferenceFoods() {
  const out = [];
  Object.entries(RESTAURANT_FOODS).forEach(([restaurante, items]) => {
    items.forEach(it => out.push({ ...it, restaurante }));
  });
  // También la comida casera colombiana ya existente en data.js (FOODS),
  // por si la foto es de un plato casero típico y no de una cadena.
  if (typeof FOODS !== "undefined") {
    Object.values(FOODS).forEach(porMomento => {
      Object.values(porMomento).forEach(lista => {
        lista.forEach(it => out.push({
          name: it.name, kcal: it.kcal, p: it.p, c: it.c, f: it.f,
          fuente: "fitcol", restaurante: null
        }));
      });
    });
  }
  return out;
}

// Intenta encontrar el mejor match para (nombre, restaurante) detectados
// por la IA. Si `restaurante` viene y coincide (normalizado) con una
// cadena conocida, busca solo dentro de esa cadena (más preciso). Si no,
// busca en toda la base. Devuelve null si el mejor puntaje no supera el
// umbral — mejor no corregir nada que corregir con un match falso.
function findReferenceFoodMatch(nombre, restaurante) {
  if (!nombre) return null;
  const THRESHOLD = 0.5;

  if (restaurante) {
    const cadena = Object.keys(RESTAURANT_FOODS).find(
      k => _rfNormalize(k) === _rfNormalize(restaurante) || _rfScore(k, restaurante) >= 0.8
    );
    if (cadena) {
      let best = null, bestScore = 0;
      RESTAURANT_FOODS[cadena].forEach(it => {
        const s = _rfScore(it.name, nombre);
        if (s > bestScore) { bestScore = s; best = it; }
      });
      if (best && bestScore >= THRESHOLD) return { ...best, restaurante: cadena, score: bestScore };
    }
  }

  let best = null, bestScore = 0;
  getAllReferenceFoods().forEach(it => {
    const s = _rfScore(it.name, nombre);
    if (s > bestScore) { bestScore = s; best = it; }
  });
  if (best && bestScore >= THRESHOLD) return { ...best, score: bestScore };
  return null;
}
