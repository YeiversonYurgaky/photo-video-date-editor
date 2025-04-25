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
  const path = await window.pywebview.api.get_file_path();
  if (path) {
    selectedFilePath = path;
    selectedFolderPath = null;
    $("file-path").value = path;
    $("folder-path").value = "";
    const meta = await window.pywebview.api.extraer_fecha_hora(path);
    setFechaExtraida(meta.fecha, meta.hora);
    logMsg('Archivo seleccionado: ' + path);
  }
});

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
    logMsg("❌ Debes seleccionar un archivo o una carpeta.");
  }
});

// Inicializa el estado de los campos
setManualEnabled(false);
