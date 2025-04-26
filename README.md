# Editor Unificado de Metadatos

Este proyecto es una aplicación de escritorio construida con Python y PyWebView que permite editar metadatos de imágenes y videos en lote, con una interfaz moderna y fácil de usar.

## Características principales

- Procesamiento de imágenes y videos para modificar fechas y metadatos EXIF.
- Soporte para previsualización de archivos mediante Base64 (sin exponer rutas locales).
- Procesamiento en lote de múltiples archivos.
- Extracción automática de fecha/hora desde el nombre del archivo.
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

## Uso

1. Ejecuta `main_webview.py`:
   ```
   python main_webview.py
   ```
2. Selecciona archivos o carpetas desde la interfaz.
3. Procesa los archivos y revisa los resultados en la tabla y log.

## Notas

- Los ejecutables `ffmpeg.exe` y `exiftool.exe` deben estar en la carpeta `bin` dentro del proyecto o en la ubicación configurada.
- **IMPORTANTE:** Para que `exiftool.exe` funcione correctamente, también es necesario incluir la carpeta `exiftool_files` dentro de la carpeta `bin` junto al ejecutable.
- Si necesitas soporte para fechas persas, instala también `persiantools`.
- Las rutas sensibles se configuran desde `.env` y no deben subirse a GitHub.

## Licencia

MIT
