// =====================================================
// food-search.js — Buscador de alimentos Open Food Facts
// API gratuita, sin key. Calcula macros por porción en vivo.
// =====================================================

async function buscarComida(query) {
  const make = (lc) => `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10${lc ? "&lc=" + lc : ""}`;

  async function fetchSafe(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  let data = await fetchSafe(make("es"));
  let products = (data?.products || []).filter(p => p.product_name && p.nutriments);
  if (products.length === 0) {
    data = await fetchSafe(make(""));
    products = (data?.products || []).filter(p => p.product_name && p.nutriments);
  }
  return products;
}

function macrosPorPorcion(prod, gramos) {
  const n = prod.nutriments || {};
  const factor = (gramos || 100) / 100;
  return {
    kcal: Math.round((n["energy-kcal_100g"] || n["energy-kcal"] || (n["energy_100g"] / 4.184) || 0) * factor),
    p:    Math.round((n["proteins_100g"] || 0) * factor * 10) / 10,
    c:    Math.round((n["carbohydrates_100g"] || 0) * factor * 10) / 10,
    f:    Math.round((n["fat_100g"] || 0) * factor * 10) / 10
  };
}

function openFoodSearch(slot) {
  const html = `
    <h2>Buscar alimento</h2>
    <p style="color:var(--text-muted); font-size:13px;">Powered by Open Food Facts. Busca por nombre y elige una porción.</p>

    <div class="field"><label>Slot</label>
      <select id="fs-slot">
        <option value="desayuno" ${slot==="desayuno"?"selected":""}>Desayuno</option>
        <option value="almuerzo" ${slot==="almuerzo"?"selected":""}>Almuerzo</option>
        <option value="snack" ${slot==="snack"?"selected":""}>Snack</option>
        <option value="cena" ${slot==="cena"?"selected":""}>Cena</option>
      </select>
    </div>

    <form id="fs-form" style="display:flex; gap:8px; margin-bottom: 14px;">
      <input type="text" id="fs-query" placeholder="arroz, pollo, avena…" style="flex:1; background:var(--bg-elev-2); color:var(--text); border:1px solid var(--border); padding:11px 13px; border-radius:8px;" required>
      <button type="submit" class="btn btn-primary">Buscar</button>
    </form>

    <div id="fs-status" style="color:var(--text-muted); font-size:13px;"></div>
    <div id="fs-results" style="max-height: 420px; overflow-y: auto;"></div>

    <button class="btn btn-block" id="fs-cancel" style="margin-top:14px;">Cerrar</button>
  `;
  const m = modal(html);
  m.root.querySelector("#fs-cancel").addEventListener("click", m.close);

  m.root.querySelector("#fs-form").addEventListener("submit", async e => {
    e.preventDefault();
    const q = m.root.querySelector("#fs-query").value.trim();
    if (!q) return;
    const status = m.root.querySelector("#fs-status");
    const results = m.root.querySelector("#fs-results");
    status.textContent = "Buscando…";
    results.innerHTML = "";

    const products = await buscarComida(q);
    if (!products.length) { status.textContent = "Sin resultados."; return; }
    status.textContent = `${products.length} resultados`;

    results.innerHTML = products.map((p, i) => {
      const m100 = macrosPorPorcion(p, 100);
      const brand = p.brands ? ` · ${escapeHtml(p.brands)}` : "";
      return `
        <div class="food-result-card" data-i="${i}">
          <div class="recipe-name">${escapeHtml(p.product_name)}<span class="card-meta">${brand}</span></div>
          <div class="card-meta" style="margin-bottom:8px;">Por 100g: <strong>${m100.kcal}</strong> kcal · ${m100.p}P · ${m100.c}C · ${m100.f}G</div>
          <div class="food-portion-row">
            <label>Porción (g):</label>
            <input type="number" class="fs-portion" min="1" max="2000" step="1" value="100">
            <div class="fs-calc">
              <strong class="fs-kcal">${m100.kcal}</strong> kcal ·
              <span class="fs-p">${m100.p}</span>P ·
              <span class="fs-c">${m100.c}</span>C ·
              <span class="fs-f">${m100.f}</span>G
            </div>
            <button class="btn btn-sm btn-primary fs-add">Agregar</button>
          </div>
        </div>
      `;
    }).join("");

    results.querySelectorAll(".food-result-card").forEach(card => {
      const i = parseInt(card.dataset.i);
      const prod = products[i];
      const portion = card.querySelector(".fs-portion");
      const update = () => {
        const mm = macrosPorPorcion(prod, parseFloat(portion.value) || 0);
        card.querySelector(".fs-kcal").textContent = mm.kcal;
        card.querySelector(".fs-p").textContent = mm.p;
        card.querySelector(".fs-c").textContent = mm.c;
        card.querySelector(".fs-f").textContent = mm.f;
      };
      portion.addEventListener("input", update);
      card.querySelector(".fs-add").addEventListener("click", async () => {
        const grams = parseFloat(portion.value) || 100;
        const mm = macrosPorPorcion(prod, grams);
        const slot = m.root.querySelector("#fs-slot").value;
        const name = prod.product_name + (prod.brands ? ` (${prod.brands.split(",")[0]})` : "");
        const entry = {
          slot,
          name,
          kcal: mm.kcal, p: mm.p, c: mm.c, f: mm.f,
          source: "openfoodfacts",
          porcion_gramos: grams
        };
        logMeal(entry);
        if (typeof cloudInsertComida === "function") {
          await cloudInsertComida({ date: todayISO(), ...entry });
        }
        toast(`Agregado: ${name} - ${mm.kcal} kcal`);
        m.close();
        if (typeof views !== "undefined" && views.diet) views.diet();
      });
    });
  });
}
