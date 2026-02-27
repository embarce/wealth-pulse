# 新浪财经爬虫服务使用指南

本项目提供了两个新浪财经爬虫服务，用于获取港股的新闻资讯和公司资料信息。

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
      "title": "小鹏汽车副总裁称第二代VLA小试牛刀，今年迎产品技术爆发",
      "url": "https://t.cj.sina.cn/articles/view/1826017320/6cd6d02804001jp9s",
      "datasource": "新浪财经",
      "publish_time": "2026-02-26 20:51:55"
    },
    {
      "title": "何小鹏：加速在天河布局行业首个人形机器人量产基地",
      "url": "https://finance.sina.com.cn/roll/2026-02-26/doc-inhpefhh1346898.shtml",
      "datasource": "新浪财经",
      "publish_time": "2026-02-26 20:33:00"
    }
  ],
  "timestamp": "2026-02-26T23:45:00"
}
```

### 使用示例
```bash
# 1. 获取Token
TOKEN=$(curl -s -X POST http://localhost:8010/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"wealth-pulse-java","client_secret":"wealth-pulse-client-secret"}' \
  | jq -r '.data.access_token')

# 2. 获取股票新闻
curl -X GET "http://localhost:8010/api/stocks/09868.HK/news" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 2. 公司信息爬虫服务

### 功能说明
爬取新浪财经港股公司资料页面，提取公司的详细信息，包括基本信息、联系方式、管理层等。

### 服务类
`app.services.sina_company_info_crawler.SinaCompanyInfoCrawler`

### API接口
**端点**: `GET /api/stocks/{stock_code}/company-info-sina`

**路径参数**:
- `stock_code`: 股票代码 (例如: 01810.HK, 0700.HK)

**认证**: 需要JWT Bearer Token

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
    "business_description": "小米集团是一家主要从事智能手机...",
    "industry": "资讯科技器材",
    "total_shares": "26024532352(股)",
    "chairman": "雷军",
    "major_shareholders": "",
    "directors": "雷军(董事长) 雷军(执行董事) 王舜德(独立非执行董事)...",
    "company_secretary": "刘灏\\苏嘉敏",
    "registered_office": "PO Box 309 Ugland House Grand Cayman, KY1-1104 Cayman Islands",
    "headquarters": "香港铜锣湾希慎道33号利园一期19楼1928室",
    "share_registrar": "香港中央证券登记有限公司",
    "auditor": "罗兵咸永道会计师事务所",
    "main_bank": "招商银行北京分行首体科技金融支行",
    "legal_advisor": "世达国际律师事务所",
    "website": "http://www.mi.com",
    "email": "ir@xiaomi.com;xiaomi.ecom@computershare.com.hk",
    "phone": "(400)1005678",
    "fax": "01060606666-1101",
    "datasource": "新浪财经"
  },
  "timestamp": "2026-02-26T23:45:00"
}
```

### 字段说明

#### 基本信息
- `security_code`: 证券代码
- `company_name_cn`: 公司名称(中文)
- `company_name_en`: 公司名称(英文)
- `business_description`: 公司业务描述
- `industry`: 所属行业
- `total_shares`: 港股股份数目

#### 管理层信息
- `chairman`: 主席
- `directors`: 董事名单
- `company_secretary`: 公司秘书
- `major_shareholders`: 主要持股人

#### 联系方式
- `headquarters`: 公司总部
- `registered_office`: 注册办事处
- `phone`: 电话号码
- `fax`: 传真号码
- `email`: 电邮地址
- `website`: 公司网址

#### 其他信息
- `share_registrar`: 股份过户登记处
- `auditor`: 核数师
- `main_bank`: 主要往来银行
- `legal_advisor`: 法律顾问

### 使用示例
```bash
# 1. 获取Token
TOKEN=$(curl -s -X POST http://localhost:8010/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"wealth-pulse-java","client_secret":"wealth-pulse-client-secret"}' \
  | jq -r '.data.access_token')

# 2. 获取公司信息
curl -X GET "http://localhost:8010/api/stocks/01810.HK/company-info-sina" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. 股票代码格式

### 输入格式
- 支持格式: `0700.HK`, `09868.HK`, `01810.HK`
- 自动补齐: `700.HK` → `00700`, `1810.HK` → `01810`

### URL规则
新浪财经使用5位数字代码：
- `0700.HK` → `00700.html`
- `09868.HK` → `09868.html`
- `01810.HK` → `01810.html`

---

## 4. 数据源

### 新闻页面URL
`https://stock.finance.sina.com.cn/hkstock/news/{code}.html`

### 公司信息URL
`https://stock.finance.sina.com.cn/hkstock/info/{code}.html`

---

## 5. 技术实现

### 依赖库
- `httpx`: HTTP客户端，用于异步请求
- `beautifulsoup4`: HTML解析库
- `lxml`: HTML解析器（更快更鲁棒）

### 安装依赖
```bash
pip install httpx beautifulsoup4 lxml
```

### 核心特性
1. **异步请求**: 使用httpx异步客户端，提高并发性能
2. **自动编码处理**: 正确处理gb2312编码
3. **错误处理**: 完善的异常捕获和日志记录
4. **同步接口**: 提供同步方法便于非异步环境调用

---

## 6. 测试脚本

### 新闻爬虫测试
```bash
# 测试HTML解析
python test_sina_crawler.py

# 测试API（需要服务运行）
python test_news_api.py
```

### 公司信息爬虫测试
```bash
# 测试HTML解析
python test_company_info_simple.py

# 测试完整功能（包含网络爬取）
python test_company_info_crawler.py
```

---

## 7. 注意事项

### 反爬限制
- 新浪财经可能有反爬虫机制
- 建议控制请求频率，避免频繁请求
- 如遇403/429错误，可能是被限流

### 数据时效性
- 新闻页面通常包含30条左右的新闻
- 公司信息相对稳定，变化频率较低

### 编码问题
- 新浪财经使用gb2312编码
- 爬虫已自动处理编码转换
- 数据库和API使用UTF-8编码

---

## 8. 故障排查

### 问题1: 超时错误
```
Exception: 请求超时: https://stock.finance.sina.com.cn/...
```
**解决方案**:
- 检查网络连接
- 增加timeout参数（默认30秒）
- 检查是否被防火墙拦截

### 问题2: 解析失败
```
No news list found for 09868.HK
```
**解决方案**:
- 检查股票代码是否正确
- 确认股票代码为港股（.HK结尾）
- 尝试在浏览器访问URL确认页面存在

### 问题3: 认证失败
```
Invalid client credentials
```
**解决方案**:
- 确认client_id和client_secret正确
- 默认值在`app/core/config.py`中配置

---

## 9. 集成到Java后端

### Java端调用示例
```java
// 1. 获取Token
String token = authService.getToken("wealth-pulse-java", "wealth-pulse-client-secret");

// 2. 调用新闻API
String newsUrl = "http://localhost:8010/api/stocks/09868.HK/news";
RestTemplate restTemplate = new RestTemplate();
HttpHeaders headers = new HttpHeaders();
headers.set("Authorization", "Bearer " + token);

HttpEntity<String> entity = new HttpEntity<>(headers);
ResponseEntity<ApiResponse> response = restTemplate.exchange(newsUrl, HttpMethod.GET, entity, ApiResponse.class);

// 3. 解析响应
List<NewsItem> newsList = (List<NewsItem>) response.getBody().getData();
```

---

## 10. 性能优化建议

### 缓存策略
1. 新闻数据缓存5-10分钟
2. 公司信息缓存1小时或更长
3. 使用Redis存储缓存数据

### 并发控制
1. 限制同时爬取的数量
2. 使用分布式锁避免重复爬取
3. 实现请求队列避免频繁请求

### 监控指标
1. 爬取成功率
2. 平均响应时间
3. 错误日志统计

---

## 11. 更新日志

### v1.0.0 (2026-02-26)
- 初始版本发布
- 实现新闻爬虫功能
- 实现公司信息爬虫功能
- 提供REST API接口
- 完善的错误处理和日志记录
