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
  dropZone.style.display = "none";
  loading.style.display = "block";

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
    loading.style.display = "none";
    dropZone.style.display = "block";

    // Reset file input
    document.getElementById("file-input").value = "";
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

  // Recopilar datos actualizados de la tabla
  const filesToProcess = currentBatchData.map((item, idx) => {
    const fechaNueva = document.getElementById(`fecha-nueva-${idx}`).value;
    const horaNueva = document.getElementById(`hora-nueva-${idx}`).value;
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
  statusZone.innerHTML = `
        <div class="batch-status batch-status-processing">
            <i class="fa-spinner fa-spin"></i> Procesando...
        </div>`;
}

function hideBatchProcessing() {
  const statusZone = document.getElementById("batch-status-zone");
  statusZone.innerHTML = "";
}

function showBatchResults(results, downloadUrl) {
  const batchDiv = document.getElementById("archivos-table-div");

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  let html = `
        <div class="batch-results">
            <div class="results-header">
                <h3><i class="fa-solid fa-check-circle"></i> Procesamiento Completado</h3>
                <div class="results-count">${results.length} archivos</div>
            </div>
            <div class="results-list">`;

  results.forEach((result) => {
    html += `
            <div class="result-item ${result.success ? "success" : "error"}">
                <div class="result-icon">
                    <i class="fa-solid ${
                      result.success ? "fa-check" : "fa-times"
                    }"></i>
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
                    <strong>${successCount}</strong><br>Exitosos
                </div>
                <div class="summary-stat error">
                    <strong>${errorCount}</strong><br>Con errores
                </div>
            </div>
            <div class="results-actions">
                <button class="primary-btn" onclick="clearBatch()">
                    <i class="fa-solid fa-plus"></i> Procesar más archivos
                </button>`;

  if (successCount > 0) {
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
  // Crear o actualizar mensaje de error
  let errorDiv = document.getElementById("error-message");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.id = "error-message";
    errorDiv.className = "error-message";
    document.querySelector(".form-panel .section").appendChild(errorDiv);
  }

  errorDiv.textContent = message;
  errorDiv.style.display = "block";

  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}
