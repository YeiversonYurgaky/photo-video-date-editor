// Variables globales
let currentBatchData = [];
let currentSessionId = null;

// Inicialización cuando carga la página
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

function initializeApp() {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");

  // Verificar que los elementos existen
  if (!dropZone || !fileInput) {
    console.error("Elementos no encontrados:", { dropZone, fileInput });
    return;
  }

  // Event listeners para drag & drop
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", handleDragOver);
  dropZone.addEventListener("dragleave", handleDragLeave);
  dropZone.addEventListener("drop", handleDrop);

  // Event listener para input file
  fileInput.addEventListener("change", handleFileSelect);
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("dragover");
}

function handleDragLeave(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("dragover");
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    uploadFiles(files);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    uploadFiles(files);
  }
}

async function uploadFiles(files) {
  const loading = document.getElementById("loading");
  const dropZone = document.getElementById("drop-zone");

  // Mostrar loading
  if (dropZone) dropZone.style.display = "none";
  if (loading) loading.style.display = "block";

  const formData = new FormData();
  for (let file of files) {
    formData.append("files", file);
  }

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      currentBatchData = result.batch_metadata;
      currentSessionId = result.session_id;
      renderBatchTable();
    } else {
      showError("Error al subir archivos: " + result.error);
    }
  } catch (error) {
    showError("Error de conexión: " + error.message);
  } finally {
    // Ocultar loading
    if (loading) loading.style.display = "none";
    if (dropZone) dropZone.style.display = "block";

    // Reset file input
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";
  }
}

function renderBatchTable() {
  const batchDiv = document.getElementById("archivos-table-div");

  if (!currentBatchData || currentBatchData.length === 0) {
    batchDiv.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-file-circle-exclamation fa-2x"></i>
                <p>No hay archivos seleccionados para procesar</p>
            </div>`;
    return;
  }

  // Detectar si es móvil
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    renderMobileInterface();
    // Ocultar form panel en móvil cuando hay archivos
    const formPanel = document.querySelector(".form-panel");
    if (formPanel) formPanel.classList.add("has-files");
    return;
  } else {
    // Mostrar form panel en desktop
    const formPanel = document.querySelector(".form-panel");
    if (formPanel) formPanel.classList.remove("has-files");
  }

  // Renderizar tabla normal para desktop
  renderDesktopTable();
}

function renderMobileInterface() {
  const batchDiv = document.getElementById("archivos-table-div");

  let html = `
    <button class="mobile-back-btn" onclick="goBackToUpload()">
      <i class="fa-solid fa-arrow-left"></i>
      Subir más archivos
    </button>
    
    <div class="mobile-files-container">`;

  currentBatchData.forEach((item, idx) => {
    const fileName = item.filename;
    // Formatear nombre de archivo para mejor visualización
    const displayName = formatDisplayFileName(fileName);

    // Determinamos si debemos colapsar las tarjetas por defecto cuando hay muchos archivos
    const shouldCollapseDefault = currentBatchData.length > 3;
    const collapsedClass = shouldCollapseDefault ? "collapsed" : "";

    // Preview para móvil
    let previewHtml = "";
    if (item.thumb) {
      previewHtml = `<img src="${item.thumb}" alt="Preview">`;
    } else {
      previewHtml = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--gray-500);">
          <i class="fa-solid ${
            item.file_type === "video" ? "fa-video" : "fa-image"
          }" style="font-size: 24px;"></i>
        </div>`;
    }

    // Tipo de archivo con icono
    let fileTypeText =
      item.file_type === "video"
        ? `<i class="fa-solid fa-video"></i> Video`
        : `<i class="fa-solid fa-image"></i> Imagen`;

    // Construir fecha y hora extraídas en formato legible
    const fechaExtraida = formatearFecha(item.fecha);
    const horaExtraida = formatearHora(item.hora);

    // Fechas para inputs
    const fechaHTMLValue = convertirFechaAHTML(item.fecha);
    const horaHTMLValue = convertirHoraAHTML(item.hora);

    html += `
      <div class="mobile-file-card ${collapsedClass}" id="file-card-${idx}">
        <button class="mobile-toggle-btn" onclick="toggleFileCard(${idx})">
          <i class="fa-solid ${
            shouldCollapseDefault ? "fa-chevron-down" : "fa-chevron-up"
          }"></i>
        </button>
        
        <div class="mobile-file-header">
          <div class="mobile-preview">${previewHtml}</div>
          <div class="mobile-file-info">
            <div class="mobile-file-name" title="${fileName}">${displayName}</div>
            <div class="mobile-file-type">${fileTypeText}</div>
          </div>
        </div>
        
        <div class="mobile-inputs">
          <!-- Sección de fecha y hora extraída -->
          <div class="mobile-input-row">
            <div class="mobile-input-group">
              <label><i class="fa-solid fa-calendar-check"></i> Fecha extraída</label>
              <input type="text" id="fecha-extraida-${idx}" value="${fechaExtraida}" readonly>
            </div>
            
            <div class="mobile-input-group">
              <label><i class="fa-solid fa-clock"></i> Hora extraída</label>
              <input type="text" id="hora-extraida-${idx}" value="${horaExtraida}" readonly>
            </div>
          </div>
          
          <!-- Sección de fecha nueva -->
          <div class="mobile-input-row">
            <div class="mobile-input-group">
              <label><i class="fa-solid fa-calendar-plus"></i> Fecha nueva</label>
              <input 
                type="date" 
                id="fecha-nueva-${idx}" 
                class="editable mobile-date-input" 
                value="${fechaHTMLValue}" 
                data-original-format="${item.fecha}">
            </div>
            
            <div class="mobile-input-group">
              <label><i class="fa-solid fa-clock"></i> Hora nueva</label>
              <input 
                type="time" 
                id="hora-nueva-${idx}" 
                class="editable mobile-time-input" 
                value="${horaHTMLValue}" 
                step="1"
                data-original-format="${item.hora}">
            </div>
          </div>
          
          <!-- Sección de acción a realizar -->
          <div class="mobile-input-group mobile-input-full">
            <label><i class="fa-solid fa-gear"></i> Acción a realizar</label>
            ${getActionInputHTML(item.file_type, idx)}
          </div>
        </div>
      </div>`;
  });

  html += `
    </div>
    
    <button class="mobile-process-btn" onclick="processBatch()">
      <i class="fa-solid fa-check"></i>
      Procesar ${currentBatchData.length} archivo${
    currentBatchData.length !== 1 ? "s" : ""
  }
    </button>`;

  batchDiv.innerHTML = html;
}

// Función auxiliar para obtener el HTML del input de acción
function getActionInputHTML(fileType, idx) {
  if (fileType === "video") {
    return `
      <select id="accion-${idx}" class="mobile-select">
        <option value="modificar_video">Solo cambiar metadata</option>
        <option value="extraer_frame">Extraer imagen del video</option>
      </select>`;
  } else if (fileType === "image") {
    return `<input type="text" value="Modificar metadatos" readonly>`;
  } else {
    return `<input type="text" value="No soportado" readonly>`;
  }
}

// Función para formatear fecha de YYYY:MM:DD a formato legible DD/MM/YYYY
function formatearFecha(fechaStr) {
  if (!fechaStr) return "";

  // Si la fecha ya está en formato YYYY:MM:DD
  if (fechaStr.includes(":")) {
    const partes = fechaStr.split(":");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
  }

  return fechaStr;
}

// Función para formatear hora legible
function formatearHora(horaStr) {
  return horaStr || "";
}

// Función para convertir fecha YYYY:MM:DD a formato HTML YYYY-MM-DD
function convertirFechaAHTML(fechaStr) {
  if (!fechaStr) return "";

  // Si la fecha está en formato YYYY:MM:DD
  if (fechaStr.includes(":")) {
    return fechaStr.replace(/:/g, "-");
  }

  return fechaStr;
}

// Función para convertir hora HH:MM:SS a formato HTML HH:MM:SS
function convertirHoraAHTML(horaStr) {
  return horaStr || "";
}

function renderDesktopTable() {
  const batchDiv = document.getElementById("archivos-table-div");

  let html = `
        <div class="batch-table-container">
            <div class="batch-controls">
                <span class="batch-count">${currentBatchData.length} archivo(s) seleccionado(s)</span>
                <button id="limpiar-batch-btn" class="control-btn" onclick="clearBatch()">
                    <i class="fa-solid fa-trash-can"></i> Limpiar lista
                </button>
                <span id="batch-status-zone"></span>
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

  currentBatchData.forEach((item, idx) => {
    const fileName = item.filename;
    const ext = fileName.split(".").pop().toLowerCase();

    let previewCell = "";
    let actionCell = "";

    // Preview cell
    if (item.thumb) {
      previewCell = `
                <div class="preview-container">
                    <img src="${item.thumb}" class="preview-thumbnail" title="${
        item.thumb_log
      }">
                    <div class="preview-type-badge ${
                      item.file_type === "video" ? "video-badge" : "image-badge"
                    }">
                        <i class="fa-solid ${
                          item.file_type === "video" ? "fa-video" : "fa-image"
                        }"></i>
                    </div>
                </div>`;
    } else {
      previewCell = `
                <div class="preview-container no-preview">
                    <i class="fa-solid ${
                      item.file_type === "video" ? "fa-video" : "fa-image"
                    }"></i>
                    <span>Sin preview</span>
                </div>`;
    }

    // Action cell
    if (item.file_type === "video") {
      actionCell = `
                <select id="accion-${idx}" class="action-select">
                    <option value="modificar_video">Solo metadata</option>
                    <option value="extraer_frame">Extraer frame</option>
                </select>`;
    } else if (item.file_type === "image") {
      actionCell = `
                <div class="action-label">
                    <i class="fa-solid fa-pencil-alt"></i> Modificar imagen
                </div>`;
    } else {
      actionCell = `
                <div class="action-label unsupported">
                    <i class="fa-solid fa-ban"></i> No soportado
                </div>`;
    }

    html += `
            <tr>
                <td>${previewCell}</td>
                <td class="archivo-nombre-td">
                    <div class="file-name-container">
                        <div class="file-icon">
                            <i class="fa-solid ${getFileIcon(ext)}"></i>
                        </div>
                        <div class="file-name">${fileName}</div>
                    </div>
                </td>
                <td>
                    <input type="text" id="fecha-extraida-${idx}" value="${
      item.fecha
    }" readonly class="fecha-input">
                </td>
                <td>
                    <input type="text" id="hora-extraida-${idx}" value="${
      item.hora
    }" readonly class="hora-input">
                </td>
                <td>
                    <input type="text" id="fecha-nueva-${idx}" value="${
      item.fecha
    }" class="fecha-input editable" placeholder="YYYY:MM:DD">
                </td>
                <td>
                    <input type="text" id="hora-nueva-${idx}" value="${
      item.hora
    }" class="hora-input editable" placeholder="HH:MM:SS">
                </td>
                <td>${actionCell}</td>
            </tr>`;
  });

  html += `
                    </tbody>
                </table>
            </div>
            <div class="batch-footer">
                <button id="procesar-batch-btn" class="primary-btn" onclick="processBatch()">
                    <i class="fa-solid fa-play"></i> Procesar lote
                </button>
            </div>
        </div>`;

  batchDiv.innerHTML = html;
}

function goBackToUpload() {
  // Limpiar datos y volver a la pantalla de carga
  clearBatch();
  const formPanel = document.querySelector(".form-panel");
  if (formPanel) formPanel.classList.remove("has-files");
}

function getFileIcon(extension) {
  const iconMap = {
    jpg: "fa-image",
    jpeg: "fa-image",
    png: "fa-image",
    gif: "fa-image",
    bmp: "fa-image",
    mp4: "fa-video",
    mov: "fa-video",
    avi: "fa-video",
    default: "fa-file",
  };
  return iconMap[extension] || iconMap.default;
}

async function processBatch() {
  if (!currentBatchData || currentBatchData.length === 0) {
    showError("No hay archivos para procesar");
    return;
  }

  // Recopilar datos actualizados
  const filesToProcess = currentBatchData.map((item, idx) => {
    let fechaNueva = document.getElementById(`fecha-nueva-${idx}`).value;
    let horaNueva = document.getElementById(`hora-nueva-${idx}`).value;

    // Convertir formato de fecha de HTML (YYYY-MM-DD) a EXIF (YYYY:MM:DD)
    if (fechaNueva && fechaNueva.includes("-")) {
      fechaNueva = fechaNueva.replace(/-/g, ":");
    }

    // Si es un input type="date", obtener el valor original si está disponible
    const fechaInput = document.getElementById(`fecha-nueva-${idx}`);
    if (
      fechaInput &&
      fechaInput.getAttribute("data-original-format") &&
      !fechaNueva
    ) {
      fechaNueva = fechaInput.getAttribute("data-original-format");
    }

    // Si es un input type="time", obtener el valor original si está disponible
    const horaInput = document.getElementById(`hora-nueva-${idx}`);
    if (
      horaInput &&
      horaInput.getAttribute("data-original-format") &&
      !horaNueva
    ) {
      horaNueva = horaInput.getAttribute("data-original-format");
    }

    const accionSelect = document.getElementById(`accion-${idx}`);
    const accion = accionSelect ? accionSelect.value : "modificar";

    return {
      path: item.path,
      filename: item.filename,
      fecha: fechaNueva,
      hora: horaNueva,
      accion: accion,
      file_type: item.file_type,
    };
  });

  // Mostrar estado de procesamiento
  showBatchProcessing();

  try {
    const response = await fetch("/api/process_batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: filesToProcess,
        session_id: currentSessionId,
      }),
    });

    const result = await response.json();

    if (result.success) {
      showBatchResults(result.results, result.download_url);
    } else {
      showError("Error al procesar archivos: " + result.error);
    }
  } catch (error) {
    showError("Error de conexión: " + error.message);
  } finally {
    hideBatchProcessing();
  }
}

function showBatchProcessing() {
  const statusZone = document.getElementById("batch-status-zone");
  if (statusZone) {
    statusZone.innerHTML = `
        <div class="batch-status batch-status-processing">
            <i class="fa-spinner fa-spin"></i> Procesando...
        </div>`;
  }
}

function hideBatchProcessing() {
  const statusZone = document.getElementById("batch-status-zone");
  if (statusZone) {
    statusZone.innerHTML = "";
  }
}

function showBatchResults(results, downloadUrl) {
  const batchDiv = document.getElementById("archivos-table-div");

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  // Detectar si es móvil
  const isMobile = window.innerWidth <= 768;

  let html = `
        <div class="batch-results">
            <div class="results-header">
                <h3><i class="fa-solid fa-check-circle"></i> Procesamiento Completado</h3>
                <div class="results-count">${results.length} archivo${
    results.length !== 1 ? "s" : ""
  }</div>
            </div>
            <div class="results-list">`;

  results.forEach((result) => {
    const iconClass = result.success ? "fa-check" : "fa-times";

    html += `
            <div class="result-item ${result.success ? "success" : "error"}">
                <div class="result-icon">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div class="result-content">
                    <div class="result-filename">${result.filename}</div>
                    <div class="result-message">${result.message}</div>
                </div>
            </div>`;
  });

  html += `
            </div>
            <div class="results-summary">
                <div class="summary-stat success">
                    <strong>${successCount}</strong>Exitosos
                </div>
                <div class="summary-stat error">
                    <strong>${errorCount}</strong>Con errores
                </div>
            </div>
            <div class="results-actions">`;

  // En móvil, primero mostrar descargar si hay archivos exitosos
  if (isMobile && successCount > 0) {
    html += `
                <a href="${downloadUrl}" class="primary-btn" download>
                    <i class="fa-solid fa-download"></i> Descargar archivos procesados
                </a>`;
  }

  html += `
                <button class="primary-btn" onclick="clearBatch()">
                    <i class="fa-solid fa-plus"></i> Procesar más archivos
                </button>`;

  // En desktop, mostrar descargar después si hay archivos exitosos
  if (!isMobile && successCount > 0) {
    html += `
                <a href="${downloadUrl}" class="primary-btn" download>
                    <i class="fa-solid fa-download"></i> Descargar archivos procesados
                </a>`;
  }

  html += `
            </div>
        </div>`;

  batchDiv.innerHTML = html;
}

function clearBatch() {
  currentBatchData = [];
  currentSessionId = null;

  const batchDiv = document.getElementById("archivos-table-div");
  batchDiv.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-file-circle-exclamation fa-2x"></i>
            <p>No hay archivos seleccionados para procesar</p>
        </div>`;
}

function showError(message) {
  console.error("Error:", message);
  const batchDiv = document.getElementById("archivos-table-div");
  batchDiv.innerHTML = `
        <div class="error-message">
            <i class="fa-solid fa-exclamation-triangle"></i>
            ${message}
        </div>`;
}

// Re-evaluar en resize de ventana
window.addEventListener("resize", function () {
  if (currentBatchData && currentBatchData.length > 0) {
    renderBatchTable();
  }
});

// Función para expandir/colapsar una tarjeta de archivo
function toggleFileCard(index) {
  const card = document.getElementById(`file-card-${index}`);
  const toggleBtn = card.querySelector(".mobile-toggle-btn i");

  if (card.classList.contains("collapsed")) {
    card.classList.remove("collapsed");
    toggleBtn.classList.remove("fa-chevron-down");
    toggleBtn.classList.add("fa-chevron-up");
  } else {
    card.classList.add("collapsed");
    toggleBtn.classList.remove("fa-chevron-up");
    toggleBtn.classList.add("fa-chevron-down");
  }

  // Hacer scroll al card cuando se expande
  if (!card.classList.contains("collapsed")) {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Función para formatear nombres de archivo para visualización
function formatDisplayFileName(fileName) {
  // Si es un nombre generado por la app para móviles, extraer información relevante
  const mobileMatcher = /mobile_([a-z]+)_(\d{8})_(\d{6})\.([a-z]+)/i;
  const match = fileName.match(mobileMatcher);

  if (match) {
    const device = match[1];
    const date = match[2];
    const time = match[3];
    const ext = match[4];

    // Formato: "Captura [dispositivo] - DD/MM/YYYY"
    const day = date.substring(6, 8);
    const month = date.substring(4, 6);
    const year = date.substring(0, 4);

    return `Captura ${device} - ${day}/${month}/${year}`;
  }

  // Para nombres muy largos, truncar y añadir elipsis
  if (fileName.length > 25) {
    const extension = fileName.split(".").pop();
    const name = fileName.substring(0, fileName.lastIndexOf("."));
    return name.substring(0, 22) + "..." + "." + extension;
  }

  return fileName;
}
