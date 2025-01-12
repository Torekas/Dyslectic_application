# app.py

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
import pyphen  # Import pyphen

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

app = Flask(__name__)
app.secret_key = 'your_secure_secret_key'  # Replace with a secure key in production

# Obsługiwane języki z ich pełnymi nazwami
SUPPORTED_LANGUAGES = {
    'en': "English",
    'pl': "Polski",
    'es': "Español",
    'de': "Deutsch",
    'fr': "Français",
    'it': "Italiano",
    'pt': "Português",
    'ru': "Русский",
    'ja': "日本語",
    'zh-cn': "中文 (简体)",
    'ar': "العربية",
    # Dodaj więcej języków według potrzeb
}

# Inicjalizacja aktualnych tekstów z domyślnymi przykładami
CURRENT_TEXT = {
    'en': "This is a simple Flask application to read a word or the entire text.",
    'pl': "Każdego ranka, Ania wstaje z łóżka. Najpierw umyje twarz i je śniadanie. Potem zakłada plecak i idzie do szkoły. W szkole Ania uczy się matematyki, języka polskiego oraz przyrody. Po lekcjach spotyka się ze przyjaciółmi na placu zabaw. Wieczorem Ania odrabia zadania domowe, czyta książkę i kładzie się do łóżka, aby odpocząć przed nowym dniem.",
    'es': "Esta es una aplicación Flask sencilla para leer una palabra o todo el texto.",
    'de': "Dies ist eine einfache Flask-Anwendung, um ein Wort oder den gesamten Text vorzulesen.",
    'fr': "Ceci est une application Flask simple pour lire un mot ou tout le texte.",
    'it': "Questa è una semplice applicazione Flask per leggere una parola o l'intero testo.",
    'pt': "Este é um aplicativo Flask simples para ler uma palavra ou todo o texto.",
    'ru': "Это простое приложение Flask для чтения слова или всего текста.",
    'ja': "これは単語または全文を読むためのシンプルなFlaskアプリケーションです。",
    'zh-cn': "这是一个简单的Flask应用程序，用于朗读单词或整个文本。",
    'ar': "هذا تطبيق Flask بسيط لقراءة كلمة أو النص بالكامل.",
    # Dodaj więcej języków według potrzeb
}

# Inicjalizacja słowników sylabowych
DICTIONARIES = {}
for lang_code in SUPPORTED_LANGUAGES.keys():
    try:
        DICTIONARIES[lang_code] = pyphen.Pyphen(lang=lang_code)
        print(f"Słownik dla języka '{lang_code}' załadowany pomyślnie.")
    except KeyError:
        DICTIONARIES[lang_code] = None  # Obsłuż brak obsługi języka
        print(f"Brak słownika dla języka '{lang_code}'.")

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
                text += page_text + "\n\n"  # Podwójny nowy wiersz dla oddzielenia akapitów
        return text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None


def syllabify_text(text, language):
    dic = DICTIONARIES.get(language)
    if not dic:
        print(f"Słownik dla języka '{language}' nie jest dostępny. Zwracanie oryginalnego tekstu.")
        return text  # Jeśli nie ma słownika dla języka, zwróć tekst bez zmian

    words = text.split()
    syllabified_words = []
    for word in words:
        # Użyj funkcji insert() z pyphen do podziału słowa na sylaby
        syllables = dic.inserted(word)
        syllabified_words.append(syllables)

    return ' '.join(syllabified_words)


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
    upload_language = request.form.get('upload_language', 'en')  # Poprawiona nazwa pola

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
    language = data.get('language', 'en')  # Domyślnie angielski
    syllabify = data.get('syllabify', False)  # Nowa opcja

    if not word:
        return jsonify({"error": "No word provided"}), 400

    if language not in SUPPORTED_LANGUAGES:
        return jsonify({"error": "Unsupported language"}), 400

    if syllabify:
        word = syllabify_text(word, language)

    # Generuj unikalną nazwę pliku audio
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(TEMP_DIR, filename)

    try:
        # Generuj TTS audio
        tts = gTTS(text=word, lang=language)
        tts.save(filepath)
        print(f"Generated TTS audio for word: {filename}")
    except Exception as e:
        print(f"Error generating TTS audio: {e}")
        return jsonify({"error": str(e)}), 500

    # Zwróć unikalny URL dla pliku audio
    return jsonify({"audio": f"/play_audio/{filename}"})


@app.route('/read_text', methods=['POST'])
def read_text():
    data = request.get_json()
    language = data.get('language', 'en')  # Domyślnie angielski
    text = data.get('text', '')  # Pobierz przetworzony tekst
    syllabify = data.get('syllabify', False)  # Nowa opcja

    print(f"Received read_text request: language={language}, syllabify={syllabify}")
    print(f"Text length: {len(text)}")

    if language not in SUPPORTED_LANGUAGES:
        print("Unsupported language.")
        return jsonify({"error": "Unsupported language"}), 400

    if not text.strip():
        print("No text provided.")
        return jsonify({"error": "No text available for the selected language."}), 400

    if syllabify:
        text = syllabify_text(text, language)
        print(f"Syllabified text: {text[:50]}...")  # Print first 50 chars for brevity

    # Generuj unikalną nazwę pliku audio
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(TEMP_DIR, filename)

    try:
        # Generuj TTS audio
        tts = gTTS(text=text, lang=language)
        tts.save(filepath)
        print(f"Generated TTS audio for full text: {filename}")
    except Exception as e:
        print(f"Error generating TTS audio: {e}")
        return jsonify({"error": str(e)}), 500

    # Zwróć unikalny URL dla pliku audio
    return jsonify({"audio": f"/play_audio/{filename}"})


@app.route('/get_syllabified_text', methods=['POST'])
def get_syllabified_text():
    data = request.get_json()
    language = data.get('language', 'en')  # Domyślnie angielski
    text = data.get('text', '')  # Pobierz przetworzony tekst

    if language not in SUPPORTED_LANGUAGES:
        return jsonify({"error": "Unsupported language"}), 400

    if not text.strip():
        return jsonify({"error": "No text provided"}), 400

    syllabified_text = syllabify_text(text, language)

    return jsonify({"syllabified_text": syllabified_text})


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
