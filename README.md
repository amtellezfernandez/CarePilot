# CarePilot Chrome Extension

A Chrome extension designed for Google Meet that attempts to capture audio for medical AI assistance. This project explores the technical challenges and limitations of browser-based audio capture.

## 🚀 Getting Started - Testing the Chrome Extension

### Prerequisites
- Chrome browser (Version 88+ for Offscreen API support)
- Developer mode enabled in Chrome Extensions

### Installation & Testing Steps

1. **Enable Developer Mode**
   ```
   1. Open Chrome and go to chrome://extensions/
   2. Toggle "Developer mode" in the top right
   3. Click "Load unpacked"
   4. Select the CarePilot project folder
   ```

2. **Test the Extension**
   ```
   1. Navigate to meet.google.com
   2. Join or start a meeting
   3. Click the CarePilot extension icon
   4. Click "Start Capture" button
   5. Monitor console outputs for debugging info
   ```

3. **Console Monitoring**
   - **Background Console**: Right-click extension → "Inspect background page"
   - **Content Console**: F12 on Google Meet tab
   - **Popup Console**: Right-click popup → "Inspect"

## 📊 Current State & Architecture

### Core Components

#### 1. **popup.html/popup.js** - User Interface
- Semi-transparent modern UI with start/stop toggle
- Visual recording indicator with pulsing animation
- Communicates with background script for state management

#### 2. **content.js** - Google Meet Integration
- Injected into Google Meet pages
- Handles user interaction messages
- Forwards audio capture requests to background script

#### 3. **background.js** - Message Router & State Manager
- Service worker managing extension lifecycle
- Routes messages between popup, content, and offscreen
- Tracks capture state (`isCapturing` boolean)
- Creates and manages offscreen document

#### 4. **offscreen.js** - Audio Capture Engine
- Hidden document bypassing Chrome's audio restrictions
- Implements comprehensive audio debugging system
- Attempts tab audio capture using `chrome.tabCapture` API

### Message Flow Architecture
```
User Click → popup.js → content.js → background.js → offscreen.js → Audio Stream
```

## 🔬 Audio Testing & Debugging in offscreen.js

### Current Testing Implementation

The `offscreen.js` includes comprehensive audio debugging to verify what's actually being captured:

#### 1. **Stream Analysis**
```javascript
// Logs detailed track information
- Track labels, states, capabilities
- Audio constraints and settings
- MediaStreamTrack event monitoring
```

#### 2. **Test Sine Wave Verification**
```javascript
// 440Hz test tone for 3 seconds
- Verifies analyser functionality
- Tests if audio processing works
- Baseline for comparison
```

#### 3. **Dual-Domain Analysis**
```javascript
// Both frequency and time domain data
- FFT analysis (2048 bins)
- Statistical calculations
- Activity detection algorithms
```

#### 4. **Real-time Monitoring**
```javascript
// Every 100ms analysis cycle
- Frequency averages and peaks
- Time domain variance
- Raw data sampling
```

### What You'll See During Testing

**Expected Console Output:**
```
=== STREAM ANALYSIS ===
Audio tracks available: 1
Track 0: {label: "System Audio", enabled: true, muted: false, readyState: "live"}
🎵 Test sine wave (440Hz) started for analyser verification
📊 Audio Analysis: {frequency: {average: 15.23, max: 95}, activity: {frequency: true}}
🎵 Test sine wave stopped
📊 Audio Analysis: {frequency: {average: 0.58, max: 3}, activity: {frequency: false}}
```

## 🚨 Critical Discovery: Tab Capture vs WebRTC Audio

### What's Actually Happening

Our extensive testing revealed a **fundamental limitation** that explains the consistent low audio readings (0.58-0.63 average):

#### 🎯 What Tab Capture CAN Capture:
- HTML `<audio>` and `<video>` elements
- Web Audio API nodes connected to `audioContext.destination`
- System sounds routed through the browser tab
- Background music, notification sounds, media playback

#### ❌ What Tab Capture CANNOT Capture:
- **WebRTC peer-to-peer audio streams** (Google Meet voices)
- Audio that bypasses the browser's audio pipeline
- Direct microphone/speaker connections
- Encrypted media streams

### Why Google Meet is Different

Google Meet uses **WebRTC technology** which creates direct peer-to-peer audio connections that:

1. **Stream directly to speakers/headphones**
2. **Bypass the browser's normal audio processing**
3. **Don't flow through the tab's audio context**
4. **Are designed for privacy/security** (can't be easily intercepted)

### What We're Actually Measuring

Those consistent low readings (0.58-0.63) represent:
- Background noise/static from empty audio stream
- Digital noise floor from the capture process
- System-level ambient audio (very quiet)
- Proof that our capture system works, but has no real audio to process

## 🔧 Technical Solutions (Viability Order)

### 1. **Screen Capture with Audio** ⭐ (Most Viable)
```javascript
// Use chrome.desktopCapture instead of tabCapture
navigator.mediaDevices.getDisplayMedia({
  audio: true,  // Captures system audio output
  video: true   // Required for audio permission
})
```
**Pros**: Captures actual system audio including WebRTC streams
**Cons**: Requires user permission, captures all system audio

### 2. **Microphone + Tab Audio Mixing** ⚠️ (Limited)
```javascript
// Capture user's microphone directly
navigator.mediaDevices.getUserMedia({audio: true})
```
**Pros**: Gets user's voice reliably
**Cons**: Misses other participants' audio

### 3. **Browser Audio Context Injection** ❌ (Complex/Fragile)
```javascript
// Inject into Google Meet's actual audio processing
// Requires reverse engineering Meet's internals
```
**Pros**: Could get all audio
**Cons**: Extremely complex, fragile, may violate terms

## 📈 Next Steps

### For Deepgram Integration

Given these findings, the recommended approach is:

1. **Switch to Screen Capture API** for reliable audio
2. **Implement Deepgram WebSocket** in offscreen document
3. **Add real-time transcription** display
4. **Handle audio format conversion** (MediaStream → PCM)

### Current Extension Status

✅ **Working**: Extension architecture, UI, state management, debugging
❌ **Limitation**: Cannot capture Google Meet WebRTC audio via tab capture
🎯 **Solution**: Implement screen capture approach for viable audio access

## 🛠️ Development Notes

- Extension uses Manifest V3 service workers
- Offscreen document required for audio APIs in MV3
- Comprehensive error handling and state management implemented
- Ready for audio processing pipeline integration once audio source is resolved

## 📝 Testing Checklist

- [ ] Extension loads without errors
- [ ] Popup UI functions correctly
- [ ] Background script receives messages
- [ ] Offscreen document captures tab stream
- [ ] Test sine wave produces activity readings
- [ ] Google Meet audio shows minimal/no activity (expected)
- [ ] Cleanup works properly on stop