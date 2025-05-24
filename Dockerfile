FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    exiftool \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make executable files in bin directory and exiftool_files executable
RUN if [ -d "bin" ]; then chmod +x bin/*.exe || true; fi
RUN if [ -d "bin/exiftool_files" ]; then chmod +x bin/exiftool_files/*.exe bin/exiftool_files/*.dll bin/exiftool_files/*.pl || true; fi

# Create fallback symlinks in case system tools aren't available
RUN mkdir -p /usr/local/bin
RUN if [ ! -f "/usr/local/bin/exiftool" ] && [ -f "bin/exiftool.exe" ]; then ln -sf "$(pwd)/bin/exiftool_files/perl.exe" /usr/local/bin/perl && ln -sf "$(pwd)/bin/exiftool_files/exiftool.pl" /usr/local/bin/exiftool; fi
RUN if [ ! -f "/usr/local/bin/ffmpeg" ] && [ -f "bin/ffmpeg.exe" ]; then ln -sf "$(pwd)/bin/ffmpeg.exe" /usr/local/bin/ffmpeg; fi

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"] 