# Wealth Pulse Web

> React Frontend for Wealth Pulse Platform

[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple)](https://vitejs.dev/)

**Language:** English | [中文](./README-CN.md)

**Parent Project:** [Wealth Pulse](../README.md)

---

## Overview

Wealth Pulse Web is a modern React-based frontend application for the Wealth Pulse investment tracking platform. It provides:

- Interactive dashboard with real-time portfolio visualization
- AI-powered trade analysis and market insights
- Stock portfolio management
- Trading history and capital flow tracking
- Multi-language support (Chinese/English)
- Responsive design for mobile and desktop

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build Tool | Vite 6 |
| Charts | Recharts 3.7 |
| K-Line Charts | klinecharts 10.0.0-beta1 |
| AI | @google/genai 1.38 |
| Utilities | html-to-image, qrcode |

---

## Project Structure

```
wealth-pulse-web/
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Holdings.tsx    # Portfolio management
│   ├── Records.tsx     # Transaction history
│   ├── AILab.tsx       # AI analysis features
│   ├── MarketSearch.tsx # Stock search
│   └── Settings.tsx    # User settings
├── components/         # Reusable components
├── services/           # API clients
│   ├── http.ts         # HTTP client
│   ├── aiAnalysis.ts   # AI analysis service
│   └── stockApi.ts     # Stock API wrapper
├── App.tsx             # Main app component
├── i18n.ts             # Internationalization
├── types.ts            # TypeScript types
├── constants.ts        # Constants
├── index.html
├── vite.config.ts
└── package.json
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm or npm

### 1. Install Dependencies

```bash
cd wealth-pulse-web

pnpm install
# or npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### 3. Run Development Server

```bash
pnpm dev
```

The app will be available at: http://localhost:9000

### 4. Build for Production

```bash
pnpm build
pnpm preview
```

---

## Features

### Dashboard

- Portfolio overview with key metrics
- Asset allocation charts
- Profit/loss visualization
- AI market outlook

### Holdings Management

- Real-time position tracking
- Cost basis calculation
- P&L analysis per stock
- Quick sell action

### Trading Records

- Buy/sell transaction history
- Capital flow logs
- Filter and search functionality
- Data export capability

### AI Lab

- Trade scoring with AI rationale
- Market analysis insights
- Screenshot analysis for broker apps
- Batch import trades

### Market Search

- Real-time stock quotes
- Quick trade actions
- Stock details view
- K-line charts

---

## API Integration

### Backend API Proxy

The development server proxies `/api` requests to the backend:

- **Backend**: http://localhost:9090
- **Frontend**: http://localhost:9000

Configured in `vite.config.ts`.

### HTTP Client

The `services/http.ts` client handles:

- JWT token injection
- 401/403 error handling
- Redirect to login on auth failure

### LocalStorage Keys

| Key | Description |
|-----|-------------|
| `pulse_token` | JWT authentication token |
| `pulse_auth` | Login status flag |
| `pulse_lang` | Language preference |
| `stock_transactions` | Trade records |
| `stock_capital` | Capital flow logs |
| `app_config` | App configuration |

---

## Internationalization

The app supports Chinese and English with automatic language detection.

### Switch Language

Use the language selector in the UI, or set in localStorage:

```javascript
localStorage.setItem('pulse_lang', 'zh'); // or 'en'
```

### Add New Language

Edit `i18n.ts` to add new translations:

```typescript
translations: {
  en: { welcome: 'Welcome' },
  zh: { welcome: '欢迎' },
  // Add your language here
}
```

---

## AI Features

### Google Gemini Integration

AI features are powered by Google Gemini:

- **Trade Scoring**: Analyzes trades and provides rationale
- **Market Outlook**: Generates portfolio-level insights
- **Screenshot Analysis**: Extracts trades from broker screenshots

### Configure AI

Set your Gemini API key in `.env`:

```bash
GEMINI_API_KEY=your_api_key_here
```

---

## Development

### Available Scripts

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type checking
tsc --noEmit
```

### Project Conventions

- **Components**: Functional components with hooks
- **State**: Props drilling (no Redux/Context)
- **Styling**: Tailwind-like utility classes
- **Types**: TypeScript interfaces in `types.ts`

---

## Integration

### Backend API

This frontend connects to the Java Spring Boot backend for all data operations.

See [Java API](../wealth-pulse-api/README.md) for backend details.

### Python Service

The backend integrates with the Python stock data service.

See [Python Service](../wealth-pulse-python/README.md) for details.

---

## Troubleshooting

### Can't connect to backend

- Ensure backend is running on port 9090
- Check proxy config in `vite.config.ts`
- Verify JWT token exists in `localStorage.pulse_token`

### AI features not working

- Check `GEMINI_API_KEY` is set in `.env`
- Verify API key is valid
- Check browser console for errors

### Build fails

- Delete `node_modules` and run `pnpm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check TypeScript errors: `tsc --noEmit`

---

## Documentation

- [Main Project README](../README.md)
- [Java API](../wealth-pulse-api/README.md)
- [Python Service](../wealth-pulse-python/README.md)
- [CLAUDE.md](../CLAUDE.md) - Development guide

---

## License

MIT License

---

## Support

For issues and questions, please open an issue on GitHub or refer to the [main README](../README.md).
