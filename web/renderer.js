// renderer.js para PyWebView
function $(id) {
  return document.getElementById(id);
}

const log = $("log");

function logMsg(msg) {
  log.value += msg + "\n";
  log.scrollTop = log.scrollHeight;
}

function setFechaExtraida(fecha, hora) {
  $("fecha-extraida").value = fecha || "";
  $("hora-extraida").value = hora || "";
}

function setManualEnabled(enabled) {
  $("fecha-hora-manual").disabled = !enabled;
  if (enabled) {
    $("fecha-hora-manual").style.background = "white";
  } else {
    $("fecha-hora-manual").style.background = "#f0f0f0";
  }
}

let selectedFilePath = null;
let selectedFolderPath = null;

// Variable global para mantener el batch actual
window.batchMeta = [];

// --- ELIMINAR DRAG & DROP: restaurar solo selección por botón ---
// Elimina cualquier lógica de drag & drop, deja solo la selección tradicional

$("select-file-btn").addEventListener("click", async function () {
  const paths = await window.pywebview.api.get_file_path(); // ahora retorna lista
  if (paths && Array.isArray(paths) && paths.length > 0) {
    window.batchMeta = await window.pywebview.api.extraer_metadata_batch(paths);
    console.log("batchMeta:", window.batchMeta); // Para depuración
    renderBatchTable(window.batchMeta);
    logMsg("Archivos seleccionados: " + paths.join(", "));
  }
});

// Renderiza una tabla editable para el batch
function renderBatchTable() {
  const batchDiv = document.getElementById("archivos-table-div");
  if (!batchDiv) return;
  if (!window.batchMeta || window.batchMeta.length === 0) {
    batchDiv.innerHTML = "";
    // Habilita botón clásico si no hay batch
    $("procesar-btn").disabled = false;
    $("file-section").style.display = "";
    $("folder-section").style.display = "";
    return;
  }
  let html = `<table class="archivos-table" style="width:100%;border-collapse:collapse;margin-bottom:1em;">
    <tr>
      <th>Preview</th>
      <th>Archivo</th>
      <th>Fecha extraída</th>
      <th>Hora extraída</th>
      <th>Fecha nueva</th>
      <th>Hora nueva</th>
      <th>Acción</th>
    </tr>`;
  window.batchMeta.forEach((item, idx) => {
    const ext = item.path.split(".").pop().toLowerCase();
    let actionCell = "";
    let previewCell = "";
    // Mostrar en consola para depuración
    if (["mp4", "mov", "avi"].includes(ext)) {
      const thumbPath = item.thumb || "";
      let thumbTitle = item.thumb_log || "";
      if (thumbPath) {
        let src = thumbPath.startsWith("data:")
          ? thumbPath
          : `file:///${thumbPath.replace(/\\/g, "/")}`;
        previewCell = `<img src="${src}" title="${thumbTitle}" style="max-width:60px;max-height:40px;object-fit:cover;" onerror="this.onerror=null;this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MCcgaGVpZ2h0PSc0MCc+PHJlY3Qgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgZmlsbD0nI2VlZScvPjx0ZXh0IHg9JzUwJScgeT0nNTAlJyBmb250LXNpemU9JzEwJyB0ZXh0LWFuY2hvcj0nbWlkZGxlJyBmaWxsPSIjODg4IiBkeT0nLjNlbSc+U2luIG1pbmlhdHVyYTwvdGV4dD48L3N2Zz4=';"></img>`;
      } else {
        previewCell = `<span style='color:#888' title="${thumbTitle}">Sin miniatura</span>`;
      }
      actionCell = `<select id="accion-${idx}">
        <option value="extraer_imagen">Extraer imagen</option>
        <option value="modificar_video">Modificar video</option>
      </select>`;
    } else if (["jpg", "jpeg", "png", "bmp", "gif"].includes(ext)) {
      // Mostrar preview para imágenes
      const thumbPath = item.thumb || "";
      let thumbTitle = item.thumb_log || "";
      if (thumbPath) {
        let src = thumbPath.startsWith("data:")
          ? thumbPath
          : `file:///${thumbPath.replace(/\\/g, "/")}`;
        previewCell = `<img src="${src}" title="${thumbTitle}" style="max-width:60px;max-height:40px;object-fit:cover;">`;
      } else {
        previewCell = `<span style='color:#888' title="${thumbTitle}">Sin preview</span>`;
      }
      actionCell = "Modificar imagen";
    } else {
      previewCell = `<span style='color:#888'>No preview</span>`;
      actionCell = "No soportado";
    }
    html += `<tr>
      <td>${previewCell}</td>
      <td class="archivo-nombre-td" title="${item.path
        .split(/[\\/]/)
        .pop()}">${item.path.split(/[\\/]/).pop()}</td>
      <td><input type="text" id="fecha-extraida-${idx}" value="${
      item.fecha || ""
    }" style="width:90px;font-size:12px;" readonly></td>
      <td><input type="text" id="hora-extraida-${idx}" value="${
      item.hora || ""
    }" style="width:70px;font-size:12px;" readonly></td>
      <td><input type="date" id="fecha-${idx}" value="" style="width:110px;"></td>
      <td><input type="time" id="hora-${idx}" value="" style="width:90px;"></td>
      <td>${actionCell}</td>
    </tr>`;
  });
  html += `</table>
    <button id="procesar-batch-btn">Procesar todos</button>
    <button id="limpiar-batch-btn" style="margin-left:12px;">Limpiar lista</button>`;
  html += `<div id="batch-error-msg" style="color:#b00;font-weight:bold;margin-top:0.5em;"></div>`;
  batchDiv.innerHTML = html;
  // Asigna el event listener cada vez que se renderiza
  document.getElementById("limpiar-batch-btn").onclick = function () {
    limpiarBatchTable();
  };
  // Asigna el event listener al botón procesar-batch-btn
  document.getElementById("procesar-batch-btn").onclick = async function () {
    let errorMsg = "";
    const archivos = window.batchMeta.map((item, idx) => {
      let fecha = document.getElementById(`fecha-${idx}`).value;
      let hora = document.getElementById(`hora-${idx}`).value;
      let accion = "modificar_imagen";
      const ext = item.path.split(".").pop().toLowerCase();
      if (["mp4", "mov", "avi"].includes(ext)) {
        accion = document.getElementById(`accion-${idx}`).value;
      }
      return {
        path: item.path,
        fecha: fecha,
        hora: hora,
        accion,
      };
    });
    // Permite hora vacía, el backend la rellenará
    document.getElementById("batch-error-msg").textContent = "";
    const resultados = await window.pywebview.api.procesar_batch(archivos);
    mostrarResultadosBatch(resultados);
  };
  // Deshabilita botones clásicos y oculta campos clásicos
  $("procesar-btn").disabled = true;
  $("file-section").style.display = "none";
  $("folder-section").style.display = "none";
}

function limpiarBatchTable() {
  const batchDiv = document.getElementById("archivos-table-div");
  batchDiv.innerHTML = "";
  window.batchMeta = [];
  $("procesar-btn").disabled = false;
  $("file-section").style.display = "";
  $("folder-section").style.display = "";
  document.getElementById("batch-error-msg").textContent = "";
}

function mostrarResultadosBatch(resultados) {
  const batchDiv = document.getElementById("archivos-table-div");
  if (!batchDiv) return;
  let html =
    '<h4 style="margin-top:1em;">Resultados del procesamiento batch:</h4>' +
    '<ul style="background:#f4f4f4;padding:1em;border-radius:8px;">';
  resultados.forEach((r) => {
    html += `<li><b>${r.path.split(/[\\/]/).pop()}</b>: ${r.resultado || r.msg || ''}</li>`;
  });
  html += "</ul>";
  html += '<button id="limpiar-batch-btn" style="margin-top:1em;">Limpiar lista</button>';
  batchDiv.innerHTML = html;
  window.batchMeta = [];
  document.getElementById("limpiar-batch-btn").onclick = function () {
    limpiarBatchTable();
  };
}

// Asegúrate de tener un <div id="archivos-table-div"></div> en tu HTML principal

$("select-folder-btn").addEventListener("click", async function () {
  const path = await window.pywebview.api.get_folder_path();
  if (path) {
    selectedFolderPath = path;
    selectedFilePath = null;
    $("folder-path").value = path;
    $("file-path").value = "";
    setFechaExtraida("", "");
    logMsg("Carpeta seleccionada: " + path);
  }
});

// El resto del flujo permanece igual

// Radio buttons para modo de fecha
$("modo-fecha-extraida").addEventListener("change", function () {
  if (this.checked) setManualEnabled(false);
});
$("modo-fecha-manual").addEventListener("change", function () {
  if (this.checked) setManualEnabled(true);
});

function getManualFechaHora() {
  const val = $("fecha-hora-manual").value;
  if (!val) return { fecha: "", hora: "" };
  // datetime-local: "2025-04-25T13:29"
  const [fecha, hora] = val.split("T");
  // Convertir a formato requerido: fecha YYYY:MM:DD, hora HH:MM:SS
  const fechaFmt = fecha ? fecha.replace(/-/g, ":") : "";
  const horaFmt = hora ? (hora.length === 5 ? hora + ":00" : hora) : "";
  return { fecha: fechaFmt, hora: horaFmt };
}

// --- CAMBIAR METADATA VIDEO ---
$("cambiar-meta-video-btn").addEventListener("click", async function () {
  log.value = "";
  if (!selectedFilePath) {
    logMsg("❌ Debes seleccionar un archivo de video.");
    return;
  }
  // Validar extensión de video
  const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm"];
  const ext = selectedFilePath
    .substring(selectedFilePath.lastIndexOf("."))
    .toLowerCase();
  if (!videoExts.includes(ext)) {
    logMsg("❌ El archivo seleccionado no es un video soportado.");
    return;
  }
  // Pedir fecha y hora
  let modo_fecha = $("modo-fecha-extraida").checked ? "extraida" : "manual";
  let fecha = "";
  let hora = "";
  if (modo_fecha === "manual") {
    const fh = getManualFechaHora();
    fecha = fh.fecha;
    hora = fh.hora;
  } else {
    fecha = $("fecha-extraida").value;
    hora = $("hora-extraida").value;
  }
  if (!fecha || !hora) {
    logMsg("❌ Debes especificar una fecha y hora válidas.");
    return;
  }
  // Llamar a la API Python
  const res = await window.pywebview.api.cambiar_metadata_video(
    selectedFilePath,
    fecha,
    hora
  );
  logMsg(res.msg);
});

$("procesar-btn").addEventListener("click", async function () {
  log.value = "";
  const modo_fecha = $("modo-fecha-extraida").checked ? "extraida" : "manual";
  let fecha_manual = "";
  let hora_manual = "";
  if (modo_fecha === "manual") {
    const fh = getManualFechaHora();
    fecha_manual = fh.fecha;
    hora_manual = fh.hora;
  }
  if (selectedFilePath) {
    const res = await window.pywebview.api.procesar_auto(
      selectedFilePath,
      modo_fecha,
      fecha_manual,
      hora_manual
    );
    logMsg(res.msg);
  } else if (selectedFolderPath) {
    const tipo_carpeta = $("tipo-carpeta").value;
    const res = await window.pywebview.api.procesar_auto(
      selectedFolderPath,
      modo_fecha,
      fecha_manual,
      hora_manual,
      tipo_carpeta
    );
    (res.logs || []).forEach(logMsg);
    if (res.msg) logMsg(res.msg);
  } else {
    // Si hay tabla batch activa, muestra mensaje específico
    const batchDiv = document.getElementById("archivos-table-div");
    if (batchDiv && batchDiv.innerHTML.trim() !== "") {
      logMsg("❌ Usa el botón 'Procesar todos' para archivos múltiples.");
    } else {
      logMsg("❌ Debes seleccionar un archivo o una carpeta.");
    }
  }
});

// Inicializa el estado de los campos
setManualEnabled(false);

document.addEventListener("click", function (e) {
  if (e.target && e.target.id === "procesar-batch-btn") {
    const rows = window.batchMeta;
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const horaActual =
      pad(now.getHours()) +
      ":" +
      pad(now.getMinutes()) +
      ":" +
      pad(now.getSeconds());
    rows.forEach((item, idx) => {
      const fechaInput = document.getElementById(`fecha-${idx}`);
      const horaInput = document.getElementById(`hora-${idx}`);
      item.fecha = fechaInput && fechaInput.value ? fechaInput.value : "";
      item.hora = horaInput && horaInput.value ? horaInput.value : "";
    });
    // Llama a la función de procesamiento batch real
    window.pywebview.api.procesar_batch(rows).then(mostrarResultadosBatch);
    logMsg("Procesando batch (hora vacía se completará en backend)...");
  }
});

// --- Abrir carpeta de salida ---
document.getElementById("abrir-output-btn").onclick = async function () {
  await window.pywebview.api.abrir_output_dir();
};
