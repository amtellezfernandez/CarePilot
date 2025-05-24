// Test audio capture capability
console.log('Content script loaded - testing audio capture...');

// Check if we can access navigator.mediaDevices
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log('MediaDevices API available');
    
    // Send message to background script to attempt tab capture
    chrome.runtime.sendMessage({action: 'captureAudio'}, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Failed to communicate with background script:', chrome.runtime.lastError);
            return;
        }
        
        if (response && response.success) {
            console.log('Audio capture initiated successfully');
        } else {
            console.error('Audio capture failed:', response?.error || 'Unknown error');
        }
    });
} else {
    console.error('MediaDevices API not available');
} 