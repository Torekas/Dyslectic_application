import os
import uuid
import threading
import time
from flask import Flask, render_template, request, send_from_directory, jsonify, redirect, url_for, flash
from gtts import gTTS
from PyPDF2 import PdfReader
from werkzeug.utils import secure_filename
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


app = Flask(__name__)
app.secret_key = 'your_secure_secret_key'  # Replace with a secure key in production

# Supported languages with their full names
SUPPORTED_LANGUAGES = {
    'en': "English",
    'pl': "Polski"
}

# Initialize current texts with default samples
CURRENT_TEXT = {
    'en': "This is a simple Flask application to read a word or the entire text.",
    'pl': "To jest prosta aplikacja Flask do odczytywania pojedynczych słów lub całego tekstu."
}

# Temporary directories
TEMP_DIR = 'temp_audio'
UPLOAD_DIR = 'uploads'
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)


def extract_text_from_pdf(pdf_path):
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n\n"  # Double newline for paragraph separation
        return text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None


@app.route('/', methods=['GET'])
def index():
    return render_template('index.html', languages=SUPPORTED_LANGUAGES, current_text=CURRENT_TEXT)


@app.route('/upload', methods=['POST'])
def upload():
    global CURRENT_TEXT
    if 'file' not in request.files:
        flash('No file part in the request.', 'error')
        return redirect(url_for('index'))

    file = request.files['file']
    upload_language = request.form.get('upload_language', 'en')  # Correctly matches 'upload_language'

    print(f"Received upload_language: {upload_language}")  # Debug Statement

    if upload_language not in SUPPORTED_LANGUAGES:
        flash('Unsupported language selected.', 'error')
        return redirect(url_for('index'))

    if file.filename == '':
        flash('No file selected for uploading.', 'error')
        return redirect(url_for('index'))

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_DIR, filename)
        file.save(file_path)

        # Extract text based on file type
        if filename.lower().endswith('.txt'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                print(f"Extracted text from TXT: {text[:50]}...")  # Debug Statement
            except Exception as e:
                flash(f'Error reading TXT file: {e}', 'error')
                os.remove(file_path)
                return redirect(url_for('index'))
        elif filename.lower().endswith('.pdf'):
            text = extract_text_from_pdf(file_path)
            if text is None:
                flash('Failed to extract text from PDF.', 'error')
                os.remove(file_path)
                return redirect(url_for('index'))
            print(f"Extracted text from PDF: {text[:50]}...")  # Debug Statement
        else:
            flash('Unsupported file format.', 'error')
            os.remove(file_path)
            return redirect(url_for('index'))

        # Update CURRENT_TEXT for the selected language
        if text:
            CURRENT_TEXT[upload_language] = text
            print(f"Updated CURRENT_TEXT['{upload_language}'] with uploaded text.")  # Debug Statement
            print(f"CURRENT_TEXT after upload: {CURRENT_TEXT}")  # Debug Statement
            flash('File successfully uploaded and text extracted.', 'success')
        else:
            flash('No text found in the uploaded file.', 'error')

        # Remove the uploaded file after processing
        os.remove(file_path)
    else:
        flash('Allowed file types are TXT and PDF.', 'error')

    return redirect(url_for('index'))


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'txt', 'pdf'}


@app.route('/read_word', methods=['POST'])
def read_word():
    data = request.get_json()
    word = data.get('word')
    language = data.get('language', 'en')  # Default to English if not provided

    if not word:
        return jsonify({"error": "No word provided"}), 400

    if language not in SUPPORTED_LANGUAGES:
        return jsonify({"error": "Unsupported language"}), 400

    # Generate a unique filename for the audio file
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(TEMP_DIR, filename)

    try:
        # Generate the TTS audio
        tts = gTTS(text=word, lang=language)
        tts.save(filepath)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Return a unique URL for the audio file
    return jsonify({"audio": f"/play_audio/{filename}"})


@app.route('/read_text', methods=['POST'])
def read_text():
    data = request.get_json()
    language = data.get('language', 'en')  # Default to English if not provided
    text = data.get('text', '')  # Get the sanitized text from the client

    if language not in SUPPORTED_LANGUAGES:
        return jsonify({"error": "Unsupported language"}), 400

    if not text.strip():
        return jsonify({"error": "No text available for the selected language."}), 400

    # Generate a unique filename for the full text audio
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(TEMP_DIR, filename)

    try:
        # Generate the TTS audio for the sanitized text
        tts = gTTS(text=text, lang=language)
        tts.save(filepath)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Return a unique URL for the full text audio
    return jsonify({"audio": f"/play_audio/{filename}"})


@app.route('/play_audio/<filename>')
def play_audio(filename):
    # Serve the generated MP3 file
    return send_from_directory(TEMP_DIR, filename)


def cleanup_temp_audio():
    """Delete audio files older than 10 minutes every 5 minutes."""
    while True:
        now = time.time()
        for filename in os.listdir(TEMP_DIR):
            file_path = os.path.join(TEMP_DIR, filename)
            if os.path.isfile(file_path):
                # Delete files older than 10 minutes (600 seconds)
                if now - os.path.getmtime(file_path) > 600:
                    try:
                        os.remove(file_path)
                        print(f"Deleted old audio file: {filename}")
                    except Exception as e:
                        print(f"Error deleting file {filename}: {e}")
        time.sleep(300)  # Wait for 5 minutes before next cleanup


# Start the cleanup thread
cleanup_thread = threading.Thread(target=cleanup_temp_audio, daemon=True)
cleanup_thread.start()

if __name__ == '__main__':
    app.run(debug=True, threaded=False)  # Ensure single-threaded for debugging
