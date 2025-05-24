// Offscreen document for audio processing
console.log('Offscreen document loaded for audio processing');

// Store references for cleanup
let mediaStream = null;
let audioContext = null;
let currentStream = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Offscreen received message:', request);

    if (request.action === 'captureAudioWithStreamId') {
        handleAudioCapture(request.streamId, sendResponse);
        return true; // Async response
    }
});

async function handleAudioCapture(streamId, sendResponse) {
    try {
        console.log('Attempting audio capture with streamId:', streamId);

        // Use streamId to capture tab audio
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            }
        });

        console.log('Tab audio stream captured successfully');

        // Store stream reference for cleanup
        mediaStream = stream;

        // Create AudioContext and connect stream to prevent muting
        if (!audioContext) {
            audioContext = new AudioContext();
        }

        // Connect stream to audio output to prevent Chrome from muting the tab
        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Silent output to prevent feedback
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Store current stream for cleanup
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        currentStream = stream;

        console.log('Audio capture active - stream connected to prevent muting');

        sendResponse({
            success: true,
            message: 'Audio capture initiated successfully'
        });

    } catch (error) {
        console.error('Audio capture failed:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// Optional: Add microphone capture for comparison/testing
async function captureMicrophone() {
    try {
        const micStream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });
        console.log('Microphone stream captured');
        return micStream;
    } catch (error) {
        console.error('Microphone capture failed:', error);
        throw error;
    }
}

// Listen for stop capture message
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'stopCapture') {
        console.log('Stopping audio capture in offscreen document');

        // Stop all audio tracks
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
                console.log('Stopping track:', track.kind);
                track.stop();
            });
            mediaStream = null;
        }

        // Close audio context
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        // Notify background script
        chrome.runtime.sendMessage({ action: 'captureStopped' });
    }
}); 