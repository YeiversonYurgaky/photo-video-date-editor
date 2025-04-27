// --- Limpiar tabla batch y restaurar UI principal ---
function limpiarBatchTable() {
  // Vacía la variable global
  window.batchMeta = [];

  // Limpia el contenido de la tabla
  const batchDiv = document.getElementById("archivos-table-div");
  if (batchDiv) {
    batchDiv.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-file-circle-exclamation fa-2x"></i>
        <p>No hay archivos seleccionados para procesar</p>
      </div>`;
  }

  // Restaura los controles principales
  $("procesar-btn").disabled = false;
  $("file-section").style.display = "";
  $("folder-section").style.display = "";
  // Limpia selección de archivos/carpeta
  $("file-path").value = "";
  $("folder-path").value = "";
  setFechaExtraida("", "");
  setManualEnabled(false);
}

// renderer.js para PyWebView
function $(id) {
  return document.getElementById(id);
}

const log = null;

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

$("select-file-btn").addEventListener("click", async function () {
  const paths = await window.pywebview.api.get_file_path(); // ahora retorna lista
  if (paths && Array.isArray(paths) && paths.length > 0) {
    window.batchMeta = await window.pywebview.api.extraer_metadata_batch(paths);
    renderBatchTable(window.batchMeta);
  }
});

// Renderiza una tabla editable más estética para el batch
function renderBatchTable() {
  const batchDiv = document.getElementById("archivos-table-div");
  if (!batchDiv) return;

  // Si no hay archivos, limpia la tabla y restaura la interfaz principal
  if (!window.batchMeta || window.batchMeta.length === 0) {
    batchDiv.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-file-circle-exclamation fa-2x"></i>
        <p>No hay archivos seleccionados para procesar</p>
      </div>`;

    // Habilita botón clásico si no hay batch
    $("procesar-btn").disabled = false;
    $("file-section").style.display = "";
    $("folder-section").style.display = "";
    return;
  }

  // --- INICIO: WRAPPER PARA LA TABLA ---
  let html = `
    <div class="batch-table-container">
      <div class="batch-controls">
        <span class="batch-count">${window.batchMeta.length} archivo(s) seleccionado(s)</span>
        <button id="limpiar-batch-btn" class="control-btn">
          <i class="fa-solid fa-trash-can"></i> Limpiar lista
        </button>
        <span id="batch-status-zone" style="margin-left: 1.5rem;"></span>
      </div>
      <div class="archivos-table-wrapper">
        <table class="archivos-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Archivo</th>
              <th>Fecha extraída</th>
              <th>Hora extraída</th>
              <th>Fecha nueva</th>
              <th>Hora nueva</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>`;

  window.batchMeta.forEach((item, idx) => {
    const ext = item.path.split(".").pop().toLowerCase();
    const fileName = item.path.split(/[\\/]/).pop();
    let actionCell = "";
    let previewCell = "";

    // Generar celdas según el tipo de archivo
    if (["mp4", "mov", "avi"].includes(ext)) {
      const thumbPath = item.thumb || "";
      let thumbTitle = item.thumb_log || "";

      if (thumbPath) {
        let src = thumbPath.startsWith("data:")
          ? thumbPath
          : `file:///${thumbPath.replace(/\\/g, "/")}`;
        previewCell = `
          <div class="preview-container">
            <img src="${src}" title="${thumbTitle}" class="preview-thumbnail" 
              onerror="this.onerror=null;this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MCcgaGVpZ2h0PSc0MCc+PHJlY3Qgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgZmlsbD0nI2VlZScvPjx0ZXh0IHg9JzUwJScgeT0nNTAlJyBmb250LXNpemU9JzEwJyB0ZXh0LWFuY2hvcj0nbWlkZGxlJyBmaWxsPSIjODg4IiBkeT0nLjNlbSc+U2luIG1pbmlhdHVyYTwvdGV4dD48L3N2Zz4=';">
            <div class="preview-type-badge video-badge">
              <i class="fa-solid fa-video"></i>
            </div>
          </div>`;
      } else {
        previewCell = `
          <div class="preview-container no-preview" title="${thumbTitle}">
            <i class="fa-solid fa-video"></i>
            <span>Sin miniatura</span>
          </div>`;
      }

      actionCell = `
        <select id="accion-${idx}" class="action-select">
          <option value="modificar_video" ${
            item.accion === "modificar_video" ? "selected" : ""
          }>Solo metadata</option>
          <option value="extraer_frame" ${
            item.accion === "extraer_frame" ? "selected" : ""
          }>Extraer frame</option>
        </select>`;
    } else if (["jpg", "jpeg", "png", "bmp", "gif"].includes(ext)) {
      // Mostrar preview para imágenes
      const thumbPath = item.thumb || "";
      let thumbTitle = item.thumb_log || "";

      if (thumbPath) {
        let src = thumbPath.startsWith("data:")
          ? thumbPath
          : `file:///${thumbPath.replace(/\\/g, "/")}`;
        previewCell = `
          <div class="preview-container">
            <img src="${src}" title="${thumbTitle}" class="preview-thumbnail">
            <div class="preview-type-badge image-badge">
              <i class="fa-solid fa-image"></i>
            </div>
          </div>`;
      } else {
        previewCell = `
          <div class="preview-container no-preview" title="${thumbTitle}">
            <i class="fa-solid fa-image"></i>
            <span>Sin preview</span>
          </div>`;
      }

      actionCell = `
        <div class="action-label">
          <i class="fa-solid fa-pencil-alt"></i> Modificar imagen
        </div>`;
    } else {
      previewCell = `
        <div class="preview-container no-preview">
          <i class="fa-solid fa-file"></i>
          <span>No preview</span>
        </div>`;

      actionCell = `
        <div class="action-label unsupported">
          <i class="fa-solid fa-ban"></i> No soportado
        </div>`;
    }

    html += `
      <tr>
        <td>${previewCell}</td>
        <td class="archivo-nombre-td" title="${fileName}">
          <div class="file-name-container">
            <div class="file-icon">
              <i class="fa-solid ${getFileIcon(ext)}"></i>
            </div>
            <div class="file-name">${fileName}</div>
          </div>
        </td>
        <td>
          <input type="text" id="fecha-extraida-${idx}" value="${
      item.fecha || ""
    }" class="fecha-input" readonly>
        </td>
        <td>
          <input type="text" id="hora-extraida-${idx}" value="${
      item.hora || ""
    }" class="hora-input" readonly>
        </td>
        <td>
          <input type="date" id="fecha-${idx}" value="${
      item.fecha && item.fecha.length === 10
        ? item.fecha.replace(/:/g, "-")
        : ""
    }" class="fecha-input editable">
        </td>
        <td>
          <input type="time" id="hora-${idx}" value="${
      item.hora || ""
    }" class="hora-input editable">
        </td>
        <td>${actionCell}</td>
      </tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>
      
      <div class="batch-footer">
        <button id="procesar-batch-btn" class="primary-btn">
          <i class="fa-solid fa-play"></i> Procesar todos
        </button>
        <div id="batch-error-msg" class="error-message"></div>
      </div>
    </div>`;

  batchDiv.innerHTML = html;

  // Asigna el event listener cada vez que se renderiza
  document
    .getElementById("limpiar-batch-btn")
    .addEventListener("click", function () {
      limpiarBatchTable();
    });

  // Asigna el event listener al botón procesar-batch-btn
  document
    .getElementById("procesar-batch-btn")
    .addEventListener("click", async function () {
      // Estado visual: poner todos los resultados en "procesando"
      mostrarBatchLoading();
      // Lee el valor de cada selector de acción
      window.batchMeta.forEach((item, idx) => {
        const accionSel = document.getElementById(`accion-${idx}`);
        if (accionSel) item.accion = accionSel.value;
      });

      // Mostrar cargando
      this.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
      this.disabled = true;

      // Recopilar datos
      let archivos = window.batchMeta.map((item, idx) => {
        // Lee los valores actuales de los inputs
        let fecha = document.getElementById(`fecha-${idx}`).value;
        let hora = document.getElementById(`hora-${idx}`).value;
        // Si el usuario no editó nada, usar los extraídos
        if (!fecha) {
          let extraida = document.getElementById(`fecha-extraida-${idx}`).value;
          // Convertir a formato YYYY:MM:DD si viene en YYYY-MM-DD
          fecha = extraida ? extraida.replace(/-/g, ":") : "";
        } else {
          // Convertir a formato YYYY:MM:DD
          fecha = fecha.replace(/-/g, ":");
        }
        if (!hora) {
          hora = document.getElementById(`hora-extraida-${idx}`).value;
        }

        return {
          path: item.path,
          fecha: fecha,
          hora: hora,
          accion: item.accion,
        };
      });

      // Limpiar mensaje de error y procesar
      document.getElementById("batch-error-msg").textContent = "";
      try {
        const resultados = await window.pywebview.api.procesar_batch(archivos);
        limpiarBatchLoading();
        mostrarResultadosBatch(resultados);
      } catch (error) {
        document.getElementById("batch-error-msg").textContent =
          "Error al procesar: " + error.message;
        // Restaurar botón
        this.innerHTML = '<i class="fa-solid fa-play"></i> Procesar todos';
        this.disabled = false;
      }
    });

  // Deshabilita botones clásicos y oculta campos clásicos
  $("procesar-btn").disabled = true;
  $("file-section").style.display = "none";
  $("folder-section").style.display = "none";
}

// Función para mostrar los resultados del procesamiento del batch
function mostrarResultadosBatch(resultados) {
  const batchDiv = document.getElementById("archivos-table-div");
  if (!batchDiv) return;

  let html = `
    <div class="batch-results">
      <div class="results-header">
        <h3>
          <i class="fa-solid fa-check-circle"></i> 
          Resultados del procesamiento
        </h3>
        <span class="results-count">${resultados.length} archivos procesados</span>
      </div>
      
      <ul class="results-list">`;

  // Contadores para estadísticas
  let exitosos = 0;
  let fallidos = 0;

  resultados.forEach((resultado) => {
    const fileName = resultado.path.split(/[\\/]/).pop();
    const esExitoso =
      !resultado.error &&
      resultado.resultado &&
      !resultado.resultado.includes("Error");

    if (esExitoso) exitosos++;
    else fallidos++;

    html += `
      <li class="result-item ${esExitoso ? "success" : "error"}">
        <div class="result-icon">
          <i class="fa-solid ${
            esExitoso ? "fa-check" : "fa-exclamation-triangle"
          }"></i>
        </div>
        <div class="result-content">
          <div class="result-filename">${fileName}</div>
          <div class="result-message">
            ${
              resultado.resultado ||
              resultado.msg ||
              (esExitoso ? "Procesado correctamente" : "Error al procesar")
            }
          </div>
        </div>
      </li>`;
  });

  html += `
      </ul>
      
      <div class="results-summary">
        <div class="summary-stat success">
          <i class="fa-solid fa-check-circle"></i> ${exitosos} exitosos
        </div>
        <div class="summary-stat ${fallidos > 0 ? "error" : ""}">
          <i class="fa-solid fa-${
            fallidos > 0 ? "times-circle" : "check-circle"
          }"></i> ${fallidos} fallidos
        </div>
      </div>
      
      <div class="results-actions">
        <button id="limpiar-batch-btn" class="primary-btn">
          <i class="fa-solid fa-broom"></i> Limpiar y procesar más archivos
        </button>
      </div>
    </div>`;

  batchDiv.innerHTML = html;
  window.batchMeta = [];

  // Asignar evento al botón de limpiar
  document
    .getElementById("limpiar-batch-btn")
    .addEventListener("click", function () {
      limpiarBatchTable();
    });

  // Restaurar los controles principales
  $("procesar-btn").disabled = false;
  $("file-section").style.display = "";
  $("folder-section").style.display = "";
}

// Función auxiliar para obtener el icono adecuado según la extensión del archivo
function getFileIcon(extension) {
  const ext = extension.toLowerCase();

  if (["jpg", "jpeg", "png", "bmp", "gif", "tiff", "webp"].includes(ext)) {
    return "fa-file-image";
  } else if (["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm"].includes(ext)) {
    return "fa-file-video";
  } else if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) {
    return "fa-file-audio";
  } else if (["doc", "docx", "txt", "pdf", "rtf"].includes(ext)) {
    return "fa-file-lines";
  } else {
    return "fa-file";
  }
}

// Mostrar loading global en zona superior de batch
function mostrarBatchLoading() {
  const statusZone = document.getElementById("batch-status-zone");
  if (statusZone) {
    statusZone.innerHTML = `
      <span class="batch-status batch-status-processing batch-status-zone">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Procesando Archivos...
      </span>`;
  }
}
function limpiarBatchLoading() {
  const statusZone = document.getElementById("batch-status-zone");
  if (statusZone) statusZone.innerHTML = "";
}

// Resto del código sin cambios

window.addEventListener("DOMContentLoaded", function() {
  const batchDiv = document.getElementById("archivos-table-div");
  if (batchDiv) {
    batchDiv.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-file-circle-exclamation fa-2x"></i>
        <p>No hay archivos seleccionados para procesar</p>
      </div>`;
  }
  // Asegura que la variable global esté vacía al inicio
  window.batchMeta = [];
});
