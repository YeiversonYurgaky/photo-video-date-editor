import os
import sys
import re
import platform    
import shutil
from datetime import timedelta

try:
    from persiantools.jdatetime import JalaliDate
    PERSIAN = True
except ImportError:
    PERSIAN = False


def is_persian_date(date_str):
    try:
        year = int(date_str[:4])
        month = int(date_str[4:6])
        day = int(date_str[6:8])
        if 1300 <= year <= 1500:
            if 1 <= month <= 12 and 1 <= day <= 31:
                if month <= 6:
                    return day <= 31
                elif month <= 11:
                    return day <= 30
                else:
                    return day <= 30
        if 2000 <= year <= 2050:
            return False
        return True
    except (ValueError, IndexError):
        return False


def persian_date_to_gregorian(persian_date_str):
    if not PERSIAN:
        return None
    try:
        year = int(persian_date_str[:4])
        month = int(persian_date_str[4:6])
        day = int(persian_date_str[6:8])
        gregorian_date = JalaliDate(year, month, day).to_gregorian()
        if year == 1404 and month == 1:
            adjusted_date = gregorian_date - timedelta(days=1)
            return adjusted_date.strftime("%Y:%m:%d")
        return gregorian_date.strftime("%Y:%m:%d")
    except Exception:
        return None


def gregorian_date_to_exif_format(gregorian_date_str):
    try:
        year = gregorian_date_str[:4]
        month = gregorian_date_str[4:6]
        day = gregorian_date_str[6:8]
        return f"{year}:{month}:{day}"
    except Exception:
        return None


def extract_datetime_from_filename(filename):
    base = os.path.splitext(os.path.basename(filename))[0]

    # Pattern for: name_YYYY_MM_DD__HH_MM_SS
    match_double_underscore = re.search(
        r'_(\d{4}_\d{2}_\d{2})__(\d{2}_\d{2}_\d{2})', base)
    if match_double_underscore:
        date_str = match_double_underscore.group(1)
        time_str = match_double_underscore.group(2)
        fecha = date_str.replace('_', ':')
        hora = time_str.replace('_', ':')
        return fecha, hora

    # Busca el patrón: cualquier cosa, guion bajo, 8 dígitos, guion bajo
    match_custom = re.search(r'_(\d{8})_', base)
    if match_custom:
        date_str = match_custom.group(1)
        if is_persian_date(date_str):
            fecha = persian_date_to_gregorian(date_str)
        else:
            fecha = gregorian_date_to_exif_format(date_str)
        hora = None
        return fecha, hora
    # Luego busca cualquier 8 dígitos en el nombre
    match = re.search(r'(\d{8})', base)
    if match:
        date_str = match.group(1)
        if is_persian_date(date_str):
            fecha = persian_date_to_gregorian(date_str)
        else:
            fecha = gregorian_date_to_exif_format(date_str)
    else:
        fecha = None
    match2 = re.search(
        r'(\d{4})[-_](\d{1,2})[-_](\d{1,2})[-_](\d{1,2})[.](\d{1,2})[.](\d{1,2})', base)
    if match2:
        y, m, d, h, mi, s = match2.groups()
        fecha = f"{y}:{m.zfill(2)}:{d.zfill(2)}"
        hora = f"{h.zfill(2)}:{mi.zfill(2)}:{s.zfill(2)}"
        return fecha, hora
    match3 = re.search(r'(\d{4})[-_](\d{1,2})[-_](\d{1,2})', base)
    if match3:
        y, m, d = match3.groups()
        fecha = f"{y}:{m.zfill(2)}:{d.zfill(2)}"
    match4 = re.search(r'Status_(\w{3})_(\d{1,2})_(\d{4})', base)
    if match4:
        month_dict = {'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'}
        month = month_dict.get(match4.group(1), '01')
        day = match4.group(2).zfill(2)
        year = match4.group(3)
        fecha = f"{year}:{month}:{day}"
    match_hora = re.search(r'(\d{1,2})[.](\d{1,2})[.](\d{1,2})', base)
    if match_hora:
        h, mi, s = match_hora.groups()
        hora = f"{h.zfill(2)}:{mi.zfill(2)}:{s.zfill(2)}"
        return fecha, hora
    match_hora2 = re.search(r'_(\d{9})$', base)
    if match_hora2:
        t = match_hora2.group(1)
        hora = f"{t[:2]}:{t[2:4]}:{t[4:6]}"
        return fecha, hora
    match_hora3 = re.search(r'_(\d{6})[-\.]', base)
    if match_hora3:
        t = match_hora3.group(1)
        hora = f"{t[:2]}:{t[2:4]}:{t[4:6]}"
        return fecha, hora
    match_hora4 = re.search(r'_(\d{6})-', base)
    if match_hora4:
        t = match_hora4.group(1)
        hora = f"{t[:2]}:{t[2:4]}:{t[4:6]}"
        return fecha, hora
    hora = None
    return fecha, hora


def get_bin_path(filename):
    """
    Obtiene la ruta del binario, adaptándose al sistema operativo.
    Prioriza binarios del sistema en Linux/producción.
    """
    print(f"[DEBUG] Buscando binario: {filename} en {platform.system()}")
    
    # En Linux (como Render), usar binarios del sistema directamente
    if platform.system() != 'Windows':
        clean_filename = filename.replace('.exe', '')
        system_path = shutil.which(clean_filename)
        print(f"[DEBUG] Buscando {clean_filename} en sistema: {system_path}")
        if system_path:
            print(f"[DEBUG] Encontrado binario del sistema: {system_path}")
            return system_path
        else:
            print(f"[DEBUG] No encontrado {clean_filename} en PATH del sistema")
    
    # Fallback a carpeta bin local (para Windows/desarrollo)
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))
    
    bin_path = os.path.join(base_path, 'bin', filename)
    print(f"[DEBUG] Ruta de fallback: {bin_path}")
    
    # Si no existe el binario local, intentar sin .exe en Linux
    if not os.path.exists(bin_path) and platform.system() != 'Windows':
        clean_filename = filename.replace('.exe', '')
        bin_path = os.path.join(base_path, 'bin', clean_filename)
        print(f"[DEBUG] Intentando sin .exe: {bin_path}")
    
    if os.path.exists(bin_path):
        print(f"[DEBUG] Binario encontrado en: {bin_path}")
        return bin_path
    
    # Último intento: devolver solo el nombre si está en PATH
    if platform.system() != 'Windows':
        clean_filename = filename.replace('.exe', '')
        print(f"[DEBUG] Último intento, devolviendo nombre: {clean_filename}")
        return clean_filename
    
    print(f"[ERROR] No se pudo encontrar el binario {filename}")
    raise FileNotFoundError(f"No se pudo encontrar el binario {filename}")


def get_creationflags():
    import sys
    import subprocess
    if sys.platform == "win32":
        return getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return 0


def process_image(input_path, datetime_exif, exiftool_path=None):
    import subprocess
    flags = get_creationflags()
    if exiftool_path is None:
        exiftool_path = get_bin_path('exiftool.exe')
    if datetime_exif:
        result = subprocess.run([
            exiftool_path,
            f"-AllDates={datetime_exif}",
            f"-FileModifyDate={datetime_exif}",
            "-overwrite_original",
            "-P",
            "-api", "QuickTimeUTC=1",
            input_path
        ], capture_output=True, text=True, creationflags=flags)
        if result.returncode != 0:
            print("Exiftool error:", result.stderr)
            raise RuntimeError(f"Exiftool falló: {result.stderr}")
    return True


def process_video(input_path, output_path, datetime_exif, exiftool_path=None, ffmpeg_path=None):
    import subprocess
    flags = get_creationflags()
    if ffmpeg_path is None:
        ffmpeg_path = get_bin_path('ffmpeg.exe')
    if exiftool_path is None:
        exiftool_path = get_bin_path('exiftool.exe')
    subprocess.run([
        ffmpeg_path, "-y", "-i", input_path,
        "-vframes", "1", "-q:v", "1", output_path
    ], check=True, creationflags=flags)
    if datetime_exif:
        result = subprocess.run([
            exiftool_path,
            f"-AllDates={datetime_exif}",
            f"-FileModifyDate={datetime_exif}",
            "-overwrite_original",
            "-P",
            "-api", "QuickTimeUTC=1",
            output_path
        ], capture_output=True, text=True, creationflags=flags)
        if result.returncode != 0:
            print("Exiftool error:", result.stderr)
            raise RuntimeError(f"Exiftool falló: {result.stderr}")
    return True


def cambiar_metadata_imagen(input_path, datetime_exif, exiftool_path=None):
    """
    Cambia la metadata (fecha/hora) de una imagen usando exiftool.
    Args:
        input_path (str): Ruta al archivo de imagen original.
        datetime_exif (str): Fecha y hora en formato 'YYYY:MM:DD HH:MM:SS'.
        exiftool_path (str, opcional): Ruta a exiftool.exe. Si no se proporciona, se busca automáticamente.
    Returns:
        bool: True si la operación fue exitosa, lanza excepción si falla.
    """
    import subprocess
    import time
    flags = get_creationflags()
    if exiftool_path is None:
        exiftool_path = get_bin_path('exiftool.exe')
    # Espera hasta que el archivo exista y esté liberado
    intentos = 0
    max_intentos = 10
    while not os.path.exists(input_path) and intentos < max_intentos:
        time.sleep(0.1)
        intentos += 1
    # Reintenta aplicar metadatos hasta 3 veces si hay error de acceso
    for retry in range(3):
        try:
            if datetime_exif:
                result = subprocess.run([
                    exiftool_path,
                    f"-AllDates={datetime_exif}",
                    f"-FileModifyDate={datetime_exif}",
                    "-overwrite_original",
                    "-P",
                    input_path
                ], capture_output=True, text=True, creationflags=flags)
                if result.returncode != 0:
                    # Si es error de acceso/rename, espera y reintenta
                    if ("Error renaming temporary file" in result.stderr or
                        "GetFileTime error" in result.stderr or
                            "Permission denied" in result.stderr):
                        time.sleep(0.5)
                        continue
                    print("Exiftool error:", result.stderr)
                    raise RuntimeError(f"Exiftool falló: {result.stderr}")
            return True
        except Exception as e:
            if retry < 2:
                time.sleep(0.5)
                continue
            raise
    return True


def cambiar_metadata_video(video_path, datetime_exif, exiftool_path=None):
    """
    Cambia la metadata (fecha/hora) de un video directamente usando exiftool.
    Args:
        video_path (str): Ruta al archivo de video.
        datetime_exif (str): Fecha y hora en formato 'YYYY:MM:DD HH:MM:SS'.
        exiftool_path (str, opcional): Ruta a exiftool.exe. Si no se proporciona, se busca automáticamente.
    Returns:
        bool: True si la operación fue exitosa, lanza excepción si falla.
    """
    import subprocess
    flags = get_creationflags()
    if exiftool_path is None:
        exiftool_path = get_bin_path('exiftool.exe')
    # Extraer la fecha y hora por separado
    fecha = datetime_exif[:10]  # YYYY:MM:DD
    hora = datetime_exif[11:]   # HH:MM:SS
    args = [
        exiftool_path,
        f"-CreateDate={datetime_exif}",
        f"-ModifyDate={datetime_exif}",
        f"-MediaCreateDate={datetime_exif}",
        f"-MediaModifyDate={datetime_exif}",
        f"-TrackCreateDate={datetime_exif}",
        f"-TrackModifyDate={datetime_exif}",
        f"-CreationDate={datetime_exif}",
        f"-FileCreateDate={fecha} {hora}",
        f"-FileModifyDate={fecha} {hora}",
        "-overwrite_original",
        "-P",
        "-api", "QuickTimeUTC=1",
        video_path
    ]
    result = subprocess.run(args, capture_output=True,
                            text=True, creationflags=flags)
    if result.returncode != 0:
        print("Exiftool error:", result.stderr)
        raise RuntimeError(f"Exiftool falló: {result.stderr}")
    return True 