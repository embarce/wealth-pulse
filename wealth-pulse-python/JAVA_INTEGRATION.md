# Java API Integration Guide

This guide explains how to integrate the Wealth Pulse Python API with your Java Spring Boot application.

## Authentication

The Python API uses JWT-based authentication. You need to obtain a bearer token before accessing protected endpoints.

### 1. Get Access Token

**Endpoint:** `POST /api/auth/token`

**Request:**
```json
{
  "client_id": "wealth-pulse-java",
  "client_secret": "wealth-pulse-client-secret"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### 2. Use Token in Requests

Include the access token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Java Integration Example

### 1. Add Dependencies (pom.xml)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

### 2. Create Configuration Class

```java
package com.litchi.wealth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PythonApiConfig {

    @Value("${wealth.python.api.base-url:http://localhost:8000}")
    private String baseUrl;

    @Value("${wealth.python.api.client-id:wealth-pulse-java}")
    private String clientId;

    @Value("${wealth.python.api.client-secret:wealth-pulse-client-secret}")
    private String clientSecret;

    // Getters
    public String getBaseUrl() { return baseUrl; }
    public String getClientId() { return clientId; }
    public String getClientSecret() { return clientSecret; }
}
```

### 3. Create Token Service

```java
package com.litchi.wealth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Service
public class PythonApiTokenService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String cachedToken;
    private Instant tokenExpiry;

    public PythonApiTokenService(PythonApiConfig config) {
        this.webClient = WebClient.builder()
            .baseUrl(config.getBaseUrl())
            .build();
    }

    public Mono<String> getAccessToken() {
        // Return cached token if still valid
        if (cachedToken != null && tokenExpiry != null &&
            Instant.now().isBefore(tokenExpiry.minusSeconds(60))) {
            return Mono.just(cachedToken);
        }

        // Request new token
        return requestNewToken();
    }

    private Mono<String> requestNewToken() {
        // Build request body
        String requestBody = String.format(
            "{\"client_id\":\"%s\",\"client_secret\":\"%s\"}",
            clientId, clientSecret
        );

        return webClient.post()
            .uri("/api/auth/token")
            .header("Content-Type", "application/json")
            .bodyValue(requestBody)
            .retrieve()
            .bodyToMono(String.class)
            .map(response -> {
                try {
                    JsonNode json = objectMapper.readTree(response);
                    String token = json.get("access_token").asText();
                    int expiresIn = json.get("expires_in").asInt();

                    // Cache token
                    this.cachedToken = token;
                    this.tokenExpiry = Instant.now().plusSeconds(expiresIn);

                    return token;
                } catch (Exception e) {
                    throw new RuntimeException("Failed to parse token response", e);
                }
            });
    }
}
```

### 4. Create Stock Data Service

```java
package com.litchi.wealth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;

@Service
public class PythonStockDataService {

    private final WebClient webClient;
    private final PythonApiTokenService tokenService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PythonStockDataService(
        PythonApiConfig config,
        PythonApiTokenService tokenService
    ) {
        this.tokenService = tokenService;
        this.webClient = WebClient.builder()
            .baseUrl(config.getBaseUrl())
            .build();
    }

    /**
     * Get all stocks
     */
    public Mono<List<JsonNode>> getAllStocks() {
        return tokenService.getAccessToken()
            .flatMap(token ->
                webClient.get()
                    .uri("/api/stocks/")
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .bodyToMono(String.class)
            )
            .map(this::parseStockList);
    }

    /**
     * Get stock by code
     */
    public Mono<JsonNode> getStock(String stockCode) {
        return tokenService.getAccessToken()
            .flatMap(token ->
                webClient.get()
                    .uri("/api/stocks/{stockCode}", stockCode)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .bodyToMono(String.class)
            )
            .map(this::parseStock);
    }

    /**
     * Get market data for a stock
     */
    public Mono<JsonNode> getMarketData(String stockCode) {
        return tokenService.getAccessToken()
            .flatMap(token ->
                webClient.get()
                    .uri("/api/stocks/{stockCode}/market-data", stockCode)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .bodyToMono(String.class)
            )
            .map(this::parseStock);
    }

    /**
     * Get historical data for a stock
     */
    public Mono<List<JsonNode>> getHistoricalData(
        String stockCode,
        String startDate,
        String endDate,
        int limit
    ) {
        return tokenService.getAccessToken()
            .flatMap(token ->
                webClient.get()
                    .uri(uriBuilder -> uriBuilder
                        .path("/api/stocks/{stockCode}/history")
                        .queryParam("start_date", startDate)
                        .queryParam("end_date", endDate)
                        .queryParam("limit", limit)
                        .build(stockCode))
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .bodyToMono(String.class)
            )
            .map(this::parseStockList);
    }

    /**
     * Refresh market data
     */
    public Mono<JsonNode> refreshMarketData(List<String> symbols) {
        return tokenService.getAccessToken()
            .flatMap(token ->
                webClient.post()
                    .uri("/api/stocks/refresh")
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .bodyValue(symbols)
                    .retrieve()
                    .bodyToMono(String.class)
            )
            .map(this::parseStock);
    }

    // Helper methods
    private List<JsonNode> parseStockList(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            List<JsonNode> stocks = new ArrayList<>();
            root.forEach(stocks::add);
            return stocks;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse response", e);
        }
    }

    private JsonNode parseStock(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse response", e);
        }
    }
}
```

### 5. Create Controller (Optional)

```java
package com.litchi.wealth.controller;

import com.litchi.wealth.service.PythonStockDataService;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/proxy/python")
public class PythonDataProxyController {

    private final PythonStockDataService stockDataService;

    public PythonDataProxyController(PythonStockDataService stockDataService) {
        this.stockDataService = stockDataService;
    }

    @GetMapping("/stocks")
    public Mono<List<JsonNode>> getStocks() {
        return stockDataService.getAllStocks();
    }

    @GetMapping("/stocks/{stockCode}")
    public Mono<JsonNode> getStock(@PathVariable String stockCode) {
        return stockDataService.getStock(stockCode);
    }

    @GetMapping("/stocks/{stockCode}/market-data")
    public Mono<JsonNode> getMarketData(@PathVariable String stockCode) {
        return stockDataService.getMarketData(stockCode);
    }
}
```

### 6. Add Configuration (application.yml)

```yaml
wealth:
  python:
    api:
      base-url: http://localhost:8000
      client-id: wealth-pulse-java
      client-secret: wealth-pulse-client-secret
```

## API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/token` | Get access token | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/token/validate` | Validate token | No |

### Stock Data Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/stocks/` | Get all stocks | Yes |
| GET | `/api/stocks/{stock_code}` | Get stock by code | Yes |
| GET | `/api/stocks/{stock_code}/market-data` | Get market data | Yes |
| GET | `/api/stocks/{stock_code}/history` | Get historical data | Yes |
| POST | `/api/stocks/refresh` | Refresh market data | Yes |
| GET | `/api/stocks/public/list` | Get stocks (public) | No |

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health/` | Health check | No |

## Error Handling

All errors return JSON format:

```json
{
  "detail": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `401` - Unauthorized (invalid or missing token)
- `404` - Resource not found
- `500` - Internal server error

## Data Models

### StockInfo
```json
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
```

### StockMarketData
```json
{
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
  "turnover": 5257500000.00,
  "market_cap": 3500000000000,
  "pe_ratio": 25.5,
  "pb_ratio": 3.2,
  "quote_time": "2026-02-09T15:30:00",
  "market_date": "2026-02-09",
  "data_source": "yfinance"
}
```

## Testing with curl

```bash
# Get token
TOKEN=$(curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"wealth-pulse-java","client_secret":"wealth-pulse-client-secret"}' \
  | jq -r '.access_token')

# Get all stocks
curl http://localhost:8000/api/stocks/ \
  -H "Authorization: Bearer $TOKEN"

# Get specific stock
curl http://localhost:8000/api/stocks/0700.HK \
  -H "Authorization: Bearer $TOKEN"

# Get market data
curl http://localhost:8000/api/stocks/0700.HK/market-data \
  -H "Authorization: Bearer $TOKEN"
```

## Notes

1. **Token Caching**: The Java service should cache the access token and refresh it only when it's about to expire (24 hours validity).

2. **Error Handling**: Implement proper error handling and retry logic for network failures.

3. **Connection Pooling**: WebClient is non-blocking and supports connection pooling by default.

4. **Security**: Keep client credentials secure and don't expose them in frontend code.

5. **Rate Limiting**: Be mindful of API rate limits when making frequent requests.
