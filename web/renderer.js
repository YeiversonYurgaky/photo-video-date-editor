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

// --- ELIMINAR DRAG & DROP: restaurar solo selección por botón ---
// Elimina cualquier lógica de drag & drop, deja solo la selección tradicional

$("select-file-btn").addEventListener("click", async function () {
  const paths = await window.pywebview.api.get_file_path(); // ahora retorna lista
  if (paths && Array.isArray(paths) && paths.length > 0) {
    // Pide metadata batch al backend
    const batchMeta = await window.pywebview.api.extraer_metadata_batch(paths);
    renderBatchTable(batchMeta);
    logMsg('Archivos seleccionados: ' + paths.join(", "));
  }
});

// Renderiza una tabla editable para el batch
function renderBatchTable(batchMeta) {
  const batchDiv = document.getElementById('batch-table-div');
  if (!batchDiv) return;
  if (!batchMeta || batchMeta.length === 0) {
    batchDiv.innerHTML = '';
    // Habilita botón clásico si no hay batch
    $("procesar-btn").disabled = false;
    $("file-section").style.display = '';
    $("folder-section").style.display = '';
    return;
  }
  let html = `<table class="batch-table" style="width:100%;border-collapse:collapse;margin-bottom:1em;">
    <tr>
      <th>Archivo</th>
      <th>Fecha extraída</th>
      <th>Hora extraída</th>
      <th>Fecha nueva</th>
      <th>Hora nueva</th>
      <th>Acción</th>
    </tr>`;
  batchMeta.forEach((item, idx) => {
    const ext = item.path.split('.').pop().toLowerCase();
    let actionCell = '';
    if (["mp4","mov","avi"].includes(ext)) {
      actionCell = `<select id="accion-${idx}">
        <option value="extraer_imagen">Extraer imagen</option>
        <option value="modificar_video">Modificar video</option>
      </select>`;
    } else {
      actionCell = 'Modificar imagen';
    }
    html += `<tr>
      <td title="${item.path}" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${item.path.split(/[\\/]/).pop()}</td>
      <td>${item.fecha || '<span style=\'color:#aaa\'>(vacío)</span>'}</td>
      <td>${item.hora || '<span style=\'color:#aaa\'>(vacío)</span>'}</td>
      <td><input type="date" value="${item.fecha || ''}" id="fecha-${idx}" style="width:130px;"></td>
      <td><input type="time" value="${item.hora || ''}" id="hora-${idx}" style="width:110px;"></td>
      <td>${actionCell}</td>
    </tr>`;
  });
  html += `</table>
    <button id="procesar-batch-btn" style="padding:0.5em 1.5em;font-size:1em;margin-bottom:1em;">Procesar todos</button>
    <button id="limpiar-batch-btn" style="margin-left:1em;padding:0.5em 1.5em;font-size:1em;">Limpiar</button>`;
  html += `<div id="batch-error-msg" style="color:#b00;font-weight:bold;margin-top:0.5em;"></div>`;
  batchDiv.innerHTML = html;
  // Deshabilita botones clásicos y oculta campos clásicos
  $("procesar-btn").disabled = true;
  $("file-section").style.display = 'none';
  $("folder-section").style.display = 'none';

  document.getElementById('procesar-batch-btn').onclick = async function() {
    // Validación: todos los campos deben estar llenos
    let errorMsg = '';
    const archivos = batchMeta.map((item, idx) => {
      let fecha = document.getElementById(`fecha-${idx}`).value;
      let hora = document.getElementById(`hora-${idx}`).value;
      let accion = 'modificar_imagen';
      const ext = item.path.split('.').pop().toLowerCase();
      if (["mp4","mov","avi"].includes(ext)) {
        accion = document.getElementById(`accion-${idx}`).value;
      }
      // Si fecha está vacía, se deja como vacío (backend pondrá fecha actual)
      return {
        path: item.path,
        fecha: fecha, // puede ser ''
        hora: hora,   // puede ser ''
        accion
      };
    });
    // Solo error si hora está vacía
    if (archivos.some(a => !a.hora)) {
      document.getElementById('batch-error-msg').textContent = 'Todos los archivos deben tener hora.';
      return;
    } else {
      document.getElementById('batch-error-msg').textContent = '';
    }
    const resultados = await window.pywebview.api.procesar_batch(archivos);
    mostrarResultadosBatch(resultados);
  };
  // Botón limpiar batch
  document.getElementById('limpiar-batch-btn').onclick = function() {
    limpiarBatchTable();
  };
}

function limpiarBatchTable() {
  const batchDiv = document.getElementById('batch-table-div');
  batchDiv.innerHTML = '';
  $("procesar-btn").disabled = false;
  $("file-section").style.display = '';
  $("folder-section").style.display = '';
  document.getElementById('batch-error-msg').textContent = '';
}

function mostrarResultadosBatch(resultados) {
  const batchDiv = document.getElementById('batch-table-div');
  if (!batchDiv) return;
  let html = '<h4 style="margin-top:1em;">Resultados del procesamiento batch:</h4><ul style="background:#f4f4f4;padding:1em;border-radius:8px;">';
  resultados.forEach(r => {
    html += `<li><b>${r.path.split(/[\\/]/).pop()}</b>: ${r.resultado}</li>`;
  });
  html += '</ul>';
  batchDiv.innerHTML += html;
}

// Asegúrate de tener un <div id="batch-table-div"></div> en tu HTML principal

$("select-folder-btn").addEventListener("click", async function () {
  const path = await window.pywebview.api.get_folder_path();
  if (path) {
    selectedFolderPath = path;
    selectedFilePath = null;
    $("folder-path").value = path;
    $("file-path").value = "";
    setFechaExtraida("", "");
    logMsg('Carpeta seleccionada: ' + path);
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
  const ext = selectedFilePath.substring(selectedFilePath.lastIndexOf('.')).toLowerCase();
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
  const res = await window.pywebview.api.cambiar_metadata_video(selectedFilePath, fecha, hora);
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
    const batchDiv = document.getElementById('batch-table-div');
    if (batchDiv && batchDiv.innerHTML.trim() !== '') {
      logMsg("❌ Usa el botón 'Procesar todos' para archivos múltiples.");
    } else {
      logMsg("❌ Debes seleccionar un archivo o una carpeta.");
    }
  }
});

// Inicializa el estado de los campos
setManualEnabled(false);
