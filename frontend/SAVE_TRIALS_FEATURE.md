# Save Trials Feature

## Overview

Users can now save clinical trials directly from the chat interface. When the AI returns trial results, each trial is displayed as a card with a "Save Trial" button. Saved trials are stored in localStorage and can be viewed in the `/saved-trials` page.

## Features

✅ **Trial Cards in Chat**: Trials displayed as individual cards with NCT ID, status, and summary
✅ **Save/Unsave Toggle**: Click to save or remove trials from saved list
✅ **Visual Feedback**: Button changes to "Saved" with filled bookmark icon
✅ **Persistent Storage**: Saved trials persist in localStorage across sessions
✅ **Duplicate Prevention**: Can't save the same trial twice (uses NCT ID)

## How It Works

### 1. API Response Format

The backend returns trials in this structure:

```json
{
  "sessionId": "session-1686241045",
  "reply": "Great news! I've found 5 active clinical trials...",
  "trials": [
    {
      "trial_name": "Sonification Techniques for Gait Training",
      "nct_id": "NCT04876339",
      "status": "RECRUITING",
      "summary": "This trial studies sonification techniques..."
    }
  ]
}
```

### 2. Chat Display

When `trials` array is present:
- Display the `reply` text as the AI message
- Render each trial as a `ChatTrialCard` component
- Each card shows:
  - Trial name (heading)
  - NCT ID (monospace font)
  - Status badge (green for RECRUITING)
  - Summary text
  - Save/Unsave button

### 3. Save Functionality

**Save Button States:**
- **Unsaved**: Outline bookmark icon + "Save Trial" text
- **Saved**: Filled bookmark icon + "Saved" text (navy blue background)

**Click Behavior:**
- If unsaved → Add to localStorage with current timestamp
- If saved → Remove from localStorage
- Button updates immediately

### 4. localStorage Structure

**Key**: `savedTrials`

**Value**: Array of SavedTrial objects
```typescript
[
  {
    trial_name: string;
    nct_id: string;
    status: string;
    summary: string;
    id: string;           // Same as nct_id
    savedAt: Date;        // Timestamp when saved
  }
]
```

## Components

### ChatTrialCard
**Location**: `src/components/ChatTrialCard.tsx`

**Props**:
```typescript
{
  trial: TrialMatch;  // Contains trial_name, nct_id, status, summary
}
```

**Features**:
- Checks if trial is already saved on mount
- Toggles save state on button click
- Updates localStorage automatically
- Shows visual feedback for saved state

### Updated MessageBubble
**Changes**:
- Now uses `ChatTrialCard` instead of `TrialCard`
- Renders trials from `message.trials` array
- Each trial gets a unique key (nct_id or index)

### Updated ChatInterface
**Changes**:
- Handles new API response format with `reply` and `trials` fields
- Passes trials array to AI messages
- Backward compatible with old formats

## User Flow

1. **User asks about a condition** (e.g., "I have Multiple Sclerosis")
2. **AI returns trials** with structured data
3. **Chat displays trial cards** with save buttons
4. **User clicks "Save Trial"** on interesting trials
5. **Button changes to "Saved"** with visual feedback
6. **User navigates to `/saved-trials`** to view all saved trials
7. **User can remove trials** from saved list

## Mobile Responsive

- Trial cards stack vertically
- Save button becomes full-width on mobile
- Touch-friendly button size (min 44px height)
- Proper spacing for thumb interaction

## Edge Cases Handled

✅ **No NCT ID**: Falls back to timestamp-based ID
✅ **Duplicate saves**: Prevented by checking nct_id
✅ **Already saved**: Button shows "Saved" state on load
✅ **No trials**: Only shows reply text, no cards
✅ **Clarifying questions**: No trials array, just reply text

## localStorage Management

### View Saved Trials
```javascript
JSON.parse(localStorage.getItem('savedTrials'))
```

### Clear All Saved Trials
```javascript
localStorage.removeItem('savedTrials')
```

### Check if Trial is Saved
```javascript
const savedTrials = JSON.parse(localStorage.getItem('savedTrials') || '[]');
const isSaved = savedTrials.some(t => t.nct_id === 'NCT04876339');
```

## Styling

### Trial Card
- White background with border
- Hover effect (elevated shadow)
- Rounded corners (8px)
- Padding for readability

### Status Badge
- Green background for RECRUITING
- Small, rounded pill shape
- Positioned in header

### Save Button
- Outline style when unsaved
- Filled style when saved
- Smooth transition on state change
- Icon + text for clarity

## Future Enhancements (Not Implemented)

- Export saved trials to PDF
- Share trials via email
- Add notes to saved trials
- Filter saved trials by status
- Sort saved trials by date
- Bulk save/unsave actions
- Trial comparison view

## Testing

### Test Save Functionality
1. Ask about a medical condition
2. Wait for trial results
3. Click "Save Trial" on first trial
4. Verify button changes to "Saved"
5. Refresh page
6. Ask same question again
7. Verify trial still shows as "Saved"

### Test Unsave Functionality
1. Click "Saved" button on a saved trial
2. Verify button changes to "Save Trial"
3. Navigate to `/saved-trials`
4. Verify trial is removed from list

### Test localStorage
1. Save multiple trials
2. Open DevTools → Application → localStorage
3. Verify `savedTrials` key exists
4. Verify array contains correct trial data
5. Verify timestamps are present

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Safari: ✅ Full support
- Firefox: ✅ Full support
- Mobile browsers: ✅ Full support

localStorage is supported in all modern browsers.
