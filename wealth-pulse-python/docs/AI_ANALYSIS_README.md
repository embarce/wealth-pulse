# AI 股票分析功能说明

## 概述

Python 服务现已集成 AI 股票分析功能，通过大语言模型（LLM）对港股进行智能分析。

## 功能特点

### 数据收集
分析服务会自动收集以下信息：
1. **股票基本信息** - 公司名称、行业、市值等
2. **实时市场数据** - 最新价格、涨跌幅、成交量等
3. **历史 K 线数据** - 默认获取 60 天的历史数据
4. **公司信息** - 主营业务、主席等（新浪财经）
5. **财务指标** - 营收、净利润、毛利率等（新浪财经）
6. **最近新闻** - 最近 5 条相关新闻（新浪财经）
7. **最近公告** - 最近 3 条公司公告（新浪财经）

### 分析结果
AI 返回以下分析结果：
- **趋势判断** - 上涨/下跌/横盘
- **技术点位** - 支撑位、压力位、止损位、止盈位
- **操作建议** - 强烈买入/买入/持有/卖出/强烈卖出
- **风险等级** - 低/中/高
- **目标价格区间** - 预测的价格范围
- **基本面分析** - 150 字以内
- **技术面分析** - 150 字以内
- **新闻影响分析** - 100 字以内
- **评级** - 买入/持有/卖出/观望
- **置信度** - 高/中/低

## 配置

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 配置 LLM API Key

在 `.env` 文件中配置（推荐使用豆包）：

```bash
# 使用豆包（推荐，国内访问速度快）
LLM_PROVIDER=doubao
DOUBAO_API_KEY=your_doubao_api_key_here
DOUBAO_MODEL=ep-20250226185244-dxp9w

# 或使用 OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

### 3. 获取豆包 API Key

1. 访问 [火山引擎控制台](https://console.volcengine.com/ark)
2. 创建推理接口，选择模型（如：doubao-pro-32k）
3. 获取 API Key 和模型 endpoint

## API 使用

### POST 方式

```bash
curl -X POST "http://localhost:8010/api/ai/analyze-stock" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock_code": "0700.HK",
    "period": "daily",
    "days": 60,
    "force_refresh": false
  }'
```

### GET 方式

```bash
curl -X GET "http://localhost:8010/api/ai/analyze-stock/0700.HK?period=daily&days=60" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 响应示例

```json
{
  "code": 200,
  "msg": "股票 0700.HK 分析完成",
  "data": {
    "stock_code": "0700.HK",
    "current_price": "380.2",
    "trend": "uptrend",
    "trend_description": "股价处于上升趋势中，均线多头排列，短期表现强势",
    "technical_points": [
      {
        "type": "support",
        "price": "370.0",
        "strength": 4,
        "description": "强支撑位，近20日低点区域"
      },
      {
        "type": "resistance",
        "price": "395.5",
        "strength": 4,
        "description": "主要压力位，前期高点区域"
      }
    ],
    "recommendation": "buy",
    "recommendation_reason": "技术面呈现上升态势，支撑位较强，建议逢低布局",
    "risk_level": "medium",
    "risk_description": "估值合理，波动性中等",
    "target_price_range": "395-425",
    "fundamental_analysis": "公司核心业务保持稳健增长...",
    "technical_analysis": "K线形态呈现上升通道...",
    "news_impact": "近期新闻整体偏正面...",
    "rating": "买入",
    "confidence": "high"
  }
}
```

## 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码，如：0700.HK, 09868.HK |
| period | string | 否 | 周期：daily/weekly/monthly，默认 daily |
| days | int | 否 | 获取多少天的历史数据，默认 60，范围 10-365 |
| force_refresh | bool | 否 | 是否强制刷新（跳过缓存），默认 false |

## 支持的 LLM 提供商

### 1. 豆包（推荐）
- **优点**：国内访问速度快，价格低，支持中文
- **适用场景**：港股分析、中文场景
- **获取方式**：https://console.volcengine.com/ark

### 2. OpenAI
- **优点**：模型能力强，生态成熟
- **适用场景**：全球市场分析
- **获取方式**：https://platform.openai.com

## 注意事项

1. **首次使用前必须配置 API Key**，否则会返回错误
2. **分析过程需要 10-30 秒**，请耐心等待
3. **建议使用豆包**，国内访问速度更快
4. **数据来源**：新浪财经爬虫，可能会有延迟
5. **分析结果仅供参考**，不构成投资建议

## 错误处理

### API Key 未配置
```json
{
  "code": 500,
  "msg": "LLM 提供商未初始化，请检查配置"
}
```
解决方法：在 `.env` 中配置 `DOUBAO_API_KEY` 或 `OPENAI_API_KEY`

### 股票不存在
```json
{
  "code": 400,
  "msg": "股票 9999.HK 不存在"
}
```
解决方法：确认股票代码正确，且已在数据库中

### 历史数据不足
```json
{
  "code": 400,
  "msg": "历史数据不足，仅有 5 条记录"
}
```
解决方法：该股票可能是新上市股票，等待更多交易数据

## 架构说明

```
app/
├── api/
│   └── ai.py                    # AI 分析 API 路由
├── services/
│   ├── llm_service.py           # LLM 服务（支持豆包、OpenAI）
│   └── stock_analysis_service.py  # 股票分析服务
└── core/
    └── config.py                # 配置（添加 LLM 配置项）
```

## 未来扩展

- [ ] 添加 Redis 缓存，减少重复分析
- [ ] 支持美股、A 股分析
- [ ] 添加更多 LLM 提供商（Claude、文心一言等）
- [ ] 支持批量分析
- [ ] 添加历史分析记录查询
