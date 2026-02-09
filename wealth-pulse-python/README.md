# Wealth Pulse Python API

FastAPI service for fetching stock market data using yfinance, with MySQL persistence and Redis caching. Supports Hong Kong and US stocks with JWT authentication for Java API integration.

## Features

- FastAPI REST API for stock market data
- yfinance integration for HK/US stock data
- MySQL database persistence (matches existing Java API schema)
- Redis caching
- JWT-based authentication for secure API access
- Scheduled tasks for automatic data refresh
- Docker support
- Full Java integration guide

## Technology Stack

- **Framework**: FastAPI 0.115.0
- **Database**: MySQL 8.0 with SQLAlchemy 2.0
- **Cache**: Redis 7
- **Task Scheduling**: APScheduler 3.10
- **Data Source**: yfinance 0.2.50
- **Authentication**: JWT (python-jose)

## Project Structure

```
wealth-pulse-python/
├── app/
│   ├── api/              # API routes
│   │   ├── auth.py       # Authentication endpoints
│   │   ├── stocks.py     # Stock endpoints
│   │   └── health.py     # Health check endpoint
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings
│   │   └── security.py   # JWT authentication
│   ├── db/               # Database connections
│   │   ├── session.py    # SQLAlchemy session
│   │   └── redis.py      # Redis client
│   ├── models/           # Database models
│   │   ├── stock_info.py
│   │   ├── stock_market_data.py
│   │   └── stock_market_history.py
│   ├── schemas/          # Pydantic schemas
│   │   └── stock.py
│   ├── services/         # Business logic
│   │   ├── yfinance_service.py
│   │   └── stock_service.py
│   ├── tasks/            # Scheduled tasks
│   │   └── scheduler.py
│   └── main.py           # FastAPI application
├── logs/                 # Application logs
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── init.sql              # Database schema
├── JAVA_INTEGRATION.md   # Java integration guide
└── README.md
```

## Quick Start with Docker

### 1. Start the services

```bash
docker-compose up -d
```

This will start:
- MySQL on port 3307
- Redis on port 6380
- FastAPI on port 8000

### 2. Check service health

```bash
curl http://localhost:8000/health/
```

### 3. Get access token

```bash
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"wealth-pulse-java","client_secret":"wealth-pulse-client-secret"}'
```

### 4. Access API documentation

Open your browser:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development without Docker

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database and Redis credentials
```

**Important**: Update the following values in `.env`:
- `API_SECRET_KEY`: Change to a secure random string (min 32 characters)
- `API_CLIENT_ID`: Client ID for Java integration
- `API_CLIENT_SECRET`: Client secret for Java integration

### 3. Create database tables

```bash
mysql -u root -p < init.sql
```

### 4. Run the application

```bash
python -m app.main
```

## API Authentication

Most endpoints require JWT authentication. Follow these steps:

### 1. Get Access Token

```bash
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "wealth-pulse-java",
    "client_secret": "wealth-pulse-client-secret"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### 2. Use Token in Requests

```bash
curl http://localhost:8000/api/stocks/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/token` | Get access token | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/token/validate` | Validate token | No |

### Stock Data Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/stocks/` | Get all stocks | Yes |
| GET | `/api/stocks/{stock_code}` | Get stock by code | Yes |
| GET | `/api/stocks/{stock_code}/market-data` | Get current market data | Yes |
| GET | `/api/stocks/{stock_code}/history` | Get historical data | Yes |
| POST | `/api/stocks/refresh` | Manually refresh market data | Yes |
| GET | `/api/stocks/public/list` | Get stocks (no auth) | No |

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health/` | Check API, database, and Redis health | No |

### Example Usage

```bash
# Get all stocks (with authentication)
TOKEN="YOUR_ACCESS_TOKEN"
curl http://localhost:8000/api/stocks/ -H "Authorization: Bearer $TOKEN"

# Get specific stock
curl http://localhost:8000/api/stocks/0700.HK -H "Authorization: Bearer $TOKEN"

# Get market data
curl http://localhost:8000/api/stocks/0700.HK/market-data -H "Authorization: Bearer $TOKEN"

# Get historical data
curl http://localhost:8000/api/stocks/0700.HK/history?limit=30 -H "Authorization: Bearer $TOKEN"

# Refresh data manually
curl -X POST http://localhost:8000/api/stocks/refresh \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '["0700.HK", "NVDA.US"]'

# Public endpoint (no authentication)
curl http://localhost:8000/api/stocks/public/list
```

## Monitored Stocks

The following stocks are monitored by default (configurable in `app/tasks/scheduler.py`):

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

## Scheduled Tasks

### Market Data Update
- **Interval**: Every 5 minutes (configurable)
- **Action**: Fetches and updates current market data for all monitored stocks
- **Caching**: Stores data in Redis for quick access

### Historical Data Update
- **Schedule**: Daily at 6:00 AM
- **Action**: Fetches and stores historical data (1 month back)

## Database Schema

### tb_stock_info
Stock information table
- Primary Key: `stock_code`
- Fields: company_name, short_name, stock_type, exchange, currency, industry, etc.

### tb_stock_market_data
Real-time market data table
- Primary Key: `id` (auto-increment)
- Unique Index: (stock_code, market_date, quote_time)
- Fields: last_price, change_number, change_rate, volume, turnover, etc.

### tb_stock_market_history
Historical price data table
- Primary Key: `id` (auto-increment)
- Unique Index: (stock_code, trade_date)
- Fields: open_price, high_price, low_price, close_price, adj_close, volume

## Configuration

Environment variables (see `.env.example`):

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
REDIS_PASSWORD=redis_data_center
REDIS_DB=0

# API
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true
API_SECRET_KEY=your-secret-key-min-32-chars
API_CLIENT_ID=wealth-pulse-java
API_CLIENT_SECRET=wealth-pulse-client-secret

# Task Scheduling
SCHEDULER_ENABLED=true
MARKET_DATA_UPDATE_INTERVAL=300  # seconds

# Logging
LOG_LEVEL=INFO
```

## Java Integration

See [JAVA_INTEGRATION.md](JAVA_INTEGRATION.md) for detailed instructions on integrating this Python API with your Java Spring Boot application.

Key integration points:
1. JWT token management
2. WebClient configuration
3. Service layer examples
4. Error handling patterns

## Docker Commands

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart API
docker-compose restart api

# Execute commands in container
docker-compose exec api python -c "print('Hello')"
```

## Monitoring

### Application Logs
Logs are stored in `logs/app.log` and can be viewed with:

```bash
docker-compose logs -f api
```

### Database Access
```bash
docker-compose exec mysql mysql -u wealth_user -pwealth_password wealth_pulse
```

### Redis Access
```bash
docker-compose exec redis redis-cli -a redis_data_center
```

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

## Security Notes

1. **Change Default Credentials**: Always change `API_SECRET_KEY`, `API_CLIENT_ID`, and `API_CLIENT_SECRET` in production
2. **Use HTTPS**: Always use HTTPS in production for API communication
3. **Token Storage**: Store tokens securely in your Java application
4. **CORS**: Update CORS settings in `app/main.py` to only allow specific origins in production

## License

MIT
