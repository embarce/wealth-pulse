package com.litchi.wealth.service.ai.impl;

import com.litchi.wealth.dto.ai.KlineAnalysisRequest;
import com.litchi.wealth.dto.rpc.KlineAnalysisRequestDto;
import com.litchi.wealth.dto.rpc.PositionAnalysisRequestDto;
import com.litchi.wealth.dto.rpc.StockAnalysisRequestDto;
import com.litchi.wealth.rpc.PythonStockRpc;
import com.litchi.wealth.service.ai.AnalysisService;
import com.litchi.wealth.utils.RedisCache;
import com.litchi.wealth.vo.ai.KlineAnalysisVo;
import com.litchi.wealth.vo.ai.PositionAnalysisVo;
import com.litchi.wealth.vo.ai.StockAnalysisVo;
import com.litchi.wealth.vo.rpc.LLMProviderInfoVo;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * AI 分析服务实现
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 股票分析服务实现（调用 Python AI 服务）
 * @date 2026/2/24
 */
@Slf4j
@Service
public class AnalysisServiceImpl implements AnalysisService {

    private static final String CACHE_PREFIX = "ai:kline:analysis:";
    private static final int CACHE_TTL_MINUTES = 5;

    @Resource
    private RedisCache redisCache;

    @Resource
    private PythonStockRpc pythonStockRpc;

    @Override
    public KlineAnalysisVo analyzeKline(KlineAnalysisRequest request) {
        String cacheKey = buildCacheKey(request);

        // 如果不是强制刷新，先尝试从缓存获取
        if (!Boolean.TRUE.equals(request.getForceRefresh())) {
            KlineAnalysisVo cached = redisCache.getCacheObject(cacheKey);
            if (cached != null) {
                log.info("从缓存获取 K 线分析结果：{}", request.getStockCode());
                return cached;
            }
        }

        // 调用 Python AI 服务执行分析
        KlineAnalysisVo result = callPythonAiService(request);

        // 缓存结果
        redisCache.setCacheObject(cacheKey, result, CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        log.info("K 线分析完成并已缓存：{}", request.getStockCode());

        return result;
    }

    @Override
    public boolean clearCache(String stockCode, String period) {
        String cacheKey = buildCacheKey(stockCode, period);
        boolean deleted = redisCache.deleteObject(cacheKey);
        log.info("清除 K 线分析缓存：stockCode={}, period={}, deleted={}", stockCode, period, deleted);
        return deleted;
    }

    @Override
    public List<LLMProviderInfoVo> listProviders() {
        return pythonStockRpc.listProviders();
    }

    @Override
    public List<String> listAvailableProviders() {
        return pythonStockRpc.listAvailableProviders();
    }

    @Override
    public StockAnalysisVo analyzeStock(StockAnalysisRequestDto request) {
        log.info("收到股票分析请求：股票代码={}, 周期={}, 天数={}, provider={}",
                request.getStockCode(), request.getPeriod(), request.getDays(), request.getProvider());

        try {
            // 调用 Python AI 服务，直接返回 StockAnalysisVo
            StockAnalysisVo result = pythonStockRpc.analyzeStock(request);
            log.info("股票分析完成：股票代码={}, 趋势={}, 建议={}, 评级={}",
                    result.getStockCode(), result.getTrend(), result.getRecommendation(), result.getRating());
            return result;
        } catch (Exception e) {
            log.error("股票分析失败：股票代码={}", request.getStockCode(), e);
            throw new RuntimeException("股票分析失败：" + e.getMessage(), e);
        }
    }

    @Override
    public PositionAnalysisVo analyzePosition(PositionAnalysisRequestDto request) {
        log.info("收到持仓分析请求：持仓数量={}, 分析深度={}, provider={}",
                request.getPositions() != null ? request.getPositions().size() : 0,
                request.getAnalysisDepth(), request.getProvider());

        try {
            // 调用 Python AI 服务，直接返回 PositionAnalysisVo
            PositionAnalysisVo result = pythonStockRpc.analyzePosition(request);
            log.info("持仓分析完成：持仓数量={}, 综合评分={}, 综合评级={}",
                    request.getPositions() != null ? request.getPositions().size() : 0,
                    result.getPortfolioSummary() != null ? result.getPortfolioSummary().getOverallScore() : null,
                    result.getPortfolioSummary() != null ? result.getPortfolioSummary().getOverallRating() : null);
            return result;
        } catch (Exception e) {
            log.error("持仓分析失败", e);
            throw new RuntimeException("持仓分析失败：" + e.getMessage(), e);
        }
    }

    /**
     * 构建缓存 Key
     */
    private String buildCacheKey(KlineAnalysisRequest request) {
        return buildCacheKey(request.getStockCode(), request.getPeriod());
    }

    /**
     * 构建缓存 Key
     */
    private String buildCacheKey(String stockCode, String period) {
        return CACHE_PREFIX + stockCode + ":" + period;
    }

    /**
     * 调用 Python AI 服务
     */
    private KlineAnalysisVo callPythonAiService(KlineAnalysisRequest request) {
        // 转换为 RPC 请求 DTO
        KlineAnalysisRequestDto rpcRequest = convertToRpcRequest(request);

        // 调用 Python AI 服务，直接返回 KlineAnalysisVo
        return pythonStockRpc.analyzeKline(rpcRequest);
    }

    /**
     * 转换为 RPC 请求 DTO
     */
    private KlineAnalysisRequestDto convertToRpcRequest(KlineAnalysisRequest request) {
        List<KlineAnalysisRequestDto.KlineDataDto> klineDataDtoList = request.getKlineData().stream()
                .map(this::convertKlineData)
                .collect(Collectors.toList());

        return KlineAnalysisRequestDto.builder()
                .stockCode(request.getStockCode())
                .period(request.getPeriod())
                .provider(request.getProvider())
                .model(request.getModel())
                .klineData(klineDataDtoList)
                .build();
    }

    /**
     * 转换单条 K 线数据
     */
    private KlineAnalysisRequestDto.KlineDataDto convertKlineData(KlineAnalysisRequest.KlineData klineData) {
        return KlineAnalysisRequestDto.KlineDataDto.builder()
                .date(klineData.getDate())
                .open(klineData.getOpen())
                .high(klineData.getHigh())
                .low(klineData.getLow())
                .close(klineData.getClose())
                .volume(klineData.getVolume() != null ? klineData.getVolume().intValue() : null)
                .amount(klineData.getAmount())
                .build();
    }
}
