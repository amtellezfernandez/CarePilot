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

        // Resume AudioContext if suspended (Chrome requirement)
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('AudioContext resumed');
        }

        // Connect stream to audio output to prevent Chrome from muting the tab
        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Silent output to prevent feedback

        // === COMPREHENSIVE AUDIO DEBUGGING ===

        // 1. Log stream constraints and capabilities
        console.log('=== STREAM ANALYSIS ===');
        const audioTracks = stream.getAudioTracks();
        console.log('Audio tracks available:', audioTracks.length);

        audioTracks.forEach((track, index) => {
            console.log(`Track ${index}:`, {
                label: track.label,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                kind: track.kind
            });

            // Log track capabilities
            const capabilities = track.getCapabilities ? track.getCapabilities() : 'getCapabilities not supported';
            console.log(`Track ${index} capabilities:`, capabilities);

            // Log current constraints
            const constraints = track.getConstraints ? track.getConstraints() : 'getConstraints not supported';
            console.log(`Track ${index} constraints:`, constraints);

            // Log current settings
            const settings = track.getSettings ? track.getSettings() : 'getSettings not supported';
            console.log(`Track ${index} settings:`, settings);
        });

        // 2. Add MediaStreamTrack event listeners
        audioTracks.forEach((track, index) => {
            track.addEventListener('mute', () => {
                console.log(`🔇 Track ${index} muted`);
                chrome.runtime.sendMessage({ action: 'audioDebug', message: `Track ${index} muted` });
            });

            track.addEventListener('unmute', () => {
                console.log(`🔊 Track ${index} unmuted`);
                chrome.runtime.sendMessage({ action: 'audioDebug', message: `Track ${index} unmuted` });
            });

            track.addEventListener('ended', () => {
                console.log(`🛑 Track ${index} ended`);
                chrome.runtime.sendMessage({ action: 'audioDebug', message: `Track ${index} ended` });
            });
        });

        // 3. Setup analyser with detailed configuration
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048; // Increased for better frequency resolution
        analyser.smoothingTimeConstant = 0.3; // Less smoothing for more responsive data
        analyser.minDecibels = -100;
        analyser.maxDecibels = -30;

        console.log('Analyser config:', {
            fftSize: analyser.fftSize,
            frequencyBinCount: analyser.frequencyBinCount,
            sampleRate: audioContext.sampleRate,
            smoothingTimeConstant: analyser.smoothingTimeConstant,
            minDecibels: analyser.minDecibels,
            maxDecibels: analyser.maxDecibels
        });

        // Connect audio graph
        source.connect(analyser);
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 4. Create test sine wave to verify analyser works
        const testOscillator = audioContext.createOscillator();
        const testGain = audioContext.createGain();
        testOscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
        testGain.gain.setValueAtTime(0.01, audioContext.currentTime); // Very quiet

        testOscillator.connect(testGain);
        testGain.connect(analyser); // Connect test tone to analyser
        testOscillator.start();

        console.log('🎵 Test sine wave (440Hz) started for analyser verification');

        // Stop test tone after 3 seconds
        setTimeout(() => {
            testOscillator.stop();
            console.log('🎵 Test sine wave stopped');
        }, 3000);

        // 5. Detailed frequency analysis
        let debugCounter = 0;
        const checkAudioDetails = setInterval(() => {
            debugCounter++;

            // Get frequency data
            const frequencyData = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(frequencyData);

            // Get time domain data
            const timeDomainData = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(timeDomainData);

            // Calculate statistics
            const freqAverage = frequencyData.reduce((a, b) => a + b) / frequencyData.length;
            const freqMax = Math.max(...frequencyData);
            const timeAverage = timeDomainData.reduce((a, b) => a + b) / timeDomainData.length;
            const timeVariance = timeDomainData.reduce((sum, val) => sum + Math.pow(val - timeAverage, 2), 0) / timeDomainData.length;

            // Check for activity
            const hasFrequencyActivity = freqAverage > 1;
            const hasTimeActivity = timeVariance > 1;

            if (hasFrequencyActivity || hasTimeActivity || debugCounter % 50 === 0) { // Log every 5 seconds if no activity
                const logData = {
                    counter: debugCounter,
                    frequency: {
                        average: Math.round(freqAverage * 100) / 100,
                        max: freqMax,
                        nonZeroBins: frequencyData.filter(val => val > 0).length,
                        sample: Array.from(frequencyData.slice(0, 10)) // First 10 bins
                    },
                    timeDomain: {
                        average: Math.round(timeAverage * 100) / 100,
                        variance: Math.round(timeVariance * 100) / 100,
                        sample: Array.from(timeDomainData.slice(0, 10)) // First 10 samples
                    },
                    activity: {
                        frequency: hasFrequencyActivity,
                        time: hasTimeActivity
                    }
                };

                console.log('📊 Audio Analysis:', logData);

                // Send to background for main console visibility
                chrome.runtime.sendMessage({
                    action: 'audioDebug',
                    message: `Audio Analysis #${debugCounter}`,
                    data: logData
                });
            }

            // Extra detailed logging for first few iterations
            if (debugCounter <= 5) {
                console.log(`Raw frequency data sample (first 20 bins):`, Array.from(frequencyData.slice(0, 20)));
                console.log(`Raw time domain data sample (first 20):`, Array.from(timeDomainData.slice(0, 20)));
            }

        }, 100);

        // Store interval ID for cleanup
        if (window.audioLevelChecker) {
            clearInterval(window.audioLevelChecker);
        }
        window.audioLevelChecker = checkAudioDetails;

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

// // Optional: Add microphone capture for comparison/testing
// async function captureMicrophone() {
//     try {
//         const micStream = await navigator.mediaDevices.getUserMedia({
//             audio: true
//         });
//         // Quick audio test (add to offscreen.js temporarily):
//         const audioTrack = micStream.getAudioTracks()[0];
//         console.log('Audio track:', audioTrack.label, audioTrack.readyState);
//         console.log('Microphone stream captured');
//         return micStream;
//     } catch (error) {
//         console.error('Microphone capture failed:', error);
//         throw error;
//     }
// }

// // TEMPORARY: Call captureMicrophone on load for testing
// captureMicrophone();

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

        // In your stopCapture message handler
        if (window.audioLevelChecker) {
            clearInterval(window.audioLevelChecker);
            window.audioLevelChecker = null;
        }

        // Notify background script
        chrome.runtime.sendMessage({ action: 'captureStopped' });
    }
}); 