# Quick Start Guide

Get Trial-Scout running in 3 steps:

## 1. Configure API Endpoint

Create a `.env` file in the project root:

```bash
echo "VITE_API_ENDPOINT=https://your-api-gateway-url.com/chat" > .env
```

Replace `https://your-api-gateway-url.com/chat` with your actual AWS API Gateway endpoint.

## 2. Install Dependencies (if not already done)

```bash
npm install
```

## 3. Start Development Server

```bash
npm run dev
```

Open your browser to `http://localhost:5173` and start searching for clinical trials!

## Testing the UI

If you don't have the backend ready yet, you can test the UI by:

1. Opening the browser console
2. Entering a medical condition in the chat
3. Observing the loading state and error handling

The app will show a connection error, which is expected without a backend.

## Next Steps

- Connect to your AWS API Gateway backend
- Test with real medical condition queries
- Deploy to production using `npm run build`

## Folder Structure Overview

```
src/
├── components/     # UI components (ChatWindow, ChatInput, etc.)
├── pages/         # ChatInterface page
├── types/         # TypeScript interfaces
├── styles/        # CSS files
└── App.tsx        # Router configuration
```

## Medical Trust Color Palette

- Navy Blue: `#1e3a8a` (primary actions, user messages)
- Light Blue: `#dbeafe` (AI messages, backgrounds)
- White: `#ffffff` (cards, input fields)

## Mobile Testing

Test on mobile by:
1. Running `npm run dev -- --host`
2. Accessing from your phone using your computer's IP address
3. Verifying the chat input stays fixed at the bottom
4. Checking that trial cards display properly

Enjoy building with Trial-Scout! 🚀
