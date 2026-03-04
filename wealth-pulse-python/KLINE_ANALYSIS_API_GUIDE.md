# K 线分析 API Java 集成指南

本文档介绍如何在 Java Spring Boot 应用中集成 Python K 线分析 API。

## 目录

- [概述](#概述)
- [API 接口说明](#api-接口说明)
- [Java 集成步骤](#java-集成步骤)
- [代码示例](#代码示例)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)

---

## 概述

K 线分析 API 提供基于人工智能的股票技术分析功能，通过 LLM（大语言模型）对 K 线数据进行深度分析。

### 特点

- **无需数据库**：所有数据由 Java 端提供，Python 只做纯 AI 分析
- **无需认证**：方便内部服务调用
- **支持多 LLM**：可切换 Doubao/OpenAI/Qwen 等供应商和模型

### 分析内容

- **趋势判断**：上涨趋势、下跌趋势、横盘整理
- **技术点位**：支撑位、压力位、止损位、止盈位
- **买卖建议**：强烈买入、买入、持有、卖出、强烈卖出
- **风险评估**：低、中、高风险等级
- **目标价格区间**：预期价格目标

### 技术架构

```
前端 → Java Spring Boot → Python FastAPI → LLM (Doubao/OpenAI/Qwen)
              ↓
         (提供 K 线数据)
```

---

## API 接口说明

### 接口地址

```
POST /api/ai/analyze-kline
```

### 请求头

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| Content-Type | String | 是 | application/json |

### 请求参数

```java
@Schema(description = "K 线分析请求")
public class KlineAnalysisRequest {

    @NotBlank(message = "股票代码不能为空")
    @Schema(description = "股票代码", example = "03900.HK", required = true)
    private String stockCode;

    @Schema(description = "股票基本信息（可选）")
    private StockInfo stockInfo;

    @Schema(description = "当前价格（可选）")
    private BigDecimal currentPrice;

    @NotNull(message = "K 线数据不能为空")
    @Schema(description = "K 线数据列表", required = true)
    private List<KlineData> klineData;

    @Schema(description = "分析周期", example = "daily")
    private String period = "daily";

    @Schema(description = "LLM 供应商", example = "doubao")
    private String provider;

    @Schema(description = "模型名称", example = "ep-20250226185244-dxp9w")
    private String model;

    /**
     * 股票基本信息
     */
    @Data
    @Schema(description = "股票基本信息")
    public static class StockInfo {
        @Schema(description = "股票代码", example = "03900.HK")
        private String stockCode;
        
        @Schema(description = "公司名称", example = "腾讯控股有限公司")
        private String companyName;
        
        @Schema(description = "所属行业", example = "互联网")
        private String industry;
        
        @Schema(description = "市值", example = "5000 亿")
        private String marketCap;
    }

    /**
     * K 线数据
     */
    @Data
    @Schema(description = "K 线数据")
    public static class KlineData {

        @Schema(description = "日期", example = "2026-02-24")
        private String date;

        @Schema(description = "开盘价", example = "150.5")
        private BigDecimal open;

        @Schema(description = "最高价", example = "155.0")
        private BigDecimal high;

        @Schema(description = "最低价", example = "149.0")
        private BigDecimal low;

        @Schema(description = "收盘价", example = "152.3")
        private BigDecimal close;

        @Schema(description = "成交量", example = "1000000")
        private Long volume;

        @Schema(description = "成交额", example = "152300000")
        private BigDecimal amount;
    }
}
```

### 响应结果

```java
@Schema(description = "K 线分析结果")
public class KlineAnalysisVo {

    @Schema(description = "股票代码", example = "03900.HK")
    private String stockCode;

    @Schema(description = "当前价格")
    private String currentPrice;

    @Schema(description = "趋势判断：uptrend=上涨趋势，downtrend=下跌趋势，sideways=横盘整理")
    private String trend;

    @Schema(description = "趋势说明")
    private String trendDescription;

    @Schema(description = "技术点位列表")
    private List<TechnicalPointVo> technicalPoints;

    @Schema(description = "综合建议：strong_buy=强烈买入，buy=买入，hold=持有，sell=卖出，strong_sell=强烈卖出")
    private String recommendation;

    @Schema(description = "建议说明")
    private String recommendationReason;

    @Schema(description = "风险等级：low=低，medium=中，high=高")
    private String riskLevel;

    @Schema(description = "目标价格区间")
    private String targetPriceRange;

    @Schema(description = "分析说明")
    private String analysisNote;
}

@Schema(description = "技术点位")
public class TechnicalPointVo {

    @Schema(description = "类型：support=支撑位，resistance=压力位，stop_loss=止损位，take_profit=止盈位")
    private String type;

    @Schema(description = "价格")
    private String price;

    @Schema(description = "强度 (1-5)")
    private Integer strength;

    @Schema(description = "描述")
    private String description;
}
```

### 响应示例

```json
{
  "code": 200,
  "msg": "股票 0700.HK K 线分析完成",
  "data": {
    "stockCode": "0700.HK",
    "currentPrice": "446.0",
    "trend": "uptrend",
    "trendDescription": "近期连续突破多个压力位，呈现明显上涨趋势",
    "technicalPoints": [
      {
        "type": "support",
        "price": "438.0",
        "strength": 4,
        "description": "前期高点形成的支撑位"
      },
      {
        "type": "resistance",
        "price": "455.0",
        "strength": 3,
        "description": "心理关口形成的压力位"
      },
      {
        "type": "stop_loss",
        "price": "430.0",
        "strength": 5,
        "description": "重要支撑位，跌破应考虑止损"
      },
      {
        "type": "take_profit",
        "price": "460.0",
        "strength": 3,
        "description": "前期高点附近可考虑止盈"
      }
    ],
    "recommendation": "buy",
    "recommendationReason": "技术面突破，成交量配合，均线多头排列，建议买入",
    "riskLevel": "medium",
    "targetPriceRange": "455-465",
    "analysisNote": "以上分析基于技术指标，仅供参考，投资需谨慎"
  },
  "timestamp": "2026-03-01T10:30:00"
}
```

---

## Java 集成步骤

### 1. 添加依赖

在 `pom.xml` 中添加以下依赖：

```xml
<dependencies>
    <!-- WebClient for async HTTP calls -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>
    
    <!-- Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

### 2. 配置 Python API 地址

在 `application.yml` 中添加配置：

```yaml
wealth-pulse:
  python-api:
    base-url: http://localhost:8010
    timeout: 60  # 超时时间（秒），LLM 分析可能需要较长时间
```

### 3. 创建配置类

```java
@Configuration
@ConfigurationProperties(prefix = "wealth-pulse.python-api")
@Data
public class PythonApiProperties {
    
    private String baseUrl;
    private Long timeout = 60L;
}
```

### 4. 创建 K 线分析服务

```java
@Service
@Slf4j
public class KlineAnalysisService {
    
    @Autowired
    private PythonApiProperties properties;
    
    @Autowired
    private WebClient.Builder webClientBuilder;
    
    /**
     * 分析 K 线
     *
     * @param stockCode 股票代码
     * @param klineData K 线数据列表
     * @param period 周期（可选，默认 daily）
     * @param provider LLM 供应商（可选）
     * @param model 模型名称（可选）
     * @return K 线分析结果
     */
    public KlineAnalysisVo analyzeKline(String stockCode, 
                                        List<KlineData> klineData,
                                        String period,
                                        String provider,
                                        String model) {
        log.info("开始分析 K 线：stockCode={}, 数据条数={}", stockCode, klineData.size());
        
        // 构建请求
        KlineAnalysisRequest request = new KlineAnalysisRequest();
        request.setStockCode(stockCode);
        request.setKlineData(klineData);
        request.setPeriod(period != null ? period : "daily");
        request.setProvider(provider);
        request.setModel(model);
        
        try {
            // 调用 Python API（无需认证）
            PythonApiResponse<KlineAnalysisVo> response = webClientBuilder.build()
                .post()
                .uri(properties.getBaseUrl() + "/api/ai/analyze-kline")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<PythonApiResponse<KlineAnalysisVo>>() {})
                .block(Duration.ofSeconds(properties.getTimeout()));
            
            if (response == null) {
                throw new RuntimeException("Python API 返回为空");
            }
            
            if (response.getCode() != 200) {
                throw new RuntimeException("Python API 调用失败：" + response.getMsg());
            }
            
            KlineAnalysisVo result = response.getData();
            if (result == null) {
                throw new RuntimeException("Python API 返回数据为空");
            }
            
            log.info("K 线分析完成：stockCode={}, trend={}, recommendation={}", 
                result.getStockCode(), result.getTrend(), result.getRecommendation());
            
            return result;
            
        } catch (WebClientResponseException e) {
            log.error("调用 Python K 线分析 API 失败：{}", e.getResponseBodyAsString(), e);
            throw new RuntimeException("调用 K 线分析 API 失败：" + e.getMessage(), e);
        } catch (Exception e) {
            log.error("调用 Python K 线分析 API 失败", e);
            throw new RuntimeException("调用 K 线分析 API 失败：" + e.getMessage(), e);
        }
    }
    
    /**
     * 分析 K 线（简化版，使用默认配置）
     */
    public KlineAnalysisVo analyzeKline(String stockCode, List<KlineData> klineData) {
        return analyzeKline(stockCode, klineData, null, null, null);
    }
    
    // ==================== 内部静态类 ====================
    
    @Data
    public static class KlineAnalysisRequest {
        private String stockCode;
        private StockInfo stockInfo;
        private BigDecimal currentPrice;
        private List<KlineData> klineData;
        private String period;
        private String provider;
        private String model;
    }
    
    @Data
    public static class StockInfo {
        private String stockCode;
        private String companyName;
        private String industry;
        private String marketCap;
    }
    
    @Data
    @Schema(description = "K 线数据")
    public static class KlineData {
        private String date;
        private BigDecimal open;
        private BigDecimal high;
        private BigDecimal low;
        private BigDecimal close;
        private Long volume;
        private BigDecimal amount;
    }
    
    @Data
    @Schema(description = "K 线分析结果")
    public static class KlineAnalysisVo {
        private String stockCode;
        private String currentPrice;
        private String trend;
        private String trendDescription;
        private List<TechnicalPointVo> technicalPoints;
        private String recommendation;
        private String recommendationReason;
        private String riskLevel;
        private String targetPriceRange;
        private String analysisNote;
    }
    
    @Data
    @Schema(description = "技术点位")
    public static class TechnicalPointVo {
        private String type;
        private String price;
        private Integer strength;
        private String description;
    }
    
    @Data
    public static class PythonApiResponse<T> {
        private Integer code;
        private String msg;
        private T data;
        private Long timestamp;
    }
}
```

### 5. 创建 Controller

```java
@RestController
@RequestMapping("/api/kline")
@Slf4j
public class KlineAnalysisController {
    
    @Autowired
    private KlineAnalysisService klineAnalysisService;
    
    /**
     * AI 分析 K 线
     */
    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<KlineAnalysisService.KlineAnalysisVo>> analyzeKline(
            @RequestBody KlineAnalysisRequest request) {
        
        try {
            KlineAnalysisService.KlineAnalysisVo result = klineAnalysisService.analyzeKline(
                request.getStockCode(),
                request.getKlineData(),
                request.getPeriod(),
                request.getProvider(),
                request.getModel()
            );
            
            return ResponseEntity.ok(ApiResponse.success(result, "K 线分析成功"));
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("K 线分析失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("分析失败：" + e.getMessage()));
        }
    }
    
    @Data
    @Schema(description = "K 线分析请求")
    public static class KlineAnalysisRequest {
        
        @NotBlank(message = "股票代码不能为空")
        @Schema(description = "股票代码", example = "03900.HK", required = true)
        private String stockCode;
        
        @Schema(description = "股票基本信息（可选）")
        private KlineAnalysisService.StockInfo stockInfo;
        
        @Schema(description = "当前价格（可选）")
        private BigDecimal currentPrice;
        
        @NotNull(message = "K 线数据不能为空")
        @Schema(description = "K 线数据列表", required = true)
        private List<KlineAnalysisService.KlineData> klineData;
        
        @Schema(description = "分析周期", example = "daily")
        private String period = "daily";
        
        @Schema(description = "LLM 供应商", example = "doubao")
        private String provider;
        
        @Schema(description = "模型名称", example = "ep-20250226185244-dxp9w")
        private String model;
    }
    
    @Data
    public static class ApiResponse<T> {
        private Integer code;
        private String msg;
        private T data;
        private Long timestamp;
        
        public static <T> ApiResponse<T> success(T data, String msg) {
            ApiResponse<T> response = new ApiResponse<>();
            response.setCode(200);
            response.setMsg(msg);
            response.setData(data);
            response.setTimestamp(System.currentTimeMillis());
            return response;
        }
        
        public static <T> ApiResponse<T> error(String msg) {
            ApiResponse<T> response = new ApiResponse<>();
            response.setCode(500);
            response.setMsg(msg);
            response.setTimestamp(System.currentTimeMillis());
            return response;
        }
    }
}
```

---

## 代码示例

### 示例 1：基础用法

```java
@Autowired
private KlineAnalysisService klineAnalysisService;

public void analyzeStock() {
    // 准备 K 线数据
    List<KlineAnalysisService.KlineData> klineData = Arrays.asList(
        createKlineData("2026-02-20", 420.5, 428.0, 418.0, 425.6, 15000000L),
        createKlineData("2026-02-21", 426.0, 432.5, 424.0, 430.2, 18000000L),
        createKlineData("2026-02-24", 431.0, 436.0, 429.0, 434.5, 16000000L),
        createKlineData("2026-02-25", 435.0, 440.0, 433.0, 438.0, 17000000L),
        createKlineData("2026-02-26", 438.5, 443.0, 436.0, 441.5, 15000000L)
    );
    
    // 调用分析
    KlineAnalysisService.KlineAnalysisVo result = klineAnalysisService.analyzeKline(
        "0700.HK",
        klineData
    );
    
    // 使用结果
    System.out.println("趋势：" + result.getTrend());
    System.out.println("建议：" + result.getRecommendation());
    System.out.println("目标价：" + result.getTargetPriceRange());
}

private KlineAnalysisService.KlineData createKlineData(
        String date, double open, double high, double low, 
        double close, long volume) {
    KlineAnalysisService.KlineData data = new KlineAnalysisService.KlineData();
    data.setDate(date);
    data.setOpen(new BigDecimal(open));
    data.setHigh(new BigDecimal(high));
    data.setLow(new BigDecimal(low));
    data.setClose(new BigDecimal(close));
    data.setVolume(volume);
    return data;
}
```

### 示例 2：指定 LLM 供应商和模型

```java
// 使用 Doubao（豆包）
KlineAnalysisService.KlineAnalysisVo result = klineAnalysisService.analyzeKline(
    "0700.HK",
    klineData,
    "daily",
    "doubao",  // 供应商
    "ep-20250226185244-dxp9w"  // 模型
);

// 使用 OpenAI
KlineAnalysisService.KlineAnalysisVo result2 = klineAnalysisService.analyzeKline(
    "0700.HK",
    klineData,
    "daily",
    "openai",
    "gpt-4o-mini"
);

// 使用 Qwen（通义千问）
KlineAnalysisService.KlineAnalysisVo result3 = klineAnalysisService.analyzeKline(
    "0700.HK",
    klineData,
    "daily",
    "qwen",
    "qwen-turbo"
);
```

### 示例 3：带股票信息的分析

```java
// 准备股票信息
KlineAnalysisService.StockInfo stockInfo = new KlineAnalysisService.StockInfo();
stockInfo.setStockCode("0700.HK");
stockInfo.setCompanyName("腾讯控股有限公司");
stockInfo.setIndustry("互联网");

// 构建完整请求
KlineAnalysisService.KlineAnalysisRequest request = new KlineAnalysisService.KlineAnalysisRequest();
request.setStockCode("0700.HK");
request.setStockInfo(stockInfo);
request.setCurrentPrice(new BigDecimal("446.0"));
request.setKlineData(klineData);
request.setProvider("doubao");
request.setModel("ep-20250226185244-dxp9w");

// 调用分析
KlineAnalysisService.KlineAnalysisVo result = klineAnalysisService.analyzeKline(
    request.getStockCode(),
    request.getKlineData(),
    request.getPeriod(),
    request.getProvider(),
    request.getModel()
);
```

### 示例 4：批量分析多只股票

```java
public Map<String, KlineAnalysisService.KlineAnalysisVo> batchAnalyze(
        Map<String, List<KlineAnalysisService.KlineData>> stockKlineMap) {
    
    Map<String, KlineAnalysisService.KlineAnalysisVo> results = new ConcurrentHashMap<>();
    
    // 并行分析
    List<CompletableFuture<Void>> futures = stockKlineMap.entrySet().stream()
        .map(entry -> CompletableFuture.runAsync(() -> {
            try {
                KlineAnalysisService.KlineAnalysisVo result = klineAnalysisService.analyzeKline(
                    entry.getKey(),
                    entry.getValue()
                );
                results.put(entry.getKey(), result);
            } catch (Exception e) {
                log.error("分析股票 {} 失败", entry.getKey(), e);
            }
        }))
        .collect(Collectors.toList());
    
    // 等待所有分析完成
    CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
    
    return results;
}
```

---

## 错误处理

### 常见错误码

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 200 | 成功 | - |
| 400 | 请求参数错误 | 检查 K 线数据是否至少 5 条 |
| 500 | 服务器内部错误 | 检查 Python API 服务状态 |

### 异常处理示例

```java
try {
    KlineAnalysisService.KlineAnalysisVo result = klineAnalysisService.analyzeKline(
        "0700.HK", klineData
    );
} catch (IllegalArgumentException e) {
    // 参数错误（如 K 线数据不足）
    log.error("请求参数错误", e);
} catch (WebClientException e) {
    // 网络错误
    log.error("网络错误", e);
} catch (Exception e) {
    // 其他错误
    log.error("分析失败", e);
}
```

---

## 最佳实践

### 1. 超时设置

K 线分析涉及 LLM 调用，建议设置合理的超时时间（60 秒）：

```java
@ConfigurationProperties(prefix = "wealth-pulse.python-api")
public class PythonApiProperties {
    private String baseUrl;
    private Long timeout = 60L;  // 默认 60 秒
}
```

### 2. 并发控制

批量分析时注意控制并发数：

```java
Semaphore semaphore = new Semaphore(5);  // 最多 5 个并发

List<CompletableFuture<Void>> futures = stocks.stream()
    .map(stock -> CompletableFuture.runAsync(() -> {
        try {
            semaphore.acquire();
            try {
                // 分析股票
            } finally {
                semaphore.release();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }))
    .collect(Collectors.toList());
```

### 3. 结果缓存

K 线分析结果可以适当缓存，避免重复分析相同的 K 线数据：

```java
@Cacheable(value = "kline-analysis", key = "#stockCode + '_' + #klineData.hashCode()")
public KlineAnalysisVo analyzeKlineWithCache(...) {
    return klineAnalysisService.analyzeKline(...);
}
```

### 4. 日志记录

记录分析请求和结果，便于后续审计和问题排查：

```java
log.info("K 线分析：stockCode={}, period={}, provider={}, result.trend={}, result.recommendation={}",
    stockCode, period, provider, result.getTrend(), result.getRecommendation());
```

---

## 附录：LLM 供应商列表

| 供应商 | 标识 | 默认模型 | 支持模型 | 说明 |
|--------|------|----------|----------|------|
| 火山引擎豆包 | doubao | ep-20250226185244-dxp9w | doubao-1-5-pro, doubao-1-5-lite | 推荐，性价比高 |
| OpenAI | openai | gpt-4o-mini | gpt-4o, gpt-4-turbo, gpt-3.5-turbo | 分析质量高 |
| 通义千问 | qwen | qwen-turbo | qwen-plus, qwen-max, qwen-long | 中文理解好 |
| Gemini | gemini | gemini-2.0-flash | gemini-1.5-pro, gemini-pro | Google 模型 |
| GiteeAI | gitee | Qwen2.5-72B-Instruct | Qwen3-235B-A22B, deepseek-coder-33B-instruct | 国产算力 AI 平台 |

> 注：支持的模型列表由各供应商内部维护，无需手动配置。

在请求中指定供应商和模型：

```java
request.setProvider("doubao");
request.setModel("ep-20250226185244-dxp9w");
```

---

## 相关文档

- [Python API 文档](http://localhost:8010/docs)
- [README.md](README.md)
