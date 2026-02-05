# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wealth Pulse is a **Hong Kong stock investment tracking & AI-assisted analysis platform** consisting of:
- **Backend (wealth-pulse-api)**: Spring Boot 3.5.5 REST API with JWT authentication
- **Frontend (wealth-pulse-web)**: React 19 + TypeScript SPA with Vite 6

The platform tracks investment portfolios, manages trading records, provides real-time market monitoring, and uses Google Gemini AI for trade analysis and market insights.

---

## Backend Development (wealth-pulse-api)

### Technology Stack
- **Framework**: Spring Boot 3.5.5, Java 17
- **Database**: MySQL with MyBatis-Plus 3.5.14
- **Cache**: Redis with Spring Session + Redisson for distributed locks
- **Security**: Spring Security + JWT (jjwt 0.13.0)
- **Storage**: AWS S3 SDK / Cloudflare R2 for file storage
- **Documentation**: SpringDoc OpenAPI 2.8.12 (Swagger UI)

### Build & Run
```bash
# Navigate to backend directory
cd wealth-pulse-api

# Build project
mvn clean package

# Run with specific profile (dev/uat/pro)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Default profile: dev (see pom.xml)
# Dev server runs on port 9090
```

### Testing
```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=ClassName

# Run specific test method
mvn test -Dtest=ClassName#methodName
```

### Database Configuration
- Connection configured in `src/main/resources/application-dev.yml`
- MyBatis-Plus handles CRUD with XML mappers in `src/main/resources/mapper/`
- Entity auto-fill: `CreateAndUpdateMetaObjectHandler` manages `createTime` and `updateTime`

### Key Architecture Patterns

#### Authentication & Authorization
- **JWT-based stateless authentication**: `JwtAuthenticationTokenFilter` validates tokens
- **User entity implements Spring Security's `UserDetails`**: Direct integration with Spring Security
- **Role-based access control**: Comma-separated roles in `tb_user.role` field
- **Public endpoints** (configured in `SecurityConfig.java:80-97`):
  - `/auth/**` - Authentication endpoints
  - `/v2/api-docs`, `/swagger-ui/**` - API documentation
  - `/common/v1/model/config` (GET only)

#### Layer Structure
```
controller/     - REST endpoints (@RestController)
service/        - Business logic interfaces
  impl/         - Service implementations
mapper/         - MyBatis-Plus data access interfaces
entity/         - Database entities with @TableName
dto/            - Request/Response objects
vo/             - View objects for API responses
constant/       - Constants and result wrappers
config/         - Spring configuration classes
utils/          - Utility classes (RedisCache, SecurityUtils, etc.)
security/       - Security filters and handlers
```

#### Caching Strategy
- **RedisCache**: Wrapper for `RedisTemplate` operations
- **RedissonLock**: Distributed lock implementation
- **Spring Session**: Stores user sessions in Redis

#### Common Development Tasks

**Adding new API endpoint:**
1. Create DTO in `dto/` package
2. Add method to interface in `service/`
3. Implement in `service/impl/`
4. Create controller method with `@PostMapping`/`@GetMapping`
5. Add mapper method if DB access needed (MyBatis-Plus provides basic CRUD)

**Entity with MyBatis-Plus:**
- Extend `BaseEntity` for auto-filled `createTime`/`updateTime`
- Use `@TableName("table_name")` for custom table names
- `@TableId(type = IdType.ASSIGN_ID)` for auto-generated snowflake IDs

**Security public access:**
- Add request matchers to `SecurityConfig.filterChain():80-97`

### Environment Variables
Required for cloud features (set in environment or `application-dev.yml`):
- `CLOUDFLARE_TURNSTILE_SECRET` - Cloudflare Turnstile verification
- R2 storage credentials (if using S3 storage)

---

## Frontend Development (wealth-pulse-web)

### Technology Stack
- **Framework**: React 19 (functional components + Hooks)
- **Language**: TypeScript 5.8
- **Build**: Vite 6
- **Charts**: Recharts 3.7
- **AI**: @google/genai 1.38 (Google Gemini)
- **Utilities**: html-to-image, qrcode

### Build & Run
```bash
# Navigate to frontend directory
cd wealth-pulse-web

# Install dependencies
pnpm install
# or npm install

# Development server (port 9000)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Environment Variables
Create `.env` file in project root:
```bash
GEMINI_API_KEY=your_gemini_api_key
```
Vite injects this as `process.env.GEMINI_API_KEY` via `define` in `vite.config.ts:22-24`.

### Dev Proxy
- `/api` requests proxy to `http://localhost:9090` (backend)
- Configured in `vite.config.ts:11-19`

### Key Architecture Patterns

#### State Management
- **No Redux/Context store**: All state in `App.tsx` with props drilling
- **LocalStorage persistence**:
  - `pulse_token` - JWT token
  - `pulse_auth` - Login status flag
  - `pulse_lang` - Language preference (zh/en)
  - `stock_transactions` - Trade records
  - `stock_capital` - Capital flow logs
  - `app_config` - App configuration

#### Internationalization (i18n)
- Custom `I18nContext` in `App.tsx:32-36`
- Dictionary in `i18n.ts` with `translations[lang]`
- Toggle via language selector, persisted to localStorage

#### HTTP Client
**`services/http.ts`** - Custom wrapper:
- Auto-attaches JWT from `localStorage.pulse_token`
- Handles 401/403 by clearing auth and redirecting to login
- Used for backend API calls

#### Backend Services
**`services/backend.ts`** - Dual-mode:
- **Mock mode**: Uses localStorage with demo data
- **Real mode**: Calls backend API via httpClient

#### Pages Structure
```
Login.tsx           - Authentication entry
Dashboard.tsx       - KPIs, charts, AI outlook
Holdings.tsx        - Portfolio positions with sell actions
Records.tsx         - Transaction & capital history
AILab.tsx           - Batch import trades, AI scoring/review
MarketSearch.tsx    - Stock search with mock prices
Settings.tsx        - Notification & app config
Help.tsx            - Usage guide
```

#### Data Flow
- **App.tsx** manages all global state (transactions, holdings, capital logs)
- **Derived calculations** via `useMemo`:
  - `holdings`: Aggregates positions from transactions
  - `assets`: Calculates total value, profit, cash from holdings
  - `totalPrincipal`: Sum of deposits - withdrawals
- **Child components** receive data as props, call handlers passed down

#### AI Integration
**`services/gemini.ts`**:
- `getTradeScore()` - Scores trades with rationale
- `getMarketOutlook()` - Generates portfolio-level insights
- Auto-triggered after buy trades in `App.tsx:185-189`

---

## Common Commands

### Full Stack Development
```bash
# Terminal 1 - Backend
cd wealth-pulse-api
mvn spring-boot:run

# Terminal 2 - Frontend
cd wealth-pulse-web
pnpm dev
```

### Database Operations
```bash
# Connect to MySQL (configured in application-dev.yml)
mysql -h 127.0.0.1 -u root -p wealth_pulse

# Redis operations
redis-cli -h 127.0.0.1 -p 6379
AUTH redis_data_center
```

### API Documentation
- Swagger UI: `http://localhost:9090/swagger-ui.html`
- Available when backend is running

---

## Architecture Notes

### Backend Service Layer Pattern
- Interfaces in `service/` (e.g., `UserService.java`)
- Implementations in `service/impl/` (e.g., `UserServiceImpl.java`)
- Controllers inject interfaces, not implementations

### Frontend Component Patterns
- No component library - custom CSS with Tailwind-like utility classes
- Modal reuse: Single `Modal.tsx` component with dynamic content
- Form state: Controlled components with `useState`

### Security Flow
1. Login → Backend returns JWT token
2. Frontend stores in `localStorage.pulse_token`
3. Subsequent requests include `Authorization: Bearer <token>`
4. Backend validates via `JwtAuthenticationTokenFilter`
5. Token refresh on each request via `tokenService.verifyToken()`

### Data Storage
- **Frontend mock mode**: All data in localStorage (works without backend)
- **Production mode**: Frontend → Backend API → MySQL/Redis

### MyBatis-Plus Tips
- XML mappers for complex queries in `src/main/resources/mapper/`
- Simple CRUD: Use built-in `BaseMapper` methods (insert, selectById, update, etc.)
- Pagination: Use `Page<T>` objects with `ToPageUtils.convert()`

### Adding New Stock Market Data
Entities (in `entity/`):
- `StockInfo` - Basic stock metadata
- `StockMarketData` - Real-time market data
- `StockMarketHistory` - Historical prices
- `UserPosition` - User holdings
- `UserAssetSummary` - Asset snapshots

---

## Troubleshooting

### Backend won't start
- Check MySQL is running on port 3306
- Check Redis is running on port 6379
- Verify credentials in `application-dev.yml`

### Frontend can't reach backend
- Ensure backend is running on port 9090
- Check proxy config in `vite.config.ts`
- Check browser console for CORS errors

### JWT token issues
- Check `JwtAuthenticationTokenFilter` logs
- Verify token in `localStorage.pulse_token`
- Check Redis for session data

### Build fails
- Backend: `mvn clean` then rebuild
- Frontend: Delete `node_modules`, run `pnpm install`
