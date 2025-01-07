// Global Variables
let fullTextAudio = null;
let isFullTextPaused = false;

// Theme Toggle Initialization
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

    // Speed Control Initialization
    const speedSlider = document.getElementById('reading-speed');
    const speedValue = document.getElementById('speed-value');
    const savedSpeed = localStorage.getItem('readingSpeed') || '1';
    speedSlider.value = savedSpeed;
    speedValue.textContent = `${savedSpeed}x`;

    speedSlider.addEventListener('input', () => {
        const speed = speedSlider.value;
        speedValue.textContent = `${speed}x`;
        localStorage.setItem('readingSpeed', speed);
    });

    // Syllabification Initialization
    const syllabifyCheckbox = document.getElementById('syllabify-checkbox');
    const savedSyllabify = localStorage.getItem('syllabify') === 'true';
    syllabifyCheckbox.checked = savedSyllabify;

    syllabifyCheckbox.addEventListener('change', () => {
        localStorage.setItem('syllabify', syllabifyCheckbox.checked);
        updateTextDisplay();  // Aktualizuj wyświetlany tekst
    });

    // Wywołanie updateTextDisplay podczas ładowania strony
    updateTextDisplay();
});

// Function to update displayed text based on selected language and syllabification
async function updateTextDisplay() {
    const language = document.getElementById('display-language').value;
    const textContainer = document.getElementById('text-container');
    const textWrapper = textContainer.querySelector('.text-wrapper');
    textWrapper.innerHTML = ''; // Clear existing text

    const originalText = window.currentTexts[language] || "";
    const syllabify = localStorage.getItem('syllabify') === 'true';
    let displayText = originalText;

    if (syllabify) {
        try {
            const response = await fetch('/get_syllabified_text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ language: language, text: originalText })
            });
            const data = await response.json();
            if (data.error) {
                alert(`Error: ${data.error}`);
                return;
            }
            displayText = data.syllabified_text;
        } catch (error) {
            console.error('Error fetching syllabified text:', error);
            return;
        }
    }

    const paragraphs = displayText.split(/\n\s*\n/); // Split by empty lines

    // Lista słów do wizualizacji
    const wordsToVisualize = ["Ania", "łóżka", "umyje", "je", "plecak", "szkoły", "przyrody", "przyjaciółmi", "zadania", "czyta", "łóżka"];

    paragraphs.forEach(paragraph => {
        const p = document.createElement('p');
        const words = paragraph.split(/\s+/); // Split by words
        words.forEach(word => {
            // Remove punctuation
            const cleanWord = word.replace(/[.,!?;:()]/g, '');

            // Check if word is in the list to visualize
            if (wordsToVisualize.includes(cleanWord)) {
                const span = document.createElement('span');
                span.classList.add('visualizable-word');
                span.textContent = word + ' ';
                span.onclick = () => {
                    readWord(cleanWord, span);
                    displayImageForWord(cleanWord);
                };
                p.appendChild(span);
            } else {
                const span = document.createElement('span');
                span.textContent = word + ' ';
                // Assign readWord to all words
                span.onclick = () => readWord(cleanWord, span);
                span.classList.add('readable-word'); // Optional class for styling
                p.appendChild(span);
            }
        });
        textWrapper.appendChild(p);
    });
}

// Function to read a single word with punctuation handling
function readWord(word, spanElement) {
    const language = document.getElementById('display-language').value;
    const speed = parseFloat(document.getElementById('reading-speed').value); // Get selected speed
    const syllabify = localStorage.getItem('syllabify') === 'true';

    // Strip punctuation for TTS
    const cleanWord = word.replace(/[.,!?;:()]/g, '');

    if (cleanWord === '') return; // Do not process empty strings

    console.log('Reading word:', cleanWord);

    fetch('/read_word', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: cleanWord, language: language, syllabify: syllabify })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Received data from /read_word:', data);
        if(data.error){
            alert(`Error: ${data.error}`);
            return;
        }
        const audio = new Audio(data.audio);
        audio.playbackRate = speed; // Set playback rate
        audio.play();
        highlightWord(spanElement);
    })
    .catch(error => {
        console.error('Error:', error);
    });
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

// Function to display image in modal
function displayImageForWord(word) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const imagePath = `/static/images/${word}.png`;

    // Check if image exists
    fetch(imagePath)
        .then(response => {
            if (response.ok) {
                modalImage.src = imagePath;
                modalImage.alt = word;
                openModal();
            } else {
                console.warn(`Image for word "${word}" not found.`);
                // Optionally: display a message or a placeholder image
                openModalWithError(word);
            }
        })
        .catch(error => {
            console.error('Error fetching image:', error);
            openModalWithError(word);
        });
}

// Function to open modal
function openModal() {
    const modal = document.getElementById('image-modal');
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
}

// Function to open modal with error message
function openModalWithError(word) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    modalImage.src = '';
    modalImage.alt = '';
    modal.querySelector('.modal-content').innerHTML = `
        <span class="close-button" aria-label="Close">&times;</span>
        <p>Brak obrazka dla słowa "${word}".</p>
    `;
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    attachCloseEvent(); // Reattach close event for dynamic content
}

// Function to close modal
function closeModal() {
    const modal = document.getElementById('image-modal');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    // Reset modal content to include image element
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-button" aria-label="Close">&times;</span>
            <img id="modal-image" src="" alt="Visualized Image">
        </div>
    `;
    attachCloseEvent(); // Reattach close event after resetting content
}

// Function to attach close event to modal
function attachCloseEvent() {
    const modal = document.getElementById('image-modal');
    const closeButton = modal.querySelector('.close-button');

    if (closeButton) {
        closeButton.onclick = closeModal;
    }

    // Close modal when clicking outside of the modal content
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    };
}

// Initialize close events on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    attachCloseEvent();
});

// Function to read the full text
function readFullText() {
    const language = document.getElementById('display-language').value;
    console.log('Selected language:', language);
    const speed = parseFloat(document.getElementById('reading-speed').value);
    console.log('Selected speed:', speed);
    const syllabify = localStorage.getItem('syllabify') === 'true';
    console.log('Syllabify:', syllabify);
    toggleSpinner(true);

    if (fullTextAudio) {
        console.log('Stopping existing audio.');
        fullTextAudio.pause();
        fullTextAudio.currentTime = 0;
        fullTextAudio = null;
    }

    const originalText = window.currentTexts[language] || "";
    console.log('Original text:', originalText);
    const sanitizedText = sanitizeText(originalText);
    console.log('Sanitized text:', sanitizedText);

    fetch('/read_text', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: language, text: sanitizedText, syllabify: syllabify })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Received data from /read_text:', data);
        toggleSpinner(false);
        if(data.error){
            alert(`Error: ${data.error}`);
            return;
        }
        fullTextAudio = new Audio(data.audio);
        fullTextAudio.playbackRate = speed; // Set playback rate
        fullTextAudio.play();
        isFullTextPaused = false;
        updatePausePlayButton(); // Set button to 'Pause'

        fullTextAudio.onended = () => {
            console.log('Full text audio ended.');
            fullTextAudio = null;
            isFullTextPaused = false;
            updatePausePlayButton(); // Reset button to 'Pause'
            toggleSpinner(false);
        };

        fullTextAudio.onerror = () => {
            alert('Wystąpił problem podczas odtwarzania audio.');
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
        const speed = parseFloat(document.getElementById('reading-speed').value);
        fullTextAudio.playbackRate = speed; // Reapply the speed
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

// Function to sanitize text by removing numbers and digits
function sanitizeText(text) {
    // Remove standalone numbers (e.g., "123")
    // Also remove numbers attached to words (e.g., "Section 2.1" becomes "Section .")
    return text.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
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
        lineGuide = document.createElement('div');
        lineGuide.classList.add('line-guide');
        textContainer.appendChild(lineGuide);
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
            // Create and append the line guide element
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
            // Remove the line guide element
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

// Function to toggle the spinner visibility
function toggleSpinner(show) {
    const spinner = document.getElementById('spinner');
    if (show) {
        spinner.style.display = 'block';
    } else {
        spinner.style.display = 'none';
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
