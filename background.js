console.log('Background script loaded');

// Create offscreen document for audio processing
async function createOffscreenDocument() {
    try {
        console.log('Creating offscreen document...');
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Audio capture for medical AI assistance'
        });
        console.log('Offscreen document created successfully');
    } catch (error) {
        console.error('Failed to create offscreen document:', error);
    }
}

// Create offscreen document on startup
createOffscreenDocument();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);

    if (request.action === 'captureAudio') {
        console.log('Audio capture requested from tab:', sender.tab.id);

        // Get MediaStreamId for the current tab (service worker can do this)
        chrome.tabCapture.getMediaStreamId({
            targetTabId: sender.tab.id
        }, (streamId) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to get MediaStreamId:', chrome.runtime.lastError.message);
                sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message
                });
                return;
            }

            if (!streamId) {
                console.error('No MediaStreamId received');
                sendResponse({
                    success: false,
                    error: 'No MediaStreamId received'
                });
                return;
            }

            console.log('MediaStreamId obtained:', streamId);

            // Forward to offscreen document for actual capture
            chrome.runtime.sendMessage({
                action: 'captureAudioWithStreamId',
                streamId: streamId
            }, (offscreenResponse) => {
                if (chrome.runtime.lastError) {
                    console.error('Failed to communicate with offscreen document:', chrome.runtime.lastError);
                    sendResponse({
                        success: false,
                        error: 'Failed to communicate with offscreen document'
                    });
                    return;
                }

                // Forward offscreen response back to content script
                sendResponse(offscreenResponse);
            });
        });

        // Return true to indicate we'll send response asynchronously
        return true;
    }
}); 