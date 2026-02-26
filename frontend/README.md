# Trial-Scout Phase 1 Chatbot Frontend

A React TypeScript chatbot frontend for searching clinical trials. Users can enter medical conditions and receive matching trial information from an AWS Lambda backend.

## Features

- 🔍 Text-based chat interface for medical condition queries
- 📱 Mobile-responsive design with Medical Trust color palette
- ⚡ Real-time loading indicators
- 🎨 Clean, professional UI with Navy Blue, White, and Light Blue theme
- 🔄 Auto-scrolling chat window
- ⚠️ Comprehensive error handling

## Tech Stack

- React 18+ with TypeScript
- React Router v6 for routing
- Vite for build tooling
- CSS for styling (no external UI libraries)

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ChatWindow.tsx
│   ├── ChatInput.tsx
│   ├── MessageBubble.tsx
│   ├── TrialCard.tsx
│   └── ErrorBoundary.tsx
├── pages/           # Page components
│   └── ChatInterface.tsx
├── types/           # TypeScript interfaces
│   └── api.ts
├── styles/          # CSS files
│   ├── variables.css
│   ├── ChatWindow.css
│   ├── ChatInput.css
│   ├── MessageBubble.css
│   ├── TrialCard.css
│   └── ChatInterface.css
├── App.tsx          # Router configuration
└── main.tsx         # Application entry point
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository and navigate to the frontend directory:
```bash
cd trial-scout-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure the API endpoint:
```bash
cp .env.example .env
```

4. Edit `.env` and replace the placeholder with your actual AWS API Gateway endpoint:
```
VITE_API_ENDPOINT=https://your-actual-api-gateway-url.com/chat
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## API Integration

The frontend expects the backend API to accept POST requests with the following format:

**Request:**
```json
{
  "message": "diabetes type 2"
}
```

**Response:**
```json
{
  "matches": [
    {
      "trial_name": "Study of Metformin in Type 2 Diabetes",
      "summary": "A randomized controlled trial examining..."
    }
  ]
}
```

## Mobile Responsiveness

The application is fully responsive and optimized for mobile devices:
- Chat window uses `100dvh` for proper mobile viewport handling
- Input field remains fixed at the bottom on mobile browsers
- Trial cards stack vertically and use full width on small screens
- No horizontal scrolling on any device

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Phase 1 Constraints

This is a minimal viable product with the following intentional limitations:
- Text-based chat only (no file uploads or voice input)
- Local state management (no Redux/Context API)
- No authentication or user accounts
- No conversation persistence (resets on page refresh)

Future phases will add these features.

## License

MIT
