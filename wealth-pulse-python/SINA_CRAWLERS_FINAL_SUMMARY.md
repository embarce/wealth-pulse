# 新浪财经四大爬虫服务完整总结

本项目提供了**四个完整的新浪财经爬虫服务**，用于获取港股的各类数据。

---

## 📊 爬虫服务概览

| 序号 | 爬虫名称 | 功能描述 | API端点 |
|------|---------|---------|---------|
| 1️⃣ | 新闻爬虫 | 爬取个股新闻资讯 | `/api/stocks/{code}/news` |
| 2️⃣ | 公司信息爬虫 | 爬取公司资料信息 | `/api/stocks/{code}/company-info-sina` |
| 3️⃣ | 财务指标爬虫 | 爬取财务数据并计算比率 | `/api/stocks/{code}/financial-indicators-sina` |
| 4️⃣ | 公司公告爬虫 | 爬取公司公告列表 | `/api/stocks/{code}/company-notices` |

---

## 1️⃣ 新闻爬虫服务

### 📌 功能说明
爬取新浪财经港股个股新闻页面，提取新闻标题、链接、发布时间等信息。

### 📁 服务文件
- `app/services/sina_news_crawler.py`

### 🌐 API接口
```
GET /api/stocks/{stock_code}/news
```

### 📦 响应数据
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

### ✅ 提取字段
- `title`: 新闻标题
- `url`: 新闻链接
- `datasource`: 数据源（固定为"新浪财经"）
- `publish_time`: 发布时间

### 🎯 测试结果
- ✅ 成功爬取 **30条新闻**
- ✅ 包含完整的标题、链接和时间信息

---

## 2️⃣ 公司信息爬虫服务

### 📌 功能说明
爬取新浪财经港股公司资料页面，提取公司的详细信息。

### 📁 服务文件
- `app/services/sina_company_info_crawler.py`

### 🌐 API接口
```
GET /api/stocks/{stock_code}/company-info-sina
```

### 📦 响应数据
```json
{
  "code": 200,
  "msg": "Company info retrieved successfully",
  "data": {
    "stock_code": "01810.HK",
    "company_name_cn": "小米集团",
    "company_name_en": "Xiaomi Corporation",
    "industry": "资讯科技器材",
    "chairman": "雷军",
    "website": "http://www.mi.com",
    "phone": "(400)1005678",
    "email": "ir@xiaomi.com",
    "datasource": "新浪财经"
  }
}
```

### ✅ 提取字段（22个）

#### 基本信息
- 证券代码、公司名称(中英文)、所属行业、股份数目

#### 管理层信息
- 主席、董事、公司秘书、主要持股人

#### 联系方式
- 总部地址、电话、传真、邮箱、网址

#### 其他信息
- 注册办事处、股份过户登记处、核数师、主要银行、法律顾问

### 🎯 测试结果
- ✅ 成功提取 **22个字段**的公司信息

---

## 3️⃣ 财务指标爬虫服务

### 📌 功能说明
爬取新浪财经港股财务指标页面，提取原始财务数据并自动计算关键比率。

### 📁 服务文件
- `app/services/sina_finance_crawler.py`

### 🌐 API接口
```
GET /api/stocks/{stock_code}/financial-indicators-sina
```

### 📦 响应数据
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
    },
    "historical_data": [...]
  }
}
```

### ✅ 提取字段

#### 最新报告期信息
- 截止日期、报表类型、公告日期

#### 盈利能力指标
- **营业收入**（百万元）
- **净利润**（百万元）
- **毛利率（%）** - 🧮 自动计算
- **净利率（%）** - 🧮 自动计算
- **基本每股盈利**（仙）
- **经营盈利**（百万元）

#### 财务健康指标
- **流动比率** - 🧮 自动计算
- **负债率（%）** - 🧮 自动计算
- **经营现金流**（百万元）
- **流动资产**（百万元）
- **流动负债**（百万元）
- **股东权益**（百万元）

#### 历史数据
- 最近 **8个报告期**的历史数据

### ⚠️ 数据限制
以下指标需要从其他数据源获取：
- ❌ 市盈率 (PE)
- ❌ 市净率 (PB)
- ❌ 股息率
- ❌ ROE (净资产收益率)

建议使用 **AkShare** 的 `stock_hk_financial_indicator_em` 接口获取这些数据。

### 🎯 测试结果
- ✅ 成功提取 **8个报告期**的历史数据
- ✅ 自动计算毛利率：**22.75%**

---

## 4️⃣ 公司公告爬虫服务

### 📌 功能说明
爬取新浪财经港股公司公告页面，提取所有公告信息。

### 📁 服务文件
- `app/services/sina_company_notice_crawler.py`

### 🌐 API接口
```
GET /api/stocks/{stock_code}/company-notices?max_pages=1
```

### 📋 查询参数
- `max_pages`: 最大爬取页数（1-10，默认1页）
- 每页约包含 **25-30条**公告

### 📦 响应数据
```json
{
  "code": 200,
  "msg": "Company notices retrieved successfully: 30 items",
  "data": [
    {
      "title": "授出限制性股份单位",
      "url": "http://stock.finance.sina.com.cn/hkstock/go/CompanyNoticeDetail/code/09868/aid/1185419.html",
      "datasource": "新浪财经",
      "publish_time": "2024-07-12 00:00:00"
    },
    {
      "title": "GRANT OF RESTRICTED SHARE UNITS",
      "url": "http://stock.finance.sina.com.cn/hkstock/go/CompanyNoticeDetail/code/09868/aid/1185407.html",
      "datasource": "新浪财经",
      "publish_time": "2024-07-12 00:00:00"
    }
  ]
}
```

### ✅ 提取字段
- `title`: 公告标题
- `url`: 公告链接
- `datasource`: 数据源（固定为"新浪财经"）
- `publish_time`: 发布时间

### 🎯 测试结果
- ✅ 成功爬取 **30条公告**
- ✅ 包含中英文公告
- ✅ 公告类型分布：
  - 其他公告：16条
  - 自愿公告：10条
  - 通告：3条
  - 其他：1条

---

## 🔧 技术实现

### 依赖库
```bash
pip install httpx beautifulsoup4 lxml
```

### 核心特性
- ✅ **异步请求**：使用 httpx 异步客户端
- ✅ **自动编码处理**：正确处理 gb2312 编码
- ✅ **智能数据提取**：BeautifulSoup4 + lxml 解析器
- ✅ **财务比率计算**：自动计算毛利率、净利率、流动比率、负债率
- ✅ **多页支持**：公告爬虫支持多页爬取
- ✅ **完善错误处理**：详细的日志记录和异常捕获

### 代码结构
```
app/services/
├── sina_news_crawler.py              # 新闻爬虫
├── sina_company_info_crawler.py      # 公司信息爬虫
├── sina_finance_crawler.py           # 财务指标爬虫
└── sina_company_notice_crawler.py    # 公司公告爬虫

app/api/
└── stocks.py                          # API端点定义

app/schemas/
└── stock.py                           # 数据模型定义
```

---

## 📝 使用示例

### 1. 获取认证Token
```bash
TOKEN=$(curl -s -X POST http://localhost:8010/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"wealth-pulse-java","client_secret":"wealth-pulse-client-secret"}' \
  | jq -r '.data.access_token')
```

### 2. 获取股票新闻
```bash
curl -X GET "http://localhost:8010/api/stocks/09868.HK/news" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. 获取公司信息
```bash
curl -X GET "http://localhost:8010/api/stocks/01810.HK/company-info-sina" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. 获取财务指标
```bash
curl -X GET "http://localhost:8010/api/stocks/01810.HK/financial-indicators-sina" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. 获取公司公告（多页）
```bash
curl -X GET "http://localhost:8010/api/stocks/09868.HK/company-notices?max_pages=3" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🧪 测试脚本

### 运行所有测试
```bash
# 测试新闻爬虫
python test_sina_crawler.py

# 测试公司信息爬虫
python test_company_info_simple.py

# 测试财务指标爬虫
python test_finance_simple.py

# 测试公司公告爬虫
python test_notice_crawler.py
```

---

## 📈 数据源对比

### 新浪财经 vs AkShare

| 数据类型 | 新浪财经 | AkShare | 推荐 |
|---------|---------|---------|------|
| 新闻资讯 | ✅ | ❌ | **新浪财经** |
| 公司资料 | ✅ | ✅ | **新浪财经**（更详细） |
| 财务原始数据 | ✅ | ✅ | 两者均可 |
| PE/PB/ROE | ❌ | ✅ | **AkShare** |
| 公司公告 | ✅ | ❌ | **新浪财经** |
| 实时行情 | ❌ | ✅ | **AkShare** |

### 建议的数据获取策略
```
新闻资讯     → 新浪新闻爬虫
公司资料     → 新浪公司信息爬虫
财务原始数据 → 新浪财务爬虫
PE/PB/ROE    → AkShare财务指标接口
公司公告     → 新浪公司公告爬虫
实时行情     → AkShare或yfinance
```

---

## 🎯 总结

### ✅ 已完成功能
1. ✅ **4个完整的爬虫服务**（新闻、公司信息、财务指标、公告）
2. ✅ **4个REST API端点**（需要JWT认证）
3. ✅ **自动财务比率计算**（毛利率、净利率、流动比率、负债率）
4. ✅ **多页数据支持**（公告爬虫）
5. ✅ **完善的错误处理和日志记录**
6. ✅ **详细的测试脚本和文档**

### 📊 数据统计
- 新闻爬虫：**30条/页**
- 公司信息：**22个字段**
- 财务指标：**8个报告期** + **6个计算比率**
- 公司公告：**25-30条/页**，支持**最多10页**

### 🔄 下一步优化建议
1. 添加Redis缓存层，减少重复爬取
2. 实现分布式锁，避免并发问题
3. 添加数据验证和清洗逻辑
4. 结合AkShare获取PE、PB、ROE等完整指标
5. 添加增量更新机制

---

**版本**: v1.0.0
**更新日期**: 2026-02-26
**维护者**: Wealth Pulse Team
