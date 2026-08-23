// =====================================================
// excel-importer.js — Importar historial de entrenamientos
// desde .xlsx/.xls/.csv con SheetJS. Mapeo flexible.
// =====================================================

// Normaliza nombres de columna: minúsculas, sin tildes ni espacios
function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Aliases para cada campo destino
const COLUMN_ALIASES = {
  fecha:    ["fecha", "date", "dia", "día"],
  ejercicio:["ejercicio", "movimiento", "exercise", "lift", "nombre"],
  series:   ["series", "sets", "serie"],
  repeticiones: ["repeticiones", "reps", "repes", "rep"],
  peso:     ["peso", "kg", "carga", "weight", "lbs", "lb"],
  notas:    ["notas", "nota", "notes", "observaciones"]
};

function mapHeaders(headers) {
  const map = { fecha: -1, ejercicio: -1, series: -1, repeticiones: -1, peso: -1, notas: -1 };
  const norm = headers.map(normalize);
  for (const target of Object.keys(map)) {
    for (let i = 0; i < norm.length; i++) {
      if (COLUMN_ALIASES[target].some(a => norm[i].includes(a))) {
        map[target] = i;
        break;
      }
    }
  }
  return map;
}

function parseFecha(v) {
  if (v == null || v === "") return null;
  // SheetJS puede entregar números (fecha serial), strings o Date
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // Intenta parsear formatos comunes: yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseNumber(v) {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

// La columna de peso puede venir en libras (alias "lb"/"lbs" en COLUMN_ALIASES.peso),
// pero antes se guardaba el número crudo directo en peso_kg sin convertir. Detecta el
// encabezado real de la columna para saber en qué unidad viene.
function detectWeightUnit(header) {
  const n = normalize(header);
  return n.includes("lb") ? "lb" : "kg";
}
function lbToKgLocal(lb) { return Math.round(lb * 0.4536 * 100) / 100; }

function openExcelImporter() {
  const html = `
    <h2>Importar historial de Excel</h2>
    <p style="color:var(--text-muted); font-size:13px;">
      Sube un archivo .xlsx, .xls o .csv. Detectamos columnas como: fecha, ejercicio, series, repeticiones (o reps), peso (o kg). Las filas se guardan en tu historial de entrenamientos.
    </p>

    <div id="xls-drop" class="xls-drop">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5-5 5 5 M12 5v12"/></svg>
      <div>Arrastra el archivo aquí o haz clic para elegir</div>
      <input type="file" id="xls-input" accept=".xlsx,.xls,.csv" style="display:none">
    </div>

    <div id="xls-progress" style="display:none; margin-top:14px;">
      <div class="card-meta" id="xls-status">Procesando…</div>
      <div class="macro-bar" style="margin-top: 6px;"><div class="macro-fill protein" id="xls-bar" style="width:0%"></div></div>
    </div>
    <div id="xls-result" style="display:none; margin-top:14px;"></div>

    <button class="btn btn-block" id="xls-close" style="margin-top:14px;">Cerrar</button>
  `;
  const m = modal(html);
  m.root.querySelector("#xls-close").addEventListener("click", m.close);

  const drop = m.root.querySelector("#xls-drop");
  const input = m.root.querySelector("#xls-input");
  drop.addEventListener("click", () => input.click());
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("dragging"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
  drop.addEventListener("drop", e => {
    e.preventDefault(); drop.classList.remove("dragging");
    const file = e.dataTransfer.files[0]; if (file) handleFile(file);
  });
  input.addEventListener("change", e => { const f = e.target.files[0]; if (f) handleFile(f); });

  async function handleFile(file) {
    if (typeof XLSX === "undefined") {
      m.root.querySelector("#xls-result").style.display = "block";
      m.root.querySelector("#xls-result").innerHTML = `<div style="color:var(--danger)">SheetJS no se cargó. Revisa tu conexión y vuelve a abrir.</div>`;
      return;
    }
    const progress = m.root.querySelector("#xls-progress");
    const bar = m.root.querySelector("#xls-bar");
    const status = m.root.querySelector("#xls-status");
    const result = m.root.querySelector("#xls-result");
    progress.style.display = "block";
    result.style.display = "none";
    status.textContent = "Leyendo archivo…";

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rows.length < 2) {
      progress.style.display = "none";
      result.style.display = "block";
      result.innerHTML = `<div style="color:var(--danger)">El archivo está vacío o no se pudo leer.</div>`;
      return;
    }

    const headers = rows[0];
    const map = mapHeaders(headers);
    if (map.fecha < 0 || map.ejercicio < 0) {
      progress.style.display = "none";
      result.style.display = "block";
      result.innerHTML = `<div style="color:var(--danger)">No se encontraron columnas de <strong>fecha</strong> y <strong>ejercicio</strong>. Columnas detectadas: ${headers.map(h => `<code>${escapeHtml(String(h))}</code>`).join(", ")}</div>`;
      return;
    }

    const dataRows = rows.slice(1);
    const total = dataRows.length;
    const toInsert = [];
    const errors = [];
    const pesoUnit = map.peso >= 0 ? detectWeightUnit(headers[map.peso]) : "kg";
    let convertedCount = 0;

    for (let i = 0; i < total; i++) {
      const row = dataRows[i];
      const fecha = parseFecha(row[map.fecha]);
      const ejercicio = String(row[map.ejercicio] || "").trim();
      if (!fecha || !ejercicio) { errors.push(`Fila ${i + 2}: falta fecha o ejercicio`); continue; }
      const series = map.series >= 0 ? parseNumber(row[map.series]) : null;
      const repes  = map.repeticiones >= 0 ? parseNumber(row[map.repeticiones]) : null;
      const pesoRaw = map.peso >= 0 ? parseNumber(row[map.peso]) : null;
      let notas  = map.notas >= 0 ? String(row[map.notas] || "").trim() || null : null;

      // La columna de peso puede venir en libras (encabezado tipo "lb"/"lbs") — antes esto
      // se guardaba directo en peso_kg sin convertir, duplicando de hecho el peso real.
      let peso_kg = pesoRaw;
      if (pesoRaw != null && pesoUnit === "lb") {
        peso_kg = lbToKgLocal(pesoRaw);
        convertedCount++;
        notas = (notas ? notas + " · " : "") + `Convertido de ${pesoRaw} lb`;
      }

      toInsert.push({
        fecha,
        ejercicio,
        series: series ? Math.round(series) : null,
        repeticiones: repes ? Math.round(repes) : null,
        peso_kg,
        notas
      });

      status.textContent = `Preparando fila ${i + 1} de ${total}…`;
      bar.style.width = `${((i + 1) / total) * 50}%`; // 50% leyendo, 50% subiendo
    }

    if (!cloudAvailable()) {
      // Fallback: solo localStorage
      toInsert.forEach(r => {
        state.setLog.push({
          id: uid(), date: r.fecha,
          sessionId: `${r.fecha}-import`,
          exerciseName: r.ejercicio, group: "",
          weight: r.peso_kg || 0, unit: "kg",
          reps: r.repeticiones || 0
        });
      });
      saveState();
      progress.style.display = "none";
      result.style.display = "block";
      result.innerHTML = renderImportResult(toInsert.length, errors, "localStorage (sin sesión Supabase)", convertedCount);
      return;
    }

    status.textContent = `Subiendo a Supabase…`;
    bar.style.width = "60%";

    // Insertar en chunks de 200
    let inserted = 0;
    const chunkSize = 200;
    for (let start = 0; start < toInsert.length; start += chunkSize) {
      const chunk = toInsert.slice(start, start + chunkSize);
      const res = await cloudBulkInsertEntrenamientos(chunk);
      inserted += res.inserted;
      if (res.errors.length) errors.push(...res.errors);
      bar.style.width = `${60 + ((start + chunk.length) / toInsert.length) * 40}%`;
    }

    // Mirror a state.setLog
    toInsert.forEach(r => {
      state.setLog.push({
        id: uid(), date: r.fecha,
        sessionId: `${r.fecha}-import`,
        exerciseName: r.ejercicio, group: "",
        weight: r.peso_kg || 0, unit: "kg",
        reps: r.repeticiones || 0
      });
    });
    saveState();

    progress.style.display = "none";
    result.style.display = "block";
    result.innerHTML = renderImportResult(inserted, errors, "", convertedCount);
    if (typeof showView === "function") showView(currentView);
  }

  function renderImportResult(inserted, errors, suffix = "", convertedCount = 0) {
    return `
      <div style="background:var(--accent-soft); border:1px solid var(--accent); padding:12px; border-radius:8px; color:var(--text);">
        Se importaron <strong>${inserted}</strong> registros correctamente${suffix ? " en " + suffix : ""}.
        ${convertedCount ? ` <strong>${convertedCount}</strong> se convirtieron de libras a kilos automáticamente.` : ""}
      </div>
      ${errors.length ? `
        <div style="margin-top:10px; max-height:160px; overflow-y:auto;">
          <div style="color:var(--danger); font-weight:600; font-size:13px; margin-bottom:6px;">Errores (${errors.length}):</div>
          <ul style="font-size:12px; color:var(--text-muted); padding-left:18px;">
            ${errors.slice(0, 30).map(e => `<li>${escapeHtml(e)}</li>`).join("")}
            ${errors.length > 30 ? `<li>… y ${errors.length - 30} más</li>` : ""}
          </ul>
        </div>` : ""}
    `;
  }
}
