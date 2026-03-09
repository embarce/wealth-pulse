# Wealth Pulse API

> Java Spring Boot Backend for Wealth Pulse Platform

[![Java](https://img.shields.io/badge/Java-17-orange)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.5-green)](https://spring.io/projects/spring-boot)

**Language:** English | [中文](./README-CN.md)

**Parent Project:** [Wealth Pulse](../README.md)

---

## Overview

Wealth Pulse API is the backend service of the Wealth Pulse platform, built with Spring Boot 3.5.5 and Java 17. It provides RESTful APIs for:

- User authentication and authorization (JWT + Spring Security)
- Stock portfolio management
- Trading records and capital flow tracking
- AI-powered trade analysis (Google Gemini)
- Real-time market data management
- File storage (AWS S3 / Cloudflare R2)
- Email notifications

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Spring Boot 3.5.5 |
| Language | Java 17 |
| Database | MySQL 8.0 + MyBatis-Plus 3.5.14 |
| Cache | Redis 7 + Redisson |
| Security | Spring Security + JWT (jjwt) |
| Storage | AWS S3 / Cloudflare R2 |
| Docs | SpringDoc OpenAPI 2.8.12 |
| Email | Resend Java SDK 4.6.0 |
| OAuth | Google API Client 2.8.1 |
| AI | Volcengine Ark Runtime |

---

## Project Structure

```
wealth-pulse-api/
├── src/main/java/com/litchi/wealth/
│   ├── controller/     # REST API endpoints
│   ├── service/        # Business logic interfaces
│   │   ├── impl/       # Service implementations
│   │   └── auth/       # Authentication services
│   ├── mapper/         # MyBatis-Plus data access
│   ├── entity/         # Database entities
│   ├── dto/            # Request/Response objects
│   ├── vo/             # View objects
│   ├── config/         # Spring configuration
│   ├── security/       # Security filters and handlers
│   └── utils/          # Utility classes
├── src/main/resources/
│   ├── mapper/         # MyBatis XML mappers
│   └── application*.yml # Configuration files
└── pom.xml
```

---

## Quick Start

### Prerequisites

- Java 17+
- Maven 3.6+
- MySQL 8.0+
- Redis 7+

### 1. Clone and Configure

```bash
cd wealth-pulse-api

# Edit database configuration
# src/main/resources/application-dev.yml
```

### 2. Build and Run

```bash
# Build
mvn clean package

# Run with dev profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### 3. Access the API

- **API**: http://localhost:9090/api
- **Swagger UI**: http://localhost:9090/swagger-ui.html

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| POST | /api/auth/register | User registration |
| POST | /api/auth/email-register | Register with email |
| POST | /api/auth/google | Google OAuth login |

### Stock Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/stocks | Get stock list |
| GET | /api/stocks/{code} | Get stock details |
| POST | /api/stocks/refresh | Refresh stock data |

### Trading & Positions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/positions | Get user positions |
| POST | /api/transactions | Create transaction |
| GET | /api/transactions | Get transaction history |
| GET | /api/capital/flows | Get capital flows |

### AI Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/analysis/trade | AI trade analysis |
| POST | /api/analysis/market | AI market outlook |
| POST | /api/analysis/screenshot | Analyze broker screenshot |

---

## Configuration

### application-dev.yml

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/wealth_pulse
    username: root
    password: your_password
  redis:
    host: localhost
    port: 6379
    password: redis_password

jwt:
  secret: your_jwt_secret
  expiration: 1440  # minutes
```

### Environment Variables

- `CLOUDFLARE_TURNSTILE_SECRET` - Cloudflare Turnstile verification
- `AWS_ACCESS_KEY_ID` - AWS S3 credentials
- `AWS_SECRET_ACCESS_KEY` - AWS S3 credentials
- `RESEND_API_KEY` - Resend email API key

---

## Security

### Authentication Flow

1. User login → Backend returns JWT token
2. Token stored in client localStorage
3. Subsequent requests include `Authorization: Bearer <token>`
4. `JwtAuthenticationTokenFilter` validates tokens
5. Token stored in Redis with 24-hour validity

### Public Endpoints

Configured in `SecurityConfig.java`:

- `/api/auth/**` - Authentication endpoints
- `/swagger-ui/**`, `/v3/api-docs/**` - API documentation
- `/favicon.ico` - Static assets

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| tb_user | User accounts |
| tb_stock_info | Stock basic info |
| tb_stock_market_data | Real-time market data |
| tb_stock_market_history | Historical prices |
| tb_user_position | User holdings |
| tb_user_asset_summary | Asset snapshots |
| tb_stock_transaction | Trade records |
| tb_capital_flow | Capital flow logs |

---

## Development

### Build Commands

```bash
# Clean build
mvn clean package

# Skip tests
mvn clean package -DskipTests

# Run specific test
mvn test -Dtest=ClassName
```

### Run with Profile

```bash
# Development
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Production
mvn spring-boot:run -Dspring-boot.run.profiles=pro
```

---

## Docker Deployment

```bash
# Build image
docker build -t wealth-pulse-api .

# Run container
docker run -p 9090:9090 wealth-pulse-api
```

---

## Integration

### Python Stock Service

This backend integrates with the Python stock data service for real-time market data.

See [Python Service](../wealth-pulse-python/README.md) for details.

### Frontend

The React frontend connects to this API for all data operations.

See [Frontend](../wealth-pulse-web/README.md) for details.

---

## Documentation

- [Main Project README](../README.md)
- [Python Service](../wealth-pulse-python/README.md)
- [Frontend Web](../wealth-pulse-web/README.md)
- [CLAUDE.md](../CLAUDE.md) - Development guide

---

## License

MIT License

---

## Support

For issues and questions, please open an issue on GitHub or refer to the [main README](../README.md).
