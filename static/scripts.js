// scripts.js

// Theme Toggle
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;

    // Check for saved theme in localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    }

    themeToggleBtn.textContent = body.classList.contains('dark-mode') ? '☀️ Light Mode' : '🌙 Dark Mode';

    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        themeToggleBtn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    });
});

// Function to update displayed text based on selected language
function updateTextDisplay() {
    const language = document.getElementById('display-language').value;
    const textContainer = document.getElementById('text-container');
    const textWrapper = textContainer.querySelector('.text-wrapper');
    textWrapper.innerHTML = ''; // Clear existing text

    const text = window.currentTexts[language] || "";
    const paragraphs = text.split(/\n\s*\n/); // Split by empty lines

    paragraphs.forEach(paragraph => {
        const p = document.createElement('p');
        const words = paragraph.split(/\s+/); // Split by whitespace
        words.forEach(word => {
            // Regex to check if the word is purely numerical (e.g., "123", "4567")
            const isNumber = /^\d+$/.test(word);

            if (isNumber) {
                // Render numerical words as styled plain text
                const span = document.createElement('span');
                span.textContent = word + ' ';
                span.classList.add('numerical-word'); // Add CSS class
                p.appendChild(span);
            } else {
                // Render non-numerical words as clickable spans for TTS
                const span = document.createElement('span');
                span.textContent = word;
                span.onclick = () => readWord(word, span);
                span.tabIndex = 0; // Make span focusable for accessibility
                span.setAttribute('role', 'button');
                span.setAttribute('aria-label', `Read word: ${word}`);
                p.appendChild(span);
                p.appendChild(document.createTextNode(' ')); // Add space between words
            }
        });
        textWrapper.appendChild(p);
    });
}

// Listen for display language change
document.getElementById('display-language').addEventListener('change', updateTextDisplay);

// Initialize the text display based on the default selected language
window.onload = updateTextDisplay;

// Function to sanitize text by removing numbers and digits
function sanitizeText(text) {
    // Remove standalone numbers (e.g., "123")
    // Also remove numbers attached to words (e.g., "Section 2.1" becomes "Section .")
    return text.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
}

// Function to read a single word with punctuation handling
function readWord(word, spanElement) {
    const language = document.getElementById('display-language').value;

    // Strip punctuation for TTS
    const cleanWord = word.replace(/[.,!?;:()]/g, '');

    if (cleanWord === '') return; // Do not process empty strings

    fetch('/read_word', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: cleanWord, language: language })
    })
    .then(response => response.json())
    .then(data => {
        if(data.error){
            alert(`Error: ${data.error}`);
            return;
        }
        const audio = new Audio(data.audio);
        audio.play();
        highlightWord(spanElement);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Global variables to manage full text audio and its state
let fullTextAudio = null;
let isFullTextPaused = false;

// Function to read the full text
function readFullText() {
    const language = document.getElementById('display-language').value;
    toggleSpinner(true);

    // If there's an existing fullTextAudio playing or paused, stop it before starting a new one
    if (fullTextAudio) {
        fullTextAudio.pause();
        fullTextAudio.currentTime = 0;
        fullTextAudio = null;
    }

    // Get the current text
    const originalText = window.currentTexts[language] || "";
    const sanitizedText = sanitizeText(originalText);

    // Send the sanitized text to the server instead of the original
    fetch('/read_text', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: language, text: sanitizedText })
    })
    .then(response => response.json())
    .then(data => {
        toggleSpinner(false);
        if(data.error){
            alert(`Error: ${data.error}`);
            return;
        }
        fullTextAudio = new Audio(data.audio);
        fullTextAudio.play();
        isFullTextPaused = false;
        updatePausePlayButton(); // Set button to 'Pause'

        fullTextAudio.onended = () => {
            fullTextAudio = null;
            isFullTextPaused = false;
            updatePausePlayButton(); // Reset button to 'Pause'
            toggleSpinner(false);
        };
    })
    .catch(error => {
        toggleSpinner(false);
        console.error('Error:', error);
    });
}

// Function to pause or play the full text audio
function pausePlayFullText() {
    if (!fullTextAudio) {
        // No audio is currently playing
        return;
    }

    if (isFullTextPaused) {
        // Resume playback
        fullTextAudio.play();
        isFullTextPaused = false;
    } else {
        // Pause playback
        fullTextAudio.pause();
        isFullTextPaused = true;
    }

    updatePausePlayButton();
}

// Function to stop the full text reading
function stopFullText() {
    if (fullTextAudio) {
        fullTextAudio.pause();
        fullTextAudio.currentTime = 0;
        fullTextAudio = null;
        isFullTextPaused = false;
        updatePausePlayButton(); // Reset button to 'Pause'
        toggleSpinner(false);
    }
}

// Function to highlight a word during audio playback
function highlightWord(spanElement) {
    // Remove existing highlights
    document.querySelectorAll('.text-wrapper span').forEach(span => {
        span.classList.remove('highlight');
    });

    // Add highlight to the selected word
    spanElement.classList.add('highlight');

    // Remove highlight after a short delay (e.g., 1 second)
    setTimeout(() => {
        spanElement.classList.remove('highlight');
    }, 1000); // Highlight lasts for 1 second
}

// Function to show/hide spinner
function toggleSpinner(show) {
    if (show) {
        document.body.classList.add('loading');
    } else {
        document.body.classList.remove('loading');
    }
}

// Function to update the Pause/Play button based on playback state
function updatePausePlayButton() {
    const pausePlayBtn = document.querySelector('.pause-play-full-text');
    if (isFullTextPaused) {
        pausePlayBtn.textContent = '▶️ Play';
        pausePlayBtn.setAttribute('aria-label', 'Play Reading Full Text');
    } else {
        pausePlayBtn.textContent = '⏸️ Pause';
        pausePlayBtn.setAttribute('aria-label', 'Pause Reading Full Text');
    }
}

// Function to search within text
function searchText() {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    const spans = document.querySelectorAll('.text-wrapper span');

    // Clear previous search highlights
    spans.forEach(span => {
        span.classList.remove('search-highlight');
    });

    if (query === '') return;

    spans.forEach(span => {
        if (span.textContent.toLowerCase().includes(query)) {
            span.classList.add('search-highlight');
        }
    });
}


// Function to change font size
// Function to change font size for the text container
function changeFontSize(action) {
    const textWrapper = document.querySelector('#text-container .text-wrapper');
    const style = window.getComputedStyle(textWrapper);
    let currentSize = parseFloat(style.fontSize); // Get the current font size in px

    // Define minimum and maximum font size
    const minFontSize = 12;
    const maxFontSize = 36;

    if (action === 'increase' && currentSize < maxFontSize) {
        currentSize += 2; // Increase font size by 2px
    } else if (action === 'decrease' && currentSize > minFontSize) {
        currentSize -= 2; // Decrease font size by 2px
    }

    // Apply the new font size
    textWrapper.style.fontSize = `${currentSize}px`;
}


/* Line Guide Toggle Functionality with Persistence */
document.addEventListener('DOMContentLoaded', () => {
    const toggleLineGuideBtn = document.getElementById('toggle-line-guide');
    const textContainer = document.getElementById('text-container');
    let lineGuideActive = localStorage.getItem('lineGuideActive') === 'true';
    let lineGuide = null;

    if (lineGuideActive) {
        toggleLineGuideBtn.textContent = '📏 Hide Line Guide';
        // Create and append the line guide element
        lineGuide = textContainer.querySelector('.line-guide');
        // Add mousemove and touchmove event listeners with throttling
        textContainer.addEventListener('mousemove', throttle(handleCursorMove, 20));
        textContainer.addEventListener('touchmove', throttle(handleCursorMove, 20));
    } else {
        toggleLineGuideBtn.textContent = '📏 Show Line Guide';
    }

    toggleLineGuideBtn.addEventListener('click', () => {
        lineGuideActive = !lineGuideActive;
        localStorage.setItem('lineGuideActive', lineGuideActive);
        if (lineGuideActive) {
            toggleLineGuideBtn.textContent = '📏 Hide Line Guide';
            // Ensure the line guide element exists
            if (!lineGuide) {
                lineGuide = document.createElement('div');
                lineGuide.classList.add('line-guide');
                textContainer.appendChild(lineGuide);
            }

            // Add mousemove and touchmove event listeners
            textContainer.addEventListener('mousemove', throttle(handleCursorMove, 20));
            textContainer.addEventListener('touchmove', throttle(handleCursorMove, 20));
        } else {
            toggleLineGuideBtn.textContent = '📏 Show Line Guide';
            // Remove the line guide element if desired, or hide it
            if (lineGuide) {
                textContainer.removeChild(lineGuide);
                lineGuide = null;
            }
            // Remove mousemove and touchmove event listeners
            textContainer.removeEventListener('mousemove', handleCursorMove);
            textContainer.removeEventListener('touchmove', handleCursorMove);
        }

        // Update accessibility attributes
        const status = lineGuideActive ? 'activated' : 'deactivated';
        toggleLineGuideBtn.setAttribute('aria-pressed', lineGuideActive);
        toggleLineGuideBtn.setAttribute('aria-label', `Toggle Line Guide, currently ${status}`);
    });

    function handleCursorMove(event) {
        if (!lineGuide) return;

        const rect = textContainer.getBoundingClientRect();
        let y;

        if (event.type.startsWith('touch')) {
            if (event.touches.length === 0) return;
            y = event.touches[0].clientY - rect.top;
        } else {
            y = event.clientY - rect.top;
        }

        // Position the line-guide vertically within the text container
        y += textContainer.scrollTop;
        lineGuide.style.top = `${y}px`;
    }


    // Throttle function to improve performance
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
            const context = this;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        }
    }
});
