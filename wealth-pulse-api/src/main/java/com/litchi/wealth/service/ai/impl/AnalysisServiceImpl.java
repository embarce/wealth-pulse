package com.litchi.wealth.service.ai.impl;

import com.litchi.wealth.dto.ai.KlineAnalysisRequest;
import com.litchi.wealth.service.ai.AnalysisService;
import com.litchi.wealth.utils.RedisCache;
import com.litchi.wealth.vo.ai.KlineAnalysisVo;
import com.litchi.wealth.vo.ai.TechnicalPointVo;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * AI分析服务实现
 *
 * @author Embrace
 * @version 1.0
 * @description: AI股票分析服务实现（Mock数据）
 * @date 2026/2/24
 */
@Slf4j
@Service
public class AnalysisServiceImpl implements AnalysisService {

    private static final String CACHE_PREFIX = "ai:kline:analysis:";
    private static final int CACHE_TTL_MINUTES = 5;

    @Resource
    private RedisCache redisCache;

    @Override
    public KlineAnalysisVo analyzeKline(KlineAnalysisRequest request) {
        String cacheKey = buildCacheKey(request);

        // 如果不是强制刷新，先尝试从缓存获取
        if (!Boolean.TRUE.equals(request.getForceRefresh())) {
            KlineAnalysisVo cached = redisCache.getCacheObject(cacheKey);
            if (cached != null) {
                log.info("从缓存获取K线分析结果: {}", request.getStockCode());
                return cached;
            }
        }

        // 执行分析（Mock数据）
        KlineAnalysisVo result = performMockAnalysis(request);

        // 缓存结果
        redisCache.setCacheObject(cacheKey, result, CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        log.info("K线分析完成并已缓存: {}", request.getStockCode());

        return result;
    }

    @Override
    public boolean clearCache(String stockCode, String period) {
        String cacheKey = buildCacheKey(stockCode, period);
        boolean deleted = redisCache.deleteObject(cacheKey);
        log.info("清除K线分析缓存: stockCode={}, period={}, deleted={}", stockCode, period, deleted);
        return deleted;
    }

    /**
     * 构建缓存Key
     */
    private String buildCacheKey(KlineAnalysisRequest request) {
        return buildCacheKey(request.getStockCode(), request.getPeriod());
    }

    /**
     * 构建缓存Key
     */
    private String buildCacheKey(String stockCode, String period) {
        return CACHE_PREFIX + stockCode + ":" + period;
    }

    /**
     * 执行Mock分析
     * TODO: 集成真实的AI模型（如火山引擎豆包）
     */
    private KlineAnalysisVo performMockAnalysis(KlineAnalysisRequest request) {
        List<KlineAnalysisRequest.KlineData> klineData = request.getKlineData();
        if (klineData == null || klineData.isEmpty()) {
            throw new IllegalArgumentException("K线数据不能为空");
        }

        // 获取最新收盘价作为当前价格
        KlineAnalysisRequest.KlineData latest = klineData.get(klineData.size() - 1);
        BigDecimal currentPrice = latest.getClose();

        // 计算一些基础技术指标
        BigDecimal maxPrice = klineData.stream()
                .map(KlineAnalysisRequest.KlineData::getHigh)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);

        BigDecimal minPrice = klineData.stream()
                .map(KlineAnalysisRequest.KlineData::getLow)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);

        BigDecimal avgPrice = klineData.stream()
                .map(KlineAnalysisRequest.KlineData::getClose)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(new BigDecimal(klineData.size()), 2, RoundingMode.HALF_UP);

        // 使用价格hash生成确定性但看起来随机的点位
        SecureRandom random = new SecureRandom(currentPrice.toBigInteger().toByteArray());

        // 生成技术点位
        List<TechnicalPointVo> technicalPoints = generateTechnicalPoints(currentPrice, maxPrice, minPrice, avgPrice, random);

        // 判断趋势
        String trend = determineTrend(klineData, currentPrice, avgPrice);
        String trendDescription = getTrendDescription(trend);

        // 生成建议
        String recommendation = generateRecommendation(trend, technicalPoints, random);
        String recommendationReason = getRecommendationReason(recommendation, trend);

        // 计算目标价格区间
        String targetPriceRange = calculateTargetPriceRange(currentPrice, trend);

        return KlineAnalysisVo.builder()
                .stockCode(request.getStockCode())
                .currentPrice(currentPrice.toString())
                .trend(trend)
                .trendDescription(trendDescription)
                .technicalPoints(technicalPoints)
                .recommendation(recommendation)
                .recommendationReason(recommendationReason)
                .riskLevel(calculateRiskLevel(currentPrice, maxPrice, minPrice))
                .targetPriceRange(targetPriceRange)
                .analysisNote("本分析基于AI模型生成的Mock数据，仅供参考，不构成投资建议。")
                .build();
    }

    /**
     * 生成技术点位
     */
    private List<TechnicalPointVo> generateTechnicalPoints(BigDecimal currentPrice, BigDecimal maxPrice, BigDecimal minPrice,
                                                            BigDecimal avgPrice, SecureRandom random) {
        List<TechnicalPointVo> points = new ArrayList<>();

        // 支撑位（绿色）- 低于当前价
        BigDecimal support1 = currentPrice.multiply(new BigDecimal("0.97")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal support2 = currentPrice.multiply(new BigDecimal("0.94")).setScale(2, RoundingMode.HALF_UP);
        points.add(TechnicalPointVo.builder()
                .type("support")
                .price(support1)
                .strength(4)
                .description("强支撑位，近20日低点区域")
                .build());
        points.add(TechnicalPointVo.builder()
                .type("support")
                .price(support2)
                .strength(3)
                .description("次要支撑位，前期整理平台下沿")
                .build());

        // 压力位（红色）- 高于当前价
        BigDecimal resistance1 = currentPrice.multiply(new BigDecimal("1.03")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal resistance2 = currentPrice.multiply(new BigDecimal("1.06")).setScale(2, RoundingMode.HALF_UP);
        points.add(TechnicalPointVo.builder()
                .type("resistance")
                .price(resistance1)
                .strength(4)
                .description("主要压力位，前期高点区域")
                .build());
        points.add(TechnicalPointVo.builder()
                .type("resistance")
                .price(resistance2)
                .strength(3)
                .description("次要压力位，中期下降趋势线")
                .build());

        // 止损位（橙色）
        BigDecimal stopLoss = currentPrice.multiply(new BigDecimal("0.95")).setScale(2, RoundingMode.HALF_UP);
        points.add(TechnicalPointVo.builder()
                .type("stop_loss")
                .price(stopLoss)
                .strength(5)
                .description("建议止损位，跌破技术支撑位")
                .build());

        // 止盈位（紫色）
        BigDecimal takeProfit1 = currentPrice.multiply(new BigDecimal("1.05")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal takeProfit2 = currentPrice.multiply(new BigDecimal("1.10")).setScale(2, RoundingMode.HALF_UP);
        points.add(TechnicalPointVo.builder()
                .type("take_profit")
                .price(takeProfit1)
                .strength(4)
                .description("第一止盈位，接近压力区")
                .build());
        points.add(TechnicalPointVo.builder()
                .type("take_profit")
                .price(takeProfit2)
                .strength(3)
                .description("第二止盈位，强势突破目标")
                .build());

        return points;
    }

    /**
     * 判断趋势
     */
    private String determineTrend(List<KlineAnalysisRequest.KlineData> klineData, BigDecimal currentPrice, BigDecimal avgPrice) {
        if (klineData.size() < 5) {
            return "sideways";
        }

        // 计算最近5日和20日均线
        int size = klineData.size();
        BigDecimal ma5 = calculateMA(klineData, Math.min(5, size));
        BigDecimal ma20 = calculateMA(klineData, Math.min(20, size));

        // 比较当前价格与均线关系
        int aboveCount = 0;
        for (int i = Math.max(0, size - 10); i < size; i++) {
            if (klineData.get(i).getClose().compareTo(ma20) > 0) {
                aboveCount++;
            }
        }

        if (currentPrice.compareTo(ma5) > 0 && aboveCount > 5) {
            return "uptrend";
        } else if (currentPrice.compareTo(ma5) < 0 && aboveCount < 5) {
            return "downtrend";
        } else {
            return "sideways";
        }
    }

    /**
     * 计算移动平均线
     */
    private BigDecimal calculateMA(List<KlineAnalysisRequest.KlineData> klineData, int period) {
        int startIdx = Math.max(0, klineData.size() - period);
        BigDecimal sum = BigDecimal.ZERO;
        int count = 0;

        for (int i = startIdx; i < klineData.size(); i++) {
            sum = sum.add(klineData.get(i).getClose());
            count++;
        }

        return sum.divide(new BigDecimal(count), 2, RoundingMode.HALF_UP);
    }

    /**
     * 获取趋势描述
     */
    private String getTrendDescription(String trend) {
        if ("uptrend".equals(trend)) {
            return "股价处于上升趋势中，均线多头排列，短期表现强势";
        } else if ("downtrend".equals(trend)) {
            return "股价处于下降趋势中，均线空头排列，短期承压明显";
        } else if ("sideways".equals(trend)) {
            return "股价处于横盘整理阶段，方向待明确，建议观望";
        } else {
            return "趋势不明确，需结合成交量等指标综合判断";
        }
    }

    /**
     * 生成建议
     */
    private String generateRecommendation(String trend, List<TechnicalPointVo> points, SecureRandom random) {
        if ("uptrend".equals(trend)) {
            return random.nextBoolean() ? "buy" : "hold";
        } else if ("downtrend".equals(trend)) {
            return random.nextBoolean() ? "sell" : "hold";
        } else {
            return "hold";
        }
    }

    /**
     * 获取建议理由
     */
    private String getRecommendationReason(String recommendation, String trend) {
        if ("buy".equals(recommendation)) {
            return "技术面呈现上升态势，支撑位较强，建议逢低布局";
        } else if ("sell".equals(recommendation)) {
            return "技术面偏弱，压力位明显，建议降低仓位";
        } else {
            return "当前走势震荡，建议持有观望，等待明确信号";
        }
    }

    /**
     * 计算风险等级
     */
    private String calculateRiskLevel(BigDecimal currentPrice, BigDecimal maxPrice, BigDecimal minPrice) {
        BigDecimal range = maxPrice.subtract(minPrice);
        BigDecimal position = currentPrice.subtract(minPrice);
        BigDecimal ratio = position.divide(range, 2, RoundingMode.HALF_UP);

        if (ratio.compareTo(new BigDecimal("0.7")) > 0) {
            return "high";
        } else if (ratio.compareTo(new BigDecimal("0.3")) < 0) {
            return "low";
        } else {
            return "medium";
        }
    }

    /**
     * 计算目标价格区间
     */
    private String calculateTargetPriceRange(BigDecimal currentPrice, String trend) {
        if ("uptrend".equals(trend)) {
            BigDecimal low = currentPrice.multiply(new BigDecimal("1.05"));
            BigDecimal high = currentPrice.multiply(new BigDecimal("1.12"));
            return low + " - " + high;
        } else if ("downtrend".equals(trend)) {
            BigDecimal low = currentPrice.multiply(new BigDecimal("0.92"));
            BigDecimal high = currentPrice.multiply(new BigDecimal("0.98"));
            return low + " - " + high;
        } else {
            BigDecimal low = currentPrice.multiply(new BigDecimal("0.97"));
            BigDecimal high = currentPrice.multiply(new BigDecimal("1.05"));
            return low + " - " + high;
        }
    }
}
