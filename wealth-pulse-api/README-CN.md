# Wealth Pulse API

> Java Spring Boot 后端服务

[![Java](https://img.shields.io/badge/Java-17-orange)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.5-green)](https://spring.io/projects/spring-boot)

**语言:** [English](./README.md) | 中文

**父项目:** [Wealth Pulse](../README.md)

---

## 简介

Wealth Pulse API 是 Wealth Pulse 平台的后端服务，基于 Spring Boot 3.5.5 和 Java 17 构建。提供以下 RESTful API：

- 用户认证与授权 (JWT + Spring Security)
- 股票投资组合管理
- 交易记录与资金流向跟踪
- AI 驱动的交易分析 (Google Gemini)
- 实时市场数据管理
- 文件存储 (AWS S3 / Cloudflare R2)
- 邮件通知

---

## 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | Spring Boot 3.5.5 |
| 语言 | Java 17 |
| 数据库 | MySQL 8.0 + MyBatis-Plus 3.5.14 |
| 缓存 | Redis 7 + Redisson |
| 安全 | Spring Security + JWT (jjwt) |
| 存储 | AWS S3 / Cloudflare R2 |
| 文档 | SpringDoc OpenAPI 2.8.12 |
| 邮件 | Resend Java SDK 4.6.0 |
| OAuth | Google API Client 2.8.1 |
| AI | Volcengine Ark Runtime |

---

## 项目结构

```
wealth-pulse-api/
├── src/main/java/com/litchi/wealth/
│   ├── controller/     # REST API 端点
│   ├── service/        # 业务逻辑接口
│   │   ├── impl/       # 服务实现
│   │   └── auth/       # 认证服务
│   ├── mapper/         # MyBatis-Plus 数据访问
│   ├── entity/         # 数据库实体
│   ├── dto/            # 请求/响应对象
│   ├── vo/             # 视图对象
│   ├── config/         # Spring 配置
│   ├── security/       # 安全过滤器和处理器
│   └── utils/          # 工具类
├── src/main/resources/
│   ├── mapper/         # MyBatis XML 映射器
│   └── application*.yml # 配置文件
└── pom.xml
```

---

## 快速开始

### 前置要求

- Java 17+
- Maven 3.6+
- MySQL 8.0+
- Redis 7+

### 1. 克隆与配置

```bash
cd wealth-pulse-api

# 编辑数据库配置
# src/main/resources/application-dev.yml
```

### 2. 构建与运行

```bash
# 构建
mvn clean package

# 以开发模式运行
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### 3. 访问 API

- **API**: http://localhost:9090/api
- **Swagger UI**: http://localhost:9090/swagger-ui.html

---

## API 接口

### 认证

| 方法 | 接口 | 描述 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/email-register | 邮箱注册 |
| POST | /api/auth/google | Google OAuth 登录 |

### 股票管理

| 方法 | 接口 | 描述 |
|------|------|------|
| GET | /api/stocks | 获取股票列表 |
| GET | /api/stocks/{code} | 获取股票详情 |
| POST | /api/stocks/refresh | 刷新股票数据 |

### 交易与持仓

| 方法 | 接口 | 描述 |
|------|------|------|
| GET | /api/positions | 获取用户持仓 |
| POST | /api/transactions | 创建交易记录 |
| GET | /api/transactions | 获取交易历史 |
| GET | /api/capital/flows | 获取资金流向 |

### AI 分析

| 方法 | 接口 | 描述 |
|------|------|------|
| POST | /api/analysis/trade | AI 交易分析 |
| POST | /api/analysis/market | AI 市场展望 |
| POST | /api/analysis/screenshot | 分析券商截图 |

---

## 配置

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
  expiration: 1440  # 分钟
```

### 环境变量

- `CLOUDFLARE_TURNSTILE_SECRET` - Cloudflare Turnstile 验证
- `AWS_ACCESS_KEY_ID` - AWS S3 凭证
- `AWS_SECRET_ACCESS_KEY` - AWS S3 凭证
- `RESEND_API_KEY` - Resend 邮件 API 密钥

---

## 安全

### 认证流程

1. 用户登录 → 后端返回 JWT 令牌
2. 令牌存储在客户端 localStorage
3. 后续请求包含 `Authorization: Bearer <token>`
4. `JwtAuthenticationTokenFilter` 验证令牌
5. 令牌存储在 Redis 中，24 小时有效期

### 公开端点

在 `SecurityConfig.java` 中配置：

- `/api/auth/**` - 认证端点
- `/swagger-ui/**`, `/v3/api-docs/**` - API 文档
- `/favicon.ico` - 静态资源

---

## 数据库结构

### 核心表

| 表名 | 描述 |
|------|------|
| tb_user | 用户账户 |
| tb_stock_info | 股票基本信息 |
| tb_stock_market_data | 实时市场数据 |
| tb_stock_market_history | 历史价格 |
| tb_user_position | 用户持仓 |
| tb_user_asset_summary | 资产快照 |
| tb_stock_transaction | 交易记录 |
| tb_capital_flow | 资金流向日志 |

---

## 开发

### 构建命令

```bash
# 清理构建
mvn clean package

# 跳过测试
mvn clean package -DskipTests

# 运行指定测试
mvn test -Dtest=ClassName
```

### 以指定 Profile 运行

```bash
# 开发环境
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 生产环境
mvn spring-boot:run -Dspring-boot.run.profiles=pro
```

---

## Docker 部署

```bash
# 构建镜像
docker build -t wealth-pulse-api .

# 运行容器
docker run -p 9090:9090 wealth-pulse-api
```

---

## 集成

### Python 股票服务

此后端与 Python 股票数据服务集成，用于获取实时市场数据。

详见 [Python 服务](../wealth-pulse-python/README.md)。

### 前端

React 前端通过此 API 进行所有数据操作。

详见 [前端](../wealth-pulse-web/README.md)。

---

## 文档

- [主项目 README](../README.md)
- [Python 服务](../wealth-pulse-python/README.md)
- [前端](../wealth-pulse-web/README.md)
- [CLAUDE.md](../CLAUDE.md) - 开发指南

---

## 许可证

MIT License

---

## 支持

如有问题或建议，请在 GitHub 上提交 issue 或参考 [主 README](../README.md)。
