document.addEventListener('DOMContentLoaded', function() {
    // Reading Ruler
    const ruler = document.getElementById('ruler');
    let rulerEnabled = true;

    document.addEventListener('mousemove', function(e) {
        if (rulerEnabled) {
            let y = e.clientY;
            ruler.style.top = (y - (ruler.offsetHeight / 2)) + 'px';
        }
    });

    // Text-to-Speech
    const speakBtn = document.getElementById('speak-btn');
    const stopBtn = document.getElementById('stop-btn'); // Added stop button
    const textContent = document.querySelector('.content pre').textContent;

    let audioPlayer = new Audio();

    speakBtn.addEventListener('click', function() {
        // Disable the speak button to prevent multiple clicks
        speakBtn.disabled = true;
        stopBtn.disabled = false;

        fetch('/speak', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: textContent }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('TTS request failed');
            }
            return response.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            audioPlayer.src = url;
            audioPlayer.play();
            audioPlayer.onended = function() {
                speakBtn.disabled = false;
                stopBtn.disabled = true;
                URL.revokeObjectURL(url);
            };
        })
        .catch(error => {
            console.error('Error:', error);
            speakBtn.disabled = false;
            stopBtn.disabled = true;
            alert('An error occurred while processing TTS.');
        });
    });

    stopBtn.addEventListener('click', function() {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        speakBtn.disabled = false;
        stopBtn.disabled = true;
    });

    // Settings Modal Functionality
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontSizeValue = document.getElementById('font-size-value');
    const rulerHeightSlider = document.getElementById('ruler-height-slider'); // Corrected ID
    const rulerHeightValue = document.getElementById('ruler-height-value');
    const toggleRulerCheckbox = document.getElementById('toggle-ruler-checkbox');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    fontSizeSlider.addEventListener('input', function() {
        fontSizeValue.textContent = this.value;
    });

    rulerHeightSlider.addEventListener('input', function() {
        rulerHeightValue.textContent = this.value;
    });

    saveSettingsBtn.addEventListener('click', function() {
        // Adjust font size
        document.querySelector('.content pre').style.fontSize = fontSizeSlider.value + 'px';

        // Adjust ruler height
        ruler.style.height = rulerHeightSlider.value + 'em';

        // Toggle ruler visibility
        rulerEnabled = toggleRulerCheckbox.checked;
        ruler.style.display = rulerEnabled ? 'block' : 'none';

        // Close the modal
        $('#settingsModal').modal('hide');
    });
});
