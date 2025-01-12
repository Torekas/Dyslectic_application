# tests/test_app.py

import os
import pytest
from flask import url_for
from app import app


@pytest.fixture
def client():
    """
    Pytest fixture to create a Flask test client.
    """
    app.config['TESTING'] = True
    # Disable audio generation in tests to speed up or avoid external calls
    # (Optional) You can also patch gTTS if desired.

    with app.test_client() as client:
        yield client


def test_index_route(client):
    """
    Test that the index page returns a 200 status code.
    """
    response = client.get('/')
    assert response.status_code == 200
    assert b"<title>Text to Speech Reader</title>" not in response.data, \
        "Check if your index.html has a <title> or adapt this assertion as needed."
    # Adapt the assertion to match some known text or HTML from your index.html


def test_read_word_missing_word(client):
    """
    Test /read_word endpoint with no 'word' provided in the JSON.
    Should return a 400 error.
    """
    response = client.post('/read_word', json={})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "No word provided"


def test_read_word_unsupported_language(client):
    """
    Test /read_word endpoint with unsupported language.
    Should return a 400 error.
    """
    response = client.post('/read_word', json={
        "word": "test",
        "language": "xx"  # An unsupported language code
    })
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Unsupported language"


def test_read_word_success(client):
    """
    Test /read_word endpoint with valid data.
    """
    response = client.post('/read_word', json={
        "word": "Hello",
        "language": "en"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert "audio" in data
    # The 'audio' key should be something like "/play_audio/<uuid>.mp3"
    assert data["audio"].startswith("/play_audio/")


def test_read_text_no_text(client):
    """
    Test /read_text endpoint with no text provided.
    Should return a 400 error.
    """
    response = client.post('/read_text', json={
        "language": "en",
        "text": ""
    })
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "No text available for the selected language."


def test_read_text_unsupported_language(client):
    """
    Test /read_text endpoint with an unsupported language.
    """
    response = client.post('/read_text', json={
        "language": "xx",
        "text": "Some text"
    })
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Unsupported language"


def test_read_text_success(client):
    """
    Test /read_text endpoint with valid data.
    """
    test_text = "This is a test text."
    response = client.post('/read_text', json={
        "language": "en",
        "text": test_text
    })
    assert response.status_code == 200
    data = response.get_json()
    assert "audio" in data
    assert data["audio"].startswith("/play_audio/")


def test_get_syllabified_text_missing_text(client):
    """
    Test /get_syllabified_text with missing text.
    Should return a 400 error.
    """
    response = client.post('/get_syllabified_text', json={
        "language": "en",
        "text": ""
    })
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "No text provided"


def test_get_syllabified_text_unsupported_language(client):
    """
    Test /get_syllabified_text with unsupported language.
    """
    response = client.post('/get_syllabified_text', json={
        "language": "xx",
        "text": "Some text"
    })
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Unsupported language"


def test_get_syllabified_text_success(client):
    """
    Test /get_syllabified_text endpoint with valid data.
    (This assumes Pyphen can handle 'en' by default.)
    """
    test_text = "Testing syllabification"
    response = client.post('/get_syllabified_text', json={
        "language": "en",
        "text": test_text
    })
    assert response.status_code == 200
    data = response.get_json()
    assert "syllabified_text" in data
    # Check that the response is not empty. Actual result depends on pyphen.
    assert data["syllabified_text"] != ""


def test_upload_no_file(client):
    """
    Test upload with no file provided.
    """
    data = {
        'upload_language': 'en'
    }
    response = client.post('/upload', data=data)
    # Since the route returns a redirect to '/', we check for 302 status code.
    assert response.status_code == 302


def test_upload_unsupported_language(client):
    """
    Test upload with an unsupported language in the form data.
    """
    data = {
        'upload_language': 'xx'
    }
    response = client.post('/upload', data=data)
    # Also expects a redirect with an error flash message
    assert response.status_code == 302


@pytest.mark.parametrize("filename, content_type", [
    ("test.txt", "text/plain"),
    ("test.pdf", "application/pdf")
])
def test_upload_allowed_file_formats(client, tmp_path, filename, content_type):
    """
    Test upload with allowed file types.
    We'll create a dummy file in a temp directory to simulate an upload.
    """
    file_content = b"This is a test file."
    test_file = tmp_path / filename
    test_file.write_bytes(file_content)

    data = {
        'upload_language': 'en'
    }
    with open(test_file, 'rb') as f:
        response = client.post(
            '/upload',
            data={
                'file': (f, filename),
                'upload_language': 'en'
            },
            content_type='multipart/form-data'
        )
    # The route should redirect back to '/'
    assert response.status_code == 302


def test_play_audio_nonexistent(client):
    """
    Test /play_audio with a nonexistent file to see how it behaves.
    We expect a 404 if the file doesn't exist on the server.
    """
    response = client.get('/play_audio/no_such_file.mp3')
    assert response.status_code == 404
