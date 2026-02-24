# AI 分析 K 线图接口文档

## 后端 API 设计

### 1. AI 分析 K 线接口

**接口路径:** `POST /api/ai/analyze-kline`

**请求参数:**
```json
{
  "stockCode": "03900.HK",
  "klineData": [
    {
      "date": "2026-02-24",
      "open": 150.5,
      "high": 155,
      "low": 149,
      "close": 152.3,
      "volume": 1000000,
      "amount": 152300000
    }
  ],
  "period": "daily",
  "forceRefresh": false
}
```

**字段说明：**
- `stockCode`: 股票代码（如 "03900.HK"）
- `klineData`: K线数据数组
  - `date`: 日期（yyyy-MM-dd 格式）
  - `open/high/low/close`: 开高低收价格
  - `volume`: 成交量
  - `amount`: 成交额
- `period`: 周期类型（minute/daily/weekly/monthly）
- `forceRefresh`: 是否强制刷新缓存（默认 false）

**响应结果:**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "stockCode": "03900.HK",
    "analysis": {
    "keyLevels": [
      {
        "type": "support",
        "price": 148.5,
        "label": "关键支撑",
        "confidence": 0.85,
        "reason": "多次回踩支撑位，成交量萎缩"
      },
      {
        "type": "resistance",
        "price": 155.8,
        "label": "趋势压力",
        "confidence": 0.78,
        "reason": "前期高点压力位"
      },
      {
        "type": "takeProfit",
        "price": 160.5,
        "label": "止盈目标",
        "confidence": 0.72,
        "reason": "趋势线上方目标位"
      },
      {
        "type": "stopLoss",
        "price": 146.2,
        "label": "风控止损",
        "confidence": 0.90,
        "reason": "跌破支撑位后的止损位"
      }
    ],
    "trend": "bullish",
    "patterns": ["底部盘整", "量价背离"],
    "advice": "当前处于筑底阶段，建议轻仓分批入场。关注145-148支撑区间。",
    "confidence": 0.81
    }
  }
}
```

### 2. 后端实现示例（Java Spring Boot）

```java
@RestController
@RequestMapping("/api/ai")
public class AIAnalysisController {

    @Autowired
    private AIAnalysisService aiAnalysisService;

    @PostMapping("/analyze-kline")
    public Result<AIAnalysisResponse> analyzeKline(@RequestBody AIAnalysisRequest request) {
        AIAnalysisResponse response = aiAnalysisService.analyzeKline(request);
        return Result.success(response);
    }
}

@Service
public class AIAnalysisServiceImpl implements AIAnalysisService {

    @Autowired
    private VolcengineArkClient arkClient; // 火山引擎 Ark 客户端

    @Override
    public AIAnalysisResponse analyzeKline(AIAnalysisRequest request) {
        // 1. 构建 prompt
        String prompt = buildAnalysisPrompt(request);

        // 2. 调用 AI 模型
        String aiResponse = arkClient.chat(prompt);

        // 3. 解析 AI 响应
        return parseAIResponse(aiResponse, request.getSymbol());
    }

    private String buildAnalysisPrompt(AIAnalysisRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append("请分析以下股票的K线数据，识别关键技术点位：\n\n");
        sb.append("股票代码: ").append(request.getSymbol()).append("\n");
        sb.append("周期: ").append(request.getPeriod()).append("\n\n");
        sb.append("最近").append(request.getKlineData().size()).append("根K线:\n");

        for (KlineDataPoint point : request.getKlineData()) {
            sb.append(String.format(
                "时间:%s 开:%.2f 高:%.2f 低:%.2f 收:%.2f 量:%d\n",
                point.getTimestamp(),
                point.getOpen(),
                point.getHigh(),
                point.getLow(),
                point.getClose(),
                point.getVolume()
            ));
        }

        sb.append("\n请以JSON格式返回分析结果，包含：\n");
        sb.append("- keyLevels: 关键点位（支撑/压力/止损/止盈）\n");
        sb.append("- trend: 趋势判断(bullish/bearish/neutral)\n");
        sb.append("- patterns: 识别出的形态数组\n");
        sb.append("- advice: 操作建议\n");
        sb.append("- confidence: 整体置信度(0-1)\n");

        return sb.toString();
    }
}
```

### 3. 数据传输优化

为了减少传输数据量，可以：

1. **只传输最近 N 根 K 线**（如最近 60 根日K线）
2. **数据压缩**（gzip）
3. **缓存分析结果**（Redis，TTL 5分钟）

```java
@Service
public class AIAnalysisServiceImpl implements AIAnalysisService {

    @Autowired
    private RedisCache redisCache;

    private static final String CACHE_KEY_PREFIX = "ai:kline:";
    private static final long CACHE_TTL = 300; // 5分钟

    @Override
    public AIAnalysisResponse analyzeKline(AIAnalysisRequest request) {
        // 生成缓存 key
        String cacheKey = generateCacheKey(request);

        // 尝试从缓存获取
        AIAnalysisResponse cached = redisCache.get(cacheKey, AIAnalysisResponse.class);
        if (cached != null) {
            return cached;
        }

        // 调用 AI 分析
        AIAnalysisResponse response = doAnalyze(request);

        // 缓存结果
        redisCache.set(cacheKey, response, CACHE_TTL);

        return response;
    }

    private String generateCacheKey(AIAnalysisRequest request) {
        return String.format("%s%s:%s:%d",
            CACHE_KEY_PREFIX,
            request.getSymbol(),
            request.getPeriod(),
            request.getKlineData().get(0).getTimestamp() // 用第一根K线时间作为版本
        );
    }
}
```

## 前端集成示例

```typescript
// 1. 调用 AI 分析
const analyzeKline = async (stockCode: string) => {
  // 获取K线数据
  const klineData = await stockApi.getEnhancedHistory(stockCode, {
    period: 'daily',
    adjust: '',
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  });

  // 转换数据格式
  const requestData: AIAnalysisRequest = {
    symbol: stockCode,
    period: 'daily',
    klineData: klineData.map(item => ({
      timestamp: new Date(item.tradeDate).getTime(),
      open: item.openPrice,
      high: item.highPrice,
      low: item.lowPrice,
      close: item.closePrice,
      volume: item.volume,
    })),
    language: 'zh'
  };

  // 调用 AI 分析接口
  const response = await aiAnalysisApi.analyzeKline(requestData);

  return response.analysis;
};

// 2. 在图表中展示点位
<StockChartWithOverlay
  stockCode="00700.HK"
  height={500}
  keyLevels={keyLevels}
  showOverlays={true}
/>
```

## 覆盖物类型说明

klinecharts 支持的覆盖物类型：

1. **segment** - 线段（两点之间的直线）
2. **rayLine** - 射线（从一个点向某个方向延伸）
3. **horizontalLine** - 水平线
4. **verticalLine** - 垂直线
5. **priceLine** - 价格线（水平线的变体，带标签）

对于 AI 分析点位，推荐使用 **priceLine** 类型，因为：
- 水平线显示价格位置
- 自动显示价格标签
- 虚线样式，不遮挡K线
- 可以自定义颜色和文字
