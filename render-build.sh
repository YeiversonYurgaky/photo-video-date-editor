#!/bin/bash

# Script de build para Render - instala dependencias del sistema
echo "Instalando dependencias del sistema..."

# Actualizar lista de paquetes
apt-get update

# Instalar exiftool y ffmpeg
apt-get install -y exiftool ffmpeg

# Instalar dependencias de Python
pip install -r requirements.txt

echo "Build completado exitosamente" 