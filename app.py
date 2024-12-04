from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify
import pyttsx3
import io
import os
import tempfile

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        text = ''
        file = request.files.get('file')
        if file and file.filename != '':
            text = file.read().decode('utf-8')
        else:
            text = request.form.get('text', '')
        return redirect(url_for('display', text=text))
    return render_template('index.html')

@app.route('/display')
def display():
    text = request.args.get('text', '')
    return render_template('display.html', text=text)

@app.route('/speak', methods=['POST'])
def speak():
    data = request.get_json()
    text = data['text']

    # Initialize pyttsx3 engine
    engine = pyttsx3.init()

    # Create an in-memory bytes buffer
    audio = io.BytesIO()

    # Set properties before adding
    engine.setProperty('rate', 150)  # Set speech rate
    engine.setProperty('volume', 1.0)  # Set volume (0.0 to 1.0)

    # Save the speech to the in-memory file
    engine.save_to_file(text, 'temp_audio.mp3')
    engine.runAndWait()

    # Read the audio file and send it
    with open('temp_audio.mp3', 'rb') as f:
        audio_bytes = f.read()

    # Remove the temporary audio file
    os.remove('temp_audio.mp3')

    return send_file(
        io.BytesIO(audio_bytes),
        mimetype='audio/mpeg',
        as_attachment=False,
        download_name='speech.mp3'
    )

@app.route('/speak_word', methods=['POST'])
def speak_word():
    data = request.get_json()
    word = data.get('word', '')
    if not word:
        return jsonify({'error': 'No word provided'}), 400

    # Initialize pyttsx3 engine
    engine = pyttsx3.init()

    # Set properties
    engine.setProperty('rate', 150)  # Speech rate
    engine.setProperty('volume', 1.0)  # Volume (0.0 to 1.0)

    # Use a temporary file to save the speech
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmpfile:
        temp_filename = tmpfile.name
        engine.save_to_file(word, temp_filename)
        engine.runAndWait()

    # Read the audio file
    with open(temp_filename, 'rb') as f:
        audio_bytes = f.read()

    # Remove the temporary audio file
    os.remove(temp_filename)

    return send_file(
        io.BytesIO(audio_bytes),
        mimetype='audio/mpeg',
        as_attachment=False,
        download_name=f'{word}.mp3'
    )

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/help')
def help_page():
    return render_template('help.html')

if __name__ == '__main__':
    app.run(debug=True)
