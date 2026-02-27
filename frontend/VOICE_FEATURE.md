# Voice Dictation Feature (Sub-Phase 2A)

## Overview

The ChatInput component now includes zero-cost voice dictation using the browser's native Web Speech API. Users can click the microphone button to dictate their medical condition instead of typing.

## Features

✅ **Native Browser API**: Uses HTML5 SpeechRecognition with webkit fallback for Safari/iOS
✅ **Real-time Transcription**: Shows interim results as you speak
✅ **Visual Feedback**: Microphone button turns red and pulses while recording
✅ **Error Handling**: Graceful fallbacks for unsupported browsers and permission denials
✅ **Zero Dependencies**: No external libraries required
✅ **Mobile Compatible**: Works on iOS Safari and Chrome Mobile

## How It Works

1. **Click the microphone button** to start voice dictation
2. **Speak your medical condition** - the text appears in real-time
3. **Click the microphone again** to stop recording
4. **Review the transcribed text** before clicking "Send"
5. The existing API integration remains unchanged

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome (Desktop) | ✅ Full support |
| Chrome (Mobile) | ✅ Full support |
| Safari (Desktop) | ✅ Full support (webkit prefix) |
| Safari (iOS) | ✅ Full support (webkit prefix) |
| Edge | ✅ Full support |
| Firefox | ❌ Not supported |

## Technical Implementation

### Web Speech API

```typescript
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognitionAPI();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';
```

### Key Features

- **Continuous Recognition**: Keeps listening until manually stopped
- **Interim Results**: Shows real-time transcription as you speak
- **Language**: Set to English (US) by default
- **Fallback**: Checks for webkit prefix for Safari compatibility

### State Management

- `isListening`: Boolean state for recording status
- `speechSupported`: Boolean to check browser compatibility
- `recognitionRef`: useRef to maintain recognition instance

### Visual States

- **Idle**: Blue microphone icon with white background
- **Recording**: Red microphone icon with pulsing animation
- **Disabled**: Grayed out when chat is disabled

## Error Handling

### Microphone Permission Denied
```
Alert: "Microphone access denied. Please enable microphone permissions in your browser settings."
```

### Browser Not Supported
```
Alert: "Speech recognition is not supported in your browser. Please use Chrome, Safari, or Edge."
```

### No Speech Detected
Silently stops listening (logged to console)

## CSS Classes

- `.chat-input__mic-button` - Base microphone button style
- `.chat-input__mic-button--active` - Active recording state (red + pulse)
- `.chat-input__mic-icon` - SVG microphone icon

## Constraints (Manifesto Compliance)

✅ **NO Text-to-Speech**: This is strictly one-way dictation (user → text)
✅ **NO External Libraries**: Pure native browser API
✅ **NO Breaking Changes**: Existing API integration unchanged
✅ **Zero Cost**: No API keys or external services required

## Testing

### Desktop
1. Open the app in Chrome or Safari
2. Click the microphone button
3. Allow microphone permissions when prompted
4. Speak a medical condition
5. Verify text appears in real-time
6. Click mic again to stop
7. Click Send to submit

### Mobile (iOS)
1. Open in Safari on iPhone/iPad
2. Click microphone button
3. Grant microphone access
4. Speak clearly
5. Verify transcription works
6. Submit as normal

### Unsupported Browser (Firefox)
1. Open in Firefox
2. Click microphone button
3. Verify alert message appears
4. Verify typing still works normally

## Future Enhancements (Not in Phase 2A)

- Language selection dropdown
- Accent/dialect support
- Offline speech recognition
- Custom wake words
- Voice commands for navigation

## Troubleshooting

**Microphone not working?**
- Check browser permissions (chrome://settings/content/microphone)
- Ensure HTTPS connection (required for microphone access)
- Try a different browser (Chrome recommended)

**Text not appearing?**
- Speak clearly and at normal pace
- Check microphone is not muted
- Verify microphone is selected in system settings

**Button stays red?**
- Click the button again to stop
- Refresh the page if stuck
- Check browser console for errors
