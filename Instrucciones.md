# Guía de Instalación y Despliegue - Biblioteca Virtual GOSCh

Esta guía detalla los pasos para desplegar la Biblioteca Virtual utilizando **Google Apps Script** y **Google Sheets** en su cuenta de Google Workspace o Gmail.

---

## Paso 1: Configurar la Base de Datos (Google Sheets)

1. Vaya a [Google Sheets](https://sheets.google.com) y cree una nueva hoja de cálculo.
2. Nómbrela **"Base de Datos - Biblioteca GOSCh"** (o cualquier nombre de su preferencia).
3. **No es necesario estructurar las columnas manualmente**: el script backend (`Code.gs`) se encargará de inicializar las hojas (`Usuarios`, `Libros`, `Historial`) y sus cabeceras automáticamente en su primera ejecución.
4. Anote la **URL** o el **ID** de esta hoja de cálculo (lo encontrará en la barra de direcciones de su navegador: `https://docs.google.com/spreadsheets/d/[ID_DE_HOJA]/edit`).

---

## Paso 2: Crear el Proyecto de Google Apps Script

1. En la hoja de cálculo creada, haga clic en el menú superior **Extensiones > Apps Script**. Esto abrirá el editor de código de Google Apps Script vinculado a la hoja.
2. En el editor lateral izquierdo, verá un archivo predeterminado llamado `Código.gs`.
3. Reemplace todo el contenido de ese archivo con el código del archivo [Code.gs](file:///c:/Users/diazp/OneDrive/Escritorio/biblioteca%20virtual/Code.gs) creado en este proyecto.
4. Guarde los cambios (clic en el icono de disco o `Ctrl + S`).

---

## Paso 3: Crear los Archivos del Frontend

En el editor de Apps Script, crearemos los archivos HTML que corresponden a la interfaz de usuario:

1. Haga clic en el botón **`+` (Agregar un archivo)** al lado de "Archivos" en el panel izquierdo y seleccione **HTML**.
2. Nombre el archivo como **`Index`** (se guardará como `Index.html`). Reemplace todo su contenido con el código del archivo [Index.html](file:///c:/Users/diazp/OneDrive/Escritorio/biblioteca%20virtual/Index.html).
3. Agregue otro archivo **HTML** y cámbiele el nombre a **`Styles`** (se guardará como `Styles.html`). Reemplace su contenido con el código de [Styles.html](file:///c:/Users/diazp/OneDrive/Escritorio/biblioteca%20virtual/Styles.html).
4. Agregue otro archivo **HTML** y cámbiele el nombre a **`Script`** (se guardará como `Script.html`). Reemplace su contenido con el código de [Script.html](file:///c:/Users/diazp/OneDrive/Escritorio/biblioteca%20virtual/Script.html).
5. Agregue un último archivo **HTML** y cámbiele el nombre a **`TFAgent`** (se guardará como `TFAgent.html`). Reemplace su contenido con el de [TFAgent.html](file:///c:/Users/diazp/OneDrive/Escritorio/biblioteca%20virtual/TFAgent.html).
6. Guarde todos los archivos.

---

## Paso 4: Configuración de Seguridad y Carpetas

El script está configurado para gestionar automáticamente los archivos subidos creando una carpeta llamada `"Biblioteca Virtual GOSCh"` en su Google Drive:
- La primera vez que un usuario suba un libro, el script creará la carpeta y le asignará permisos para que *"Cualquier persona con el enlace pueda leer"* (esto es necesario para que el lector integrado cargue los PDFs mediante el preview de Google Drive).
- Los libros se almacenan de forma segura y solo los usuarios autorizados (estado `Activo` en Sheets) pueden ver el catálogo en la aplicación.

### Claves y Palabras de Pase Configurable:
En el archivo `Code.gs` (líneas 6 a 18), puede modificar las **palabras de pase** que los usuarios deben ingresar durante su registro para auto-aprobarse:
```javascript
  PALABRAS_PASO: {
    "1": ["tubalcain", "tubalcaín"],      // Palabra de paso para Aprendiz
    "2": ["shibboleth", "schibboleth"],  // Palabra de paso para Compañero
    "3": ["giblim", "mac-benac"],        // Palabra de paso para Maestro
    "33": ["herodum", "spes mea in deo est"] // Palabra de paso para Grado 33
  }
```
Si un usuario ingresa una palabra incorrecta o la deja en blanco, su estado en la pestaña `Usuarios` de Google Sheets se guardará como `Pendiente`. Un administrador deberá ingresar a la hoja y cambiar manualmente el estado a `Activo` para permitirle el acceso.

---

## Paso 5: Implementación como Aplicación Web

Para publicar la biblioteca y obtener el enlace de acceso:

1. En la esquina superior derecha del editor de Apps Script, haga clic en el botón azul **Implementar > Nueva implementación**.
2. En la ventana emergente, haga clic en el engranaje de configuración al lado de "Seleccionar tipo" y elija **Aplicación web**.
3. Configure los siguientes parámetros:
   - **Descripción**: Biblioteca GOSCh V1
   - **Ejecutar como**: **Mi cuenta** (esto permite que el script acceda al Google Sheet y Google Drive usando sus privilegios administrativos sin exigirle permisos de Drive a cada usuario).
   - **Quién tiene acceso**: **Cualquiera** (necesario para que los miembros de la Logia puedan ingresar usando el sistema de login y PIN interno).
4. Haga clic en **Implementar**.
5. **Autorizar Acceso**: Google le solicitará otorgar permisos para que el script pueda escribir en Google Sheets y Drive en su nombre.
   - Haga clic en *Autorizar acceso*.
   - Seleccione su cuenta de Google.
   - Si aparece la pantalla de advertencia "Google no ha verificado esta aplicación", haga clic en **Configuración avanzada** (abajo a la izquierda) y luego haga clic en **Ir a Proyecto (no seguro)**.
   - Permita los accesos necesarios.
6. Copie la **URL de la aplicación web** generada. Este es el enlace público que compartirá con los miembros autorizados.

---

## Paso 6: Administrar Usuarios y Contenidos

- **Base de Datos**: Abra la hoja de cálculo de Google Sheets. Allí verá en tiempo real las solicitudes de registro en la pestaña `Usuarios`. Modifique la celda `Estado` a `Activo` para habilitar el acceso a usuarios que quedaron pendientes.
- **Subida de Archivos**: Los usuarios con cuenta activa pueden subir libros PDF/EPUB/DOC desde la pestaña **"Aportar Trazado"**. Los archivos se guardarán directamente en su Google Drive y se registrarán en la pestaña `Libros` del Sheet.
- **Mantenimiento**: Si desea cambiar o eliminar algún libro, simplemente borre la fila del libro en Google Sheets o elimine el archivo de su Google Drive.
