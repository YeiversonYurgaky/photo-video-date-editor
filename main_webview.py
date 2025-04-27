import webview
import os
import sys
from dotenv import load_dotenv
from media_utils import (
    extract_datetime_from_filename,
    process_video,
    get_bin_path,
    cambiar_metadata_imagen,
    cambiar_metadata_video
)


class Api:
    def __init__(self):
        # Determinar la ruta base (donde está el ejecutable o script)
        if hasattr(sys, '_MEIPASS'):
            base_dir = sys._MEIPASS
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
        # Cargar rutas fijas desde .env

        load_dotenv(os.path.join(base_dir, '.env'))
        self.output_dir = os.getenv('OUTPUT_DIR')
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

    def procesar_carpeta(self, folder_path, tipo_archivo, modo_fecha, fecha_manual, hora_manual):
        if tipo_archivo == "imagen":
            valid_exts = ('.jpg', '.jpeg', '.png', '.bmp', '.gif')
        else:
            valid_exts = ('.mp4', '.mov', '.avi')
        count = 0
        success = 0
        logs = []
        for file in os.listdir(folder_path):
            if file.lower().endswith(valid_exts):
                input_path = os.path.join(folder_path, file)
                if modo_fecha == 'extraida':
                    res = self.extraer_fecha_hora(input_path)
                    f = res['fecha']
                    h = res['hora'] or "12:00:00"
                else:
                    f = fecha_manual
                    h = hora_manual or "12:00:00"
                base = os.path.splitext(os.path.basename(input_path))[0]
                ext = os.path.splitext(input_path)[1].lower()
                if tipo_archivo == "video":
                    datetime_exif = f"{f} {h}" if f else None
                    try:
                        cambiar_metadata_video(
                            input_path, datetime_exif, self.exiftool_path)
                        logs.append(
                            f"✓ Metadatos aplicados a video: {input_path}")
                    except Exception as e:
                        logs.append(
                            f"❌ Error aplicando metadata: {str(e)}")
                elif tipo_archivo == "imagen":
                    datetime_exif = f"{f} {h}" if f else None
                    try:
                        cambiar_metadata_imagen(
                            input_path, datetime_exif, self.exiftool_path)
                        logs.append(
                            f"✓ Metadatos aplicados a imagen: {input_path}")
                    except Exception as e:
                        logs.append(
                            f"❌ Error aplicando metadata: {str(e)}")
                else:
                    logs.append(
                        f"❌ Tipo de archivo no soportado para {file}.")
                success += 1
                count += 1
        logs.append(
            f"--- RESUMEN ---\nTotal de archivos procesados: {count}\nArchivos modificados exitosamente: {success}")
        return {"success": True, "logs": logs}

    def procesar_auto(self, path, modo_fecha, fecha_manual, hora_manual, tipo_carpeta=None):
        import os
        if os.path.isdir(path):
            # Procesar carpeta con filtro
            return self._procesar_carpeta_auto(path, modo_fecha, fecha_manual, hora_manual, tipo_carpeta)
        elif os.path.isfile(path):
            # Procesar archivo individual
            return self._procesar_archivo_auto(path, modo_fecha, fecha_manual, hora_manual)
        else:
            return {"success": False, "msg": "❌ Ruta no válida."}

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

    def _procesar_carpeta_auto(self, folder_path, modo_fecha, fecha_manual, hora_manual, tipo_carpeta=None):
        imagen_exts = ('.jpg', '.jpeg', '.png', '.bmp', '.gif')
        video_exts = ('.mp4', '.mov', '.avi')
        archivos = [f for f in os.listdir(
            folder_path) if os.path.isfile(os.path.join(folder_path, f))]
        logs = []
        count = 0
        success = 0
        for file in archivos:
            ext = os.path.splitext(file)[1].lower()
            input_path = os.path.join(folder_path, file)
            es_imagen = ext in imagen_exts
            es_video = ext in video_exts
            # Filtro según tipo_carpeta
            if tipo_carpeta == "imagen" and not es_imagen:
                continue
            if tipo_carpeta == "video" and not es_video:
                continue
            if tipo_carpeta in (None, "ambos") and not (es_imagen or es_video):
                continue
            if es_imagen or es_video:
                res = self._procesar_archivo_auto(
                    input_path, modo_fecha, fecha_manual, hora_manual)
                logs.append(res.get("msg", ""))
                if res.get("success"):
                    success += 1
                count += 1
        logs.append(
            f"--- RESUMEN ---\nTotal de archivos procesados: {count}\nArchivos modificados exitosamente: {success}")
        return {"success": True, "logs": logs}

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
                            output_dir = self.output_dir or os.path.dirname(
                                path)
                            if not os.path.exists(output_dir):
                                os.makedirs(output_dir)
                            output_img = os.path.join(
                                output_dir, f"{base}_frame.jpg")
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
        import os
        import webbrowser
        output_dir = self.output_dir
        if output_dir and os.path.isdir(output_dir):
            # En Windows, usa explorer.exe
            if os.name == 'nt':
                os.startfile(output_dir)
            else:
                webbrowser.open(f'file://{output_dir}')
            return True
        return False


if __name__ == '__main__':
    api = Api()
    webview.create_window('Editor Unificado de Metadatos', 'web/index.html',
                          js_api=api, width=950, height=670, resizable=True)
    webview.start(debug=True)
