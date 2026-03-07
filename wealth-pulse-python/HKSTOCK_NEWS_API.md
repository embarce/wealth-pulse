# 新浪港股新闻 API 使用说明

## API 端点

所有接口都在 `/api/hkstock` 路径下，需要先获取 JWT Token 才能访问。

### 1. 获取港股首页新闻

**端点**: `GET /api/hkstock/news/home`

**描述**: 获取港股首页新闻，包括要闻、大行研报 URL、公司新闻 URL

**请求示例**:
```bash
curl -X GET "http://localhost:8000/api/hkstock/news/home" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例**:
```json
{
  "code": 200,
  "msg": "Homepage news retrieved successfully",
  "data": {
    "important_news": [
      {
        "title": "港股收评：恒指涨 1.72% 科指涨 3.15%",
        "url": "https://finance.sina.com.cn/stock/hkstock/marketalerts/2026-03-06/doc-inhpzvnk2535272.shtml",
        "datasource": "新浪财经"
      }
    ],
    "rank_url": "https://finance.sina.com.cn/roll/c/57028.shtml",
    "company_news_url": "https://finance.sina.com.cn/roll/c/57038.shtml",
    "rank_url_fallback": false,
    "company_news_url_fallback": false
  }
}
```

### 2. 获取大行研报

**端点**: `GET /api/hkstock/news/rank`

**描述**: 获取港股大行研报列表（第一页）

**请求参数**:
- `url` (可选): 自定义研报列表页 URL
- `skip_if_url_missing` (可选): 如果 URL 缺失是否跳过爬取

**请求示例**:
```bash
curl -X GET "http://localhost:8000/api/hkstock/news/rank" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例**:
```json
{
  "code": 200,
  "msg": "Rank news retrieved successfully",
  "data": {
    "news": [
      {
        "title": "高盛：微降澳博控股目标价至 2.7 港元 评级为"中性"",
        "url": "https://finance.sina.com.cn/stock/hkstock/hkgg/2026-03-06/doc-inhpzzuh2464028.shtml",
        "datasource": "新浪财经",
        "publish_time": "(03 月 06 日 17:47)"
      }
    ],
    "url_used": "https://finance.sina.com.cn/roll/c/57028.shtml",
    "url_fallback": false,
    "skipped": false
  }
}
```

### 3. 获取公司新闻

**端点**: `GET /api/hkstock/news/company`

**描述**: 获取港股公司新闻列表（第一页）

**请求参数**:
- `url` (可选): 自定义公司新闻列表页 URL
- `skip_if_url_missing` (可选): 如果 URL 缺失是否跳过爬取

**请求示例**:
```bash
curl -X GET "http://localhost:8000/api/hkstock/news/company" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 获取所有新闻（汇总）

**端点**: `GET /api/hkstock/news/all`

**描述**: 一次性获取所有港股新闻，包括要闻、大行研报、公司新闻

**请求示例**:
```bash
curl -X GET "http://localhost:8000/api/hkstock/news/all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例**:
```json
{
  "code": 200,
  "msg": "All news retrieved successfully: 60 items",
  "data": {
    "important_news": [...],
    "rank_news": [...],
    "company_news": [...],
    "summary": {
      "important_news_count": 20,
      "rank_news_count": 20,
      "company_news_count": 20,
      "total_count": 60
    },
    "warnings": []
  }
}
```

---

## Java 调用示例

### 依赖

```xml
<dependencies>
    <!-- HTTP Client -->
    <dependency>
        <groupId>org.apache.httpcomponents.client5</groupId>
        <artifactId>httpclient5</artifactId>
        <version>5.3</version>
    </dependency>

    <!-- JSON 处理 -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.16.0</version>
    </dependency>
</dependencies>
```

### Java 工具类

```java
package com.wealthpulse.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * 新浪港股新闻 API 客户端
 */
public class SinaHKStockNewsClient {

    private static final String BASE_URL = "http://localhost:8000";
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private final String accessToken;
    private final CloseableHttpClient httpClient;

    public SinaHKStockNewsClient(String accessToken) {
        this.accessToken = accessToken;
        this.httpClient = HttpClients.createDefault();
    }

    /**
     * 获取港股首页新闻
     */
    public JsonNode getHomepageNews() throws Exception {
        return executeGet("/api/hkstock/news/home");
    }

    /**
     * 获取大行研报
     */
    public JsonNode getRankNews() throws Exception {
        return executeGet("/api/hkstock/news/rank");
    }

    /**
     * 获取公司新闻
     */
    public JsonNode getCompanyNews() throws Exception {
        return executeGet("/api/hkstock/news/company");
    }

    /**
     * 获取所有新闻（汇总）
     */
    public JsonNode getAllNews() throws Exception {
        return executeGet("/api/hkstock/news/all");
    }

    /**
     * 执行 GET 请求
     */
    private JsonNode executeGet(String endpoint) throws Exception {
        HttpGet request = new HttpGet(BASE_URL + endpoint);
        request.setHeader("Authorization", "Bearer " + accessToken);
        request.setHeader("Content-Type", "application/json");

        return httpClient.execute(request, response -> {
            int code = response.getCode();
            String body = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);

            if (code != 200) {
                throw new RuntimeException("API 请求失败：" + code + " - " + body);
            }

            JsonNode rootNode = objectMapper.readTree(body);
            JsonNode dataNode = rootNode.get("data");

            if (rootNode.get("code").asInt() != 200) {
                throw new RuntimeException("业务错误：" + rootNode.get("msg").asText());
            }

            return dataNode;
        });
    }

    /**
     * 关闭 HTTP 客户端
     */
    public void close() throws Exception {
        httpClient.close();
    }

    /**
     * 静态方法：获取 Token
     */
    public static String getToken(String username, String password) throws Exception {
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            HttpPost request = new HttpPost(BASE_URL + "/api/auth/token");
            request.setHeader("Content-Type", "application/x-www-form-urlencoded");

            String body = "username=" + username + "&password=" + password;
            request.setEntity(new StringEntity(body, StandardCharsets.UTF_8));

            return httpClient.execute(request, response -> {
                String responseBody = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
                JsonNode rootNode = objectMapper.readTree(responseBody);
                return rootNode.get("data").get("access_token").asText();
            });
        }
    }

    // ==================== 使用示例 ====================

    public static void main(String[] args) {
        try {
            // 1. 获取 Token
            String token = getToken("your_username", "your_password");
            System.out.println("获取 Token 成功：" + token.substring(0, 20) + "...");

            // 2. 创建客户端
            SinaHKStockNewsClient client = new SinaHKStockNewsClient(token);

            // 3. 获取首页新闻
            JsonNode homepageNews = client.getHomepageNews();
            System.out.println("\n=== 首页要闻 ===");
            for (JsonNode news : homepageNews.get("important_news")) {
                System.out.println("- " + news.get("title").asText());
            }

            // 4. 获取大行研报
            JsonNode rankNews = client.getRankNews();
            System.out.println("\n=== 大行研报 ===");
            for (JsonNode item : rankNews.get("news")) {
                System.out.println("- " + item.get("title").asText() +
                                   " (" + item.get("publish_time").asText() + ")");
            }

            // 5. 获取公司新闻
            JsonNode companyNews = client.getCompanyNews();
            System.out.println("\n=== 公司新闻 ===");
            for (JsonNode item : companyNews.get("news")) {
                System.out.println("- " + item.get("title").asText());
            }

            // 6. 获取所有新闻（汇总）
            JsonNode allNews = client.getAllNews();
            JsonNode summary = allNews.get("summary");
            System.out.println("\n=== 汇总统计 ===");
            System.out.println("要闻：" + summary.get("important_news_count").asInt() + "条");
            System.out.println("研报：" + summary.get("rank_news_count").asInt() + "条");
            System.out.println("公司新闻：" + summary.get("company_news_count").asInt() + "条");
            System.out.println("总计：" + summary.get("total_count").asInt() + "条");

            // 检查警告信息
            if (allNews.has("warnings") && allNews.get("warnings").size() > 0) {
                System.out.println("\n=== 警告信息 ===");
                for (JsonNode warning : allNews.get("warnings")) {
                    System.out.println("- " + warning.asText());
                }
            }

            client.close();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### Spring Boot 集成示例

```java
package com.wealthpulse.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.wealthpulse.client.SinaHKStockNewsClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 港股新闻服务
 */
@Service
public class HKStockNewsService {

    private final SinaHKStockNewsClient newsClient;

    public HKStockNewsService(
        @Value("${wealthpulse.api.token}") String accessToken) {
        this.newsClient = new SinaHKStockNewsClient(accessToken);
    }

    /**
     * 获取大行研报摘要
     */
    public List<Map<String, String>> getRankNewsSummary() {
        List<Map<String, String>> summaries = new ArrayList<>();

        try {
            JsonNode rankNews = newsClient.getRankNews();
            for (JsonNode item : rankNews.get("news")) {
                Map<String, String> summary = new HashMap<>();
                summary.put("title", item.get("title").asText());
                summary.put("url", item.get("url").asText());
                summary.put("publishTime", item.get("publish_time").asText());
                summaries.add(summary);
            }
        } catch (Exception e) {
            // 处理异常
            e.printStackTrace();
        }

        return summaries;
    }

    /**
     * 获取新闻汇总统计
     */
    public Map<String, Object> getNewsSummary() {
        Map<String, Object> result = new HashMap<>();

        try {
            JsonNode allNews = newsClient.getAllNews();
            JsonNode summary = allNews.get("summary");

            result.put("importantNewsCount", summary.get("important_news_count").asInt());
            result.put("rankNewsCount", summary.get("rank_news_count").asInt());
            result.put("companyNewsCount", summary.get("company_news_count").asInt());
            result.put("totalCount", summary.get("total_count").asInt());

        } catch (Exception e) {
            e.printStackTrace();
        }

        return result;
    }
}
```

---

## Python 调用示例

```python
import httpx

BASE_URL = "http://localhost:8000"
ACCESS_TOKEN = "your_token_here"

def get_headers():
    return {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

# 获取所有新闻
response = httpx.get(f"{BASE_URL}/api/hkstock/news/all", headers=get_headers())
data = response.json()

if data['code'] == 200:
    news_data = data['data']
    summary = news_data['summary']

    print(f"要闻：{summary['important_news_count']}条")
    print(f"研报：{summary['rank_news_count']}条")
    print(f"公司新闻：{summary['company_news_count']}条")
    print(f"总计：{summary['total_count']}条")
```

---

## 错误处理

### HTTP 错误码

| 状态码 | 描述 |
|--------|------|
| 200 | 成功 |
| 401 | 未授权（Token 无效或过期） |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 业务错误码

API 响应中的 `code` 字段：

| Code | 描述 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 500 | 内部错误 |

### 警告处理

当无法获取到动态 URL 时，会返回警告信息但不会中断请求：

```json
{
  "code": 200,
  "data": {
    "warnings": [
      "未获取到大行研报 URL，使用默认 URL",
      "未获取到公司新闻 URL，使用默认 URL"
    ]
  }
}
```
