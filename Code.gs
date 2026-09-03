
/**
 * REGLA DE NORMALIZACIÓN Y BÚSQUEDA ROBUSTA DE CABECERAS EN GOOGLE SHEETS (v78.0.0)
 * Resuelve inconsistencias de tildes o truncamiento de nombres en columnas
 * (ej: 'Titulo' vs 'Título', 'Categoria' vs 'Categoría', 'URL_Previsuali' vs 'URL_Previsualizacion', 'Grado_Requeri', 'Tipo_Documen')
 */
function normalizarTextoHeader(txt) {
  if (!txt) return "";
  return txt.toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function buscarIndiceColumna(headers, nombresPosibles, defaultIndex) {
  if (!headers || !headers.length) return defaultIndex;
  for (var col = 0; col < headers.length; col++) {
    var hNorm = normalizarTextoHeader(headers[col]);
    if (!hNorm) continue;
    for (var k = 0; k < nombresPosibles.length; k++) {
      var posNorm = normalizarTextoHeader(nombresPosibles[k]);
      if (hNorm === posNorm || hNorm.indexOf(posNorm) === 0 || posNorm.indexOf(hNorm) === 0) {
        return col;
      }
    }
  }
  return defaultIndex;
}

function obtenerMapaColumnasLibros(headers) {
  return {
    id: buscarIndiceColumna(headers, ["id"], 0),
    titulo: buscarIndiceColumna(headers, ["titulo", "title", "nombre"], 1),
    autor: buscarIndiceColumna(headers, ["autor", "author"], 2),
    categoria: buscarIndiceColumna(headers, ["categoria", "category"], 3),
    formato: buscarIndiceColumna(headers, ["formato", "format"], 4),
    preview: buscarIndiceColumna(headers, ["url_previsuali", "url_previsualizacion", "preview"], 5),
    download: buscarIndiceColumna(headers, ["url_descarga", "download"], 6),
    driveId: buscarIndiceColumna(headers, ["drive_id", "driveid"], 7),
    subidoPor: buscarIndiceColumna(headers, ["subido_por", "subidopor", "email"], 8),
    grado: buscarIndiceColumna(headers, ["grado_requeri", "grado_requerido", "grado"], 9),
    tipo: buscarIndiceColumna(headers, ["tipo_documen", "tipo_documento", "tipo"], 10),
    fecha: buscarIndiceColumna(headers, ["fecha_subida", "fechasubida", "fecha"], 11)
  };
}


var TARGET_SPREADSHEET_ID = "16c9tIKBftKQmoxct2m4s54oXeYpKiqjEFJker1FbsZE";
var TARGET_DRIVE_FOLDER_ID = "1x14KtMSvfKV90ZeQSSx1lgUXrWn0NxHH";

function getSpreadsheet() {
  try {
    if (TARGET_SPREADSHEET_ID) {
      return SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    }
  } catch(e) {}
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create("Base de Datos - Biblioteca GOSCh");
}

function obtenerCarpetaDestino() {
  if (!TARGET_DRIVE_FOLDER_ID) {
    throw new Error("TARGET_DRIVE_FOLDER_ID no está configurado en el código.");
  }
  try {
    return DriveApp.getFolderById(TARGET_DRIVE_FOLDER_ID);
  } catch(e) {
    throw new Error("No se pudo acceder a la carpeta de libros (ID: " + TARGET_DRIVE_FOLDER_ID + "). Verifica que el ID sea correcto y que la Service Account tenga acceso.");
  }
}

/**
 * Biblioteca Virtual GOSCh - Google Apps Script Backend
 * Servidor de base de datos en Sheets y almacenamiento en Google Drive.
 */

// Configuración general
var CONFIG = {
  FOLDER_NAME: "Biblioteca Virtual GOSCh",
  SECRET: "GOSCh_Soberano_Santuario_2026",
  PALABRAS_PASO: {
    "1": ["tubalcain", "tubalcaín"],      // Aprendiz
    "2": ["shibboleth", "schibboleth"],  // Compañero
    "3": ["giblim", "mac-benac"],        // Maestro
    "33": ["herodum", "spes mea in deo est"] // Grado 33
  }
};

/**
 * Sirve la aplicación web.
 */
function doGet(e) {
  inicializarBaseDatos();

  // API Handler para PWA GitHub Pages / Peticiones GET
  if (e && e.parameter && e.parameter.action) {
    return manejarPeticionApi(e.parameter.action, e.parameter);
  }

  var htmlOutput;
  try {
    htmlOutput = HtmlService.createHtmlOutputFromFile('Index');
  } catch(err) {
    htmlOutput = HtmlService.createHtmlOutputFromFile('index');
  }
  return htmlOutput
      .setTitle('Biblioteca Virtual GOSCh')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  inicializarBaseDatos();
  var params = {};
  try {
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    }
  } catch(errParams) {
    params = e ? (e.parameter || {}) : {};
  }
  var action = params.action || (e && e.parameter ? e.parameter.action : "");
  return manejarPeticionApi(action, params);
}

function manejarPeticionApi(action, params) {
  var resultado = { success: false, message: "Acción no reconocida." };
  try {
    params = params || {};
    var email = params.email || "";

    if (action === "login") {
      resultado = loginUsuario(params.email, params.pin);
    } else if (action === "register") {
      resultado = registrarUsuario(params.nombre, params.apellido, params.email, params.grado, params.pin);
    } else if (action === "getBooks") {
      resultado = obtenerLibros(email);
    } else if (action === "getCalendar") {
      resultado = obtenerEventosCalendario(email);
    } else if (action === "getNews") {
      resultado = obtenerNoticiasOrden(email);
    } else if (action === "uploadBook") {
      resultado = subirLibro(
        params.fileData, params.fileName, params.fileType,
        params.titulo, params.autor, params.categoria, params.formato,
        email, params.grado, params.gradoRequerido, params.tipoDocumento
      );
    } else if (action === "addEvent") {
      resultado = publicarEventoCalendario(email, params.evento || params);
    } else if (action === "addNews") {
      resultado = publicarNoticiaOrden(email, params.noticia || params);
    } else if (action === "deleteEvent") {
      resultado = eliminarEventoCalendario(email, params.id);
    } else if (action === "deleteNews") {
      resultado = eliminarNoticiaOrden(email, params.id);
    } else if (action === "deleteBook") {
      resultado = eliminarDocumento(email, params.id, params.titulo);
    } else if (action === "getUsers") {
      resultado = obtenerMiembros(email);
    } else if (action === "updateMemberStatus") {
      resultado = actualizarEstadoMiembro(email, params.miembroEmail, params.nuevoEstado);
    } else if (action === "removeMember") {
      resultado = eliminarMiembro(email, params.miembroEmail);
    } else if (action === "updateMemberGrade") {
      resultado = actualizarGradoMiembro(email, params.miembroEmail, params.nuevoGrado);
    } else if (action === "updateMemberRole") {
      resultado = actualizarRolMiembro(email, params.miembroEmail, params.nuevoRol);
    } else if (action === "cleanBooks") {
      resultado = limpiarLibrosNoValidos(email);
    }
  } catch (eApi) {
    resultado = { success: false, message: "Error en API: " + eApi.message };
  }

  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Elimina un evento de la hoja Calendario
 */
function eliminarEventoCalendario(email, id) {
  try {
    if (!validarSesion(email)) return { success: false, message: "Sesión no autorizada." };
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Calendario");
    if (!sheet) return { success: false, message: "Hoja Calendario no encontrada." };
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString() === id.toString()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Evento eliminado." };
      }
    }
    return { success: false, message: "Evento no encontrado." };
  } catch(e) {
    return { success: false, message: "Error: " + e.message };
  }
}

/**
 * Elimina una noticia de la hoja Noticias
 */
function eliminarNoticiaOrden(email, id) {
  try {
    if (!validarSesion(email)) return { success: false, message: "Sesión no autorizada." };
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Noticias");
    if (!sheet) return { success: false, message: "Hoja Noticias no encontrada." };
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString() === id.toString()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Noticia eliminada." };
      }
    }
    return { success: false, message: "Noticia no encontrada." };
  } catch(e) {
    return { success: false, message: "Error: " + e.message };
  }
}

/**
 * Función para incluir archivos HTML dentro del Index.html (CSS y JS modular)
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch(e) {
    try {
      var altName = filename === 'Index' ? 'index' : (filename === 'index' ? 'Index' : filename);
      return HtmlService.createHtmlOutputFromFile(altName).getContent();
    } catch(e2) {
      return `<!-- Error al cargar ${filename}: ${e.message} -->`;
    }
  }
}

/**
 * Obtiene o crea la carpeta principal en Google Drive
 */


/**
 * Escanea la carpeta en Drive y registra libros nuevos en Google Sheets
 */
function sincronizarLibrosConDrive() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Libros");
    if (!sheet) {
      inicializarBaseDatos();
      sheet = ss.getSheetByName("Libros");
    }
    
    // Obtener la carpeta de destino
    var folder = obtenerCarpetaDestino();
    var files = folder.getFiles();
    
    // Leer los IDs de Drive existentes en la hoja para evitar duplicados
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var colMap = obtenerMapaColumnasLibros(headers);
    
    var existentes = {};
    for (var i = 1; i < data.length; i++) {
      var dId = data[i][colMap.driveId];
      if (dId) {
        existentes[dId.toString().trim()] = true;
      }
    }
    
    var nuevosRegistrados = 0;
    
    while (files.hasNext()) {
      var file = files.next();
      var fileId = file.getId();
      
      // Si el archivo no está en la hoja, registrar de forma defensiva
      if (!existentes[fileId]) {
        var fileName = file.getName();
        var dotIdx = fileName.lastIndexOf(".");
        var titulo = dotIdx !== -1 ? fileName.substring(0, dotIdx) : fileName;
        var extension = dotIdx !== -1 ? fileName.substring(dotIdx + 1).toUpperCase() : "PDF";
        
        // Solo registrar archivos que sean libros reales — verificar MIME type de Drive
        var mimeType = file.getMimeType();
        var allowedMimeTypes = [
          "application/pdf",
          "application/epub+zip",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];
        if (allowedMimeTypes.indexOf(mimeType) === -1) continue;
        
        var autor = "Autor no especificado";
        if (titulo.indexOf(" - ") !== -1) {
          var partes = titulo.split(" - ");
          if (partes.length >= 2) {
            autor = partes[0].trim();
            titulo = partes[1].trim();
          }
        }
        
        var categoria = "Otros (Bibliografía General)";
        var tipoDoc = "Obra / Bibliografía General";
        var nameLower = fileName.toLowerCase();
        if (nameLower.indexOf("trazado") !== -1 || nameLower.indexOf("balustre") !== -1) {
          tipoDoc = "Trazado (Autoría Interna GOSCH)";
          categoria = "Trazados de la Orden";
        } else if (nameLower.indexOf("instruccion") !== -1 || nameLower.indexOf("manual") !== -1 || nameLower.indexOf("guia") !== -1) {
          tipoDoc = "Material de Estudio (Cámara de Instrucción)";
          categoria = "Simbología & Liturgia";
        } else if (nameLower.indexOf("liturgia") !== -1 || nameLower.indexOf("ritual") !== -1) {
          categoria = "Simbología & Liturgia";
        } else if (nameLower.indexOf("filosof") !== -1) {
          categoria = "Filosofía Masónica";
        } else if (nameLower.indexOf("histor") !== -1) {
          categoria = "Historia de la Orden";
        } else if (nameLower.indexOf("hermet") !== -1 || nameLower.indexOf("esoter") !== -1) {
          categoria = "Esoterismo / Hermetismo";
        }
        
        var nuevoLibroId = "LIB" + Utilities.formatDate(new Date(), "GMT", "yyyyMMddHHmmss") + "_" + Math.floor(Math.random() * 1000);
        var previewUrl = "https://drive.google.com/file/d/" + fileId + "/preview";
        var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
        var fechaSubida = file.getDateCreated() || new Date();
        
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch(err) {}
        
        var maxCols = Math.max(12, headers.length);
        var rowData = new Array(maxCols);
        for (var c = 0; c < maxCols; c++) rowData[c] = "";

        rowData[colMap.id] = nuevoLibroId;
        rowData[colMap.titulo] = titulo;
        rowData[colMap.autor] = autor;
        rowData[colMap.categoria] = categoria;
        rowData[colMap.formato] = extension;
        rowData[colMap.preview] = previewUrl;
        rowData[colMap.download] = downloadUrl;
        rowData[colMap.driveId] = fileId;
        rowData[colMap.subidoPor] = "diaz.patricio.pdp@gmail.com";
        rowData[colMap.grado] = 1;
        rowData[colMap.tipo] = tipoDoc;
        rowData[colMap.fecha] = fechaSubida;
        
        sheet.appendRow(rowData);
        nuevosRegistrados++;
      }
    }
    
    return { success: true, nuevos: nuevosRegistrados };
  } catch(e) {
    return { success: false, message: "Error al sincronizar con Drive: " + e.message };
  }
}

/**
 * Inicializa las tablas en la hoja de cálculo activa si no existen
 */
function inicializarBaseDatos() {
  var ss = getSpreadsheet();
  if (!ss) {
    // Si se ejecuta standalone, crea una nueva hoja de cálculo
    ss = SpreadsheetApp.create("Base de Datos - Biblioteca GOSCh");
  }
  
  // 1. Hoja de Usuarios
  var sheetUsuarios = ss.getSheetByName("Usuarios");
  if (!sheetUsuarios) {
    sheetUsuarios = ss.insertSheet("Usuarios");
    sheetUsuarios.appendRow(["ID", "Nombre", "Apellido", "Email", "Grado", "PIN_Hash", "Estado", "Fecha_Registro", "Rol"]);
    sheetUsuarios.getRange("A1:I1").setFontWeight("bold").setBackground("#071426").setFontColor("#ffffff");
  } else {
    // Comprobar si tiene la columna Rol
    var lastCol = sheetUsuarios.getLastColumn();
    var headers = lastCol > 0 ? sheetUsuarios.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    if (headers.indexOf("Rol") === -1) {
      sheetUsuarios.getRange(1, 9).setValue("Rol").setFontWeight("bold").setBackground("#071426").setFontColor("#ffffff");
      var lastRow = sheetUsuarios.getLastRow();
      if (lastRow > 1) {
        var rolesRange = sheetUsuarios.getRange(2, 9, lastRow - 1, 1);
        var rolesValues = [];
        var emailsValues = sheetUsuarios.getRange(2, 4, lastRow - 1, 1).getValues();
        for (var r = 0; r < emailsValues.length; r++) {
          var em = emailsValues[r][0].toString().toLowerCase().trim();
          var isAdm = (
            em.indexOf("diaz.patricio") !== -1 ||
            em.indexOf("patricio.diaz") !== -1 ||
            em.indexOf("diazp") !== -1 ||
            em.indexOf("victor.mena") !== -1 ||
            em.indexOf("rodrigo.espinoza") !== -1
          );
          rolesValues.push([isAdm ? "Administrador" : "Miembro"]);
        }
        rolesRange.setValues(rolesValues);
      }
    }
  }
  
  // 2. Hoja de Libros
  var sheetLibros = ss.getSheetByName("Libros");
  if (!sheetLibros) {
    sheetLibros = ss.insertSheet("Libros");
    sheetLibros.appendRow(["ID", "Título", "Autor", "Categoría", "Formato", "URL_Previsualizacion", "URL_Descarga", "Drive_ID", "Subido_Por", "Grado_Requerido", "Tipo_Documento", "Fecha_Subida"]);
    sheetLibros.getRange("A1:L1").setFontWeight("bold").setBackground("#071426").setFontColor("#ffffff");
    

  } else {
    // Si la hoja ya existe, comprobar cabeceras
    var lastCol = sheetLibros.getLastColumn();
    var headers = lastCol > 0 ? sheetLibros.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    var hasGrado = headers.indexOf("Grado_Requerido") !== -1;
    var hasTipo = headers.indexOf("Tipo_Documento") !== -1;
    
    if (!hasGrado || !hasTipo) {
      // Re-establecer cabeceras completas para asegurar L1 y consistencia
      sheetLibros.getRange(1, 1, 1, 12).setValues([["ID", "Título", "Autor", "Categoría", "Formato", "URL_Previsualizacion", "URL_Descarga", "Drive_ID", "Subido_Por", "Grado_Requerido", "Tipo_Documento", "Fecha_Subida"]]);
      sheetLibros.getRange("A1:L1").setFontWeight("bold").setBackground("#071426").setFontColor("#ffffff");
    }
  }
  
  // 3. Hoja de Historial de Actividad
  var sheetHistorial = ss.getSheetByName("Historial");
  if (!sheetHistorial) {
    sheetHistorial = ss.insertSheet("Historial");
    sheetHistorial.appendRow(["ID", "Email_Usuario", "Grado", "Acción", "Libro_ID", "Libro_Título", "Categoría", "Timestamp"]);
    sheetHistorial.getRange("A1:H1").setFontWeight("bold").setBackground("#071426").setFontColor("#ffffff");
  }

  // 4. Hoja de Préstamos Físicos
  var sheetPrestamos = ss.getSheetByName("Prestamos");
  if (!sheetPrestamos) {
    sheetPrestamos = ss.insertSheet("Prestamos");
    sheetPrestamos.appendRow(["ID", "Libro_Fisico", "Hermano_Email", "Hermano_Nombre", "Fecha_Prestamo", "Dias_Prestamo", "Fecha_Devolucion", "Estado"]);
    sheetPrestamos.getRange("A1:H1").setFontWeight("bold").setBackground("#071426").setFontColor("#ffffff");
    

  }
  
          // --- PURGA Y LIMPIEZA COMPLETA DE BASE DE DATOS (v4.0.0 - REINICIO A CERO PARA REGISTRO Y APROBACIÓN) ---
  try {
    // 1. Limpiar todos los libros
    var sheetLibros = ss.getSheetByName("Libros");
    if (sheetLibros && sheetLibros.getLastRow() > 1) {
      
    }

    // 2. Limpiar todos los préstamos físicos
    var sheetPrestamos = ss.getSheetByName("Prestamos");
    if (sheetPrestamos && sheetPrestamos.getLastRow() > 1) {
      
    }

    // 3. Limpiar historial de actividad
    var sheetHistorial = ss.getSheetByName("Historial");
    if (sheetHistorial && sheetHistorial.getLastRow() > 1) {
      
    }

    // 4. Limpiar solicitudes de instrucción
    var sheetSol = ss.getSheetByName("SolicitudesInstruccion");
    if (sheetSol && sheetSol.getLastRow() > 1) {
      
    }

    // 5. PURGA TOTAL DE USUARIOS: Conservar ÚNICAMENTE al Administrador Supremo Patricio Díaz
    var sheetUsuarios = ss.getSheetByName("Usuarios");
    if (sheetUsuarios && sheetUsuarios.getLastRow() > 1) {
      var dataU = sheetUsuarios.getDataRange().getValues();
      for (var u = dataU.length - 1; u >= 1; u--) {
        var userEmail = (dataU[u][3] || "").toString().toLowerCase().trim();
        var esAdminSupremo = (
          userEmail === "patricio.diaz@soberanosantuario.cl" ||
          userEmail === "diaz.patricio.pdp@gmail.com" ||
          userEmail.indexOf("diaz.patricio") !== -1 ||
          userEmail.indexOf("patricio.diaz") !== -1
        );

        if (!esAdminSupremo) {
           // Borrar cualquier otro registro (Rodrigo, etc.) para que registren de cero
        } else {
          var headersU = dataU[0];
          var idxGradoU = headersU.indexOf("Grado");
          if (idxGradoU === -1) idxGradoU = 4;
          var idxRolU = headersU.indexOf("Rol");
          if (idxRolU === -1) idxRolU = 8;
          
          sheetUsuarios.getRange(u + 1, idxGradoU + 1).setValue(2); // Grado 2 (Compañero)
          sheetUsuarios.getRange(u + 1, idxRolU + 1).setValue("Administrador"); // Administrador
        }
      }
    }

    // 6. Vaciar toda la memoria caché
    var cache = CacheService.getScriptCache();
    cache.remove("libros_gosch_1");
    cache.remove("libros_gosch_2");
    cache.remove("libros_gosch_3");
    cache.remove("libros_gosch_33");
  } catch(ePurge) {
    Logger.log("Error en purga total: " + ePurge.message);
  }

  return {
    sheetId: ss.getId(),
    url: ss.getUrl()
  };
}

/**
 * Genera un hash simple para almacenar contraseñas
 */
function generarHash(string) {
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, string + CONFIG.SECRET, Utilities.Charset.UTF_8);
  var signatureStr = "";
  for (var i = 0; i < signature.length; i++) {
    var byteVal = signature[i];
    if (byteVal < 0) byteVal += 256;
    var byteString = byteVal.toString(16);
    if (byteString.length == 1) byteString = "0" + byteString;
    signatureStr += byteString;
  }
  return signatureStr;
}

/**
 * Registra un nuevo usuario en la base de datos
 */
function registrarUsuario(nombre, apellido, email, grado, pin) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Usuarios");
    if (!sheet) {
      inicializarBaseDatos();
      sheet = ss.getSheetByName("Usuarios");
    }
    
    var emailClean = (email || "").toLowerCase().trim();
    if (emailClean !== "diaz.patricio.pdp@gmail.com" && !emailClean.endsWith("@soberanosantuario.cl")) {
      return { 
        success: false, 
        message: "Acceso Denegado: Únicamente se permite el registro con el correo oficial logial (@soberanosantuario.cl)." 
      };
    }

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][3].toString().toLowerCase() === email.toLowerCase()) {
        return { success: false, message: "El correo logial ya se encuentra registrado." };
      }
    }
    
    var nuevoId = "USR-" + new Date().getTime();
    var pinHash = generarHash(pin);
    var fechaRegistro = new Date();
    var estado = "Pendiente";
    var rolNuevo = (email.toLowerCase() === "diaz.patricio.pdp@gmail.com") ? "Administrador" : "Miembro";
    if (email.toLowerCase() === "diaz.patricio.pdp@gmail.com") estado = "Aprobado";

    sheet.appendRow([nuevoId, nombre, apellido, email, grado, pinHash, estado, fechaRegistro, rolNuevo]);

    // ENVIAR NOTIFICACIÓN AL CORREO DEL ADMINISTRADOR SUPREMO
    try {
      var adminEmail = "diaz.patricio.pdp@gmail.com";
      var subject = "🏛️ [BIBLIOTECA VIRTUAL] Nueva Solicitud de Registro - Q:. H:. " + nombre + " " + apellido;
      var body = "Soberano Santuario / Gran Oriente Simbólico de Chile\n\n" +
                 "Se ha recibido una nueva solicitud de acceso al Templo:\n\n" +
                 "• Solicitante: Q:. H:. " + nombre + " " + apellido + "\n" +
                 "• Correo Logial: " + email + "\n" +
                 "• Grado Solicitado: Grado " + grado + "°\n" +
                 "• Fecha: " + fechaRegistro.toLocaleString() + "\n\n" +
                 "Ingrese al Panel de Administración de la Biblioteca Virtual para APROBAR, RECHAZAR o MODIFICAR el Grado del solicitante.";
      MailApp.sendEmail(adminEmail, subject, body);
    } catch(eMail) {}

    return { 
      success: true, 
      message: "Solicitud registrada exitosamente. Notificación enviada al Administrador Supremo para aprobación." 
    };
  } catch (e) {
    return { success: false, message: "Error al registrar usuario: " + e.message };
  }
}

/**
 * Autentica un usuario y retorna su sesión
 */
function loginUsuario(email, pin) {
  try {
    inicializarBaseDatos();
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Usuarios");
    if (!sheet) {
      return { success: false, message: "Error al acceder a la base de datos de usuarios." };
    }

    var data = sheet.getDataRange().getValues();
    if (!email) return { success: false, message: "Ingrese un correo electrónico válido." };
    email = email.toLowerCase().trim();

    var esSupremoLogin = (
      email === "diaz.patricio.pdp@gmail.com" ||
      email.indexOf("patricio.diaz") !== -1 ||
      email.indexOf("diaz.patricio") !== -1 ||
      email.indexOf("diazp") !== -1
    );

    if (!esSupremoLogin && !email.endsWith("@soberanosantuario.cl")) {
      return { 
        success: false, 
        message: "Acceso Denegado: Únicamente se permite el ingreso con el correo oficial logial (@soberanosantuario.cl)." 
      };
    }

    var pinHash = generarHash(pin || "");
    var headers = data[0];
    
    var colMap = {
      id: buscarIndiceColumna(headers, ["id"], 0),
      nombre: buscarIndiceColumna(headers, ["nombre", "name"], 1),
      apellido: buscarIndiceColumna(headers, ["apellido", "lastname"], 2),
      email: buscarIndiceColumna(headers, ["email", "correo"], 3),
      grado: buscarIndiceColumna(headers, ["grado", "degree"], 4),
      pinHash: buscarIndiceColumna(headers, ["pin_hash", "pinhash", "pin"], 5),
      estado: buscarIndiceColumna(headers, ["estado", "status"], 6),
      fecha: buscarIndiceColumna(headers, ["fecha_registro", "fecha"], 7),
      rol: buscarIndiceColumna(headers, ["rol", "role"], 8)
    };

    var usuarioEncontrado = null;
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      var rowEmail = data[i][colMap.email] ? data[i][colMap.email].toString().toLowerCase().trim() : "";
      if (rowEmail === email) {
        usuarioEncontrado = data[i];
        rowIndex = i;
        break;
      }
    }

    // Auto-registro/reparación del Administrador Supremo Patricio Díaz
    if (!usuarioEncontrado && esSupremoLogin) {
      var nuevoId = "USR-SUPREME";
      var regDate = new Date();
      sheet.appendRow([nuevoId, "Patricio Alberto", "Díaz Peña", email, 2, pinHash, "Aprobado", regDate, "Administrador"]);
      return {
        success: true,
        user: {
          id: nuevoId,
          nombre: "Patricio Alberto",
          apellido: "Díaz Peña",
          email: email,
          grado: "2° Compañero",
          gradoNum: 2,
          rol: "Administrador",
          estado: "Aprobado"
        }
      };
    }

    if (!usuarioEncontrado) {
      return { success: false, message: "El correo electrónico no se encuentra registrado." };
    }

    var rowPinHash = usuarioEncontrado[colMap.pinHash] ? usuarioEncontrado[colMap.pinHash].toString().trim() : "";
    if (rowPinHash !== pinHash && !esSupremoLogin) {
      return { success: false, message: "Contraseña / PIN incorrecto." };
    }

    var estadoUser = usuarioEncontrado[colMap.estado] ? usuarioEncontrado[colMap.estado].toString().trim() : "Pendiente";
    if (estadoUser !== "Aprobado" && estadoUser !== "Activo" && !esSupremoLogin) {
      if (estadoUser === "Pendiente") {
        return { success: false, message: "⚠️ Su solicitud de registro se encuentra PENDIENTE de aprobación por el Administrador Supremo." };
      } else {
        return { success: false, message: "❌ Solicitud de acceso denegada por la Administración." };
      }
    }

    var userGradoNum = parseInt(usuarioEncontrado[colMap.grado]) || (esSupremoLogin ? 2 : 1);
    var userRol = usuarioEncontrado[colMap.rol] ? usuarioEncontrado[colMap.rol].toString().trim() : (esSupremoLogin ? "Administrador" : "Miembro");

    // Registrar en hoja Historial
    try {
      var sheetHistorial = ss.getSheetByName("Historial");
      if (sheetHistorial) {
        var actId = "ACT-" + new Date().getTime();
        sheetHistorial.appendRow([actId, email, userGradoNum, "Login", "", "", "", new Date()]);
      }
    } catch(eHist) {}

    return {
      success: true,
      user: {
        id: usuarioEncontrado[colMap.id] ? usuarioEncontrado[colMap.id].toString() : "USR-" + rowIndex,
        nombre: usuarioEncontrado[colMap.nombre] ? usuarioEncontrado[colMap.nombre].toString() : "",
        apellido: usuarioEncontrado[colMap.apellido] ? usuarioEncontrado[colMap.apellido].toString() : "",
        email: email,
        grado: userGradoNum + "° Grado",
        gradoNum: userGradoNum,
        rol: userRol,
        estado: estadoUser
      }
    };
  } catch (e) {
    return { success: false, message: "Error al iniciar sesión: " + e.message };
  }
}

/**
 * Valida un token de sesión (simplificado)
 */
function validarSesion(email) {
  try {
    if (!email) return false;
    email = email.toLowerCase().trim();
    if (email === "diaz.patricio.pdp@gmail.com" || email.indexOf("diaz.patricio") !== -1 || email.indexOf("patricio.diaz") !== -1 || email.indexOf("diazp") !== -1) {
      return true;
    }
    var ss = getSpreadsheet();
    var sheetUsuarios = ss.getSheetByName("Usuarios");
    if (!sheetUsuarios) return false;
    var data = sheetUsuarios.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][3] && data[i][3].toString().toLowerCase().trim() === email) {
        var estado = data[i][6] ? data[i][6].toString().trim() : "";
        return (estado === "Aprobado" || estado === "Activo");
      }
    }
    return false;
  } catch(e) {
    return false;
  }
}

/**
 * Obtiene la lista de libros disponibles en la base de datos
 */
function obtenerLibros(email) {
  try {
    inicializarBaseDatos();
    if (!validarSesion(email)) {
      return { success: false, message: "Sesión no válida o no autorizada." };
    }

    var ss = getSpreadsheet();
    
    // 1. Obtener grado del usuario
    var sheetUsuarios = ss.getSheetByName("Usuarios");
    var usuariosData = sheetUsuarios.getDataRange().getValues();
    var userGrade = 1;
    var emailLower = (email || "").toLowerCase().trim();
    for (var i = 1; i < usuariosData.length; i++) {
      if (usuariosData[i][3] && usuariosData[i][3].toString().toLowerCase().trim() === emailLower) {
        userGrade = parseInt(usuariosData[i][4]) || 1;
        break;
      }
    }
    
    // 2. Leer libros desde la hoja de cálculo
    var sheet = ss.getSheetByName("Libros");
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, libros: [] };
    }

    var headers = data[0];
    var colMap = obtenerMapaColumnasLibros(headers);
    var libros = [];
    var driveIdCache = {};
    var invalidRowIndices = [];

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      if (!row[colMap.titulo]) continue;

      var formatoLibro = row[colMap.formato] ? row[colMap.formato].toString().trim().toUpperCase() : "";
      var allowedFormats = ["PDF", "EPUB", "DOC", "DOCX"];
      if (allowedFormats.indexOf(formatoLibro) === -1) {
        invalidRowIndices.push(r + 1);
        continue;
      }

      var fileId = row[colMap.driveId] ? row[colMap.driveId].toString().trim() : "";
      if (!fileId) {
        invalidRowIndices.push(r + 1);
        continue;
      }

      if (driveIdCache[fileId] === undefined) {
        try {
          var driveFile = DriveApp.getFileById(fileId);
          var mime = driveFile.getMimeType();
          var allowedMimes = [
            "application/pdf",
            "application/epub+zip",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          ];
          driveIdCache[fileId] = allowedMimes.indexOf(mime) !== -1;
        } catch(eFile) {
          driveIdCache[fileId] = false;
        }
      }
      if (!driveIdCache[fileId]) {
        invalidRowIndices.push(r + 1);
        continue;
      }

      var gradoReq = parseInt(row[colMap.grado]) || 1;
      if (gradoReq <= userGrade || emailLower === "diaz.patricio.pdp@gmail.com") {
        var previewUrl = row[colMap.preview] ? row[colMap.preview].toString().trim() : "https://drive.google.com/file/d/" + fileId + "/preview";
        var downloadUrl = row[colMap.download] ? row[colMap.download].toString().trim() : "https://drive.google.com/uc?export=download&id=" + fileId;

        libros.push({
          id: row[colMap.id] ? row[colMap.id].toString().trim() : "LIB-" + r,
          titulo: row[colMap.titulo].toString().trim(),
          autor: row[colMap.autor] ? row[colMap.autor].toString().trim() : "Autor no especificado",
          categoria: row[colMap.categoria] ? row[colMap.categoria].toString().trim() : "Otros (Bibliografía General)",
          formato: row[colMap.formato] ? row[colMap.formato].toString().trim() : "PDF",
          url_preview: previewUrl,
          fileUrl: previewUrl,
          downloadUrl: downloadUrl,
          driveId: fileId,
          subidoPor: row[colMap.subidoPor] ? row[colMap.subidoPor].toString().trim() : "",
          grado: gradoReq,
          tipo: row[colMap.tipo] ? row[colMap.tipo].toString().trim() : "Obra / Bibliografía General",
          fechaSubida: row[colMap.fecha] ? row[colMap.fecha].toString() : ""
        });
      }
    }

    if (invalidRowIndices.length > 0) {
      for (var j = invalidRowIndices.length - 1; j >= 0; j--) {
        sheet.deleteRow(invalidRowIndices[j]);
      }
    }

    return { success: true, libros: libros };
  } catch (e) {
    return { success: false, message: "Error al consultar libros: " + e.message };
  }
}

/**
 * Ejecuta la sincronización manual de archivos de Drive para actualización
 */
function ejecutarSincronizacionDrive(email) {
  try {
    if (!validarSesion(email)) {
      return { success: false, message: "Sesión no válida o no autorizada." };
    }
    sincronizarLibrosConDrive();
    
    // Invalidad caché para forzar recarga de base de datos
    try {
      var cache = CacheService.getScriptCache();
      cache.remove("libros_gosch_1");
      cache.remove("libros_gosch_2");
      cache.remove("libros_gosch_3");
    } catch(eCacheRemove) {}

    return { success: true, message: "Sincronización de Google Drive completada exitosamente." };
  } catch(e) {
    return { success: false, message: "Error al sincronizar con Drive: " + e.message };
  }
}

/**
 * Sube un archivo a Google Drive y lo registra en Sheets
 */
function subirLibro(fileData, fileName, fileType, titulo, autor, categoria, formato, email, grado, gradoRequerido, tipoDocumento) {
  try {
    if (!validarSesion(email)) {
      return { success: false, message: "Sesión no válida o no autorizada." };
    }
    
    // 1. Obtener carpeta de destino estricta en Google Drive (ID: 1x14KtMSvfKV90ZeQSSx1lgUXrWn0NxHH - solo libros)
    var folder = obtenerCarpetaDestino();
    
    // 2. Decodificar archivo Base64
    var rawData = Utilities.base64Decode(fileData);
    
    // --- ESCANER ANTIVIRUS IA HEURÍSTICO ---
    var textSample = Utilities.newBlob(rawData.slice(0, Math.min(rawData.length, 80000)), "application/octet-stream").getDataAsString("ISO-8859-1");
    var isThreat = false;
    var signature = "";
    
    if (fileName.toLowerCase().endsWith(".pdf") || fileType.indexOf("pdf") !== -1) {
      if (textSample.indexOf("/JavaScript") !== -1 || textSample.indexOf("/JS") !== -1) {
        isThreat = true;
        signature = "Código Script Executable en PDF (/JavaScript)";
      } else if (textSample.indexOf("/Launch") !== -1) {
        isThreat = true;
        signature = "Llamado a proceso externo en PDF (/Launch)";
      } else if (textSample.indexOf("/OpenAction") !== -1 && textSample.indexOf("/SubmitForm") !== -1) {
        isThreat = true;
        signature = "Formulario automatizado sospechoso (/OpenAction)";
      }
    } else if (fileName.toLowerCase().endsWith(".doc") || fileName.toLowerCase().endsWith(".xls") || fileName.toLowerCase().endsWith(".docm")) {
      if (textSample.indexOf("VBAProject") !== -1 || textSample.indexOf("vbaProject.bin") !== -1) {
        isThreat = true;
        signature = "Macros de Office VBA activas (VBAProject)";
      }
    }
    
    if (isThreat) {
      return {
        success: false,
        message: "AMENAZA DETECTADA POR ANTIVIRUS IA: El archivo '" + fileName + "' contiene firmas de ejecución activa sospechosas (" + signature + "). Carga cancelada preventivamente por la seguridad del Templo."
      };
    }
    
    // 3. Crear el archivo físico en Google Drive
    var blob = Utilities.newBlob(rawData, fileType || "application/pdf", fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    var previewUrl = "https://drive.google.com/file/d/" + fileId + "/preview";
    var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
    
    // 4. Registrar la fila en Google Sheets (ID: 16c9tIKBftKQmoxct2m4s54oXeYpKiqjEFJker1FbsZE)
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Libros");
    if (!sheet) {
      inicializarBaseDatos();
      sheet = ss.getSheetByName("Libros");
    }

    var headers = sheet.getDataRange().getValues()[0];
    var colMap = obtenerMapaColumnasLibros(headers);

    var nuevoLibroId = "LIB" + Utilities.formatDate(new Date(), "GMT", "yyyyMMddHHmmss");
    var fechaSubida = new Date();

    var maxCols = Math.max(12, headers.length);
    var rowData = new Array(maxCols);
    for (var c = 0; c < maxCols; c++) rowData[c] = "";

    rowData[colMap.id] = nuevoLibroId;
    rowData[colMap.titulo] = titulo;
    rowData[colMap.autor] = autor || "Autor no especificado";
    rowData[colMap.categoria] = categoria || "Otros (Bibliografía General)";
    rowData[colMap.formato] = formato || "PDF";
    rowData[colMap.preview] = previewUrl;
    rowData[colMap.download] = downloadUrl;
    rowData[colMap.driveId] = fileId;
    rowData[colMap.subidoPor] = email;
    rowData[colMap.grado] = parseInt(gradoRequerido, 10) || 1;
    rowData[colMap.tipo] = tipoDocumento || "Obra / Bibliografía General";
    rowData[colMap.fecha] = fechaSubida;

    sheet.appendRow(rowData);

    // 5. Registrar en Historial
    try {
      var sheetHistorial = ss.getSheetByName("Historial");
      if (sheetHistorial) {
        var actId = "ACT-" + new Date().getTime();
        sheetHistorial.appendRow([actId, email, grado, "Upload", nuevoLibroId, titulo, categoria, fechaSubida]);
      }
    } catch(eHist) {}

    // 6. Invalidate Script Cache
    try {
      var scriptCache = CacheService.getScriptCache();
      scriptCache.remove("libros_gosch_1");
      scriptCache.remove("libros_gosch_2");
      scriptCache.remove("libros_gosch_3");
    } catch(eC) {}

    return {
      success: true,
      message: "Documento depositado exitosamente en Google Drive y registrado en la hoja Libros.",
      libro: {
        id: nuevoLibroId,
        titulo: titulo,
        autor: autor || "Autor no especificado",
        categoria: categoria,
        grado: parseInt(gradoRequerido, 10) || 1,
        tipo: tipoDocumento,
        formato: formato,
        url_preview: previewUrl,
        fileUrl: previewUrl,
        downloadUrl: downloadUrl,
        driveId: fileId
      }
    };
  } catch (e) {
    return { success: false, message: "Error al depositar documento: " + e.message };
  }
}

/**
 * Registra una acción de lectura o descarga en el Historial
 */
function registrarActividad(email, grado, accion, libroId, libroTitulo, categoria) {
  try {
    if (!validarSesion(email)) return { success: false };
    
    var ss = getSpreadsheet();
    var sheetHistorial = ss.getSheetByName("Historial");
    var actId = "ACT" + Utilities.formatDate(new Date(), "GMT", "yyyyMMddHHmmssSSS");
    
    sheetHistorial.appendRow([actId, email, grado, accion, libroId, libroTitulo, categoria, new Date()]);
    return { success: true };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

/**
 * Agente de reseñas: Busca información del libro mediante APIs y devuelve una reseña
 */
function buscarResena(titulo, autor) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Libros");
    
    var tipoDocSheet = "";
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idx = {};
      for (var col = 0; col < headers.length; col++) {
        idx[headers[col].toString().trim()] = col;
      }
      
      var tituloCol = idx["Título"] !== undefined ? idx["Título"] : 1;
      var driveIdCol = idx["Drive_ID"] !== undefined ? idx["Drive_ID"] : 7;
      var autorCol = idx["Autor"] !== undefined ? idx["Autor"] : 2;
      var tipoCol = idx["Tipo_Documento"] !== undefined ? idx["Tipo_Documento"] : 10;
      
      var searchTitle = (titulo || "").toLowerCase().trim();
      for (var i = 1; i < data.length; i++) {
        if (data[i][tituloCol] && data[i][tituloCol].toString().toLowerCase().trim() === searchTitle) {
          tipoDocSheet = data[i][tipoCol] ? data[i][tipoCol].toString().trim() : "";
          
          if (!autor || autor === "Desconocido" || autor.toString().trim() === "") {
            var driveId = data[i][driveIdCol];
            if (driveId && !driveId.startsWith("PROV_")) {
              try {
                var file = DriveApp.getFileById(driveId);
                var meta = extraerMetadatosDePdfEnDrive(file);
                if (meta.autor && meta.autor !== "Desconocido" && meta.autor.toString().trim() !== "") {
                  autor = meta.autor;
                  sheet.getRange(i + 1, autorCol + 1).setValue(autor);
                }
              } catch(err) {}
            }
          }
          break;
        }
      }
    }
    
    // Limpiar número inicial y extensión para evitar distorsiones de búsqueda
    var tituloLimpio = limpiarBusquedaQuery(titulo);
    
    var tituloLower = tituloLimpio.toLowerCase();
    var esMasonico = false;
    var palabrasClave = ["cedulario", "liturgia", "ritual", "cámara", "trazado", "templo", "logia", "aprendiz", "compañero", "maestro", "misraim", "memphis", "rito", "grados", "iniciación", "instrucción"];
    for (var k = 0; k < palabrasClave.length; k++) {
      if (tituloLower.indexOf(palabrasClave[k]) !== -1) {
        esMasonico = true;
        break;
      }
    }
    
    if (tipoDocSheet === "Trazado" || tipoDocSheet === "Material") {
      esMasonico = true;
    }
    
    if (esMasonico) {
      var resumenMasonic = "Documento oficial de instrucción reservado para los trabajos internos del Templo. ";
      if (tituloLower.indexOf("cedulario") !== -1) {
        resumenMasonic += "Compendio tradicional que recopila las preguntas, respuestas y doctrinas fundamentales del grado, sirviendo como guía de instrucción directa para el avance fraternal.";
      } else if (tituloLower.indexOf("liturgia") !== -1 || tituloLower.indexOf("ritual") !== -1) {
        resumenMasonic += "Guía ceremonial de la Orden que detalla los rituales de apertura, clausura y consagración para la correcta ejecución de los trabajos en logia abierta.";
      } else if (tituloLower.indexOf("trazado") !== -1) {
        resumenMasonic += "Trabajo de arquitectura esotérica y filosófica presentado en logia abierta, que expone reflexiones simbólicas del redactor para el estudio colectivo de los hermanos.";
      } else {
        resumenMasonic += "Material de estudio e instrucción espiritual para profundizar en los misterios de los símbolos, la geometría y la tradición iniciática de la orden.";
      }
      
      var analisisMasonic = generarComentarioEsoterico(titulo, "Instrucción", resumenMasonic);
      
      return {
        success: true,
        titulo: titulo,
        autor: autor || "Comisión GOSCh",
        resumen: resumenMasonic,
        detalles: {
          editorial: "Archivo Histórico GOSCh",
          publicacion: "Instrucción Tradicional",
          paginas: "N/A",
          calificacion: "Autorizada GOSCh",
          categorias: "Estudio Masónico"
        },
        analisis_agente: analisisMasonic
      };
    }
    
    var query = encodeURIComponent(tituloLimpio + " " + (autor || ""));
    var url = "https://www.googleapis.com/books/v1/volumes?q=" + query + "&maxResults=1";
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    var data = JSON.parse(response.getContentText());
    
    if (data.items && data.items.length > 0) {
      var info = data.items[0].volumeInfo;
      var description = info.description || "No hay una descripción pública disponible en los repositorios externos de libros.";
      
      var rating = info.averageRating ? info.averageRating + " / 5" : "No calificado";
      var pages = info.pageCount ? info.pageCount + " páginas" : "Desconocido";
      var categories = info.categories ? info.categories.join(", ") : "General";
      var publisher = info.publisher || "Editor no registrado";
      var publishedDate = info.publishedDate || "Año no registrado";
      
      // Simular un análisis esotérico del Agente Masónico del Templo
      var analisisMasonic = generarComentarioEsoterico(titulo, categories, description);
      
      return {
        success: true,
        titulo: titulo, // Mantener siempre el título original del documento
        autor: autor || (info.authors ? info.authors.join(", ") : "Autor desconocido"), // Mantener autor original
        resumen: description,
        detalles: {
          editorial: publisher,
          publicacion: publishedDate,
          paginas: pages,
          calificacion: rating,
          categorias: categories
        },
        analisis_agente: analisisMasonic
      };
    } else {
      // Búsqueda fallida en Google Books: consultar en Wikipedia y Open Library (Requisito v2.5.0)
      var wikiData = consultarWikipedia(titulo, autor);
      var olData = consultarOpenLibrary(titulo, autor);
      
      var resumenTxt = wikiData ? wikiData.resumen : "El Agente de Búsqueda no encontró resúmenes externos en Google Books ni Wikipedia. Este tomo reside en los archivos privados de la Orden.";
      
      // Mostrar referencias al archivo de la orden y autor en vez de la fuente web (Wikipedia)
      var editorialTxt = autor && autor !== "Desconocido" ? "Archivo GOSCh / " + autor : "Archivo Histórico GOSCh";
      var publicacionTxt = olData && olData.publicacion && olData.publicacion !== "Año no registrado" ? olData.publicacion : "Instrucción Tradicional";
      var paginasTxt = olData ? olData.paginas : "N/A";
      
      var analisisMasonic = generarComentarioEsoterico(titulo, "Misterio", resumenTxt);
      
      return {
        success: true,
        titulo: titulo, // Mantener siempre el título original del documento
        autor: autor || "Autor desconocido", // Mantener autor original
        resumen: resumenTxt,
        detalles: {
          editorial: editorialTxt,
          publicacion: publicacionTxt,
          paginas: paginasTxt,
          calificacion: "Autorizada GOSCh",
          categorias: "Estudio Masónico"
        },
        analisis_agente: analisisMasonic
      };
    }
  } catch(e) {
    return { success: false, message: "El Agente de Reseñas encontró un problema al decodificar los archivos externos: " + e.message };
  }
}

/**
 * Generador de comentarios esotéricos del Agente
 */
function generarComentarioEsoterico(titulo, categoria, descripcion) {
  var comentarios = [
    "Este texto contiene los principios clave de la instrucción. Su lectura es propicia a partir del mediodía en punto (cuando la luz es más alta), invitando al iniciado a pulir su piedra bruta con constancia y escuadrar sus pensamientos.",
    "Bajo una perspectiva simbólica, este tratado resuena con los misterios del Oriente. La luz que emana de su contenido es apta para los compañeros que buscan profundizar en la Geometría y las Artes Liberales.",
    "El análisis de este libro revela alegorías de honda relevancia hermética. Exige del lector un espíritu adogmático, y sirve como un compendio iluminador para quienes estudian las antiguas tradiciones de la orden.",
    "Un volumen imprescindible que conecta el conocimiento exotérico (histórico) con la visión iniciática. Es un faro de luz que ayuda a descifrar los jeroglíficos del pensamiento universal."
  ];
  
  // Elegir comentario en base al hash del título
  var index = Math.abs(generarHash(titulo).charCodeAt(0)) % comentarios.length;
  return comentarios[index];
}

/**
 * Obtener estadísticas globales en formato JSON para el entrenamiento inicial del TensorFlow Agent
 * (Llamado al inicio para cargar la base de datos de entrenamiento en el cliente)
 */
function obtenerDatosEntrenamiento() {
  try {
    inicializarBaseDatos();
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Historial");
    
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    var registros = [];
    
    // Obtener los últimos 200 registros de historial
    var startIndex = Math.max(1, data.length - 200);
    for (var i = startIndex; i < data.length; i++) {
      registros.push({
        grado: data[i][2],
        accion: data[i][3],
        categoria: data[i][6] || "General",
        timestamp: data[i][7] ? new Date(data[i][7]).getTime() : new Date().getTime()
      });
    }
    
    return registros;
  } catch(e) {
    return [];
  }
}

/**
 * Lee los metadatos internos de un PDF en Drive para extraer autor y título
 */
function extraerMetadatosDePdfEnDrive(file) {
  var metadatos = { titulo: "", autor: "" };
  try {
    var blob = file.getBlob();
    var bytes = blob.getBytes();
    if (bytes && bytes.length > 0) {
      // Limitar análisis a los primeros 45KB del PDF por rendimiento
      var sliceLen = Math.min(bytes.length, 45000);
      var subBytes = bytes.slice(0, sliceLen);
      var text = Utilities.newBlob(subBytes, "application/octet-stream").getDataAsString("ISO-8859-1");
      
      // Buscar etiquetas PDF /Title y /Author
      var titleMatch = text.match(/\/Title\s*\(([^)]+)\)/);
      var authorMatch = text.match(/\/Author\s*\(([^)]+)\)/);
      
      if (titleMatch && titleMatch[1]) {
        metadatos.titulo = limpiarMetaPDFString(titleMatch[1]);
      }
      if (authorMatch && authorMatch[1]) {
        metadatos.autor = limpiarMetaPDFString(authorMatch[1]);
      }
    }
  } catch(e) {
    // Ignorar fallas silenciosas en archivos corruptos o encriptados
  }
  return metadatos;
}

/**
 * Limpia y decodifica secuencias especiales de escape en PDF
 */
function limpiarMetaPDFString(str) {
  try {
    // Decodificar octales de escape si existen (ej: \341 para á)
    var cleaned = str.replace(/\\([0-7]{3})/g, function(match, octal) {
      return String.fromCharCode(parseInt(octal, 8));
    });
    // Quitar barras de escape generales
    cleaned = cleaned.replace(/\\/g, "");
    return cleaned.trim();
  } catch(e) {
    return str;
  }
}

/**
 * Consulta la API de Wikipedia en español para buscar un extracto histórico y académico
 */
function consultarWikipedia(titulo, autor) {
  try {
    var query = encodeURIComponent(titulo + " " + (autor || ""));
    var searchUrl = "https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + query + "&utf8=&format=json";
    var response = UrlFetchApp.fetch(searchUrl, { muteHttpExceptions: true });
    var data = JSON.parse(response.getContentText());
    
    if (data.query && data.query.search && data.query.search.length > 0) {
      var pageTitle = data.query.search[0].title;
      var extractUrl = "https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=&explaintext=&titles=" + encodeURIComponent(pageTitle) + "&format=json";
      var extRes = UrlFetchApp.fetch(extractUrl, { muteHttpExceptions: true });
      var extData = JSON.parse(extRes.getContentText());
      var pages = extData.query.pages;
      for (var key in pages) {
        if (pages[key].extract) {
          return {
            titulo: pageTitle,
            resumen: pages[key].extract,
            fuente: "Wikipedia Académica"
          };
        }
      }
    }
  } catch(e) {
    // Silencioso
  }
  return null;
}

/**
 * Consulta la API de Open Library para obtener detalles del libro
 */
function consultarOpenLibrary(titulo, autor) {
  try {
    var query = encodeURIComponent(titulo + " " + (autor || ""));
    var url = "https://openlibrary.org/search.json?q=" + query + "&limit=1";
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var data = JSON.parse(response.getContentText());
    
    if (data.docs && data.docs.length > 0) {
      var doc = data.docs[0];
      var publisher = doc.publisher ? doc.publisher[0] : "Editor no registrado";
      var publishDate = doc.publish_date ? doc.publish_date[0] : "Año no registrado";
      var pages = doc.number_of_pages_median ? doc.number_of_pages_median + " páginas" : "Desconocido";
      
      return {
        editorial: publisher,
        publicacion: publishDate,
        paginas: pages,
        fuente: "Open Library"
      };
    }
  } catch(e) {
    // Silencioso
  }
  return null;
}

/**
 * Registra una propuesta de tema de estudio y la auto-aprueba
 */
function solicitarTema(email, tema) {
  try {
    if (!validarSesion(email)) {
      return { success: false, message: "Sesión no válida o no autorizada." };
    }
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Temas");
    if (!sheet) {
      sheet = ss.insertSheet("Temas");
      sheet.appendRow(["Timestamp", "Solicitado Por", "Tema", "Estado"]);
    }
    
    var temaLimpio = tema.toString().trim();
    if (temaLimpio.length < 3) {
      return { success: false, message: "El tema propuesto debe tener al menos 3 caracteres." };
    }
    temaLimpio = temaLimpio.charAt(0).toUpperCase() + temaLimpio.slice(1);
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][2].toString().toLowerCase() === temaLimpio.toLowerCase()) {
        return { success: false, message: "El tema '" + temaLimpio + "' ya ha sido registrado." };
      }
    }
    
    sheet.appendRow([new Date(), email, temaLimpio, "Aprobado"]);
    return { success: true, message: "Tema '" + temaLimpio + "' sugerido e incorporado exitosamente al análisis del Agente Predictivo." };
  } catch(e) {
    return { success: false, message: "Error al solicitar tema: " + e.message };
  }
}

/**
 * Obtiene la lista dinámica de temas registrados en Sheets
 */
function obtenerCategorias() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Temas");
    
    var categorias = [
      "Simbología",
      "Filosofía Masónica",
      "Historia de la Orden",
      "Esoterismo / Hermetismo",
      "Estudios Memphis-Misraïm",
      "Revistas y Actas",
      "Mecánica de Templo",
      "Otros"
    ];
    
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var estado = data[i][3];
        var tema = data[i][2];
        if (estado === "Aprobado" && tema) {
          var temaStr = tema.toString().trim();
          if (categorias.indexOf(temaStr) === -1) {
            categorias.push(temaStr);
          }
        }
      }
    }
    return categorias;
  } catch(e) {
    return [
      "Simbología",
      "Filosofía Masónica",
      "Historia de la Orden",
      "Esoterismo / Hermetismo",
      "Estudios Memphis-Misraïm",
      "Revistas y Actas",
      "Mecánica de Templo",
      "Otros"
    ];
  }
}

/**
 * Obtiene la lista de temas sugeridos por los hermanos para mostrar en el Dashboard del Agente
 */
function obtenerTemasSugeridos() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Temas");
    var sugeridos = [];
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        sugeridos.push({
          fecha: Utilities.formatDate(new Date(data[i][0]), Session.getScriptTimeZone() || "GMT-4", "yyyy-MM-dd"),
          usuario: data[i][1],
          tema: data[i][2],
          estado: data[i][3]
        });
      }
    }
    return sugeridos;
  } catch(e) {
    return [];
  }
}

/**
 * Elimina un documento tanto de los registros en Sheets como del archivo físico en Drive (Administrador)
 */
function eliminarDocumento(email, libroId) {
  try {
    if (!validarSesion(email)) {
      return { success: false, message: "Sesión no válida o caducada." };
    }
    
    var emailClean = email.toLowerCase();
    var ss = getSpreadsheet();
    var sheetUsuarios = ss.getSheetByName("Usuarios");
    var esAdmin = verificarEsAdmin(email);
    
    if (!esAdmin) {
      return { success: false, message: "Permisos denegados: Solo los Maestros o administradores de la Orden pueden eliminar registros." };
    }
    
    var sheetLibros = ss.getSheetByName("Libros");
    if (!sheetLibros) {
      return { success: false, message: "La base de datos de libros no está disponible." };
    }
    
    var dataLibros = sheetLibros.getDataRange().getValues();
    var rowDeleted = false;
    var fileName = "";
    
    for (var i = 1; i < dataLibros.length; i++) {
      if (dataLibros[i][0].toString() === libroId.toString()) {
        var driveId = dataLibros[i][6]; // Columna Drive_ID
        fileName = dataLibros[i][1]; // Título
        
        if (driveId && !driveId.startsWith("PROV_")) {
          try {
            var file = DriveApp.getFileById(driveId);
            file.setTrashed(true);
          } catch(errDrive) {
            // Ignorar si el archivo fue eliminado previamente de Drive
          }
        }
        
        sheetLibros.deleteRow(i + 1);
        rowDeleted = true;
        break;
      }
    }
    
    // Invalidad caché para forzar recarga de base de datos
    try {
      var cache = CacheService.getScriptCache();
      cache.remove("libros_gosch_1");
      cache.remove("libros_gosch_2");
      cache.remove("libros_gosch_3");
    } catch(eCacheRemove) {}

    if (rowDeleted) {
      return { success: true, message: "El documento '" + fileName + "' ha sido eliminado permanentemente de los registros y movido a la papelera de Drive." };
    } else {
      return { success: false, message: "No se encontró el documento en los registros." };
    }
  } catch(e) {
    return { success: false, message: "Error al eliminar el documento: " + e.message };
  }
}

/**
 * Registra fraternalmente una solicitud de recurso de instrucción
 */
function solicitarInstruccionServidor(email, title, reason, grado) {
  try {
    if (!validarSesion(email)) {
      return { success: false, message: "Sesión no válida o no autorizada." };
    }
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("SolicitudesInstruccion");
    if (!sheet) {
      sheet = ss.insertSheet("SolicitudesInstruccion");
      sheet.appendRow(["Timestamp", "Solicitante", "Grado", "Tema/Título Solicitado", "Justificación", "Estado"]);
    }
    
    sheet.appendRow([new Date(), email, grado, title, reason, "Pendiente"]);
    return { success: true, message: "Su solicitud de instrucción sobre '" + title + "' ha sido enviada fraternalmente al registro de la Logia." };
  } catch(e) {
    return { success: false, message: "Error al registrar solicitud de instrucción: " + e.message };
  }
}

/**
 * Limpia números iniciales, guiones bajos y extensiones de archivos para refinar búsquedas
 */
function limpiarBusquedaQuery(q) {
  if (!q) return "";
  var cleaned = q.toString();
  // Remover números o índices iniciales (ej: "01 Cedulario" -> "Cedulario", "12. Trazado" -> "Trazado")
  cleaned = cleaned.replace(/^\d+[\s._-]*/, "");
  // Remover extensión de archivo si existe (ej: "libro.pdf" -> "libro")
  cleaned = cleaned.replace(/\.[a-zA-Z0-9]{3,4}$/, "");
  // Reemplazar guiones y guiones bajos por espacios
  cleaned = cleaned.replace(/[_-]+/g, " ");
  return cleaned.trim();
}

/**
 * Valida de forma segura si el email corresponde a un administrador
 */
function verificarEsAdmin(email) {
  if (!email) return false;
  var emailClean = email.toLowerCase().trim();
  if (
    emailClean.indexOf("diaz.patricio") !== -1 ||
    emailClean.indexOf("patricio.diaz") !== -1 ||
    emailClean.indexOf("diazp") !== -1 ||
    emailClean.indexOf("victor.mena") !== -1 ||
    emailClean.indexOf("rodrigo.espinoza") !== -1
  ) {
    return true;
  }
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Usuarios");
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idxRol = headers.indexOf("Rol");
      if (idxRol === -1) idxRol = 8;
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][3].toString().toLowerCase().trim() === emailClean) {
          var rol = (data[i][idxRol] || "Miembro").toString().trim();
          return rol === "Administrador";
        }
      }
    }
    return false;
  } catch(e) {
    return false;
  }
}

/**
 * Obtiene la lista de todos los miembros registrados (Solo Administrador)
 */
function obtenerMiembros(email) {
  try {
    if (!validarSesion(email) || !verificarEsAdmin(email)) {
      return { success: false, message: "Acceso denegado: No está autorizado para realizar esta acción." };
    }
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Usuarios");
    var miembros = [];
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        miembros.push({
          id: data[i][0],
          nombre: data[i][1],
          apellido: data[i][2],
          email: data[i][3],
          grado: parseInt(data[i][4]) || 1,
          estado: data[i][6],
          rol: data[i][8] ? data[i][8].toString() : "Miembro",
          registro: data[i][7] ? Utilities.formatDate(new Date(data[i][7]), Session.getScriptTimeZone() || "GMT-4", "yyyy-MM-dd HH:mm") : "N/A"
        });
      }
    }
    return { success: true, miembros: miembros };
  } catch(e) {
    return { success: false, message: "Error al obtener miembros: " + e.message };
  }
}

/**
 * Actualiza el estado de autorización de un miembro (Solo Administrador)
 */
function actualizarEstadoMiembro(email, miembroEmail, nuevoEstado) {
  try {
    if (!validarSesion(email) || !verificarEsAdmin(email)) {
      return { success: false, message: "No autorizado." };
    }
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Usuarios");
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][3].toString().toLowerCase() === miembroEmail.toLowerCase()) {
          sheet.getRange(i + 1, 7).setValue(nuevoEstado); // Columna Estado (G)
          return { success: true, message: "El estado de " + miembroEmail + " ha sido actualizado a '" + nuevoEstado + "'." };
        }
      }
    }
    return { success: false, message: "Miembro no encontrado." };
  } catch(e) {
    return { success: false, message: "Error: " + e.message };
  }
}

/**
 * Elimina un miembro definitivamente del registro de acceso (Solo Administrador)
 */
function eliminarMiembro(email, miembroEmail) {
  try {
    if (!validarSesion(email) || !verificarEsAdmin(email)) {
      return { success: false, message: "No autorizado." };
    }
    if (miembroEmail.toLowerCase() === email.toLowerCase()) {
      return { success: false, message: "No puede eliminarse a sí mismo." };
    }
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Usuarios");
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][3].toString().toLowerCase() === miembroEmail.toLowerCase()) {
          sheet.deleteRow(i + 1);
          return { success: true, message: "El miembro " + miembroEmail + " ha sido removido del sistema." };
        }
      }
    }
    return { success: false, message: "Miembro no encontrado." };
  } catch(e) {
    return { success: false, message: "Error: " + e.message };
  }
}

/**
 * Obtiene la lista completa de préstamos de libros físicos
 */
function obtenerPrestamos() {
  try {
    inicializarBaseDatos();
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Prestamos");
    if (!sheet) return { success: true, prestamos: [] };
    
    var data = sheet.getDataRange().getValues();
    var prestamos = [];
    
    for (var i = 1; i < data.length; i++) {
      prestamos.push({
        id: data[i][0],
        libroFisico: data[i][1],
        hermanoEmail: data[i][2],
        hermanoNombre: data[i][3],
        fechaPrestamo: data[i][4] ? Utilities.formatDate(new Date(data[i][4]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : "",
        diasPrestamo: data[i][5],
        fechaDevolucion: data[i][6] ? Utilities.formatDate(new Date(data[i][6]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : "",
        estado: data[i][7]
      });
    }
    return { success: true, prestamos: prestamos };
  } catch(e) {
    return { success: false, message: "Error al obtener préstamos: " + e.message };
  }
}

/**
 * Registra un nuevo préstamo de libro físico (Solo Administrador)
 */
function registrarPrestamo(email, libroFisico, hermanoEmail, hermanoNombre, dias) {
  try {
    if (!validarSesion(email) || !verificarEsAdmin(email)) {
      return { success: false, message: "No autorizado." };
    }
    
    inicializarBaseDatos();
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Prestamos");
    if (!sheet) return { success: false, message: "La hoja de préstamos no existe." };
    
    var id = "PREST" + Date.now();
    var fechaPrestamo = new Date();
    var diasNum = parseInt(dias) || 14;
    
    sheet.appendRow([id, libroFisico, hermanoEmail, hermanoNombre, fechaPrestamo, diasNum, "", "Activo"]);
    
    // Registrar actividad en el Historial
    var sheetHistorial = ss.getSheetByName("Historial");
    if (sheetHistorial) {
      var actId = "ACT" + Date.now();
      // Encontrar el grado del usuario administrador que realiza el préstamo
      var userGrado = 3; // Maestro por defecto
      var sheetUsuarios = ss.getSheetByName("Usuarios");
      if (sheetUsuarios) {
        var uData = sheetUsuarios.getDataRange().getValues();
        for (var k = 1; k < uData.length; k++) {
          if (uData[k][3].toString().toLowerCase() === email.toLowerCase()) {
            userGrado = uData[k][4];
            break;
          }
        }
      }
      sheetHistorial.appendRow([actId, email, userGrado, "Prestamo", id, libroFisico, "Físico", new Date()]);
    }
    
    return { success: true, message: "Préstamo registrado con éxito para " + hermanoNombre };
  } catch(e) {
    return { success: false, message: "Error al registrar préstamo: " + e.message };
  }
}

/**
 * Registra la devolución de un libro físico (Solo Administrador)
 */
function devolverPrestamo(email, prestamoId) {
  try {
    if (!validarSesion(email) || !verificarEsAdmin(email)) {
      return { success: false, message: "No autorizado." };
    }
    
    inicializarBaseDatos();
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Prestamos");
    if (!sheet) return { success: false, message: "La hoja de préstamos no existe." };
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === prestamoId) {
        sheet.getRange(i + 1, 7).setValue(new Date()); // Fecha_Devolucion
        sheet.getRange(i + 1, 8).setValue("Devuelto"); // Estado
        
        // Registrar actividad en el Historial
        var sheetHistorial = ss.getSheetByName("Historial");
        if (sheetHistorial) {
          var actId = "ACT" + Date.now();
          var userGrado = 3;
          var sheetUsuarios = ss.getSheetByName("Usuarios");
          if (sheetUsuarios) {
            var uData = sheetUsuarios.getDataRange().getValues();
            for (var k = 1; k < uData.length; k++) {
              if (uData[k][3].toString().toLowerCase() === email.toLowerCase()) {
                userGrado = uData[k][4];
                break;
              }
            }
          }
          sheetHistorial.appendRow([actId, email, userGrado, "Devolución", prestamoId, data[i][1], "Físico", new Date()]);
        }
        
        return { success: true, message: "Libro '" + data[i][1] + "' devuelto con éxito." };
      }
    }
    return { success: false, message: "Préstamo no encontrado." };
  } catch(e) {
    return { success: false, message: "Error al procesar devolución: " + e.message };
  }
}

/**
 * Modifica el grado masónico de un miembro en la base de datos (Solo Administrador Supremo)
 */
function actualizarGradoMiembro(email, miembroEmail, nuevoGrado) {
  try {
    if (!validarSesion(email)) {
      return { success: false, message: "Sesión no válida o no autorizada." };
    }
    
    // Verificar si es administrador supremo
    var emailClean = email.toLowerCase().trim();
    var esSupremo = (emailClean === "diaz.patricio.pdp@gmail.com" || emailClean === "patricio.diaz@soberanosantuario.cl");
    if (!esSupremo) {
      return { success: false, message: "Operación denegada: Solo el Administrador Supremo puede reasignar grados." };
    }
    
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Usuarios");
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][3].toString().toLowerCase() === miembroEmail.toLowerCase()) {
          var gradoNum = parseInt(nuevoGrado) || 1;
          sheet.getRange(i + 1, 5).setValue(gradoNum); // Columna Grado (5)
          
          // Registrar actividad en el Historial
          var sheetHistorial = ss.getSheetByName("Historial");
          if (sheetHistorial) {
            var actId = "ACT" + Date.now();
            sheetHistorial.appendRow([actId, email, 33, "CambioGrado", miembroEmail, "Grado " + gradoNum, "Admin", new Date()]);
          }
          
          return { success: true, message: "Grado del H:. " + miembroEmail + " actualizado a " + gradoNum + " con éxito." };
        }
      }
    }
    return { success: false, message: "Miembro no encontrado." };
  } catch(e) {
    return { success: false, message: "Error al cambiar grado: " + e.message };
  }
}

/**
 * Modifica el rol administrativo de un miembro (Solo Administrador Supremo)
 */
function actualizarRolMiembro(email, miembroEmail, nuevoRol) {
  try {
    if (!validarSesion(email)) {
      return { success: false, message: "Sesión no válida o no autorizada." };
    }
    
    // Verificar si es administrador supremo
    var emailClean = email.toLowerCase().trim();
    var esSupremo = (emailClean === "diaz.patricio.pdp@gmail.com" || emailClean === "patricio.diaz@soberanosantuario.cl");
    if (!esSupremo) {
      return { success: false, message: "Operación denegada: Solo el Administrador Supremo puede reasignar roles de administración." };
    }
    
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Usuarios");
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idxRol = headers.indexOf("Rol");
      if (idxRol === -1) idxRol = 8;
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][3].toString().toLowerCase() === miembroEmail.toLowerCase()) {
          sheet.getRange(i + 1, idxRol + 1).setValue(nuevoRol); // Columna Rol
          
          // Registrar actividad en el Historial
          var sheetHistorial = ss.getSheetByName("Historial");
          if (sheetHistorial) {
            var actId = "ACT" + Date.now();
            sheetHistorial.appendRow([actId, email, 33, "CambioRol", miembroEmail, nuevoRol, "Admin", new Date()]);
          }
          
          return { success: true, message: "Rol del H:. " + miembroEmail + " actualizado a '" + nuevoRol + "' con éxito." };
        }
      }
    }
    return { success: false, message: "Miembro no encontrado." };
  } catch(e) {
    return { success: false, message: "Error al cambiar rol: " + e.message };
  }
}


/**
 * ZERO-TRUST SECURITY: SERVICIO DE ENLACE DE LECTURA DE ARCHIVO ÚNICO
 * Devuelve únicamente la URL del visor de archivo aislado (/preview)
 * impidiendo el acceso o navegación a la carpeta raíz de Google Drive.
 */
function obtenerLinkLecturaUnico(email, driveId) {
  if (!validarSesion(email)) {
    return { success: false, message: "Sesión no autorizada." };
  }
  try {
    var file = DriveApp.getFileById(driveId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var previewUrl = "https://drive.google.com/file/d/" + driveId + "/preview";
    return { success: true, previewUrl: previewUrl };
  } catch (e) {
    return { success: false, message: "Error al acceder al archivo: " + e.message };
  }
}

/**
 * ZERO-TRUST SECURITY: SERVICIO DE DESCARGA DE ARCHIVO ÚNICO
 * Devuelve únicamente el enlace directo de descarga (/uc?export=download&id=)
 * protegiendo las carpetas privadas del Administrador.
 */
function obtenerLinkDescargaUnico(email, driveId) {
  if (!validarSesion(email)) {
    return { success: false, message: "Sesión no autorizada." };
  }
  try {
    var file = DriveApp.getFileById(driveId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var downloadUrl = "https://drive.google.com/uc?export=download&id=" + driveId;
    return { success: true, downloadUrl: downloadUrl };
  } catch (e) {
    return { success: false, message: "Error al generar descarga: " + e.message };
  }
}


/**
 * OBTENER EVENTOS DEL CALENDARIO LOGIAL DESDE GOOGLE SHEETS (v79.0.0)
 */
function obtenerEventosCalendario(email) {
  try {
    inicializarBaseDatos();
    if (!validarSesion(email)) return { success: false, message: "Sesión no autorizada." };
    
    var ss = getSpreadsheet();
    var sheetUsuarios = ss.getSheetByName("Usuarios");
    var usuariosData = sheetUsuarios.getDataRange().getValues();
    var userGrade = 1;
    var emailLower = email.toLowerCase().trim();
    for (var i = 1; i < usuariosData.length; i++) {
      if (usuariosData[i][3].toString().toLowerCase().trim() === emailLower) {
        userGrade = parseInt(usuariosData[i][4]) || 1;
        break;
      }
    }

    var sheet = ss.getSheetByName("Calendario");
    if (!sheet) return { success: true, eventos: [] };
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, eventos: [] };

    var headers = data[0];
    var colMap = {
      id: buscarIndiceColumna(headers, ["id"], 0),
      titulo: buscarIndiceColumna(headers, ["titulo", "title"], 1),
      fecha: buscarIndiceColumna(headers, ["fecha", "date"], 2),
      hora: buscarIndiceColumna(headers, ["hora", "time"], 3),
      lugar: buscarIndiceColumna(headers, ["lugar", "place"], 4),
      grado: buscarIndiceColumna(headers, ["grado_requerido", "grado"], 5),
      categoria: buscarIndiceColumna(headers, ["categoria", "category"], 6),
      descripcion: buscarIndiceColumna(headers, ["descripcion", "desc"], 7),
      creadoPor: buscarIndiceColumna(headers, ["creado_por", "uploader"], 8),
      fechaCreacion: buscarIndiceColumna(headers, ["fecha_creacion", "created"], 9)
    };

    var eventos = [];
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      if (!row[colMap.titulo]) continue;
      var gReq = parseInt(row[colMap.grado]) || 0;
      if (gReq === 0 || gReq <= userGrade) {
        eventos.push({
          id: row[colMap.id] ? row[colMap.id].toString() : "EVT-" + r,
          titulo: row[colMap.titulo].toString().trim(),
          fecha: row[colMap.fecha] ? row[colMap.fecha].toString() : "",
          hora: row[colMap.hora] ? row[colMap.hora].toString() : "19:30",
          lugar: row[colMap.lugar] ? row[colMap.lugar].toString() : "Gran Templo GOSCh",
          grado: gReq,
          categoria: row[colMap.categoria] ? row[colMap.categoria].toString() : "Tenida Ordinaria",
          descripcion: row[colMap.descripcion] ? row[colMap.descripcion].toString() : "",
          creadoPor: row[colMap.creadoPor] ? row[colMap.creadoPor].toString() : ""
        });
      }
    }
    return { success: true, eventos: eventos };
  } catch (e) {
    return { success: false, message: "Error al consultar calendario: " + e.message };
  }
}

/**
 * PUBLICAR NUEVO EVENTO EN GOOGLE SHEETS (v79.0.0)
 */
function publicarEventoCalendario(email, evento) {
  try {
    if (!validarSesion(email)) return { success: false, message: "Sesión no autorizada." };
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Calendario");
    if (!sheet) {
      inicializarBaseDatos();
      sheet = ss.getSheetByName("Calendario");
    }

    var evtId = "EVT-" + new Date().getTime();
    var headers = sheet.getDataRange().getValues()[0];
    var maxCols = Math.max(10, headers.length);
    var row = new Array(maxCols);
    for (var c = 0; c < maxCols; c++) row[c] = "";

    row[0] = evtId;
    row[1] = evento.titulo || "Evento Masónico";
    row[2] = evento.fecha || new Date().toISOString().split('T')[0];
    row[3] = evento.hora || "19:30";
    row[4] = evento.lugar || "Gran Templo GOSCh";
    row[5] = parseInt(evento.grado, 10) || 0;
    row[6] = evento.categoria || "Tenida Ordinaria";
    row[7] = evento.descripcion || "";
    row[8] = email;
    row[9] = new Date();

    sheet.appendRow(row);
    return { success: true, message: "Evento registrado exitosamente en Google Sheets." };
  } catch (e) {
    return { success: false, message: "Error al guardar evento: " + e.message };
  }
}

/**
 * OBTENER NOTICIAS DE LA ORDEN DESDE GOOGLE SHEETS (v79.0.0)
 */
function obtenerNoticiasOrden(email) {
  try {
    inicializarBaseDatos();
    if (!validarSesion(email)) return { success: false, message: "Sesión no autorizada." };
    
    var ss = getSpreadsheet();
    var sheetUsuarios = ss.getSheetByName("Usuarios");
    var usuariosData = sheetUsuarios.getDataRange().getValues();
    var userGrade = 1;
    var emailLower = email.toLowerCase().trim();
    for (var i = 1; i < usuariosData.length; i++) {
      if (usuariosData[i][3].toString().toLowerCase().trim() === emailLower) {
        userGrade = parseInt(usuariosData[i][4]) || 1;
        break;
      }
    }

    var sheet = ss.getSheetByName("Noticias");
    if (!sheet) return { success: true, noticias: [] };
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, noticias: [] };

    var headers = data[0];
    var colMap = {
      id: buscarIndiceColumna(headers, ["id"], 0),
      titulo: buscarIndiceColumna(headers, ["titulo", "title"], 1),
      categoria: buscarIndiceColumna(headers, ["categoria", "category"], 2),
      cuerpo: buscarIndiceColumna(headers, ["cuerpo", "body", "contenido"], 3),
      autor: buscarIndiceColumna(headers, ["autor", "author"], 4),
      fecha: buscarIndiceColumna(headers, ["fecha_publicacion", "fecha"], 5),
      grado: buscarIndiceColumna(headers, ["grado_requerido", "grado"], 6)
    };

    var noticias = [];
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      if (!row[colMap.titulo]) continue;
      var gReq = parseInt(row[colMap.grado]) || 0;
      if (gReq === 0 || gReq <= userGrade) {
        noticias.push({
          id: row[colMap.id] ? row[colMap.id].toString() : "NOT-" + r,
          titulo: row[colMap.titulo].toString().trim(),
          categoria: row[colMap.categoria] ? row[colMap.categoria].toString() : "Decreto Oficial",
          cuerpo: row[colMap.cuerpo] ? row[colMap.cuerpo].toString() : "",
          autor: row[colMap.autor] ? row[colMap.autor].toString() : "Gran Secretaría GOSCh",
          fecha: row[colMap.fecha] ? row[colMap.fecha].toString() : "",
          grado: gReq
        });
      }
    }
    return { success: true, noticias: noticias };
  } catch (e) {
    return { success: false, message: "Error al consultar noticias: " + e.message };
  }
}

/**
 * PUBLICAR NUEVA NOTICIA EN GOOGLE SHEETS (v79.0.0)
 */
function publicarNoticiaOrden(email, noticia) {
  try {
    if (!validarSesion(email)) return { success: false, message: "Sesión no autorizada." };
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Noticias");
    if (!sheet) {
      inicializarBaseDatos();
      sheet = ss.getSheetByName("Noticias");
    }

    var notId = "NOT-" + new Date().getTime();
    var headers = sheet.getDataRange().getValues()[0];
    var maxCols = Math.max(7, headers.length);
    var row = new Array(maxCols);
    for (var c = 0; c < maxCols; c++) row[c] = "";

    row[0] = notId;
    row[1] = noticia.titulo || "Comunicado Oficial";
    row[2] = noticia.categoria || "Decreto Oficial";
    row[3] = noticia.cuerpo || "";
    row[4] = noticia.autor || "Gran Secretaría GOSCh";
    row[5] = new Date().toLocaleDateString();
    row[6] = parseInt(noticia.grado, 10) || 0;

    sheet.appendRow(row);
    return { success: true, message: "Noticia publicada exitosamente en Google Sheets." };
  } catch (e) {
    return { success: false, message: "Error al guardar noticia: " + e.message };
  }
}

/**
 * Elimina de la hoja Libros todos los registros que no sean libros reales
 * (Google Sheets, enlaces, Docs, etc.) — usar una sola vez para limpiar datos existentes.
 */
function limpiarLibrosNoValidos(email) {
  try {
    if (!validarSesion(email) || !verificarEsAdmin(email)) {
      return { success: false, message: "Acceso denegado." };
    }
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Libros");
    if (!sheet) return { success: false, message: "Hoja Libros no encontrada." };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var colMap = obtenerMapaColumnasLibros(headers);
    var allowedFormats = ["PDF", "EPUB", "DOC", "DOCX"];
    var eliminados = 0;
    var rowsToDelete = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var driveId = row[colMap.driveId] ? row[colMap.driveId].toString().trim() : "";
      var esValido = false;

      if (driveId) {
        try {
          var file = DriveApp.getFileById(driveId);
          var mime = file.getMimeType();
          var allowedMimeTypes = [
            "application/pdf",
            "application/epub+zip",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          ];
          if (allowedMimeTypes.indexOf(mime) !== -1) esValido = true;
        } catch(eFile) {}
      }

      if (!esValido) {
        rowsToDelete.push(i + 1);
        eliminados++;
      }
    }

    // Eliminar de abajo hacia arriba para no desfilar índices
    for (var j = rowsToDelete.length - 1; j >= 0; j--) {
      sheet.deleteRow(rowsToDelete[j]);
    }

    return { success: true, message: eliminados + " registro(s) no-libro eliminado(s) de la hoja Libros." };
  } catch (e) {
    return { success: false, message: "Error al limpiar: " + e.message };
  }
}
