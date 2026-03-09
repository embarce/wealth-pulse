# Wealth Pulse Python API

> FastAPI Service for Stock Market Data

[![Python](https://img.shields.io/badge/Python-3.10+-yellow)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal)](https://fastapi.tiangolo.com/)

**Language:** English | [中文](./README-CN.md)

**Parent Project:** [Wealth Pulse](../README.md)

---

## Overview

Wealth Pulse Python API is a FastAPI-based service for fetching and managing stock market data. It provides:

- Real-time stock data via yfinance (HK & US stocks)
- MySQL database persistence
- Redis caching for high performance
- JWT authentication for secure API access
- Scheduled tasks for automatic data refresh
- Docker support for easy deployment

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI 0.115.0 |
| Language | Python 3.10+ |
| Database | MySQL 8.0 + SQLAlchemy 2.0 |
| Cache | Redis 7 |
| Scheduler | APScheduler 3.10 |
| Data Source | yfinance 0.2.50 |
| Auth | JWT (python-jose) |
| Deployment | Docker + Docker Compose |

---

## Project Structure

```
wealth-pulse-python/
├── app/
│   ├── api/              # API routes
│   │   ├── auth.py       # Authentication endpoints
│   │   ├── stocks.py     # Stock endpoints
│   │   └── health.py     # Health check
│   ├── core/             # Configuration
│   │   ├── config.py     # Settings
│   │   └── security.py   # JWT auth
│   ├── db/               # Database
│   │   ├── session.py    # SQLAlchemy session
│   │   └── redis.py      # Redis client
│   ├── models/           # Database models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   ├── tasks/            # Scheduled tasks
│   └── main.py           # FastAPI app
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── init.sql
├── JAVA_INTEGRATION.md
└── README.md
```

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
cd wealth-pulse-python

# Start all services
docker-compose up -d

# Check service health
curl http://localhost:8000/health/
```

### Option 2: Manual Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Create database tables
mysql -u root -p < init.sql

# Run the application
python -m app.main
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/token | Get access token |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/token/validate | Validate token |

### Stock Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/stocks/ | Get all stocks |
| GET | /api/stocks/{code} | Get stock by code |
| GET | /api/stocks/{code}/market-data | Current market data |
| GET | /api/stocks/{code}/history | Historical data |
| POST | /api/stocks/refresh | Refresh market data |
| GET | /api/stocks/public/list | Get stocks (no auth) |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health/ | Health status |

---

## Authentication

### Get Access Token

```bash
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "wealth-pulse-java",
    "client_secret": "wealth-pulse-client-secret"
  }'
```

### Use Token in Requests

```bash
TOKEN="YOUR_ACCESS_TOKEN"

# Get all stocks
curl http://localhost:8000/api/stocks/ \
  -H "Authorization: Bearer $TOKEN"

# Get market data
curl http://localhost:8000/api/stocks/0700.HK/market-data \
  -H "Authorization: Bearer $TOKEN"
```

---

## Monitored Stocks

### Hong Kong Stocks
- 0700.HK - Tencent
- 9988.HK - Alibaba
- 0941.HK - China Mobile
- 1299.HK - AIA
- 0960.HK - Longfor Group
- 2018.HK - AAC Tech
- 1876.HK - Budweiser APAC
- 1024.HK - BOE Visual Technology
- 2020.HK - ANTA Sports
- 0883.HK - CNOOC

### US Stocks
- NVDA - NVIDIA
- AAPL - Apple
- MSFT - Microsoft
- TSLA - Tesla

---

## Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| Market Data Update | Every 5 min | Fetch real-time data |
| Historical Data Update | Daily 6:00 AM | Fetch historical data |

---

## Configuration

### Environment Variables (.env)

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wealth_pulse

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# API
API_HOST=0.0.0.0
API_PORT=8000
API_SECRET_KEY=your-secret-key-min-32-chars
API_CLIENT_ID=wealth-pulse-java
API_CLIENT_SECRET=wealth-pulse-client-secret

# Scheduler
SCHEDULER_ENABLED=true
MARKET_DATA_UPDATE_INTERVAL=300

# Logging
LOG_LEVEL=INFO
```

---

## Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Restart API
docker-compose restart api

# Access MySQL
docker-compose exec mysql mysql -u wealth_user -pwealth_password wealth_pulse

# Access Redis
docker-compose exec redis redis-cli -a redis_data_center
```

---

## API Documentation

When running, access interactive docs at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Integration

### Java Backend

This Python API is designed to integrate with the Java Spring Boot backend.

See [JAVA_INTEGRATION.md](JAVA_INTEGRATION.md) for detailed integration instructions.

### Frontend

The React frontend indirectly uses this API through the Java backend.

See [Frontend](../wealth-pulse-web/README.md) for details.

---

## Troubleshooting

### API fails to start
- Check MySQL and Redis are healthy: `docker-compose ps`
- Check logs: `docker-compose logs api`
- Verify database credentials in `.env`

### 401 Unauthorized errors
- Verify you have a valid access token
- Check token hasn't expired (24 hour validity)
- Verify client_id and client_secret are correct

### Database connection errors
- Verify database credentials in `.env`
- Ensure MySQL is running and accessible
- Check database exists and tables are created

### Scheduler not working
- Check `SCHEDULER_ENABLED=true` in environment
- Check logs for scheduler errors
- Verify yfinance can access stock data

---

## Documentation

- [Main Project README](../README.md)
- [Java API](../wealth-pulse-api/README.md)
- [Frontend Web](../wealth-pulse-web/README.md)
- [Java Integration Guide](JAVA_INTEGRATION.md)

---

## License

MIT License

---

## Support

For issues and questions, please open an issue on GitHub or refer to the [main README](../README.md).
