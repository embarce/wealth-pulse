# Wealth Pulse

> Hong Kong stock investment tracking & AI-assisted analysis platform
> 港股投资跟踪与 AI 辅助分析平台

---

[![Java](https://img.shields.io/badge/Java-17-orange)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.5-green)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-yellow)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal)](https://fastapi.tiangolo.com/)

## Overview / 简介

**Wealth Pulse** is a full-stack investment tracking platform designed for Hong Kong stock market investors. It combines:

- **Backend API** (Spring Boot) - RESTful services with JWT authentication
- **Frontend Web** (React + TypeScript) - Interactive dashboard with AI-powered insights
- **Python Scripts** (FastAPI) - Stock data fetching and processing utilities

**Wealth Pulse** 是一个专为港股投资者设计的全栈投资跟踪平台，整合了：

- **后端 API** (Spring Boot) - 基于 JWT 认证的 RESTful 服务
- **前端 Web** (React + TypeScript) - 交互式仪表盘与 AI 智能分析
- **Python 脚本** (FastAPI) - 股票数据获取与处理工具

---

## Project Structure / 项目结构

```
wealth-pulse/
├── wealth-pulse-api/       # Java Spring Boot backend
├── wealth-pulse-web/       # React TypeScript frontend
├── wealth-pulse-python/    # FastAPI stock data service
├── sql/                    # Database scripts
└── docs/                   # Documentation
```

---

## Quick Start / 快速开始

### Prerequisites / 前置要求

- **Java 17+**
- **Node.js 18+**
- **Python 3.10+**
- **MySQL 8.0+**
- **Redis 7+**
- **Gemini API Key** (for AI features)

### 1. Backend API / 后端服务

```bash
cd wealth-pulse-api

# Configure database in src/main/resources/application-dev.yml
# Edit MySQL and Redis connection settings

# Build and run
mvn clean package
mvn spring-boot:run

# API runs on http://localhost:9090
# Swagger UI: http://localhost:9090/swagger-ui.html
```

### 2. Python Stock Service / Python 股票服务

```bash
cd wealth-pulse-python

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database and API credentials

# Run with Docker
docker-compose up -d

# Or run directly
python -m app.main

# API runs on http://localhost:8000
# Swagger UI: http://localhost:8000/docs
```

### 3. Frontend Web / 前端应用

```bash
cd wealth-pulse-web

# Install dependencies
pnpm install
# or npm install

# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Run development server
pnpm dev

# Web app runs on http://localhost:9000
```

---

## Features / 功能特性

### Backend API (Spring Boot)

- **Authentication**: JWT-based stateless authentication
- **User Management**: Registration, login, OAuth (Google)
- **Portfolio Tracking**: Positions, transactions, capital flows
- **Market Data**: Real-time and historical stock data
- **AI Integration**: Google Gemini for trade analysis
- **File Storage**: AWS S3 / Cloudflare R2
- **Email Notifications**: Resend email service
- **API Documentation**: Swagger/OpenAPI

### Python Service (FastAPI)

- **Stock Data Provider**: yfinance integration for HK/US stocks
- **Data Persistence**: MySQL with SQLAlchemy ORM
- **Caching**: Redis for high-performance data access
- **Scheduled Tasks**: Automatic market data refresh
- **JWT Authentication**: Secure API access for Java backend
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

## Technology Stack / 技术栈

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
| Utilities | html-to-image, qrcode |

---

## Database Schema / 数据库结构

### Core Tables / 核心数据表

- `tb_user` - User accounts and authentication
- `tb_stock_info` - Stock basic information
- `tb_stock_market_data` - Real-time market data
- `tb_stock_market_history` - Historical price data
- `tb_user_position` - User holdings
- `tb_user_asset_summary` - Asset snapshots
- `tb_stock_transaction` - Trade records
- `tb_capital_flow` - Capital flow logs

---

## API Endpoints / API 接口

### Backend API (Port 9090)

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/positions` - Get user positions
- `POST /api/transactions` - Create transaction
- `GET /api/assets/summary` - Asset summary
- `POST /api/ai/analyze` - AI trade analysis

### Python Service (Port 8000)

- `POST /api/auth/token` - Get JWT token
- `GET /api/stocks/` - List all stocks
- `GET /api/stocks/{code}/market-data` - Current market data
- `GET /api/stocks/{code}/history` - Historical data
- `POST /api/stocks/refresh` - Refresh market data
- `GET /health/` - Health check

---

## Configuration / 配置

### Environment Variables / 环境变量

**Backend (.env)**:
```bash
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/wealth_pulse
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=your_password
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6379
SPRING_REDIS_PASSWORD=redis_password
JWT_SECRET=your_jwt_secret_key
CLOUDFLARE_TURNSTILE_SECRET=your_turnstile_secret
```

**Python (.env)**:
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wealth_pulse
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
API_SECRET_KEY=your_secret_key_min_32_chars
API_CLIENT_ID=wealth-pulse-java
API_CLIENT_SECRET=your_client_secret
```

**Frontend (.env)**:
```bash
GEMINI_API_KEY=your_gemini_api_key
```

---

## Development / 开发

### Running All Services / 启动所有服务

```bash
# Terminal 1 - Backend
cd wealth-pulse-api
mvn spring-boot:run

# Terminal 2 - Python Service
cd wealth-pulse-python
docker-compose up -d

# Terminal 3 - Frontend
cd wealth-pulse-web
pnpm dev
```

### Access Points / 访问地址

- **Frontend**: http://localhost:9000
- **Backend API**: http://localhost:9090
- **Backend Swagger**: http://localhost:9090/swagger-ui.html
- **Python API**: http://localhost:8000
- **Python Swagger**: http://localhost:8000/docs

---

## Docker Deployment / Docker 部署

### Python Service
```bash
cd wealth-pulse-python
docker-compose up -d
```

### Backend API
```bash
cd wealth-pulse-api
docker build -t wealth-pulse-api .
docker run -p 9090:9090 wealth-pulse-api
```

### Frontend
```bash
cd wealth-pulse-web
pnpm build
docker build -t wealth-pulse-web .
docker run -p 80:80 wealth-pulse-web
```

---

## Documentation / 文档

- [Backend Development Guide](./CLAUDE.md#backend-development-wealth-pulse-api)
- [Frontend Development Guide](./CLAUDE.md#frontend-development-wealth-pulse-web)
- [Python Service Guide](./wealth-pulse-python/README.md)
- [Java Integration Guide](./wealth-pulse-python/JAVA_INTEGRATION.md)

---

## Contributing / 贡献

Contributions are welcome! Please feel free to submit a Pull Request.

欢迎贡献！请随时提交 Pull Request。

---

## License / 许可证

MIT License

---

## Support / 支持

For issues and questions, please open an issue on GitHub.

如有问题或建议，请在 GitHub 上提交 issue。
