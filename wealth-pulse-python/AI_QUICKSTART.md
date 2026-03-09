# AI 股票分析功能 - 快速入门

## 已创建的文件

```
wealth-pulse-python/
├── app/
│   ├── api/
│   │   └── ai.py                      # ✅ AI 分析 API 路由
│   ├── services/
│   │   ├── llm_service.py             # ✅ LLM 服务（豆包/OpenAI）
│   │   └── stock_analysis_service.py  # ✅ 股票分析服务
│   ├── core/
│   │   └── config.py                  # ✅ 已添加 LLM 配置
│   └── main.py                        # ✅ 已注册 AI 路由
├── docs/
│   └── AI_ANALYSIS_README.md          # ✅ 详细说明文档
├── test_ai_analysis.py                # ✅ 测试脚本
├── .env.example                       # ✅ 已添加 LLM 配置示例
└── requirements.txt                   # ✅ 已更新依赖
```

## 快速开始

### 1. 配置环境变量

编辑 `.env` 文件，添加 LLM 配置：

```bash
# 推荐使用豆包（火山引擎）
LLM_PROVIDER=doubao
DOUBAO_API_KEY=your_doubao_api_key_here
DOUBAO_MODEL=ep-20250226185244-dxp9w
```

### 2. 启动服务

```bash
cd wealth-pulse-python
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

### 3. 访问 API 文档

打开浏览器访问：http://localhost:8010/docs

找到 `ai-analysis` 标签，查看 AI 分析接口。

### 4. 测试 API

```bash
# 获取 Token
curl -X POST "http://localhost:8010/api/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "wealth-pulse-java",
    "client_secret": "wealth-pulse-client-secret",
    "grant_type": "client_credentials"
  }'

# 使用 Token 分析股票
curl -X POST "http://localhost:8010/api/ai/analyze-stock" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock_code": "0700.HK",
    "period": "daily",
    "days": 60
  }'
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/analyze-stock | AI 分析股票（推荐） |
| GET | /api/ai/analyze-stock/{stock_code} | AI 分析股票（GET 方式） |

## 获取豆包 API Key

1. 访问 https://console.volcengine.com/ark
2. 点击「创建推理接口」
3. 选择模型：doubao-pro-32k 或 doubao-pro-4k
4. 复制 API Key 和模型 endpoint

## 支持的股票

- 港股：0700.HK（腾讯）、9988.HK（阿里巴巴）等
- 数据库中已存在的股票

## 注意事项

1. **必须配置 API Key** 才能使用
2. **分析耗时约 10-30 秒**
3. **建议使用豆包**（速度快、成本低）
4. **数据来源**：新浪财经爬虫

## 故障排查

### 问题：LLM 提供商未初始化
```
解决：检查 .env 中是否配置了 DOUBAO_API_KEY
```

### 问题：股票不存在
```
解决：先使用 POST /api/stocks/refresh 刷新股票数据
```

### 问题：分析超时
```
解决：增加 LLM 请求超时时间，或使用更快的模型
```

## 下一步

- 查看 [AI_ANALYSIS_README.md](./docs/AI_ANALYSIS_README.md) 了解更多详情
- 运行 `python test_ai_analysis.py` 测试分析功能
- 集成到前端应用中
