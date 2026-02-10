# API 响应格式说明

## 统一响应格式

所有 API 端点都使用统一的响应格式：

```json
{
  "code": 200,
  "msg": "success",
  "data": {},
  "timestamp": "2026-02-09T15:30:00.123456"
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | int | 状态码（200=成功, 401=未授权, 404=未找到, 500=服务器错误等） |
| `msg` | string | 响应消息 |
| `data` | object/array/null | 响应数据 |
| `timestamp` | string | 响应时间戳（ISO 8601格式） |

## 成功响应示例

### 获取 Token

**请求：**
```bash
POST /api/auth/token
Content-Type: application/json

{
  "client_id": "wealth-pulse-java",
  "client_secret": "wealth-pulse-client-secret"
}
```

**响应：**
```json
{
  "code": 200,
  "msg": "Token obtained successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 86400
  },
  "timestamp": "2026-02-09T15:30:00.123456"
}
```

### 获取股票列表

**请求：**
```bash
GET /api/stocks/
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**响应：**
```json
{
  "code": 200,
  "msg": "Stocks retrieved successfully",
  "data": [
    {
      "stock_code": "0700.HK",
      "company_name": "Tencent Holdings Limited",
      "short_name": "Tencent",
      "stock_type": "STOCK",
      "exchange": "HKG",
      "currency": "HKD",
      "industry": "Technology",
      "market_cap": "3500000000000",
      "display_order": 0,
      "stock_status": 1
    }
  ],
  "timestamp": "2026-02-09T15:30:00.123456"
}
```

### 获取市场数据

**请求：**
```bash
GET /api/stocks/0700.HK/market-data
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**响应：**
```json
{
  "code": 200,
  "msg": "Market data retrieved successfully",
  "data": {
    "id": 1,
    "stock_code": "0700.HK",
    "last_price": 350.50,
    "change_number": 5.20,
    "change_rate": 1.50,
    "open_price": 348.00,
    "pre_close": 345.30,
    "high_price": 352.00,
    "low_price": 347.50,
    "volume": 15000000,
    "turnover": 5257500000.0,
    "market_cap": 3500000000000.0,
    "pe_ratio": 25.5,
    "pb_ratio": 3.2,
    "quote_time": "2026-02-09T15:30:00",
    "market_date": "2026-02-09",
    "data_source": "yfinance"
  },
  "timestamp": "2026-02-09T15:30:00.123456"
}
```

## 错误响应示例

### 认证失败 (401)

**请求：**
```bash
POST /api/auth/token
Content-Type: application/json

{
  "client_id": "invalid_client",
  "client_secret": "wrong_secret"
}
```

**响应：**
```json
{
  "code": 401,
  "msg": "Invalid client credentials",
  "data": null,
  "timestamp": "2026-02-09T15:30:00.123456"
}
```

### 资源未找到 (404)

**请求：**
```bash
GET /api/stocks/INVALID.HK
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**响应：**
```json
{
  "code": 404,
  "msg": "Stock INVALID.HK not found",
  "data": null,
  "timestamp": "2026-02-09T15:30:00.123456"
}
```

### 参数验证失败 (422)

**请求：**
```bash
GET /api/stocks/?limit=1000
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**响应：**
```json
{
  "code": 422,
  "msg": "参数验证失败: query.limit: ensure this value is less than or equal to 500",
  "data": {
    "errors": [
      {
        "loc": ["query", "limit"],
        "msg": "ensure this value is less than or equal to 500",
        "type": "less_than_equal"
      }
    ]
  },
  "timestamp": "2026-02-09T15:30:00.123456"
}
```

### 服务器错误 (500)

**响应：**
```json
{
  "code": 500,
  "msg": "服务器内部错误: Database connection failed",
  "data": null,
  "timestamp": "2026-02-09T15:30:00.123456"
}
```

## 状态码说明

| Code | 说明 |
|------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 - Token 无效或缺失 |
| 403 | 禁止访问 |
| 404 | 资源未找到 |
| 422 | 参数验证失败 |
| 500 | 服务器内部错误 |

## Java 集成示例

### 统一响应解析类

```java
package com.litchi.wealth.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

public class ApiResponse<T> {
    @JsonProperty("code")
    private Integer code;

    @JsonProperty("msg")
    private String msg;

    @JsonProperty("data")
    private T data;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    // Getters and Setters
    public Integer getCode() { return code; }
    public void setCode(Integer code) { this.code = code; }

    public String getMsg() { return msg; }
    public void setMsg(String msg) { this.msg = msg; }

    public T getData() { return data; }
    public void setData(T data) { this.data = data; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    // Helper method to check if success
    public boolean isSuccess() {
        return code != null && code == 200;
    }
}
```

### 使用示例

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

public class StockService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Mono<List<Stock>> getStocks(String token) {
        return webClient.get()
            .uri("/api/stocks/")
            .header("Authorization", "Bearer " + token)
            .retrieve()
            .bodyToMono(String.class)
            .map(response -> {
                try {
                    // 解析统一响应格式
                    ApiResponse<List<Stock>> apiResponse =
                        objectMapper.readValue(response,
                            new TypeReference<ApiResponse<List<Stock>>>() {});

                    // 检查是否成功
                    if (!apiResponse.isSuccess()) {
                        throw new RuntimeException(apiResponse.getMsg());
                    }

                    return apiResponse.getData();
                } catch (Exception e) {
                    throw new RuntimeException("Failed to parse response", e);
                }
            });
    }
}
```

## Python 客户端示例

```python
import requests
from typing import TypeVar, Type
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)

class ApiResponse(BaseModel, Generic[T]):
    code: int
    msg: str
    data: T
    timestamp: datetime

    def is_success(self) -> bool:
        return self.code == 200


class WealthPulseClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token = None

    def login(self, client_id: str, client_secret: str):
        """获取访问令牌"""
        response = requests.post(
            f"{self.base_url}/api/auth/token",
            json={
                "client_id": client_id,
                "client_secret": client_secret
            }
        )
        api_response = ApiResponse(**response.json())

        if api_response.is_success():
            self.token = api_response.data.access_token
            return self.token
        else:
            raise Exception(api_response.msg)

    def get_stocks(self):
        """获取股票列表"""
        if not self.token:
            raise Exception("Not authenticated")

        response = requests.get(
            f"{self.base_url}/api/stocks/",
            headers={"Authorization": f"Bearer {self.token}"}
        )

        api_response = ApiResponse(**response.json())

        if api_response.is_success():
            return api_response.data
        else:
            raise Exception(api_response.msg)

# 使用示例
client = WealthPulseClient("http://localhost:9000")
client.login("wealth-pulse-java", "wealth-pulse-client-secret")
stocks = client.get_stocks()
print(stocks)
```

## 注意事项

1. **所有响应都包含 `code` 和 `msg` 字段**
2. **HTTP 状态码始终为 200**，实际的错误信息在 `code` 字段中
3. **`data` 字段可能为 `null`**，需要在使用前检查
4. **`timestamp` 字段可用于调试和日志记录**
5. **建议客户端先检查 `code` 字段**，再处理 `data` 字段
