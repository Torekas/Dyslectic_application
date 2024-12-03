from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify
from gtts import gTTS
import io
import os
import pygame

app = Flask(__name__)

# Initialize pygame mixer
pygame.mixer.init()

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        text = ''
        file = request.files['file']
        if file:
            text = file.read().decode('utf-8')
        else:
            text = request.form['text']
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
    tts = gTTS(text)
    audio = io.BytesIO()
    tts.write_to_fp(audio)
    audio.seek(0)
    return send_file(audio, mimetype='audio/mpeg')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/help')
def help_page():
    return render_template('help.html')


if __name__ == '__main__':
    app.run(debug=True)
