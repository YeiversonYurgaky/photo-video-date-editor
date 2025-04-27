import os
import sys
import re
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
    hora = None
    return fecha, hora


def get_bin_path(filename):
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, 'bin', filename)


def process_image(input_path, datetime_exif, exiftool_path=None):
    import subprocess
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
        ], capture_output=True, text=True)
        if result.returncode != 0:
            print("Exiftool error:", result.stderr)
            raise RuntimeError(f"Exiftool falló: {result.stderr}")
    return True


def process_video(input_path, output_path, datetime_exif, exiftool_path=None, ffmpeg_path=None):
    import subprocess
    if ffmpeg_path is None:
        ffmpeg_path = get_bin_path('ffmpeg.exe')
    if exiftool_path is None:
        exiftool_path = get_bin_path('exiftool.exe')
    subprocess.run([
        ffmpeg_path, "-y", "-i", input_path,
        "-vframes", "1", "-q:v", "1", output_path
    ], check=True)
    if datetime_exif:
        result = subprocess.run([
            exiftool_path,
            f"-AllDates={datetime_exif}",
            f"-FileModifyDate={datetime_exif}",
            "-overwrite_original",
            "-P",
            "-api", "QuickTimeUTC=1",
            output_path
        ], capture_output=True, text=True)
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
    return process_image(input_path, datetime_exif, exiftool_path)


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
    if exiftool_path is None:
        exiftool_path = get_bin_path('exiftool.exe')
    args = [
        exiftool_path,
        f"-AllDates={datetime_exif}",
        f"-FileModifyDate={datetime_exif}",
        "-overwrite_original",
        "-P",
        "-api", "QuickTimeUTC=1",
        video_path
    ]
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        print("Exiftool error:", result.stderr)
        raise RuntimeError(f"Exiftool falló: {result.stderr}")
    return True
