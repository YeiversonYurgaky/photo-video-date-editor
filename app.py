from flask import Flask, request, jsonify, render_template, send_file, redirect, url_for
from werkzeug.utils import secure_filename
import os
import tempfile
import shutil
import zipfile
from datetime import datetime
import uuid
from media_utils import (
    extract_datetime_from_filename,
    cambiar_metadata_imagen,
    cambiar_metadata_video,
    get_bin_path
)
import base64
import io
from PIL import Image
import ffmpeg

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size
app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
app.config['PROCESSED_FOLDER'] = '/tmp/processed'

# Crear directorios si no existen
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)

# Extensiones permitidas
ALLOWED_EXTENSIONS = {
    'image': {'jpg', 'jpeg', 'png', 'bmp', 'gif'},
    'video': {'mp4', 'mov', 'avi'}
}

def allowed_file(filename, file_type=None):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    if file_type:
        return ext in ALLOWED_EXTENSIONS.get(file_type, set())
    else:
        all_exts = set()
        for exts in ALLOWED_EXTENSIONS.values():
            all_exts.update(exts)
        return ext in all_exts

def get_file_type(filename):
    """Determina el tipo de archivo por su extensión o contenido"""
    if '.' not in filename:
        return 'unknown'
    
    ext = filename.rsplit('.', 1)[1].lower()
    
    # Primero intentamos por extensión
    if ext in ALLOWED_EXTENSIONS['image']:
        return 'image'
    elif ext in ALLOWED_EXTENSIONS['video']:
        return 'video'
    
    return 'unknown'

def detect_file_type_from_content(file_path):
    """Detecta el tipo de archivo examinando sus primeros bytes"""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(12)  # Leemos los primeros bytes
            
        # Firmas de archivo comunes
        # JPEG: FF D8 FF
        if header[:3] == b'\xFF\xD8\xFF':
            return 'image'
        
        # PNG: 89 50 4E 47 0D 0A 1A 0A
        if header[:8] == b'\x89\x50\x4E\x47\x0D\x0A\x1A\x0A':
            return 'image'
        
        # GIF: 47 49 46 38
        if header[:4] == b'GIF8':
            return 'image'
        
        # MP4: 00 00 00 xx 66 74 79 70 (ftyp)
        if header[4:8] == b'ftyp':
            return 'video'
        
        # MOV/QuickTime: 00 00 00 xx 6D 6F 6F 76 (moov)
        if header[4:8] == b'moov' or header[4:8] == b'mdat':
            return 'video'
        
        # Si no podemos determinar, usamos el tamaño como heurística
        # Los videos suelen ser mucho más grandes que las imágenes
        file_size = os.path.getsize(file_path)
        if file_size > 5 * 1024 * 1024:  # 5MB
            return 'video'
        else:
            return 'image'
            
    except Exception as e:
        print(f"Error detectando tipo por contenido: {e}")
        return 'unknown'

def generate_thumbnail(file_path, file_type):
    """Genera thumbnail en memoria, con mejor manejo de errores"""
    try:
        if file_type == 'video':
            try:
                # Extrae frame usando ffmpeg
                out, _ = (
                    ffmpeg.input(file_path, ss=0)
                    .output('pipe:', vframes=1, format='image2', vcodec='mjpeg')
                    .run(capture_stdout=True, capture_stderr=True)
                )
                img = Image.open(io.BytesIO(out))
                img.thumbnail((120, 80))
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG")
                return f"data:image/jpeg;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
            except Exception as e:
                print(f"Error generando thumbnail de video {file_path}: {e}")
                # Fallback a icono genérico de video
                svg = '''<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40' viewBox='0 0 60 40'><rect width='100%' height='100%' fill='#333'/><polygon points='20,10 45,20 20,30' fill='#eee'/></svg>'''
                return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode('utf-8')).decode('utf-8')}"
                
        elif file_type == 'image':
            try:
                with open(file_path, 'rb') as f:
                    img_bytes = f.read()
                img = Image.open(io.BytesIO(img_bytes))
                img.thumbnail((120, 80))
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG")
                return f"data:image/jpeg;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
            except Exception as e:
                print(f"Error generando thumbnail de imagen {file_path}: {e}")
                # Fallback a icono genérico de imagen
                svg = '''<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40' viewBox='0 0 60 40'><rect width='100%' height='100%' fill='#eee'/><circle cx='20' cy='15' r='5' fill='#999'/><polygon points='10,40 30,25 50,40' fill='#999'/></svg>'''
                return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode('utf-8')).decode('utf-8')}"
                
        else:
            # Icono genérico para archivos desconocidos
            svg = '''<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' font-size='10' text-anchor='middle' fill='#888' dy='.3em'>Archivo</text></svg>'''
            return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode('utf-8')).decode('utf-8')}"
            
    except Exception as e:
        print(f"Error general generando thumbnail: {e}")
        # SVG fallback
        svg = '''<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' font-size='10' text-anchor='middle' fill='#888' dy='.3em'>Sin miniatura</text></svg>'''
        return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode('utf-8')).decode('utf-8')}"

@app.route('/')
def index():
    """Sirve la página principal"""
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_files():
    """Maneja la subida de archivos múltiples"""
    if 'files' not in request.files:
        print("[ERROR] No se encontraron archivos en la solicitud")
        print("Headers:", dict(request.headers))
        print("Form data:", dict(request.form))
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    if not files or all(file.filename == '' for file in files):
        print("[ERROR] No hay archivos seleccionados o nombres vacíos")
        return jsonify({'error': 'No files selected'}), 400
    
    # Depurar información de archivos
    for file in files:
        print(f"[DEBUG] Archivo recibido: {file.filename}, Content-Type: {file.content_type}")
    
    batch_metadata = []
    session_id = str(uuid.uuid4())
    session_folder = os.path.join(app.config['UPLOAD_FOLDER'], session_id)
    os.makedirs(session_folder, exist_ok=True)
    
    for file in files:
        if file:  # Removemos la verificación allowed_file para permitir cualquier extensión
            # Obtener el nombre original del archivo
            original_filename = file.filename
            print(f"[DEBUG] Nombre original: {original_filename}")
            
            # En dispositivos móviles, a veces el nombre es una ruta completa
            # o tiene caracteres extraños, así que extraemos el nombre base
            if '/' in original_filename:
                original_filename = original_filename.split('/')[-1]
            if '\\' in original_filename:
                original_filename = original_filename.split('\\')[-1]
            
            # Para iOS/Safari que puede enviar archivos como "image.jpg"
            if original_filename.startswith('image.') or original_filename.startswith('video.'):
                # Generar un nombre con timestamp
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                ext = original_filename.split('.')[-1]
                original_filename = f"mobile_{timestamp}.{ext}"
            
            print(f"[DEBUG] Nombre procesado: {original_filename}")
            
            # Limpiamos el nombre para que sea seguro para el sistema de archivos
            filename = secure_filename(original_filename)
            print(f"[DEBUG] Nombre seguro: {filename}")
            
            # Si después de limpiar quedó vacío o muy corto, usamos un nombre genérico
            if len(filename) < 3:
                current_time = datetime.now().strftime('%Y%m%d_%H%M%S')
                file_ext = original_filename.split('.')[-1] if '.' in original_filename else 'jpg'
                filename = f"mobile_upload_{current_time}.{file_ext}"
                print(f"[DEBUG] Nombre genérico: {filename}")
            
            file_path = os.path.join(session_folder, filename)
            file.save(file_path)
            print(f"[DEBUG] Archivo guardado en: {file_path}")
            
            # Determinar el tipo de archivo por MIME
            mime_type = file.content_type or ""
            file_type = 'unknown'
            
            if 'image/' in mime_type:
                file_type = 'image'
            elif 'video/' in mime_type:
                file_type = 'video'
            else:
                # Si no tenemos MIME, intentamos por extensión
                file_type = get_file_type(filename)
                
                # Si sigue siendo desconocido, intentamos por contenido
                if file_type == 'unknown':
                    file_type = detect_file_type_from_content(file_path)
            
            print(f"[DEBUG] Tipo detectado: {file_type} (MIME: {mime_type})")
            
            # Extraer metadatos del nombre
            try:
                fecha, hora = extract_datetime_from_filename(filename)
                print(f"[DEBUG] Metadatos extraídos: fecha={fecha}, hora={hora}")
            except Exception as e:
                print(f"[ERROR] Error extrayendo metadatos: {e}")
                fecha, hora = "", ""
            
            # Generar miniatura
            try:
                thumbnail = generate_thumbnail(file_path, file_type)
            except Exception as e:
                print(f"[ERROR] Error generando thumbnail: {e}")
                # SVG fallback
                svg = '''<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' font-size='10' text-anchor='middle' fill='#888' dy='.3em'>Sin miniatura</text></svg>'''
                thumbnail = f"data:image/svg+xml;base64,{base64.b64encode(svg.encode('utf-8')).decode('utf-8')}"
            
            batch_metadata.append({
                'path': file_path,
                'filename': filename,
                'fecha': fecha or '',
                'hora': hora or '',
                'thumb': thumbnail,
                'thumb_log': 'Thumbnail generado',
                'file_type': file_type,
                'session_id': session_id
            })
    
    return jsonify({
        'success': True,
        'batch_metadata': batch_metadata,
        'session_id': session_id
    })

@app.route('/api/process_batch', methods=['POST'])
def process_batch():
    """Procesa un lote de archivos"""
    data = request.get_json()
    if not data or 'files' not in data:
        return jsonify({'error': 'No files data provided'}), 400
    
    files_data = data['files']
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({'error': 'Session ID required'}), 400
    
    results = []
    processed_folder = os.path.join(app.config['PROCESSED_FOLDER'], session_id)
    os.makedirs(processed_folder, exist_ok=True)
    
    for file_data in files_data:
        try:
            file_path = file_data['path']
            filename = file_data['filename']
            fecha = file_data['fecha']
            hora = file_data['hora']
            accion = file_data.get('accion', 'modificar')
            file_type = file_data['file_type']
            
            # Validar que el archivo existe
            if not os.path.exists(file_path):
                results.append({
                    'filename': filename,
                    'success': False,
                    'message': 'Archivo no encontrado'
                })
                continue
            
            # Procesar archivo
            if not fecha:
                results.append({
                    'filename': filename,
                    'success': False,
                    'message': 'Fecha requerida'
                })
                continue
            
            # Construir datetime para metadatos
            hora_final = hora or "12:00:00"
            datetime_exif = f"{fecha} {hora_final}"
            
            # Copiar archivo a carpeta procesada
            processed_file_path = os.path.join(processed_folder, filename)
            shutil.copy2(file_path, processed_file_path)
            
            # Aplicar metadatos según el tipo
            if file_type == 'image':
                cambiar_metadata_imagen(processed_file_path, datetime_exif)
                message = f"Metadatos aplicados a imagen: {filename}"
            elif file_type == 'video':
                cambiar_metadata_video(processed_file_path, datetime_exif)
                message = f"Metadatos aplicados a video: {filename}"
            else:
                results.append({
                    'filename': filename,
                    'success': False,
                    'message': 'Tipo de archivo no soportado'
                })
                continue
            
            results.append({
                'filename': filename,
                'success': True,
                'message': message
            })
            
        except Exception as e:
            results.append({
                'filename': file_data.get('filename', 'unknown'),
                'success': False,
                'message': f"Error: {str(e)}"
            })
    
    return jsonify({
        'success': True,
        'results': results,
        'download_url': f"/api/download/{session_id}"
    })

@app.route('/api/download/<session_id>')
def download_processed_files(session_id):
    """Descarga archivos procesados como ZIP"""
    processed_folder = os.path.join(app.config['PROCESSED_FOLDER'], session_id)
    
    if not os.path.exists(processed_folder):
        return f"Error: Ningún archivo encontrado para session {session_id}", 404
    
    # Verificar que hay archivos en la carpeta
    files_list = []
    for root, dirs, files in os.walk(processed_folder):
        for file in files:
            file_path = os.path.join(root, file)
            files_list.append(file_path)
    
    if not files_list:
        return f"Error: Carpeta vacía para session {session_id}", 404
        
    # Crear ZIP físico en lugar de en memoria para evitar problemas
    zip_filename = f'processed_files_{session_id[:8]}.zip'
    zip_path = os.path.join(app.config['PROCESSED_FOLDER'], zip_filename)
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in files_list:
            arcname = os.path.basename(file_path)
            zip_file.write(file_path, arcname)
    
    # Limpieza de archivos (los limpiamos después de crear el ZIP)
    try:
        if os.path.exists(processed_folder) and processed_folder != zip_path:
            for item in os.listdir(processed_folder):
                item_path = os.path.join(processed_folder, item)
                if item_path != zip_path and os.path.isfile(item_path):
                    os.remove(item_path)
        
        upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], session_id)
        if os.path.exists(upload_folder):
            shutil.rmtree(upload_folder)
    except Exception as e:
        print(f"Error al limpiar archivos: {e}")
    
    try:
        return send_file(
            zip_path,
            mimetype='application/zip',
            as_attachment=True,
            download_name=zip_filename
        )
    except Exception as e:
        return f"Error al enviar archivo: {str(e)}", 500

@app.route('/api/extract_metadata', methods=['POST'])
def extract_metadata():
    """Extrae metadatos de un filename (para testing)"""
    data = request.get_json()
    filename = data.get('filename', '')
    
    try:
        fecha, hora = extract_datetime_from_filename(filename)
        return jsonify({
            'success': True,
            'fecha': fecha or '',
            'hora': hora or ''
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/<path:path>')
def catch_all(path):
    """Maneja rutas que no existen, verificando si es un UUID para descargar"""
    # Verificar si parece un UUID
    if len(path) == 36 and path.count('-') == 4:
        return redirect(url_for('download_processed_files', session_id=path))
    
    # Verificar si es un archivo .txt o .json que contiene un UUID
    if path.endswith('.txt') or path.endswith('.json'):
        base_name = os.path.basename(path)
        name_without_ext = os.path.splitext(base_name)[0]
        if len(name_without_ext) == 36 and name_without_ext.count('-') == 4:
            return redirect(url_for('download_processed_files', session_id=name_without_ext))
    
    # Si no es un UUID, mostrar página principal
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 