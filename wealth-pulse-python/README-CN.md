# Wealth Pulse Python API

> FastAPI 股票数据服务

[![Python](https://img.shields.io/badge/Python-3.10+-yellow)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal)](https://fastapi.tiangolo.com/)

**语言:** [English](./README.md) | 中文

**父项目:** [Wealth Pulse](../README.md)

---

## 简介

Wealth Pulse Python API 是一个基于 FastAPI 的股票数据管理服务。提供以下功能：

- 通过 yfinance 获取实时股票数据（港股和美股）
- MySQL 数据库持久化
- Redis 高性能缓存
- JWT 认证安全访问
- 定时任务自动刷新数据
- Docker 容器化部署

---

## 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | FastAPI 0.115.0 |
| 语言 | Python 3.10+ |
| 数据库 | MySQL 8.0 + SQLAlchemy 2.0 |
| 缓存 | Redis 7 |
| 调度器 | APScheduler 3.10 |
| 数据源 | yfinance 0.2.50 |
| 认证 | JWT (python-jose) |
| 部署 | Docker + Docker Compose |

---

## 项目结构

```
wealth-pulse-python/
├── app/
│   ├── api/              # API 路由
│   │   ├── auth.py       # 认证端点
│   │   ├── stocks.py     # 股票端点
│   │   └── health.py     # 健康检查
│   ├── core/             # 配置
│   │   ├── config.py     # 设置
│   │   └── security.py   # JWT 认证
│   ├── db/               # 数据库
│   │   ├── session.py    # SQLAlchemy 会话
│   │   └── redis.py      # Redis 客户端
│   ├── models/           # 数据库模型
│   ├── schemas/          # Pydantic 模型
│   ├── services/         # 业务逻辑
│   ├── tasks/            # 定时任务
│   └── main.py           # FastAPI 应用
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── init.sql
├── JAVA_INTEGRATION.md
└── README.md
```

---

## 快速开始

### 方式 1：Docker（推荐）

```bash
cd wealth-pulse-python

# 启动所有服务
docker-compose up -d

# 检查服务健康状态
curl http://localhost:8000/health/
```

### 方式 2：手动安装

```bash
# 安装依赖
pip install -r requirements.txt

# 配置环境
cp .env.example .env
# 编辑 .env 填入你的凭证

# 创建数据库表
mysql -u root -p < init.sql

# 运行应用
python -m app.main
```

---

## API 接口

### 认证

| 方法 | 接口 | 描述 |
|------|------|------|
| POST | /api/auth/token | 获取访问令牌 |
| POST | /api/auth/refresh | 刷新令牌 |
| POST | /api/auth/token/validate | 验证令牌 |

### 股票数据

| 方法 | 接口 | 描述 |
|------|------|------|
| GET | /api/stocks/ | 获取所有股票 |
| GET | /api/stocks/{code} | 获取单只股票 |
| GET | /api/stocks/{code}/market-data | 当前市场数据 |
| GET | /api/stocks/{code}/history | 历史数据 |
| POST | /api/stocks/refresh | 刷新市场数据 |
| GET | /api/stocks/public/list | 获取股票（无需认证） |

### 健康检查

| 方法 | 接口 | 描述 |
|------|------|------|
| GET | /health/ | 健康状态 |

---

## 认证

### 获取访问令牌

```bash
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "wealth-pulse-java",
    "client_secret": "wealth-pulse-client-secret"
  }'
```

### 在请求中使用令牌

```bash
TOKEN="YOUR_ACCESS_TOKEN"

# 获取所有股票
curl http://localhost:8000/api/stocks/ \
  -H "Authorization: Bearer $TOKEN"

# 获取市场数据
curl http://localhost:8000/api/stocks/0700.HK/market-data \
  -H "Authorization: Bearer $TOKEN"
```

---

## 监控股票

### 港股
- 0700.HK - 腾讯
- 9988.HK - 阿里巴巴
- 0941.HK - 中国移动
- 1299.HK - 友邦保险
- 0960.HK - 龙湖集团
- 2018.HK - 瑞声科技
- 1876.HK - 百威亚太
- 1024.HK - 京东视觉科技
- 2020.HK - 安踏体育
- 0883.HK - 中国海洋石油

### 美股
- NVDA - 英伟达
- AAPL - 苹果
- MSFT - 微软
- TSLA - 特斯拉

---

## 定时任务

| 任务 | 计划 | 描述 |
|------|------|------|
| 市场数据更新 | 每 5 分钟 | 获取实时数据 |
| 历史数据更新 | 每天 6:00 | 获取历史数据 |

---

## 配置

### 环境变量 (.env)

```bash
# 数据库
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

# 调度器
SCHEDULER_ENABLED=true
MARKET_DATA_UPDATE_INTERVAL=300

# 日志
LOG_LEVEL=INFO
```

---

## Docker 命令

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f api

# 停止服务
docker-compose down

# 重启 API
docker-compose restart api

# 访问 MySQL
docker-compose exec mysql mysql -u wealth_user -pwealth_password wealth_pulse

# 访问 Redis
docker-compose exec redis redis-cli -a redis_data_center
```

---

## API 文档

运行时可访问交互式文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 集成

### Java 后端

此 Python API 设计用于与 Java Spring Boot 后端集成。

详见 [JAVA_INTEGRATION.md](JAVA_INTEGRATION.md)。

### 前端

React 前端通过 Java 后端间接使用此 API。

详见 [前端](../wealth-pulse-web/README.md)。

---

## 故障排除

### API 无法启动
- 检查 MySQL 和 Redis 健康状态：`docker-compose ps`
- 查看日志：`docker-compose logs api`
- 验证 `.env` 中的数据库凭证

### 401 未授权错误
- 验证你有有效的访问令牌
- 检查令牌是否已过期（24 小时有效期）
- 验证 client_id 和 client_secret 是否正确

### 数据库连接错误
- 验证 `.env` 中的数据库凭证
- 确保 MySQL 正在运行并可访问
- 检查数据库已创建且表已建立

### 调度器不工作
- 检查环境中 `SCHEDULER_ENABLED=true`
- 查看日志中的调度器错误
- 验证 yfinance 可以访问股票数据

---

## 文档

- [主项目 README](../README.md)
- [Java API](../wealth-pulse-api/README.md)
- [前端](../wealth-pulse-web/README.md)
- [Java 集成指南](JAVA_INTEGRATION.md)

---

## 许可证

MIT License

---

## 支持

如有问题或建议，请在 GitHub 上提交 issue 或参考 [主 README](../README.md)。
