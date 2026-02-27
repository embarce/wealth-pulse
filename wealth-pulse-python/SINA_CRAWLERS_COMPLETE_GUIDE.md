# 新浪财经三大爬虫服务完整使用指南

本项目提供了三个新浪财经爬虫服务，用于获取港股的新闻资讯、公司资料和财务指标。

---

## 目录
1. [新闻爬虫服务](#1-新闻爬虫服务)
2. [公司信息爬虫服务](#2-公司信息爬虫服务)
3. [财务指标爬虫服务](#3-财务指标爬虫服务)
4. [数据局限性说明](#4-数据局限性说明)
5. [使用建议](#5-使用建议)

---

## 1. 新闻爬虫服务

### 功能说明
爬取新浪财经港股个股新闻页面，提取新闻标题、链接、发布时间等信息。

### 服务类
`app.services.sina_news_crawler.SinaNewsCrawler`

### API接口
**端点**: `GET /api/stocks/{stock_code}/news`

**路径参数**:
- `stock_code`: 股票代码 (例如: 0700.HK, 09868.HK)

**认证**: 需要JWT Bearer Token

**响应示例**:
```json
{
  "code": 200,
  "msg": "Stock news retrieved successfully",
  "data": [
    {
      "title": "小鹏汽车副总裁称第二代VLA小试牛刀",
      "url": "https://t.cj.sina.cn/articles/view/1826017320/...",
      "datasource": "新浪财经",
      "publish_time": "2026-02-26 20:51:55"
    }
  ]
}
```

### 使用示例
```bash
curl -X GET "http://localhost:8010/api/stocks/09868.HK/news" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 2. 公司信息爬虫服务

### 功能说明
爬取新浪财经港股公司资料页面，提取公司的详细信息。

### 服务类
`app.services.sina_company_info_crawler.SinaCompanyInfoCrawler`

### API接口
**端点**: `GET /api/stocks/{stock_code}/company-info-sina`

**响应字段**:
- 基本信息: 证券代码、公司名称、公司业务、所属行业、股份数目
- 管理层: 主席、董事、公司秘书
- 联系方式: 总部地址、电话、传真、邮箱、网址
- 其他信息: 注册办事处、股份过户登记处、核数师、主要银行、法律顾问

**响应示例**:
```json
{
  "code": 200,
  "msg": "Company info retrieved successfully",
  "data": {
    "stock_code": "01810.HK",
    "security_code": "01810",
    "company_name_cn": "小米集团",
    "company_name_en": "Xiaomi Corporation",
    "industry": "资讯科技器材",
    "chairman": "雷军",
    "headquarters": "香港铜锣湾希慎道33号利园一期19楼1928室",
    "website": "http://www.mi.com",
    "phone": "(400)1005678",
    "email": "ir@xiaomi.com",
    "datasource": "新浪财经"
  }
}
```

### 使用示例
```bash
curl -X GET "http://localhost:8010/api/stocks/01810.HK/company-info-sina" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. 财务指标爬虫服务

### 功能说明
爬取新浪财经港股财务指标页面，提取原始财务数据并计算关键比率。

### 服务类
`app.services.sina_finance_crawler.SinaFinanceCrawler`

### API接口
**端点**: `GET /api/stocks/{stock_code}/financial-indicators-sina`

**响应字段**:

#### Latest Period (最新报告期)
- `end_date`: 截止日期
- `report_type`: 报表类型（年报/中报/季报）
- `announcement_date`: 公告日期

#### Profitability (盈利能力)
- `revenue`: 营业收入（百万元）
- `net_profit`: 净利润（百万元）
- `gross_profit_margin`: 毛利率（%）- **计算得出**
- `net_profit_margin`: 净利率（%）- **计算得出**
- `eps_basic`: 基本每股盈利（仙）
- `operating_profit`: 经营盈利（百万元）

#### Financial Health (财务健康)
- `current_ratio`: 流动比率 - **计算得出**
- `debt_ratio`: 负债率（%）- **计算得出**
- `operating_cash_flow`: 经营现金流（百万元）
- `current_assets`: 流动资产（百万元）
- `current_liabilities`: 流动负债（百万元）
- `total_equity`: 股东权益（百万元）

#### Historical Data
- 最近8个报告期的历史数据

**响应示例**:
```json
{
  "code": 200,
  "msg": "Financial indicators retrieved successfully",
  "data": {
    "stock_code": "01810.HK",
    "datasource": "新浪财经",
    "latest_period": {
      "end_date": "2025-09-30",
      "report_type": "三季报",
      "announcement_date": "2025-11-18"
    },
    "profitability": {
      "revenue": 47902.35,
      "net_profit": 11245.67,
      "gross_profit_margin": 22.75,
      "net_profit_margin": 23.48,
      "eps_basic": 150.06,
      "operating_profit": 5864.79
    },
    "financial_health": {
      "current_ratio": 1.85,
      "debt_ratio": 45.2,
      "operating_cash_flow": 8923.45,
      "current_assets": 156234.56,
      "current_liabilities": 84567.89,
      "total_equity": 234567.89
    }
  }
}
```

### 使用示例
```bash
curl -X GET "http://localhost:8010/api/stocks/01810.HK/financial-indicators-sina" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. 数据局限性说明

### 可获取的指标 ✅

#### 新闻爬虫
- ✅ 新闻标题
- ✅ 新闻链接
- ✅ 发布时间
- ✅ 数据源标识

#### 公司信息爬虫
- ✅ 公司基本信息（名称、业务、行业）
- ✅ 管理层信息（主席、董事、秘书）
- ✅ 联系方式（地址、电话、邮箱、网址）
- ✅ 其他信息（核数师、银行、律师）

#### 财务指标爬虫
- ✅ 营业收入、净利润、经营盈利
- ✅ 毛利率、净利率（**计算得出**）
- ✅ 流动比率、负债率（**计算得出**）
- ✅ 基本每股盈利、摊薄每股盈利
- ✅ 经营现金流
- ✅ 多期历史数据（通常8个报告期）

### 需要其他数据源的指标 ⚠️

#### 财务指标爬虫暂不提供
以下指标在新浪财经财务页面**不直接提供**，需要从其他数据源获取：

1. **市盈率 (PE Ratio)**
   - 原因：需要实时股价数据
   - 计算：PE = 股价 / 每股收益
   - 建议来源：AkShare `stock_hk_financial_indicator_em`

2. **市净率 (PB Ratio)**
   - 原因：需要实时股价和每股净资产数据
   - 计算：PB = 股价 / 每股净资产
   - 建议来源：AkShare `stock_hk_financial_indicator_em`

3. **股息率 (Dividend Yield)**
   - 原因：需要实时股价和股息数据
   - 计算：股息率 = 年度股息 / 股价
   - 建议来源：AkShare `stock_hk_financial_indicator_em`

4. **ROE (净资产收益率)**
   - 原因：新浪不直接提供此比率
   - 计算：ROE = 净利润 / 股东权益
   - 建议来源：AkShare `stock_hk_financial_indicator_em`

---

## 5. 使用建议

### 5.1 数据源组合

推荐的数据获取策略：

```
新闻资讯 → 新浪新闻爬虫
公司资料 → 新浪公司信息爬虫
财务指标 → 新浪财务爬虫 + AkShare财务指标接口
实时行情 → yfinance 或 AkShare
历史K线 → AkShare港股历史接口
```

### 5.2 获取完整财务比率

如需获取PE、PB、ROE等完整财务比率，建议：

**方案1：使用AkShare接口**
```python
import akshare as ak

# 获取港股财务指标（包含PE、PB、ROE等）
df = ak.stock_hk_financial_indicator_em(symbol="01810")
print(df[['市盈率', '市净率', '股息率TTM', '股东权益回报率']])
```

**方案2：自行计算**
```python
# 1. 获取实时股价
stock_price = get_real_time_price("01810.HK")  # 从行情接口

# 2. 获取每股收益（从新浪财务爬虫）
eps = 150.06  # 单位：仙

# 3. 计算市盈率
pe = (stock_price / 100) / (eps / 100)  # 转换单位后计算
```

### 5.3 API调用优先级

**推荐调用顺序**：
1. 新浪新闻 - 频率高（每分钟）
2. 新浪财务指标 - 频率中等（每天）
3. 新浪公司信息 - 频率低（每周或每月）

### 5.4 缓存策略

```python
# 推荐缓存时间
news_cache_ttl = 300           # 新闻：5分钟
company_info_cache_ttl = 86400  # 公司信息：24小时
financial_cache_ttl = 3600     # 财务指标：1小时
```

### 5.5 错误处理

```python
try:
    # 尝试从新浪获取财务指标
    sina_data = sina_finance_crawler.fetch_financial_indicators_sync(stock_code)

    # 检查数据完整性
    if not sina_data.get('profitability', {}).get('revenue'):
        logger.warning("Sina财务数据不完整，尝试使用AkShare")
        # 回退到AkShare
        akshare_data = fetch_from_akshare(stock_code)

except Exception as e:
    logger.error(f"新浪爬取失败: {e}")
    # 使用备用数据源
    backup_data = fetch_from_akshare(stock_code)
```

---

## 6. 测试脚本

### 运行所有测试
```bash
# 测试新闻爬虫
python test_sina_crawler.py

# 测试公司信息爬虫
python test_company_info_simple.py

# 测试财务指标爬虫
python test_finance_simple.py
```

### 测试API（需要服务运行）
```bash
# 获取Token
TOKEN=$(curl -s -X POST http://localhost:8010/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"wealth-pulse-java","client_secret":"wealth-pulse-client-secret"}' \
  | jq -r '.data.access_token')

# 测试三个爬虫API
curl -X GET "http://localhost:8010/api/stocks/01810.HK/news" \
  -H "Authorization: Bearer $TOKEN"

curl -X GET "http://localhost:8010/api/stocks/01810.HK/company-info-sina" \
  -H "Authorization: Bearer $TOKEN"

curl -X GET "http://localhost:8010/api/stocks/01810.HK/financial-indicators-sina" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. 技术实现

### 依赖库
```bash
pip install httpx beautifulsoup4 lxml
```

### 核心特性
- ✅ 异步请求（httpx）
- ✅ 自动编码处理（gb2312）
- ✅ 智能数据提取
- ✅ 财务比率计算
- ✅ 完善的错误处理

---

## 8. 更新日志

### v1.0.0 (2026-02-26)
- ✅ 新增新闻爬虫服务
- ✅ 新增公司信息爬虫服务
- ✅ 新增财务指标爬虫服务
- ✅ 提供REST API接口
- ✅ 完善的错误处理和日志记录
- ✅ 自动计算关键财务比率
