console.log('Popup loaded');
const startSection = document.getElementById('startSection');
const recordingStatus = document.getElementById('recordingStatus');
const stopButton = document.getElementById('stopButton');
const captureToggle = document.getElementById('captureToggle');


// Update your toggle button click handler to show/hide sections
captureToggle.addEventListener('click', function () {
    // Hide start button, show recording status
    startSection.classList.add('hidden');
    recordingStatus.classList.add('active');
    stopButton.classList.add('active');

    // Trigger audio capture when user opens popup (indicates user interaction)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('meet.google.com')) {
            console.log('Sending audio capture request to Google Meet tab');
            chrome.tabs.sendMessage(tabs[0].id, { action: 'startAudioCapture' });
        }
    });
});

// Add stop button handler
stopButton.addEventListener('click', function () {
    // Show start button, hide recording status
    startSection.classList.remove('hidden');
    recordingStatus.classList.remove('active');
    stopButton.classList.remove('active');

    // Send stop message to background script
    chrome.runtime.sendMessage({ action: 'stopCapture' });
});

// Stop recording when popup closes
window.addEventListener('beforeunload', function () {
    if (recordingStatus.classList.contains('active')) {
        chrome.runtime.sendMessage({ action: 'stopCapture' });
    }
});