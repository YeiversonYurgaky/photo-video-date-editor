# English

# Unified Metadata Editor

This project is a desktop application built with Python and PyWebView that allows you to batch edit dates and EXIF metadata of images and videos using a modern, user-friendly interface.

## Main Features

- Batch processing of images and videos to modify only their date metadata (EXIF).
- **Extract a frame from each video file as an image, with adjustable quality (FFmpeg -q:v).**
- Apply custom date/time metadata to both images and extracted video frames.
- File preview support via Base64 (no exposure of local paths).
- Batch processing for multiple files at once, with per-file action selection (e.g., only metadata, or extract frame).
- Automatic extraction of date/time from filenames, or manual entry with default time fallback.
- Modern web-based GUI using PyWebView.
- Flexible path configuration via `.env` file.
- Optional support for Persian (Jalali) dates using `persiantools`.

## Requirements

- Python 3.8+
- [ffmpeg](https://ffmpeg.org/) (executable, not a Python package)
- [exiftool](https://exiftool.org/) (executable)

### Python Dependencies

Install dependencies with:

```
pip install -r requirements.txt
```

### Environment Variables

Configure the `.env` file at the project root. Example:

```
OUTPUT_DIR=C:\Users\user\salida
```

## Project Structure

- `main_webview.py`: Main logic and API for the web interface.
- `media_utils.py`: File processing functions, date extraction, and metadata handling.
- `web/`: Web interface files (JS, CSS, HTML).
- `bin/`: Contains `ffmpeg.exe` and `exiftool.exe` executables.
- `.env`: Environment variables for configurable paths.

## Supported File Types

- **Images:** JPG, JPEG, PNG
- **Videos:** MP4, MOV, AVI, MKV

You can select individual files or folders containing these formats for processing.

## Why select individual files if batch mode exists?

While batch processing (by folder) is ideal for large volumes, the ability to select individual files from the file explorer provides important advantages:

- **Selective processing:** Modify only specific files without affecting others in the folder.
- **Avoid errors:** Skip unwanted or unsupported files.
- **Quick tests:** Easily test the app with one or two files before mass processing.
- **Convenience:** Useful if your files are scattered across different folders.
- **Flexibility:** Combine files from different locations in a single operation.

Both options are available to suit different needs and workflows.

## Usage

1. Run `main_webview.py`:
   ```
   python main_webview.py
   ```
2. Select files or folders from the interface.
3. **For videos, choose whether to only modify metadata or extract a frame as an image (with metadata applied) in the batch table.**
4. Process the files and review the results in the table and log.

## Notes

- The `ffmpeg.exe` and `exiftool.exe` executables must be in the `bin` folder inside the project or in the configured location.
- **IMPORTANT:** For `exiftool.exe` to work correctly, you must also include the `exiftool_files` folder inside the `bin` directory, next to the executable.
- If you need Persian date support, also install `persiantools`.
- Sensitive paths are configured via `.env` and should not be pushed to GitHub.

## License

MIT

# Spanish

# Editor Unificado de Metadatos

Este proyecto es una aplicación de escritorio construida con Python y PyWebView que permite editar metadatos de imágenes y videos en lote, con una interfaz moderna y fácil de usar.

## Características principales

- Procesamiento de imágenes y videos para modificar solamente fechas con EXIF.
- **Extracción de un frame de cada video como imagen, con calidad ajustable (FFmpeg -q:v).**
- Aplicación de metadatos personalizados de fecha/hora tanto a imágenes como a los frames extraídos de video.
- Soporte para previsualización de archivos mediante Base64 (sin exponer rutas locales).
- Procesamiento en lote de múltiples archivos, con selección de acción por archivo (solo metadata o extraer frame).
- Extracción automática de fecha/hora desde el nombre del archivo, o ingreso manual con hora predeterminada si no se especifica.
- Interfaz gráfica moderna (web) usando PyWebView.
- Configuración flexible de rutas mediante archivo `.env`.
- Soporte opcional para fechas persas (Jalali) usando `persiantools`.

## Requisitos

- Python 3.8+
- [ffmpeg](https://ffmpeg.org/) (ejecutable, no es paquete Python)
- [exiftool](https://exiftool.org/) (ejecutable)

### Dependencias Python

Instala las dependencias con:

```
pip install -r requirements.txt
```

### Variables de entorno

Configura el archivo `.env` en la raíz del proyecto. Ejemplo:

```
OUTPUT_DIR=C:\Users\user\salida
```

## Estructura del Proyecto

- `main_webview.py`: Lógica principal y API para la interfaz web.
- `media_utils.py`: Funciones de procesamiento de archivos, extracción de fechas y manejo de metadatos.
- `web/`: Archivos de la interfaz web (JS, CSS, HTML).
- `bin/`: Ejecutables de `ffmpeg.exe` y `exiftool.exe`.
- `.env`: Variables de entorno para rutas configurables.

## Archivos soportados

- **Imágenes:** JPG, JPEG, PNG
- **Videos:** MP4, MOV, AVI, MKV

Puedes seleccionar archivos individuales o carpetas con archivos de estos formatos para su procesamiento.

## ¿Por qué seleccionar archivos individuales si existe el modo batch?

Aunque el procesamiento batch (por carpeta) es ideal para grandes volúmenes de archivos, la opción de seleccionar archivos individuales desde el explorador ofrece ventajas importantes:

- **Procesamiento selectivo:** Permite modificar solo archivos concretos, sin afectar otros en la carpeta.
- **Evitar errores:** Da control para omitir archivos no deseados o no soportados.
- **Pruebas rápidas:** Facilita probar la app con uno o dos archivos antes de procesar en masa.
- **Comodidad:** Útil si los archivos están dispersos en diferentes carpetas.
- **Flexibilidad:** Permite combinar archivos de distintas ubicaciones en una sola operación.

Ambas opciones están disponibles para adaptarse a diferentes necesidades y flujos de trabajo.

## Uso

1. Ejecuta `main_webview.py`:
   ```
   python main_webview.py
   ```
2. Selecciona archivos o carpetas desde la interfaz.
3. **Para videos, elige en la tabla batch si solo modificar metadata o extraer un frame como imagen (con metadata aplicado).**
4. Procesa los archivos y revisa los resultados en la tabla y log.

## Notas

- Los ejecutables `ffmpeg.exe` y `exiftool.exe` deben estar en la carpeta `bin` dentro del proyecto o en la ubicación configurada.
- **IMPORTANTE:** Para que `exiftool.exe` funcione correctamente, también es necesario incluir la carpeta `exiftool_files` dentro de la carpeta `bin` junto al ejecutable.
- Si necesitas soporte para fechas persas, instala también `persiantools`.
- Las rutas sensibles se configuran desde `.env` y no deben subirse a GitHub.

## Licencia

MIT
