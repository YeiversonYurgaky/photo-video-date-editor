# --- Utilidad para ocultar consola en subprocesos en Windows ---
from media_utils import (
    extract_datetime_from_filename,
    process_video,
    get_bin_path,
    cambiar_metadata_imagen,
    cambiar_metadata_video
)
from dotenv import load_dotenv
import sys
import os
import webview
import sys as _sys


def get_creationflags():
    import sys
    import subprocess
    if sys.platform == "win32":
        return getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return 0


# --- Parche para ocultar consola en ffmpeg-python en Windows ---
if _sys.platform == "win32":
    import subprocess as _subprocess
    import ffmpeg as _ffmpeg
    from ffmpeg._run import output_operator as _output_operator

    @_output_operator()
    def _patched_run_async(
        stream_spec,
        cmd='ffmpeg',
        pipe_stdin=False,
        pipe_stdout=False,
        pipe_stderr=False,
        quiet=False,
        overwrite_output=False,
    ):
        creationflags = _subprocess.CREATE_NO_WINDOW
        args = _ffmpeg._run.compile(
            stream_spec, cmd, overwrite_output=overwrite_output)
        stdin_stream = _subprocess.PIPE if pipe_stdin else None
        stdout_stream = _subprocess.PIPE if pipe_stdout or quiet else None
        stderr_stream = _subprocess.PIPE if pipe_stderr or quiet else None
        return _subprocess.Popen(
            args, stdin=stdin_stream, stdout=stdout_stream, stderr=stderr_stream, creationflags=creationflags
        )
    _ffmpeg._run.run_async = _patched_run_async


class Api:
    def __init__(self):
        # Determinar la ruta base (donde está el ejecutable o script)
        if hasattr(sys, '_MEIPASS'):
            base_dir = sys._MEIPASS
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
        # Ya no se carga .env ni OUTPUT_DIR
        # Inicializa rutas de ejecutables externos de forma dinámica
        self.exiftool_path = get_bin_path('exiftool.exe')
        self.ffmpeg_path = get_bin_path('ffmpeg.exe')
        self._last_file_path = None
        self._last_folder_path = None
        self._last_thumb_logs = None

    def get_file_path(self):
        # PyWebView native file dialog
        window = webview.windows[0]
        result = window.create_file_dialog(
            webview.OPEN_DIALOG, allow_multiple=True)
        if result and len(result) > 0:
            self._last_file_path = result
            return self._last_file_path
        return None

    def get_folder_path(self):
        window = webview.windows[0]
        result = window.create_file_dialog(webview.FOLDER_DIALOG)
        if result and len(result) > 0:
            self._last_folder_path = result[0]
            return self._last_folder_path
        return None

    def extraer_fecha_hora(self, input_path):
        fecha, hora = extract_datetime_from_filename(input_path)
        return {"fecha": fecha, "hora": hora}

    def procesar_archivo(self, input_path, tipo_archivo, modo_fecha, fecha_manual, hora_manual, accion=None):
        # modo_fecha: 'extraida' o 'manual'
        if modo_fecha == 'extraida':
            res = self.extraer_fecha_hora(input_path)
            fecha_final = res['fecha']
            hora_final = res['hora'] or "12:00:00"
        else:
            fecha_final = fecha_manual
            hora_final = hora_manual or "12:00:00"
        base = os.path.splitext(os.path.basename(input_path))[0]
        ext = os.path.splitext(input_path)[1].lower()
        if tipo_archivo == "video":
            # Determina la acción a realizar
            if not accion:
                accion = "modificar_video"
            if accion == "modificar_video":
                datetime_exif = f"{fecha_final} {hora_final}"
                cambiar_metadata_video(
                    input_path, datetime_exif, self.exiftool_path)
                return {"success": True, "msg": f"✓ Metadatos aplicados a video: {input_path}"}
            else:
                return {"success": False, "msg": "❌ Acción no soportada para video."}
        elif tipo_archivo == "imagen":
            if not accion:
                accion = "modificar_imagen"
            if accion == "modificar_imagen":
                datetime_exif = f"{fecha_final} {hora_final}"
                cambiar_metadata_imagen(
                    input_path, datetime_exif, self.exiftool_path)
                return {"success": True, "msg": f"✓ Metadatos aplicados a imagen: {input_path}"}
            else:
                return {"success": False, "msg": "❌ Acción no soportada para imagen."}
        else:
            return {"success": False, "msg": "❌ Tipo de archivo no soportado."}

    def _procesar_archivo_auto(self, input_path, modo_fecha, fecha_manual, hora_manual):
        ext = os.path.splitext(input_path)[1].lower()
        imagen_exts = ('.jpg', '.jpeg', '.png', '.bmp', '.gif')
        video_exts = ('.mp4', '.mov', '.avi')
        if ext in imagen_exts:
            tipo = "imagen"
        elif ext in video_exts:
            tipo = "video"
        else:
            return {"success": False, "msg": f"❌ Extensión no soportada: {ext}"}
        return self.procesar_archivo(input_path, tipo, modo_fecha, fecha_manual, hora_manual)

    def is_file_or_dir(self, path):
        import os
        if os.path.isfile(path):
            return {"type": "file"}
        elif os.path.isdir(path):
            return {"type": "dir"}
        else:
            return {"type": "unknown"}

    def get_dropped_path(self, filename):
        # En Windows/PyWebView, normalmente no se necesita esto, pero se deja para compatibilidad
        return filename

    def extraer_metadata_batch(self, file_paths):
        # Recibe una lista de rutas, devuelve [{path, fecha, hora, thumb, thumb_log} ...]
        from datetime import datetime
        import os
        import subprocess
        import tempfile
        import base64
        results = []
        thumb_logs = []
        # flags = get_creationflags()  # Ya no se usa aquí, el parche global lo maneja
        for path in file_paths:
            try:
                fecha, hora = extract_datetime_from_filename(path)
            except Exception:
                fecha, hora = "", ""
            ext = os.path.splitext(path)[1].lower()
            thumb = None
            thumb_log = ''
            if ext in [".mp4", ".mov", ".avi"]:
                # Genera miniatura SOLO en memoria, nunca en disco
                try:
                    import ffmpeg
                    import numpy as np
                    from PIL import Image
                    import io
                    # Extrae el primer frame usando ffmpeg-python
                    out, _ = (
                        ffmpeg.input(path, ss=0)
                        .output('pipe:', vframes=1, format='image2', vcodec='mjpeg')
                        .run(capture_stdout=True, capture_stderr=True)
                    )
                    img = Image.open(io.BytesIO(out))
                    # Redimensiona thumbnail
                    img.thumbnail((120, 80))
                    buffer = io.BytesIO()
                    img.save(buffer, format="JPEG")
                    thumb = f"data:image/jpeg;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
                    thumb_log = "Imagen lista para previsualizar."
                except Exception as e:
                    # SVG fallback base64 for 'Sin miniatura'
                    svg = '''<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' font-size='10' text-anchor='middle' fill='#888' dy='.3em'>Sin miniatura</text></svg>'''
                    thumb = f"data:image/svg+xml;base64,{base64.b64encode(svg.encode('utf-8')).decode('utf-8')}"
                    thumb_log = f"❌ Error leyendo imagen: {str(e)}"
            elif ext in [".jpg", ".jpeg", ".png", ".bmp", ".gif"]:
                try:
                    from PIL import Image
                    import io
                    with open(path, 'rb') as f:
                        img_bytes = f.read()
                    img = Image.open(io.BytesIO(img_bytes))
                    img.thumbnail((120, 80))
                    buffer = io.BytesIO()
                    img.save(buffer, format="JPEG")
                    thumb = f"data:image/jpeg;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
                    thumb_log = "Imagen lista para previsualizar."
                except Exception as e:
                    svg = '''<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' font-size='10' text-anchor='middle' fill='#888' dy='.3em'>Sin preview</text></svg>'''
                    thumb = f"data:image/svg+xml;base64,{base64.b64encode(svg.encode('utf-8')).decode('utf-8')}"
                    thumb_log = f"❌ Error leyendo imagen: {str(e)}"
            print(f"{path} -> fecha: {fecha}, hora: {hora}")
            results.append({
                "path": path,
                "fecha": fecha,
                "hora": hora,
                "thumb": thumb,
                "thumb_log": thumb_log
            })
        self._last_thumb_logs = thumb_logs
        return results

    def procesar_batch(self, archivos):
        # Recibe lista de dicts: {path, fecha, hora, accion}
        resultados = []
        for archivo in archivos:
            path = archivo.get("path")
            fecha = archivo.get("fecha")
            hora = archivo.get("hora")
            accion = archivo.get("accion", "modificar_imagen")
            ext = os.path.splitext(path)[1].lower()
            base = os.path.splitext(os.path.basename(path))[0]
            try:
                # Si la fecha está vacía, usar la fecha actual
                if not fecha:
                    from datetime import datetime
                    fecha = datetime.now().strftime('%Y:%m:%d')
                    hora = datetime.now().strftime('%H:%M:%S')
                # Si la hora está vacía pero la fecha existe, usar hora por defecto
                if fecha and (not hora or hora.strip() == ""):
                    hora = "12:00:00"
                datetime_exif = f"{fecha} {hora}"
                if ext in [".jpg", ".jpeg", ".png"]:
                    try:
                        cambiar_metadata_imagen(
                            path, datetime_exif, self.exiftool_path)
                        res = f"✓ Metadatos aplicados a imagen: {path}"
                    except Exception as e:
                        res = f"❌ Error metadatos imagen: {str(e)}"
                elif ext in [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm"]:
                    # Si la acción es solo extraer frame, NO modificar el video original
                    if accion == "extraer_frame":
                        try:
                            # Guardar el frame en el mismo directorio del video de entrada
                            output_dir = os.path.dirname(path)
                            if not os.path.exists(output_dir):
                                os.makedirs(output_dir)
                            output_img = os.path.join(
                                output_dir, f"{base}.jpg")
                            process_video(path, output_img, None,
                                          self.exiftool_path, self.ffmpeg_path)
                            try:
                                cambiar_metadata_imagen(
                                    output_img, datetime_exif, self.exiftool_path)
                                res = f"✓ Frame extraído y metadatos aplicados: {output_img}"
                            except Exception as e:
                                res = f"❌ Error metadatos frame: {str(e)}"
                        except Exception as e:
                            res = f"❌ Error extrayendo frame: {str(e)}"
                    else:
                        video_error = None
                        try:
                            cambiar_metadata_video(
                                path, datetime_exif, self.exiftool_path)
                            res = f"✓ Metadatos aplicados a video: {path}"
                        except Exception as e:
                            video_error = str(e)
                            res = f"⚠️ No se pudieron modificar los metadatos del video: {video_error}"
                else:
                    res = f"Tipo de archivo no soportado: {path}"
            except Exception as e:
                res = f"❌ Error: {str(e)}"
            resultados.append({"path": path, "resultado": res})
        return resultados

    def abrir_output_dir(self):
        # Esta función ya no es necesaria
        return False


if __name__ == '__main__':
    api = Api()
    webview.create_window('Editor Unificado de Metadatos', 'web/index.html',
                          js_api=api, width=950, height=670, resizable=True)
    webview.start(debug=True)
