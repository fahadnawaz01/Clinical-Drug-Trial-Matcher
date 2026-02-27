# Dashboard & Context Feature (Sub-Phase 2B)

## Overview

Sub-Phase 2B adds the application shell with routing, navigation, patient profile management, and saved trials functionality. All data is stored locally in the browser using localStorage - no external database required.

## New Features

✅ **Main Layout Shell**: Top navigation bar with hamburger menu and slide-out sidebar
✅ **Three Routes**: Chat (`/chat`), Patient Profile (`/profile`), Saved Trials (`/saved-trials`)
✅ **Patient Profile**: Editable demographics, conditions, and medications
✅ **Saved Trials**: View and manage saved clinical trials
✅ **Zero-Cost Storage**: All data persists in browser localStorage
✅ **Mobile-First Design**: Responsive sidebar and layouts for mobile devices

## Routes

### 1. `/chat` (New Consultation)
- Default route - redirects from `/`
- Existing chat interface with voice dictation
- Ready for future "Save Trial" button integration

### 2. `/profile` (Patient Profile)
- View/edit patient demographics (Name, Age, Sex, Location)
- Manage medical conditions (add/remove tags)
- Manage current medications (add/remove tags)
- All data persists in localStorage

### 3. `/saved-trials` (Matched Trials)
- View all saved clinical trials
- Remove trials from saved list
- Empty state when no trials saved
- Shows save date for each trial

## Architecture

### Main Layout Component
```
MainLayout
├── Header (Top Nav Bar)
│   ├── Hamburger Menu Button
│   └── App Title
├── Sidebar Drawer (Slide-out)
│   └── Navigation Links
│       ├── New Consultation → /chat
│       ├── Patient Profile → /profile
│       └── Matched Trials → /saved-trials
└── Main Content Area
    └── Route Components
```

### Data Storage (localStorage)

**Patient Profile** (`patientProfile` key):
```typescript
{
  name: string;
  age: string;
  sex: string;
  location: string;
  conditions: string[];
  medications: string[];
}
```

**Saved Trials** (`savedTrials` key):
```typescript
[
  {
    id: string;
    trial_name: string;
    summary: string;
    savedAt: Date;
  }
]
```

## Custom Hooks

### `useLocalStorage<T>(key, initialValue)`
Zero-dependency hook for localStorage management:
- Automatically syncs state with localStorage
- Type-safe with TypeScript generics
- Handles JSON serialization/deserialization
- Error handling for localStorage failures

**Usage:**
```typescript
const [profile, setProfile] = useLocalStorage<PatientProfile>('patientProfile', initialProfile);
```

## Mobile-First Design

### Sidebar Behavior
- **Desktop**: Slide-out drawer from left
- **Mobile**: Full-screen overlay with slide animation
- **Width**: 280px (max 80vw on mobile)
- **Backdrop**: Semi-transparent overlay when open

### Responsive Breakpoints
- **Mobile**: < 768px
  - Sidebar: 260px width
  - Profile: Full-width form fields
  - Trials: Stacked cards

## Navigation

### Top Bar
- **Hamburger Icon**: Opens/closes sidebar
- **App Title**: "Trial-Scout"
- **Background**: Navy Blue (#1e3a8a)
- **Height**: 60px (56px on mobile)

### Sidebar Links
- **Active State**: Light blue background + left border
- **Icons**: Material Design style SVG icons
- **Hover**: Light blue background
- **Auto-close**: Closes on link click (mobile)

## Patient Profile Features

### View Mode
- Display all profile information
- "Edit" button in header
- Empty states for missing data

### Edit Mode
- Inline form fields for demographics
- Add/remove tags for conditions
- Add/remove tags for medications
- "Save Changes" and "Cancel" buttons

### Tag Management
- Press Enter or click "Add" to add tags
- Click × to remove tags
- Tags styled with light blue background

## Saved Trials Features

### Trial Cards
- Trial name as heading
- Full summary text
- Save date footer
- Remove button (trash icon)
- Hover effect for better UX

### Empty State
- Bookmark icon
- "No trials saved yet" message
- Call-to-action text
- Centered layout

## File Structure

```
src/
├── components/
│   ├── MainLayout.tsx          # App shell with sidebar
│   └── ...
├── pages/
│   ├── ChatInterface.tsx       # Existing chat (Route 1)
│   ├── PatientProfile.tsx      # Profile management (Route 2)
│   └── SavedTrials.tsx         # Saved trials list (Route 3)
├── hooks/
│   └── useLocalStorage.ts      # localStorage hook
├── styles/
│   ├── MainLayout.css
│   ├── PatientProfile.css
│   └── SavedTrials.css
├── types/
│   └── api.ts                  # Updated with new types
└── App.tsx                     # Updated routing config
```

## Constraints (Manifesto Compliance)

✅ **English Only**: No language toggle (as per requirements)
✅ **Zero-Cost Storage**: localStorage only, no database
✅ **Mobile-First**: Responsive design for all screen sizes
✅ **No Breaking Changes**: Existing chat functionality preserved

## Future Enhancements (Not in Phase 2B)

- Save button in chat to add trials to saved list
- Export saved trials to PDF
- Share profile with healthcare providers
- Sync data across devices
- Advanced filtering for saved trials

## Testing

### Desktop
1. Open app → Should redirect to `/chat`
2. Click hamburger → Sidebar slides out
3. Navigate to Profile → Edit and save data
4. Navigate to Saved Trials → See empty state
5. Check localStorage in DevTools

### Mobile (< 768px)
1. Verify sidebar is full-screen overlay
2. Check hamburger menu works
3. Verify profile form is full-width
4. Test tag management on touch devices
5. Verify no horizontal scrolling

## localStorage Management

### View Data
```javascript
// In browser console
localStorage.getItem('patientProfile')
localStorage.getItem('savedTrials')
```

### Clear Data
```javascript
localStorage.removeItem('patientProfile')
localStorage.removeItem('savedTrials')
```

### Reset All
```javascript
localStorage.clear()
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Safari: ✅ Full support
- Firefox: ✅ Full support
- Mobile browsers: ✅ Full support

localStorage is supported in all modern browsers with ~10MB storage limit.
