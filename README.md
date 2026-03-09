# Wealth Pulse

> Hong Kong Stock Investment Tracking & AI-Assisted Analysis Platform

[![Java](https://img.shields.io/badge/Java-17-orange)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.5-green)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)

**Language:** English | [中文](./README-CN.md)

---

## Overview

**Wealth Pulse** is a full-stack investment tracking platform designed for Hong Kong stock market investors. It combines:

- **Backend API** (Spring Boot) - RESTful services with JWT authentication
- **Frontend Web** (React + TypeScript) - Interactive dashboard with AI-powered insights
- **Python Scripts** - Stock data fetching and processing utilities

---

## Project Structure

```
wealth-pulse/
├── wealth-pulse-api/       # Java Spring Boot backend
├── wealth-pulse-web/       # React TypeScript frontend
├── wealth-pulse-python/    # Python stock data service
├── sql/                    # Database scripts
└── docs/                   # Documentation & screenshots
```

---

## Screenshots

### Dashboard
![Dashboard](./docs/ds.png)

### Wealth Analysis
![Wealth Analysis](./docs/wa.png)

### K-Line Chart
![K-Line](./docs/k.png)

### AI Analysis
![AI Analysis](./docs/ai-a.png)
![AI Lab](./docs/ai-l.png)

### News & Reports
![News](./docs/news.png)
![HK Market News](./docs/hk-news.png)
![Report](./docs/report.png)

---

## Quick Start

### Prerequisites

- **Java 17+**
- **Node.js 18+**
- **Python 3.10+**
- **MySQL 8.0+**
- **Redis 7+**
- **Gemini API Key** (for AI features)

### 1. Backend API

```bash
cd wealth-pulse-api

# Configure database in src/main/resources/application-dev.yml
mvn clean package
mvn spring-boot:run

# API runs on http://localhost:9090
# Swagger UI: http://localhost:9090/swagger-ui.html
```

### 2. Python Stock Service

```bash
cd wealth-pulse-python

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration

# Run with Docker
docker-compose up -d
# Or run directly
python -m app.main

# API runs on http://localhost:8000
```

### 3. Frontend Web

```bash
cd wealth-pulse-web

pnpm install
echo "GEMINI_API_KEY=your_api_key_here" > .env
pnpm dev

# Web app runs on http://localhost:9000
```

---

## Features

### Backend API (Spring Boot)

- **Authentication**: JWT-based stateless authentication
- **User Management**: Registration, login, OAuth (Google)
- **Portfolio Tracking**: Positions, transactions, capital flows
- **Market Data**: Real-time and historical stock data
- **AI Integration**: Google Gemini for trade analysis
- **File Storage**: AWS S3 / Cloudflare R2
- **Email Notifications**: Resend email service
- **API Documentation**: Swagger/OpenAPI

### Python Service

- **Stock Data Provider**: yfinance integration for HK/US stocks
- **Data Persistence**: MySQL with SQLAlchemy ORM
- **Caching**: Redis for high-performance data access
- **Scheduled Tasks**: Automatic market data refresh
- **JWT Authentication**: Secure API access
- **Docker Support**: Containerized deployment

### Frontend Web (React)

- **Dashboard**: Asset overview with interactive charts
- **Holdings Management**: Position tracking and P&L calculation
- **Trade Records**: Buy/sell transaction history
- **Capital Flow**: Deposit/withdrawal tracking
- **AI Lab**: Trade scoring and AI-powered market insights
- **Market Search**: Real-time stock quotes and quick trading
- **Multi-language**: Chinese/English support
- **Responsive Design**: Mobile-friendly interface

---

## Technology Stack

### Backend API

| Component | Technology |
|-----------|------------|
| Framework | Spring Boot 3.5.5 |
| Language | Java 17 |
| Database | MySQL + MyBatis-Plus 3.5.14 |
| Cache | Redis + Redisson |
| Security | Spring Security + JWT |
| Storage | AWS S3 / Cloudflare R2 |
| Docs | SpringDoc OpenAPI 2.8.12 |
| Email | Resend Java SDK 4.6.0 |
| OAuth | Google API Client 2.8.1 |

### Python Service

| Component | Technology |
|-----------|------------|
| Framework | FastAPI 0.115.0 |
| Language | Python 3.10+ |
| Database | MySQL + SQLAlchemy 2.0 |
| Cache | Redis |
| Scheduler | APScheduler 3.10 |
| Data Source | yfinance 0.2.50 |
| Auth | JWT (python-jose) |

### Frontend Web

| Component | Technology |
|-----------|------------|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build | Vite 6 |
| Charts | Recharts 3.7 |
| AI | @google/genai 1.38 |

---

## API Endpoints

### Backend API (Port 9090)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| POST | /api/auth/register | User registration |
| GET | /api/positions | Get user positions |
| POST | /api/transactions | Create transaction |
| GET | /api/assets/summary | Asset summary |
| POST | /api/ai/analyze | AI trade analysis |

### Python Service (Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/token | Get JWT token |
| GET | /api/stocks/ | List all stocks |
| GET | /api/stocks/{code}/market-data | Current market data |
| GET | /api/stocks/{code}/history | Historical data |
| POST | /api/stocks/refresh | Refresh market data |

---

## Configuration

### Backend (.env)
```bash
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/wealth_pulse
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=your_password
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6379
JWT_SECRET=your_jwt_secret_key
```

### Python (.env)
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
REDIS_HOST=localhost
API_SECRET_KEY=your_secret_key_min_32_chars
```

### Frontend (.env)
```bash
GEMINI_API_KEY=your_gemini_api_key
```

---

## Development

### Running All Services

```bash
# Terminal 1 - Backend
cd wealth-pulse-api && mvn spring-boot:run

# Terminal 2 - Python Service
cd wealth-pulse-python && docker-compose up -d

# Terminal 3 - Frontend
cd wealth-pulse-web && pnpm dev
```

### Access Points

- **Frontend**: http://localhost:9000
- **Backend API**: http://localhost:9090
- **Backend Swagger**: http://localhost:9090/swagger-ui.html
- **Python API**: http://localhost:8000
- **Python Swagger**: http://localhost:8000/docs

---

## Documentation

- [Backend Development Guide](./CLAUDE.md#backend-development-wealth-pulse-api)
- [Frontend Development Guide](./CLAUDE.md#frontend-development-wealth-pulse-web)
- [Python Service Guide](./wealth-pulse-python/README.md)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License

---

## Support

For issues and questions, please open an issue on GitHub.
