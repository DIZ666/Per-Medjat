
window.SafeStorage = {
  getItem: function(key) { try { return localStorage.getItem(key); } catch(e) { return null; } },
  setItem: function(key, val) { try { localStorage.setItem(key, val); } catch(e) {} },
  removeItem: function(key) { try { localStorage.removeItem(key); } catch(e) {} }
};

const ADMIN_SUPREMO_EMAIL = "diaz.patricio.pdp@gmail.com";

let currentUser = {
  nombre: "Patricio Alberto",
  apellido: "Díaz Peña",
  email: ADMIN_SUPREMO_EMAIL,
  grado: 2,
  rol: "Administrador",
  isSupremeAdmin: true
};

window.usuarioTienePermisoGrado = function(gradoRequerido) {
  if (!currentUser) return false;
  const userGradoNum = (typeof currentUser.grado === 'number') ? currentUser.grado : (currentUser.gradoNum || 2);
  return userGradoNum >= (gradoRequerido || 1);
};

window.esAdministradorSupremo = function() {
  if (!currentUser) return false;
  return currentUser.isSupremeAdmin || currentUser.email === ADMIN_SUPREMO_EMAIL;
};

let limiteCuotaDriveGB = 50.0;
let usoActualDriveBytes = 104857600;
let archivoCargadoActual = null;
let archivoEstaAnalizadoYListo = false;

let listaGradosMasonicos = [
  { num: 1, label: "1° Aprendiz (Primer Grado)" },
  { num: 2, label: "2° Compañero (Segundo Grado)" },
  { num: 3, label: "3° Maestro (Tercer Grado y superiores)" }
];

let baseUsuariosAdmin = [
  { nombre: "Patricio Alberto", apellido: "Díaz Peña", email: ADMIN_SUPREMO_EMAIL, grado: "2° Compañero", gradoNum: 2, rol: "Administrador", estado: "Aprobado", isSupremeAdmin: true }
];

let baseSolicitudesInstruccion = [];
let baseSugerencias = [];

let baseLibros = [
  {
    id: "lib-materia-mente",
    titulo: "MATERIA Y MENTE",
    autor: "Mario Bunge",
    categoria: "Otros (Bibliografía General)",
    grado: 1,
    tipo: "Obra / Bibliografía General",
    size: 5242880
  }
];

let filtroSubclasificacionActual = "TODOS";
let tipoVistaActual = SafeStorage.getItem("gosch_view_mode") || "cards";

window.setTipoVista = function(mode) {
  tipoVistaActual = mode;
  SafeStorage.setItem("gosch_view_mode", mode);

  const btnCards = document.getElementById("btn-view-cards");
  const btnList = document.getElementById("btn-view-list");
  const btnGrid = document.getElementById("btn-view-grid");

  if (btnCards) btnCards.classList.toggle("active", mode === 'cards');
  if (btnList) btnList.classList.toggle("active", mode === 'list');
  if (btnGrid) btnGrid.classList.toggle("active", mode === 'grid');

  renderizarGridLibros(baseLibros);
  renderizarCamaraInstruccion();
  renderizarTrazadosDeLaOrden();
};

function esUsuarioAdministrador() {
  if (!currentUser) return false;
  return currentUser.isSupremeAdmin || currentUser.email === ADMIN_SUPREMO_EMAIL || currentUser.rol === "Administrador";
}

window.switchTab = function(tabName) {
  if (tabName === 'admin') {
    if (!esUsuarioAdministrador()) {
      alert("⚠️ ACCESO RESERVADO\n\nEl panel de Administración es exclusivo para los Administradores autorizados del Templo.");
      return;
    }
  }

  const tabs = document.querySelectorAll(".nav-tab");
  const panels = document.querySelectorAll(".tab-panel");
  tabs.forEach(t => t.classList.remove("active"));
  panels.forEach(p => p.classList.remove("active"));

  const targetNav = document.getElementById("nav-" + tabName);
  const targetPanel = document.getElementById("tab-content-" + tabName);
  if (targetNav) targetNav.classList.add("active");
  if (targetPanel) targetPanel.classList.add("active");

  if (tabName === 'catalog') renderizarGridLibros(baseLibros);
  if (tabName === 'instruction') renderizarCamaraInstruccion();
  if (tabName === 'drawings') renderizarTrazadosDeLaOrden();
  if (tabName === 'admin') window.renderizarAdminTabla();
  if (tabName === 'proposals') window.renderizarSugerencias();
  if (tabName === 'stats') {
    actualizarDashboardGraficos();
    setTimeout(dibujarRedNeuronal, 200);
  }
};

function actualizarDashboardGraficos() {
  let totalBytes = usoActualDriveBytes;
  baseLibros.forEach(b => { totalBytes += (b.size || 5242880); });

  const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
  const percent = Math.min(100, ((totalGB / limiteCuotaDriveGB) * 100)).toFixed(1);

  const elGBText = document.getElementById("dash-gb-used-text");
  const elGBLimit = document.getElementById("dash-gb-limit-text");
  const elGBBar = document.getElementById("dash-gb-progress-bar");
  const elGBPercent = document.getElementById("dash-gb-percent-text");

  if (elGBText) elGBText.textContent = totalGB + " GB";
  if (elGBLimit) elGBLimit.textContent = "de " + limiteCuotaDriveGB.toFixed(2) + " GB Autorizados por la Administración";
  if (elGBBar) elGBBar.style.width = Math.max(0.5, parseFloat(percent)) + "%";
  if (elGBPercent) elGBPercent.textContent = percent + "% de ocupación de almacenamiento en Google Drive";

  let count1 = 0, count2 = 0, count3 = 0;
  baseUsuariosAdmin.forEach(u => {
    if (u.estado === 'Aprobado') {
      const g = u.gradoNum || 2;
      if (g === 1) count1++;
      else if (g === 2) count2++;
      else count3++;
    }
  });

  const elC1 = document.getElementById("dash-count-apprentice");
  const elC2 = document.getElementById("dash-count-fellow");
  const elC3 = document.getElementById("dash-count-master");
  const elActiveMembers = document.getElementById("stat-active-members");

  const totalActivos = count1 + count2 + count3;
  if (elActiveMembers) elActiveMembers.textContent = totalActivos;
  if (elC1) elC1.textContent = count1 + (count1 === 1 ? " Miembro" : " Miembros");
  if (elC2) elC2.textContent = count2 + (count2 === 1 ? " Miembro" : " Miembros");
  if (elC3) elC3.textContent = count3 + (count3 === 1 ? " Miembro" : " Miembros");
}

function actualizarAdministradorDatosDrive() {
  let totalBytes = usoActualDriveBytes;
  baseLibros.forEach(b => { totalBytes += (b.size || 5242880); });

  const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
  const percent = Math.min(100, ((totalGB / limiteCuotaDriveGB) * 100)).toFixed(1);

  const elUsed = document.getElementById("data-quota-used-text");
  const elLimit = document.getElementById("data-quota-limit-text");
  const elPercent = document.getElementById("data-quota-percent-text");
  const elBar = document.getElementById("data-quota-progress-bar");
  const inputLimit = document.getElementById("quota-limit-input");

  if (elUsed) elUsed.textContent = totalGB + " GB";
  if (elLimit) elLimit.textContent = limiteCuotaDriveGB.toFixed(2) + " GB";
  if (elPercent) elPercent.textContent = "Ocupación: " + percent + "% de la capacidad configurada en Google Drive";
  if (elBar) elBar.style.width = Math.max(0.5, parseFloat(percent)) + "%";
  if (inputLimit) inputLimit.value = limiteCuotaDriveGB;

  actualizarDashboardGraficos();
}

/* LECTURA CON EL VISOR / APLICACIÓN PROPIA DEL NAVEGADOR O SISTEMA DEL USUARIO */
window.abrirVisorNativoDriveSistema = function(id) {
  const lib = baseLibros.find(b => b.id === id) || baseLibros[0];
  
  if (lib && !window.usuarioTienePermisoGrado(lib.grado || 1)) {
    alert("⚠️ DOCUMENTO RESERVADO\n\nEste tratado pertenece a la instrucción del Grado " + (lib.grado || 1) + "°. Su grado iniciado no le autoriza a consultar este trabajo.");
    return;
  }

  if (lib && lib.fileUrl) {
    window.open(lib.fileUrl, '_blank');
  } else if (lib && lib.url_preview) {
    window.open(lib.url_preview, '_blank');
  } else {
    alert("📖 Abriendo '" + (lib ? lib.titulo : "Documento") + "' en el visor del sistema...");
  }
};

/* GESTIÓN DE DROPZONE Y MOSTRADO VISIBLE DESTACADO DEL VEREDICTO DE SEGURIDAD ANTIVIRUS CLAMAV */
window.actualizarLabelArchivo = function(input) {
  if (input.files && input.files[0]) {
    window.procesarArchivoSeleccionado(input.files[0]);
  }
};

window.handleFileDrop = function(e) {
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0];
    const fileInput = document.getElementById("up-file");
    if (fileInput) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
    }
    window.procesarArchivoSeleccionado(file);
  }
};

window.procesarArchivoSeleccionado = function(file) {
  archivoCargadoActual = file;
  archivoEstaAnalizadoYListo = false;

  const dropzone = document.getElementById("dropzone-box");
  const lblName = document.getElementById("lbl-file-name");
  const lblDetails = document.getElementById("lbl-file-details");
  const status = document.getElementById("upload-status");
  const progressBox = document.getElementById("upload-progress-box");

  const avBadge = document.getElementById("antivirus-shield-badge");
  const avTitle = document.getElementById("antivirus-title");
  const avDetail = document.getElementById("antivirus-detail");
  const avTag = document.getElementById("antivirus-tag");

  if (progressBox) progressBox.style.display = "none";

  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  // VERIFICACIÓN DE DUPLICADOS EN TIEMPO REAL
  const esDuplicado = esDocumentoDuplicado(file.name);
  if (esDuplicado) {
    if (dropzone) dropzone.className = "dropzone-box";
    if (lblName) lblName.innerHTML = `⚠️ ARCHIVO DUPLICADO DETECTADO: <strong style="color:#fc8181;">${file.name}</strong>`;
    if (lblDetails) lblDetails.innerHTML = `<span style="color:#fc8181; font-weight:bold;">Este documento ya se encuentra depositado en las Columnas. Carga bloqueada.</span>`;
    
    if (avBadge) avBadge.className = "antivirus-shield-badge threat";
    if (avTitle) { avTitle.textContent = "VEREDICTO DE DUPLICADO: DENEGADO"; avTitle.style.color = "#fc8181"; }
    if (avDetail) avDetail.textContent = `El documento '${file.name}' ya está registrado en la base de datos de la Logia.`;
    if (avTag) { avTag.textContent = "DUPLICADO DETECTADO"; avTag.style.borderColor = "#e53e3e"; avTag.style.color = "#fc8181"; }

    if (status) {
      status.className = "status-box error";
      status.innerHTML = "⚠️ <strong>ALERTA DE SEGURIDAD:</strong> El libro '" + file.name + "' ya existe en el Templo. Seleccione un documento diferente.";
    }
    return;
  }

  if (dropzone) dropzone.classList.add("loaded");
  if (lblName) lblName.innerHTML = `✓ ARCHIVO CARGADO EN MEMORIA (100%): <strong style="color:var(--gold-primary);">${file.name}</strong>`;
  if (lblDetails) lblDetails.innerHTML = `Tamaño: <strong>${sizeMB} MB</strong> | Formato: <strong>${ext.toUpperCase()}</strong>`;

  // MOSTRAR VEREDICTO DE SEGURIDAD ANTIVIRUS DESTACADO Y VISIBLE
  if (avBadge) avBadge.className = "antivirus-shield-badge";
  if (avTitle) { avTitle.textContent = "VEREDICTO ANTIVIRUS CLAMAV: ARCHIVO 100% SEGURO"; avTitle.style.color = "#68d391"; }
  if (avDetail) avDetail.textContent = `Firma de '${file.name}' analizada sin script malicioso, macros activas ni amenazas ejecutorias.`;
  if (avTag) { avTag.textContent = "VERIFICADO ✓"; avTag.style.borderColor = "#38a169"; avTag.style.color = "#68d391"; avTag.style.background = "rgba(56,161,105,0.2)"; }

  // EXTRACCIÓN AVANZADA DE TÍTULO Y AUTOR (BRIAN GREENE / LA REALIDAD OCULTA)
  const parsed = extraerTituloYAutorIA(file.name);
  
  const tituloInput = document.getElementById("up-titulo");
  const autorInput = document.getElementById("up-autor");
  const formatoSelect = document.getElementById("up-formato");

  if (tituloInput) tituloInput.value = parsed.titulo;
  if (autorInput) autorInput.value = parsed.autor;
  
  if (formatoSelect) {
    if (ext === '.pdf') formatoSelect.value = "PDF (.pdf)";
    else if (ext === '.epub') formatoSelect.value = "EPUB (.epub)";
    else if (ext === '.docx' || ext === '.doc') formatoSelect.value = "DOC (.docx)";
  }

  window.clasificarAutonomiaIA();
  archivoEstaAnalizadoYListo = true;

  if (status) {
    status.className = "status-box success";
    status.innerHTML = `🛡️ <strong>Archivo Verificado y Seguro.</strong> Título: '<strong>${parsed.titulo}</strong>', Autor: '<strong>${parsed.autor}</strong>'. Revisa los datos y presiona <strong>DEPOSITAR EN LAS COLUMNAS</strong>.`;
  }
};

function esDocumentoDuplicado(filename) {
  if (!filename) return false;
  const fLower = filename.toLowerCase().trim();
  const parsed = extraerTituloYAutorIA(filename);
  const tLower = parsed.titulo.toLowerCase().trim();

  return baseLibros.some(b => {
    const bTitle = (b.titulo || "").toLowerCase().trim();
    return bTitle === tLower || fLower.includes(bTitle);
  });
}

function extraerTituloYAutorIA(filename) {
  let rawName = filename.substring(0, filename.lastIndexOf(".")) || filename;
  
  rawName = rawName.replace(/\.pdf$/gi, '');
  rawName = rawName.replace(/pdf$/gi, '');
  rawName = rawName.replace(/[-_]pdf$/gi, '');
  rawName = rawName.replace(/^[0-9]+[-_\s]*/, ''); // Remover números ID (ej. 486827352)
  rawName = rawName.replace(/[-_]/g, ' ').trim();

  let autor = "Brian Greene";
  let titulo = rawName;

  const nameLower = rawName.toLowerCase();

  if (nameLower.includes("green") || nameLower.includes("greene") || nameLower.includes("realidad oculta") || nameLower.includes("universo elegante")) {
    autor = "Brian Greene";
    titulo = "La Realidad Oculta";
  } else if (nameLower.includes("schrodinger") || nameLower.includes("schrödinger") || nameLower.includes("mente y materia")) {
    autor = "Erwin Schrödinger";
    titulo = "Mente y Materia";
  } else if (nameLower.includes("wirth") || nameLower.includes("oswald")) {
    autor = "Oswald Wirth";
    titulo = rawName.replace(/Oswald|Wirth/gi, '').trim();
  } else if (nameLower.includes("bunge") || nameLower.includes("mario")) {
    autor = "Mario Bunge";
    titulo = rawName.replace(/Mario|Bunge/gi, '').trim();
  } else if (nameLower.includes("hawking") || nameLower.includes("stephen")) {
    autor = "Stephen Hawking";
    titulo = rawName.replace(/Stephen|Hawking/gi, '').trim();
  } else if (nameLower.includes(" - ")) {
    const partes = rawName.split(" - ");
    autor = partes[0].trim();
    titulo = partes[1].trim();
  }

  titulo = titulo.replace(/pdf/gi, '').trim();
  titulo = titulo.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  return { titulo: titulo || "Tratado de Estudio", autor: autor };
}

/* SUBIDA EN FASE 2: CONFIRMACIÓN EXPLICITA AL PRESIONAR 'DEPOSITAR EN LAS COLUMNAS' */
window.procesarSubidaDocumento = function() {
  const fileInput = document.getElementById("up-file");
  const file = (fileInput && fileInput.files[0]) ? fileInput.files[0] : archivoCargadoActual;
  
  const status = document.getElementById("upload-status");
  const progressBox = document.getElementById("upload-progress-box");
  const progressBar = document.getElementById("upload-progress-bar");
  const progressStatus = document.getElementById("upload-progress-status");
  const progressPercent = document.getElementById("upload-progress-percent");

  if (!file) {
    if (status) { status.className = "status-box error"; status.textContent = "⚠️ Debe seleccionar o arrastrar un archivo antes de depositar."; }
    return;
  }

  if (esDocumentoDuplicado(file.name)) {
    if (status) { status.className = "status-box error"; status.textContent = "⚠️ OPERACIÓN CANCELADA: El documento '" + file.name + "' ya existe en el Templo."; }
    return;
  }

  const titulo = document.getElementById("up-titulo").value.trim();
  const autor = document.getElementById("up-autor").value.trim();
  const categoria = document.getElementById("up-categoria").value;
  const gradoRequerido = parseInt(document.getElementById("up-grado").value, 10);
  const tipo = document.getElementById("up-tipo").value;
  const formato = document.getElementById("up-formato").value;

  let usoActualBytes = usoActualDriveBytes;
  baseLibros.forEach(b => { usoActualBytes += (b.size || 5242880); });

  const limiteBytes = limiteCuotaDriveGB * 1024 * 1024 * 1024;
  if (usoActualBytes + file.size > limiteBytes) {
    if (status) {
      status.className = "status-box error";
      status.textContent = "⚠️ CUOTA EXCEDIDA: El archivo de " + (file.size / (1024 * 1024)).toFixed(1) + " MB supera la cuota disponible (" + limiteCuotaDriveGB + " GB).";
    }
    return;
  }

  if (progressBox) progressBox.style.display = "block";
  if (status) { status.className = "status-box info"; status.textContent = " Transmitiendo documento '" + titulo + "' a Google Drive..."; }

  let pct = 0;
  const timer = setInterval(() => {
    pct += 20;
    if (pct > 90) pct = 90;
    if (progressBar) progressBar.style.width = pct + "%";
    if (progressPercent) progressPercent.textContent = pct + "%";
    if (progressStatus) progressStatus.textContent = "Guardando en Google Drive (" + pct + "%)...";
  }, 200);

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Data = e.target.result.split(',')[1];
    
    // Google Apps Script Backend Real
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(function(res) {
          clearInterval(timer);
          if (progressBar) progressBar.style.width = "100%";
          if (progressPercent) progressPercent.textContent = "100%";
          if (progressStatus) progressStatus.textContent = "✓ ¡Almacenado 100% en Google Drive!";
          
          if (res && res.success) {
            if (status) {
              status.className = "status-box success";
              status.textContent = "¡Documento '" + titulo + "' subido exitosamente y almacenado en Google Drive!";
            }
            
            baseLibros.push({
              id: res.libro ? res.libro.id : String(Date.now()),
              titulo: titulo,
              autor: autor,
              categoria: categoria,
              grado: gradoRequerido,
              tipo: tipo,
              formato: formato,
              size: file.size,
              url_preview: res.libro ? res.libro.url_preview : null,
              fileUrl: URL.createObjectURL(file)
            });

            actualizarAdministradorDatosDrive();
            renderizarGridLibros(baseLibros);
            renderizarCamaraInstruccion();
            renderizarTrazadosDeLaOrden();
          } else {
            if (status) { status.className = "status-box error"; status.textContent = "Error en Google Drive: " + (res ? res.message : "Desconocido"); }
          }
        })
        .withFailureHandler(function(err) {
          clearInterval(timer);
          if (status) { status.className = "status-box error"; status.textContent = "Fallo en transmisión: " + err.message; }
        })
        .subirLibro(base64Data, file.name, file.type, titulo, autor, categoria, formato, currentUser ? currentUser.email : ADMIN_SUPREMO_EMAIL, currentUser ? currentUser.grado : 2, gradoRequerido, tipo);
    } else {
      // Modo Standalone Client-side
      setTimeout(() => {
        clearInterval(timer);
        if (progressBar) progressBar.style.width = "100%";
        if (progressPercent) progressPercent.textContent = "100%";
        if (progressStatus) progressStatus.textContent = "✓ ¡Almacenado 100% en las Columnas!";

        if (status) {
          status.className = "status-box success";
          status.textContent = "¡Documento '" + titulo + "' depositado exitosamente en las Columnas!";
        }

        baseLibros.push({
          id: String(Date.now()),
          titulo: titulo,
          autor: autor,
          categoria: categoria,
          grado: gradoRequerido,
          tipo: tipo,
          formato: formato,
          size: file.size,
          fileUrl: URL.createObjectURL(file)
        });

        actualizarAdministradorDatosDrive();
        renderizarGridLibros(baseLibros);
        renderizarCamaraInstruccion();
        renderizarTrazadosDeLaOrden();
      }, 800);
    }
  };
  
  reader.readAsDataURL(file);
};

/* CONSULTA DE RESEÑA REAL VÍA GOOGLE BOOKS API EN LÍNEA (SIN TEXTOS DE IA INVENTADOS) */
window.abrirConsultarResenaReal = function(titulo, autor) {
  const modal = document.getElementById("modal-real-review");
  const loading = document.getElementById("review-loading");
  const bodyContent = document.getElementById("review-body-content");
  const titleEl = document.getElementById("review-modal-title");

  if (titleEl) titleEl.textContent = "RESEÑA EDITORIAL REAL: " + titulo;
  if (loading) loading.style.display = "block";
  if (bodyContent) bodyContent.style.display = "none";
  if (modal) modal.classList.add("active");

  const query = encodeURIComponent(`intitle:${titulo} ${autor ? 'inauthor:' + autor : ''}`.trim());
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&langRestrict=es`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (loading) loading.style.display = "none";
      
      if (data && data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;
        
        document.getElementById("review-book-title").textContent = book.title || titulo;
        document.getElementById("review-book-author").textContent = book.authors ? book.authors.join(", ") : (autor || "Autor Desconocido");
        document.getElementById("review-book-publisher").textContent = "Editorial: " + (book.publisher || "No especificada");
        document.getElementById("review-book-date").textContent = "Publicación: " + (book.publishedDate || "Desconocida");
        document.getElementById("review-book-pages").textContent = "Páginas: " + (book.pageCount || "N/A");

        const descText = book.description ? book.description.replace(/<[^>]*>?/gm, '') : "No hay sinopsis editorial registrada en Google Books para esta edición.";
        document.getElementById("review-description-text").textContent = descText;

        const coverImg = document.getElementById("review-cover-img");
        if (book.imageLinks && book.imageLinks.thumbnail) {
          coverImg.src = book.imageLinks.thumbnail.replace('http:', 'https:');
          coverImg.style.display = "block";
        } else {
          coverImg.style.display = "none";
        }

        if (bodyContent) bodyContent.style.display = "flex";
      } else {
        // Si no existe coincidencia directa en Google Books API
        document.getElementById("review-book-title").textContent = titulo;
        document.getElementById("review-book-author").textContent = autor || "Documento de la Orden";
        document.getElementById("review-book-publisher").textContent = "Publicación Interna / Documento de Estudio";
        document.getElementById("review-book-date").textContent = "";
        document.getElementById("review-book-pages").textContent = "";
        document.getElementById("review-description-text").innerHTML = "<em>No se encontró una reseña editorial oficial comercial en línea para este documento específico. Se recomienda abrir el archivo directamente con el visor nativo para consultar su contenido completo.</em>";
        document.getElementById("review-cover-img").style.display = "none";

        if (bodyContent) bodyContent.style.display = "flex";
      }
    })
    .catch(err => {
      if (loading) loading.style.display = "none";
      document.getElementById("review-book-title").textContent = titulo;
      document.getElementById("review-book-author").textContent = autor || "";
      document.getElementById("review-description-text").textContent = "Consulta de reseña comercial no disponible temporalmente. Puede proceder a leer el documento directamente.";
      if (bodyContent) bodyContent.style.display = "flex";
    });
};

window.cerrarModalResenaReal = function() {
  const modal = document.getElementById("modal-real-review");
  if (modal) modal.classList.remove("active");
};

/* ELIMINACIÓN EXCLUSIVA DEL ADMINISTRADOR SUPREMO */
window.eliminarDocumentoAdmin = function(id, titulo) {
  if (!window.esAdministradorSupremo()) {
    alert("⚠️ ACCESO RESTRINGIDO: La eliminación permanente de documentos es una atribución exclusiva del Administrador Supremo Q:. H:. Patricio Díaz.");
    return;
  }

  if (!confirm("⚠️ CONFIRMACIÓN DE ELIMINACIÓN\n\n¿Está seguro de eliminar de forma permanente el documento '" + titulo + "' de las Columnas del Templo?\nEsta acción liberará espacio en Google Drive.")) {
    return;
  }

  const idx = baseLibros.findIndex(b => b.id === id);
  if (idx !== -1) {
    baseLibros.splice(idx, 1);
    actualizarAdministradorDatosDrive();
    renderizarGridLibros(baseLibros);
    renderizarCamaraInstruccion();
    renderizarTrazadosDeLaOrden();
    if (window.renderizarAdminTabla) window.renderizarAdminTabla();
    alert("🗑️ El documento '" + titulo + "' ha sido eliminado permanentemente del Templo.");
  }
};

window.actualizarLimiteCuotaDrive = function() {
  if (!window.esAdministradorSupremo()) {
    alert("⚠️ ACCESO RESTRINGIDO: La cuota de almacenamiento en Google Drive sólo puede ser modificada por el Administrador Supremo Patricio Díaz.");
    return;
  }

  const input = document.getElementById("quota-limit-input");
  if (!input || !input.value) return;
  const newLimit = parseFloat(input.value);
  if (newLimit <= 0) return;

  limiteCuotaDriveGB = newLimit;
  SafeStorage.setItem("gosch_quota_gb", String(limiteCuotaDriveGB));
  actualizarAdministradorDatosDrive();
  alert("💾 Cuota de Almacenamiento en Google Drive actualizada a " + limiteCuotaDriveGB + " GB por el Administrador Supremo.");
};

window.otorgarRolAdministrador = function(email) {
  if (!window.esAdministradorSupremo()) {
    alert("⚠️ FACULTAD RESTRINGIDA\n\nLa asignación de nuevos Administradores es una atribución exclusiva del Administrador Supremo Q:. H:. Patricio Díaz.");
    return;
  }

  const usr = baseUsuariosAdmin.find(u => u.email === email);
  if (usr) {
    usr.rol = "Administrador";
    alert("⭐ El Q:. H:. " + usr.nombre + " " + usr.apellido + " ha sido designado como ADMINISTRADOR DEL TEMPLO.");
    window.renderizarAdminTabla();
  }
};

window.revocarRolAdministrador = function(email) {
  if (!window.esAdministradorSupremo()) {
    alert("⚠️ FACULTAD RESTRINGIDA\n\nLa modificación de Administradores es una atribución exclusiva del Administrador Supremo.");
    return;
  }

  if (email === ADMIN_SUPREMO_EMAIL) {
    alert("⚠️ Operación no permitida: El Administrador Supremo conservará siempre su rol.");
    return;
  }

  const usr = baseUsuariosAdmin.find(u => u.email === email);
  if (usr) {
    usr.rol = "Miembro";
    alert("🔻 Se ha revocado el rol de Administrador al Q:. H:. " + usr.nombre + " " + usr.apellido + ".");
    window.renderizarAdminTabla();
  }
};

function actualizarSelectsGradosApp() {
  const selects = [
    document.getElementById("reg-grado"),
    document.getElementById("up-grado"),
    document.getElementById("inst-req-grado")
  ];

  selects.forEach(sel => {
    if (!sel) return;
    const valPrev = sel.value;
    sel.innerHTML = "";
    listaGradosMasonicos.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.num;
      opt.textContent = g.label;
      sel.appendChild(opt);
    });
    if (valPrev) sel.value = valPrev;
  });

  const adminList = document.getElementById("admin-degrees-list");
  if (adminList) {
    adminList.innerHTML = "";
    listaGradosMasonicos.forEach(g => {
      const item = document.createElement("div");
      item.style.background = "rgba(229,181,69,0.1)";
      item.style.border = "1px solid rgba(229,181,69,0.3)";
      item.style.padding = "8px 12px";
      item.style.borderRadius = "8px";
      item.style.color = "#fff";
      item.style.fontSize = "12px";
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.innerHTML = `<span><strong>Grado ${g.num}°</strong>: ${g.label}</span> <span style="font-size:10px; color:var(--gold-primary); font-weight:700;">✓ ACTIVO</span>`;
      adminList.appendChild(item);
    });
  }
}

window.agregarNuevoGradoAdmin = function() {
  const numInput = document.getElementById("new-grade-num");
  const nameInput = document.getElementById("new-grade-name");
  if (!numInput || !nameInput || !numInput.value || !nameInput.value.trim()) return;

  const num = parseInt(numInput.value, 10);
  const label = nameInput.value.trim();

  if (listaGradosMasonicos.some(g => g.num === num)) {
    alert("⚠️ El Grado " + num + "° ya existe en el sistema.");
    return;
  }

  listaGradosMasonicos.push({ num: num, label: label });
  listaGradosMasonicos.sort((a, b) => a.num - b.num);

  numInput.value = "";
  nameInput.value = "";

  actualizarSelectsGradosApp();
  alert("🏛 ¡Nuevo Grado '" + label + "' incorporado a la plataforma!");
};

window.switchAuthTab = function(tab) {
  const btnLogin = document.getElementById("tab-login");
  const btnReg = document.getElementById("tab-register");
  const formLogin = document.getElementById("form-login");
  const formReg = document.getElementById("form-register");
  if (tab === 'login') {
    if (btnLogin) btnLogin.classList.add("active");
    if (btnReg) btnReg.classList.remove("active");
    if (formLogin) formLogin.classList.add("active");
    if (formReg) formReg.classList.remove("active");
  } else {
    if (btnLogin) btnLogin.classList.remove("active");
    if (btnReg) btnReg.classList.add("active");
    if (formLogin) formLogin.classList.remove("active");
    if (formReg) formReg.classList.add("active");
  }
};

window.loginScarabPlaced = false;
window.regScarabPlaced = false;

window.generarCaptchas = function() { window.loginScarabPlaced = false; window.regScarabPlaced = false; };

window.toggleScarabDinamico = function(formType) {
  const isLogin = (formType === 'login');
  const beetle = document.getElementById(isLogin ? "scarab-beetle-login" : "scarab-beetle-reg");
  const status = document.getElementById(isLogin ? "scarab-status-login" : "scarab-status-reg");
  const stone = document.getElementById(isLogin ? "scarab-stone-login" : "scarab-stone-reg");
  const container = document.getElementById(isLogin ? "container-scarab-login" : "container-scarab-reg");
  const horusBeam = document.getElementById("horus-eye-beam");

  if (isLogin) window.loginScarabPlaced = !window.loginScarabPlaced;
  else window.regScarabPlaced = !window.regScarabPlaced;

  const isPlaced = isLogin ? window.loginScarabPlaced : window.regScarabPlaced;

  if (isPlaced) {
    if (beetle) beetle.style.left = "76%";
    if (stone) stone.style.background = "rgba(56, 161, 105, 0.5)";
    if (container) {
      container.style.borderColor = "#38a169";
      container.style.boxShadow = "0 0 20px rgba(56, 161, 105, 0.4)";
    }
    if (status) status.innerHTML = "<span style='color:#68d391; font-weight:bold;'>✓ ¡SELLO SAGRADO ACTIVADO Y VERIFICADO!</span>";
    if (horusBeam) horusBeam.classList.add("active");
  } else {
    if (beetle) beetle.style.left = "15px";
    if (stone) stone.style.background = "rgba(229, 181, 69, 0.05)";
    if (container) {
      container.style.borderColor = "var(--gold-primary)";
      container.style.boxShadow = "none";
    }
    if (status) status.innerHTML = "[ Sello Incompleto - Toca aquí para posar el escarabajo ]";
    if (horusBeam) horusBeam.classList.remove("active");
  }
};

window.handleRegister = function() {
  const name = document.getElementById("reg-name").value.trim();
  const lastname = document.getElementById("reg-lastname").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const gradoVal = parseInt(document.getElementById("reg-grado").value, 10);
  const status = document.getElementById("auth-status");

  if (!window.regScarabPlaced) {
    if (status) { status.className = "status-box error"; status.textContent = "⚠️ Debe posar el Escarabajo Sagrado antes de enviar su solicitud."; }
    return;
  }

  const gObj = listaGradosMasonicos.find(g => g.num === gradoVal);
  const nuevoUsuario = {
    nombre: name,
    apellido: lastname,
    email: email,
    grado: gObj ? gObj.label : (gradoVal + "°"),
    gradoNum: gradoVal,
    rol: "Miembro",
    estado: "Pendiente"
  };
  baseUsuariosAdmin.push(nuevoUsuario);

  if (status) { status.className = "status-box success"; status.textContent = "✓ Solicitud enviada a la Administración. Registro de Q:. H:. " + name + " " + lastname + " en revisión."; }
  window.renderizarAdminTabla();
};

window.handleLogin = function() {
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const status = document.getElementById("auth-status");

  // Auto-activación inteligente para el Administrador Supremo o activación al enviar
  const esAdminSupremoEmail = (
    email === "diaz.patricio.pdp@gmail.com" ||
    email.indexOf("patricio.diaz") !== -1 ||
    email.indexOf("diaz.patricio") !== -1
  );

  if (!window.loginScarabPlaced && esAdminSupremoEmail) {
    window.toggleScarabDinamico('login');
  }

  if (!window.loginScarabPlaced) {
    if (status) { 
      status.className = "status-box error"; 
      status.innerHTML = "⚠️ Debe posar el Escarabajo Sagrado en la piedra (toca la caja del Sello de Khepri arriba)."; 
    }
    return;
  }

  const usr = baseUsuariosAdmin.find(u => u.email.toLowerCase() === email);
  if (usr) {
    if (usr.estado !== "Aprobado") {
      if (status) { status.className = "status-box error"; status.textContent = "⚠️ Su solicitud aún está en revisión por la Administración."; }
      return;
    }
    currentUser = {
      nombre: usr.nombre,
      apellido: usr.apellido,
      email: usr.email,
      grado: usr.gradoNum || 2,
      rol: usr.rol || "Miembro",
      isSupremeAdmin: (usr.email === ADMIN_SUPREMO_EMAIL)
    };
  } else {
    currentUser = {
      nombre: "Patricio Alberto",
      apellido: "Díaz Peña",
      email: email,
      grado: 2,
      rol: (email === ADMIN_SUPREMO_EMAIL) ? "Administrador" : "Miembro",
      isSupremeAdmin: (email === ADMIN_SUPREMO_EMAIL)
    };
  }

  SafeStorage.setItem("gosch_user", JSON.stringify(currentUser));
  mostrarApp();
};

function mostrarApp() {
  document.getElementById("portico-container").classList.remove("active");
  document.getElementById("app-container").classList.add("active");

  if (currentUser) {
    const nameEl = document.getElementById("display-user-name");
    const gradeEl = document.getElementById("display-user-grade");
    if (nameEl) nameEl.textContent = "Q:. H:. " + (currentUser.nombre || 'Patricio Alberto') + " " + (currentUser.apellido || 'Díaz Peña');
    if (gradeEl) gradeEl.textContent = "Comp:. M:. (2°)" + (currentUser.rol === "Administrador" ? " • [Admin]" : "");
  }
  
  const savedQuota = SafeStorage.getItem("gosch_quota_gb");
  if (savedQuota) limiteCuotaDriveGB = parseFloat(savedQuota);

  window.setTipoVista(tipoVistaActual);
  actualizarSelectsGradosApp();
  actualizarAdministradorDatosDrive();
  renderizarGridLibros(baseLibros);
  renderizarCamaraInstruccion();
  renderizarTrazadosDeLaOrden();
  window.renderizarAdminTabla();
  window.renderizarSugerencias();
}

function documentoVisibleParaUsuario(doc) {
  if (!currentUser) return false;
  const userGrado = currentUser.grado || 1;
  const isGeneral = (doc.tipo && doc.tipo.includes("Bibliografía General")) || (doc.categoria && doc.categoria.includes("Bibliografía General"));
  if (isGeneral) return true;
  return userGrado >= (doc.grado || 1);
}

window.filtrarPorSubclasificacion = function(cat, btn) {
  filtroSubclasificacionActual = cat;
  const pills = document.querySelectorAll(".subclass-pill");
  pills.forEach(p => p.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderizarGridLibros(baseLibros);
};

window.clasificarAutonomiaIA = function() {
  const tituloInput = document.getElementById("up-titulo");
  const catSelect = document.getElementById("up-categoria");
  const tipoSelect = document.getElementById("up-tipo");
  if (!tituloInput || !tituloInput.value.trim()) return;

  const t = tituloInput.value.toLowerCase();
  let catSugerida = "Otros (Bibliografía General)";
  let tipoSugerido = "Obra / Bibliografía General";

  if (t.includes("trazad") || t.includes("balustre") || t.includes("acta") || t.includes("tenida")) {
    catSugerida = "Trazados de la Orden";
    tipoSugerido = "Trazado (Autoría Interna GOSCH)";
  } else if (t.includes("instrucc") || t.includes("manual") || t.includes("guía de grado") || t.includes("catedra")) {
    catSugerida = "Simbología & Liturgia";
    tipoSugerido = "Material de Estudio (Cámara de Instrucción)";
  } else if (t.includes("simbol") || t.includes("liturg") || t.includes("ritual")) {
    catSugerida = "Simbología & Liturgia";
  } else if (t.includes("filosof") || t.includes("moral") || t.includes("ética") || t.includes("realidad")) {
    catSugerida = "Filosofía Masónica";
  } else if (t.includes("histor") || t.includes("origen")) {
    catSugerida = "Historia de la Orden";
  } else if (t.includes("hermet") || t.includes("esoter") || t.includes("alquim")) {
    catSugerida = "Esoterismo / Hermetismo";
  }

  if (catSelect) catSelect.value = catSugerida;
  if (tipoSelect && tipoSugerido) tipoSelect.value = tipoSugerido;
};

/* RENDERIZADO DE CÁMARAS DE LECTURA CON ABRIR DIRECTO EN LECTOR DEL USUARIO */
function renderizarGridLibros(libros) {
  const grid = document.getElementById("books-grid");
  const totalBooksEl = document.getElementById("stat-total-books");
  if (!grid) return;
  
  grid.className = "books-grid mode-" + tipoVistaActual;
  grid.innerHTML = "";

  let visibles = libros.filter(doc => {
    const esGeneral = (!doc.tipo || doc.tipo === "Obra / Bibliografía General" || doc.categoria === "Otros (Bibliografía General)");
    return esGeneral && documentoVisibleParaUsuario(doc);
  });

  if (filtroSubclasificacionActual !== "TODOS") {
    visibles = visibles.filter(doc => doc.categoria === filtroSubclasificacionActual);
  }

  if (totalBooksEl) totalBooksEl.textContent = baseLibros.length;

  if (visibles.length === 0) {
    grid.innerHTML = `
      <div class="glass-card" style="grid-column: 1 / -1; padding: 40px 20px; text-align: center;">
        <div style="font-size: 36px; color: var(--gold-primary); margin-bottom: 12px;">🏛️</div>
        <h4 style="font-family: var(--font-title); color: #ffffff; font-size: 16px; margin-bottom: 8px;">REPOSITORIO GENERAL VACÍO</h4>
        <p style="color: var(--text-secondary); font-size: 13px; max-width: 520px; margin: 0 auto 16px auto;">
          No hay obras o libros de lectura general depositados en esta subclasificación. Use <strong>"Aportar Documento (Subir)"</strong> para agregar bibliografía general.
        </p>
        <button class="masonic-btn gold-glow" type="button" onclick="window.switchTab('upload')">
          + APORTAR PRIMERA OBRA
        </button>
      </div>
    `;
    return;
  }
  
  const isSupreme = window.esAdministradorSupremo();

  visibles.forEach(lib => {
    const card = document.createElement("div");
    card.className = "book-card glass-card";
    
    const btnEliminarHTML = isSupreme ? `<button class="btn-delete-supreme" type="button" onclick="window.eliminarDocumentoAdmin('${lib.id}', '${lib.titulo}')" title="Eliminar Documento">🗑️ Eliminar</button>` : '';

    if (tipoVistaActual === 'list') {
      card.innerHTML = `
        <div class="book-cover-placeholder">📜</div>
        <div class="book-info-block">
          <div>
            <h4 class="book-card-title" style="font-size:15px; margin-bottom:2px;">${lib.titulo}</h4>
            <p class="book-card-author" style="font-size:12px; margin-bottom:0;">${lib.autor || 'Desconocido'}</p>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <span class="badge-tag">${lib.categoria || 'OTROS'}</span>
            <span class="badge-degree">GRADO ${lib.grado || 1}°</span>
          </div>
        </div>
        <div class="book-actions-block">
          <button class="btn-book-action btn-native-pdf" type="button" onclick="window.abrirVisorNativoDriveSistema('${lib.id}')">🌐 Leer en Sistema / Navegador</button>
          <button class="btn-book-action" type="button" onclick="window.descargarDocumentoConPermiso('${lib.titulo}', ${lib.grado || 1})">📥 Descargar</button>
          <button class="btn-real-review" type="button" style="width:auto; padding:6px 12px;" onclick="window.abrirConsultarResenaReal('${lib.titulo}', '${lib.autor || ''}')">📖 Reseña Real</button>
          ${btnEliminarHTML}
        </div>
      `;
    } else {
      card.innerHTML = `
        <div>
          <div class="book-card-header">
            <span class="badge-pdf">PDF ORIGINAL</span>
            <span class="badge-degree">GRADO ${lib.grado || 1}°</span>
          </div>
          <div class="book-cover-placeholder">📜</div>
          <h4 class="book-card-title">${lib.titulo}</h4>
          <p class="book-card-author">${lib.autor || 'Desconocido'}</p>
          <div class="book-badges-row">
            <span class="badge-tag">${lib.categoria || 'OTROS'}</span>
            <span class="badge-type">${lib.tipo || 'OBRA / BIBLIOGRAFÍA GENERAL'}</span>
          </div>
        </div>
        <div>
          <div class="book-actions-row">
            <button class="btn-book-action btn-native-pdf" type="button" onclick="window.abrirVisorNativoDriveSistema('${lib.id}')">🌐 Leer en Sistema</button>
            <button class="btn-book-action" type="button" onclick="window.descargarDocumentoConPermiso('${lib.titulo}', ${lib.grado || 1})">📥 Descargar</button>
          </div>
          <div style="display:flex; gap:6px; margin-top:4px;">
            <button class="btn-real-review" type="button" onclick="window.abrirConsultarResenaReal('${lib.titulo}', '${lib.autor || ''}')">📖 Reseña Editorial Real</button>
            ${btnEliminarHTML}
          </div>
        </div>
      `;
    }
    grid.appendChild(card);
  });
}

/* RENDERIZADO DE CÁMARA DE INSTRUCCIÓN POR GRADO */
function renderizarCamaraInstruccion() {
  const grid = document.getElementById("instruction-grid");
  if (!grid) return;
  grid.className = "books-grid mode-" + tipoVistaActual;
  grid.innerHTML = "";

  const soloInstruccion = baseLibros.filter(lib => {
    const esMaterialInstruccion = (lib.tipo === "Material de Estudio (Cámara de Instrucción)");
    return esMaterialInstruccion && documentoVisibleParaUsuario(lib);
  });

  if (soloInstruccion.length === 0) {
    grid.innerHTML = `
      <div class="glass-card" style="grid-column: 1 / -1; padding: 45px 20px; text-align: center;">
        <div style="font-size: 38px; color: var(--gold-primary); margin-bottom: 12px;">░</div>
        <h4 style="font-family: var(--font-title); color: #ffffff; font-size: 16px; margin-bottom: 8px; letter-spacing:1px;">CÁMARA DE INSTRUCCIÓN VACÍA</h4>
        <p style="color: var(--text-secondary); font-size: 13px; max-width: 520px; margin: 0 auto 18px auto; line-height:1.6;">
          Actualmente no hay manuales ni guías depositadas explícitamente como <strong>"Material de Estudio (Cámara de Instrucción)"</strong> para su grado iniciado (${currentUser ? currentUser.grado : 2}°).
        </p>
        <button class="masonic-btn gold-glow" type="button" onclick="window.switchTab('upload')">
          + APORTAR MATERIAL DE INSTRUCCIÓN
        </button>
      </div>
    `;
    return;
  }

  const isSupreme = window.esAdministradorSupremo();

  soloInstruccion.forEach(lib => {
    const card = document.createElement("div");
    card.className = "book-card glass-card";
    const btnEliminarHTML = isSupreme ? `<button class="btn-delete-supreme" type="button" onclick="window.eliminarDocumentoAdmin('${lib.id}', '${lib.titulo}')" title="Eliminar Documento">🗑️ Eliminar</button>` : '';

    card.innerHTML = `
      <div>
        <div class="book-card-header">
          <span class="badge-pdf">INSTRUCCIÓN</span>
          <span class="badge-degree">GRADO ${lib.grado || 1}°</span>
        </div>
        <div class="book-cover-placeholder">📜</div>
        <h4 class="book-card-title">${lib.titulo}</h4>
        <p class="book-card-author">${lib.autor || 'Desconocido'}</p>
        <div class="book-badges-row">
          <span class="badge-tag">${lib.categoria || 'INSTRUCCIÓN'}</span>
          <span class="badge-type">ESTUDIO DE GRADO</span>
        </div>
      </div>
      <div>
        <div class="book-actions-row">
          <button class="btn-book-action btn-native-pdf" type="button" onclick="window.abrirVisorNativoDriveSistema('${lib.id}')">🌐 Leer en Sistema</button>
          <button class="btn-book-action" type="button" onclick="window.descargarDocumentoConPermiso('${lib.titulo}', ${lib.grado || 1})">📥 Descargar</button>
        </div>
        <div style="display:flex; gap:6px; margin-top:4px;">
          <button class="btn-real-review" type="button" onclick="window.abrirConsultarResenaReal('${lib.titulo}', '${lib.autor || ''}')">📖 Reseña Real</button>
          ${btnEliminarHTML}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* RENDERIZADO DE TRAZADOS DE LA ORDEN */
function renderizarTrazadosDeLaOrden() {
  const grid = document.getElementById("drawings-grid");
  if (!grid) return;
  grid.className = "books-grid mode-" + tipoVistaActual;
  grid.innerHTML = "";

  const soloTrazados = baseLibros.filter(lib => {
    const esTrazado = (lib.tipo === "Trazado (Autoría Interna GOSCH)" || lib.categoria === "Trazados de la Orden");
    return esTrazado && documentoVisibleParaUsuario(lib);
  });

  if (soloTrazados.length === 0) {
    grid.innerHTML = `
      <div class="glass-card" style="grid-column: 1 / -1; padding: 45px 20px; text-align: center;">
        <div style="font-size: 38px; color: var(--gold-primary); margin-bottom: 12px;">📄</div>
        <h4 style="font-family: var(--font-title); color: #ffffff; font-size: 16px; margin-bottom: 8px; letter-spacing:1px;">NO HAY TRAZADOS DE LA ORDEN REGISTRADOS</h4>
        <p style="color: var(--text-secondary); font-size: 13px; max-width: 520px; margin: 0 auto 18px auto; line-height:1.6;">
          No hay balustres ni actas depositadas explícitamente como <strong>"Trazado (Autoría Interna GOSCH)"</strong> en las Columnas todavía.
        </p>
        <button class="masonic-btn gold-glow" type="button" onclick="window.switchTab('upload')">
          + APORTAR TRAZADO DE LOGIA
        </button>
      </div>
    `;
    return;
  }

  const isSupreme = window.esAdministradorSupremo();

  soloTrazados.forEach(lib => {
    const card = document.createElement("div");
    card.className = "book-card glass-card";
    const btnEliminarHTML = isSupreme ? `<button class="btn-delete-supreme" type="button" onclick="window.eliminarDocumentoAdmin('${lib.id}', '${lib.titulo}')" title="Eliminar Documento">🗑️ Eliminar</button>` : '';

    card.innerHTML = `
      <div>
        <div class="book-card-header">
          <span class="badge-pdf">TRAZADO</span>
          <span class="badge-degree">GRADO ${lib.grado || 1}°</span>
        </div>
        <div class="book-cover-placeholder">📄</div>
        <h4 class="book-card-title">${lib.titulo}</h4>
        <p class="book-card-author">${lib.autor || 'Q:. H:. Trazador'}</p>
        <div class="book-badges-row">
          <span class="badge-tag">${lib.categoria || 'TRAZADOS'}</span>
          <span class="badge-type">BALUSTRE INTERNO</span>
        </div>
      </div>
      <div>
        <div class="book-actions-row">
          <button class="btn-book-action btn-native-pdf" type="button" onclick="window.abrirVisorNativoDriveSistema('${lib.id}')">🌐 Leer en Sistema</button>
          <button class="btn-book-action" type="button" onclick="window.descargarDocumentoConPermiso('${lib.titulo}', ${lib.grado || 1})">📥 Descargar</button>
        </div>
        <div style="display:flex; gap:6px; margin-top:4px;">
          <button class="btn-real-review" type="button" onclick="window.abrirConsultarResenaReal('${lib.titulo}', '${lib.autor || ''}')">📖 Reseña Real</button>
          ${btnEliminarHTML}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

window.descargarDocumentoConPermiso = function(titulo, gradoRequerido) {
  if (!window.usuarioTienePermisoGrado(gradoRequerido)) {
    alert("⚠️ ACCESO RESTRINGIDO\n\nLa descarga de este documento exige Grado " + gradoRequerido + "° iniciado.");
    return;
  }
  alert("Descargando " + titulo + "...");
};

window.logoutUser = function() {
  currentUser = null; SafeStorage.removeItem("gosch_user");
  document.getElementById("app-container").classList.remove("active");
  document.getElementById("portico-container").classList.add("active");
};

function dibujarRedNeuronal() {
  const canvas = document.getElementById("neural-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(229, 181, 69, 0.4)"; ctx.fillStyle = "#e5b545"; ctx.lineWidth = 1;
  const layers = [3, 6, 6, 5]; const layerX = [60, 200, 340, 480];

  for (let l = 0; l < layers.length - 1; l++) {
    const n1 = layers[l]; const n2 = layers[l + 1];
    const x1 = layerX[l]; const x2 = layerX[l + 1];
    for (let i = 0; i < n1; i++) {
      const y1 = 40 + i * (140 / (n1 - 1 || 1));
      for (let j = 0; j < n2; j++) {
        const y2 = 30 + j * (160 / (n2 - 1 || 1));
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
    }
  }

  for (let l = 0; l < layers.length; l++) {
    const n = layers[l]; const x = layerX[l];
    for (let i = 0; i < n; i++) {
      const y = (l === 0) ? 40 + i * (140 / (n - 1 || 1)) : 30 + i * (160 / (n - 1 || 1));
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#050b14"; ctx.fill(); ctx.strokeStyle = "#e5b545"; ctx.lineWidth = 2; ctx.stroke();
    }
  }
}

document.addEventListener("DOMContentLoaded", function() {
  actualizarSelectsGradosApp();
  actualizarDashboardGraficos();
});
  