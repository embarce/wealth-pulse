# K 线分析 API 使用示例

## Python 测试脚本

运行测试脚本验证 API 功能：

```bash
# 确保 Python API 服务已启动
python -m app.main

# 在另一个终端运行测试
python test_kline_analysis.py
```

## Java 完整示例

### 1. 创建测试 Controller

```java
package com.wealthpulse.controller;

import com.wealthpulse.service.KlineAnalysisService;
import com.wealthpulse.service.KlineAnalysisService.KlineAnalysisVo;
import com.wealthpulse.service.KlineAnalysisService.KlineData;
import com.wealthpulse.service.KlineAnalysisService.TechnicalPointVo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/demo")
public class KlineAnalysisDemoController {
    
    @Autowired
    private KlineAnalysisService klineAnalysisService;
    
    /**
     * 演示：分析腾讯控股 K 线
     */
    @GetMapping("/analyze-tencent")
    public KlineAnalysisVo analyzeTencent() {
        // 准备 K 线数据（腾讯控股 0700.HK 最近 10 个交易日）
        List<KlineData> klineData = Arrays.asList(
            createKline("2026-02-14", 415.0, 420.0, 412.0, 418.5, 12000000),
            createKline("2026-02-17", 419.0, 425.0, 417.0, 423.0, 15000000),
            createKline("2026-02-18", 423.5, 428.0, 421.0, 426.5, 14000000),
            createKline("2026-02-19", 427.0, 432.0, 425.0, 430.0, 16000000),
            createKline("2026-02-20", 430.5, 435.0, 428.0, 433.5, 18000000),
            createKline("2026-02-21", 434.0, 438.0, 432.0, 436.0, 17000000),
            createKline("2026-02-24", 436.5, 440.0, 434.0, 438.5, 15000000),
            createKline("2026-02-25", 439.0, 442.0, 436.0, 440.0, 14000000),
            createKline("2026-02-26", 440.5, 445.0, 438.0, 443.0, 16000000),
            createKline("2026-02-27", 443.5, 448.0, 441.0, 446.0, 18000000)
        );
        
        // 调用分析
        KlineAnalysisVo result = klineAnalysisService.analyzeKline("0700.HK", klineData);
        
        // 打印结果
        System.out.println("===== 腾讯控股 K 线分析结果 =====");
        System.out.println("股票代码：" + result.getStockCode());
        System.out.println("当前价格：" + result.getCurrentPrice());
        System.out.println("趋势判断：" + result.getTrend());
        System.out.println("趋势说明：" + result.getTrendDescription());
        System.out.println("综合建议：" + result.getRecommendation());
        System.out.println("建议说明：" + result.getRecommendationReason());
        System.out.println("风险等级：" + result.getRiskLevel());
        System.out.println("目标价格：" + result.getTargetPriceRange());
        
        System.out.println("\n技术点位:");
        for (TechnicalPointVo point : result.getTechnicalPoints()) {
            System.out.printf("  - %s: 价格=%s, 强度=%d, 说明=%s%n",
                point.getType(), point.getPrice(), point.getStrength(), point.getDescription());
        }
        
        System.out.println("\n分析说明：" + result.getAnalysisNote());
        
        return result;
    }
    
    /**
     * 演示：使用指定 LLM 供应商分析
     */
    @GetMapping("/analyze-with-provider")
    public KlineAnalysisVo analyzeWithProvider(@RequestParam(defaultValue = "doubao") String provider) {
        List<KlineData> klineData = Arrays.asList(
            createKline("2026-02-20", 420.5, 428.0, 418.0, 425.6, 15000000),
            createKline("2026-02-21", 426.0, 432.5, 424.0, 430.2, 18000000),
            createKline("2026-02-24", 431.0, 436.0, 429.0, 434.5, 16000000),
            createKline("2026-02-25", 435.0, 440.0, 433.0, 438.0, 17000000),
            createKline("2026-02-26", 438.5, 443.0, 436.0, 441.5, 15000000)
        );
        
        // 指定 LLM 供应商和模型
        return klineAnalysisService.analyzeKline(
            "0700.HK",
            klineData,
            "daily",
            provider,
            null  // 使用默认模型
        );
    }
    
    private KlineData createKline(String date, double open, double high, 
                                   double low, double close, long volume) {
        KlineData data = new KlineData();
        data.setDate(date);
        data.setOpen(new BigDecimal(open));
        data.setHigh(new BigDecimal(high));
        data.setLow(new BigDecimal(low));
        data.setClose(new BigDecimal(close));
        data.setVolume(volume);
        return data;
    }
}
```

### 2. 创建单元测试

```java
package com.wealthpulse.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class KlineAnalysisServiceTest {
    
    @Autowired
    private KlineAnalysisService klineAnalysisService;
    
    @Test
    public void testAnalyzeKline() {
        // 准备测试数据
        List<KlineAnalysisService.KlineData> klineData = Arrays.asList(
            createKline("2026-02-20", 420.5, 428.0, 418.0, 425.6, 15000000),
            createKline("2026-02-21", 426.0, 432.5, 424.0, 430.2, 18000000),
            createKline("2026-02-24", 431.0, 436.0, 429.0, 434.5, 16000000),
            createKline("2026-02-25", 435.0, 440.0, 433.0, 438.0, 17000000),
            createKline("2026-02-26", 438.5, 443.0, 436.0, 441.5, 15000000)
        );
        
        // 执行分析
        KlineAnalysisService.KlineAnalysisVo result = klineAnalysisService.analyzeKline(
            "0700.HK", klineData
        );
        
        // 验证结果
        assertNotNull(result);
        assertEquals("0700.HK", result.getStockCode());
        assertNotNull(result.getCurrentPrice());
        assertNotNull(result.getTrend());
        assertNotNull(result.getRecommendation());
        assertNotNull(result.getRiskLevel());
        
        System.out.println("测试通过！");
        System.out.println("趋势：" + result.getTrend());
        System.out.println("建议：" + result.getRecommendation());
    }
    
    @Test
    public void testAnalyzeKlineWithProvider() {
        List<KlineAnalysisService.KlineData> klineData = Arrays.asList(
            createKline("2026-02-20", 420.5, 428.0, 418.0, 425.6, 15000000),
            createKline("2026-02-21", 426.0, 432.5, 424.0, 430.2, 18000000),
            createKline("2026-02-24", 431.0, 436.0, 429.0, 434.5, 16000000),
            createKline("2026-02-25", 435.0, 440.0, 433.0, 438.0, 17000000),
            createKline("2026-02-26", 438.5, 443.0, 436.0, 441.5, 15000000)
        );
        
        // 测试不同供应商
        String[] providers = {"doubao", "openai", "qwen"};
        
        for (String provider : providers) {
            try {
                KlineAnalysisService.KlineAnalysisVo result = klineAnalysisService.analyzeKline(
                    "0700.HK", klineData, "daily", provider, null
                );
                
                System.out.println(provider + " 分析完成");
                System.out.println("  趋势：" + result.getTrend());
                System.out.println("  建议：" + result.getRecommendation());
                
            } catch (Exception e) {
                System.out.println(provider + " 分析失败：" + e.getMessage());
            }
        }
    }
    
    private KlineAnalysisService.KlineData createKline(
            String date, double open, double high, 
            double low, double close, long volume) {
        KlineAnalysisService.KlineData data = new KlineAnalysisService.KlineData();
        data.setDate(date);
        data.setOpen(new BigDecimal(open));
        data.setHigh(new BigDecimal(high));
        data.setLow(new BigDecimal(low));
        data.setClose(new BigDecimal(close));
        data.setVolume(volume);
        return data;
    }
}
```

### 3. 实际业务场景示例

```java
@Service
public class StockAnalysisBusinessService {
    
    @Autowired
    private KlineAnalysisService klineAnalysisService;
    
    @Autowired
    private StockHistoryService stockHistoryService;  // 假设的历史数据服务
    
    /**
     * 智能投顾：根据用户持仓自动生成投资建议
     */
    public List<InvestmentAdvice> generateAdviceForPortfolio(
            List<UserPosition> userPositions) {
        
        return userPositions.stream().map(position -> {
            try {
                // 获取最近 30 天的 K 线数据
                List<KlineAnalysisService.KlineData> klineData = 
                    stockHistoryService.getKlineData(
                        position.getStockCode(), 
                        30
                    );
                
                // 调用 AI 分析
                KlineAnalysisService.KlineAnalysisVo analysis = 
                    klineAnalysisService.analyzeKline(
                        position.getStockCode(), 
                        klineData
                    );
                
                // 转换为投资建议
                return convertToAdvice(position, analysis);
                
            } catch (Exception e) {
                log.error("生成投资建议失败：{}", position.getStockCode(), e);
                return null;
            }
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }
    
    /**
     * 每日股票筛选：找出技术面强势的股票
     */
    public List<String> screenStrongStocks(List<String> stockCodes) {
        return stockCodes.parallelStream().map(code -> {
            try {
                List<KlineAnalysisService.KlineData> klineData = 
                    stockHistoryService.getKlineData(code, 20);
                
                KlineAnalysisService.KlineAnalysisVo analysis = 
                    klineAnalysisService.analyzeKline(code, klineData);
                
                // 筛选上涨趋势且建议买入的股票
                if ("uptrend".equals(analysis.getTrend()) &&
                    ("buy".equals(analysis.getRecommendation()) || 
                     "strong_buy".equals(analysis.getRecommendation()))) {
                    return code;
                }
                
            } catch (Exception e) {
                log.error("筛选股票失败：{}", code, e);
            }
            return null;
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }
    
    /**
     * 风险预警：检查持仓风险
     */
    public List<RiskWarning> checkPortfolioRisk(List<UserPosition> positions) {
        return positions.stream().map(position -> {
            try {
                List<KlineAnalysisService.KlineData> klineData = 
                    stockHistoryService.getKlineData(
                        position.getStockCode(), 
                        10
                    );
                
                KlineAnalysisService.KlineAnalysisVo analysis = 
                    klineAnalysisService.analyzeKline(
                        position.getStockCode(), 
                        klineData
                    );
                
                // 高风险股票
                if ("high".equals(analysis.getRiskLevel()) ||
                    "sell".equals(analysis.getRecommendation()) ||
                    "strong_sell".equals(analysis.getRecommendation())) {
                    
                    RiskWarning warning = new RiskWarning();
                    warning.setStockCode(position.getStockCode());
                    warning.setRiskLevel(analysis.getRiskLevel());
                    warning.setRecommendation(analysis.getRecommendation());
                    warning.setReason(analysis.getRecommendationReason());
                    return warning;
                }
                
            } catch (Exception e) {
                log.error("风险检查失败：{}", position.getStockCode(), e);
            }
            return null;
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }
    
    private InvestmentAdvice convertToAdvice(
            UserPosition position, 
            KlineAnalysisService.KlineAnalysisVo analysis) {
        
        InvestmentAdvice advice = new InvestmentAdvice();
        advice.setStockCode(position.getStockCode());
        advice.setAction(analysis.getRecommendation());
        advice.setReason(analysis.getRecommendationReason());
        advice.setTargetPrice(analysis.getTargetPriceRange());
        advice.setTrend(analysis.getTrend());
        advice.setRiskLevel(analysis.getRiskLevel());
        advice.setTechnicalPoints(analysis.getTechnicalPoints());
        advice.setUpdateTime(LocalDateTime.now());
        return advice;
    }
    
    @Data
    public static class InvestmentAdvice {
        private String stockCode;
        private String action;
        private String reason;
        private String targetPrice;
        private String trend;
        private String riskLevel;
        private List<TechnicalPointVo> technicalPoints;
        private LocalDateTime updateTime;
    }
    
    @Data
    public static class RiskWarning {
        private String stockCode;
        private String riskLevel;
        private String recommendation;
        private String reason;
    }
}
```

---

## 快速开始

### 1. 启动 Python API

```bash
cd wealth-pulse-python
docker-compose up -d
# 或者
python -m app.main
```

### 2. 配置 Java 应用

在 `application.yml` 中配置：

```yaml
wealth-pulse:
  python-api:
    base-url: http://localhost:8010
    auth:
      client-id: wealth-pulse-java
      client-secret: wealth-pulse-client-secret
```

### 3. 调用示例

```bash
# 访问 Java 接口
curl http://localhost:8080/api/demo/analyze-tencent
```

### 4. 查看结果

```json
{
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
    }
  ],
  "recommendation": "buy",
  "recommendationReason": "技术面突破，成交量配合，建议买入",
  "riskLevel": "medium",
  "targetPriceRange": "455-465",
  "analysisNote": "以上分析基于技术指标，仅供参考"
}
```
