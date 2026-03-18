package com.litchi.wealth.service.ai.impl;

import cn.hutool.core.date.DateUtil;
import com.litchi.wealth.dto.ai.BrokerScreenshotRequest;
import com.litchi.wealth.dto.ai.HkStockMarketAnalysisRequest;
import com.litchi.wealth.dto.ai.KlineAnalysisRequest;
import com.litchi.wealth.dto.ai.TradeScoreRequest;
import com.litchi.wealth.dto.rpc.KlineAnalysisRequestDto;
import com.litchi.wealth.dto.rpc.PositionAnalysisRequestDto;
import com.litchi.wealth.dto.rpc.StockAnalysisRequestDto;
import com.litchi.wealth.exception.ServiceException;
import com.litchi.wealth.rpc.PythonStockRpc;
import com.litchi.wealth.service.ai.AnalysisService;
import com.litchi.wealth.utils.MarkdownUtils;
import com.litchi.wealth.utils.RedisCache;
import com.litchi.wealth.vo.ai.*;
import com.litchi.wealth.vo.rpc.LLMProviderInfoVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static com.litchi.wealth.constant.Constants.ANALYSIS_REDIS_KEY_PREFIX;

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

    @Autowired
    private PythonStockRpc pythonStockRpc;

    @Autowired
    private RedisCache redisCache;

    @Override
    @Cacheable(value = "analyzeKline", key = "#request.stockCode + '-' + #request.period+'-'+#request.model +'-'+#request.provider")
    public KlineAnalysisVo analyzeKline(KlineAnalysisRequest request) {
        // 调用 Python AI 服务执行分析
        KlineAnalysisVo result = callPythonAiService(request);
        log.info("K 线分析完成并已缓存：{}", request.getStockCode());
        return result;
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
    @Cacheable(value = "analyzeStock", key = "#request.stockCode + '-' + #request.period+'-'+#request.days+'-'+#request.provider+'-'+#request.model")
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

    @Override
    public HkStockMarketAnalysisVo getHkStockMarketAnalysis() {
        String today = DateUtil.today();
        String redisKey = ANALYSIS_REDIS_KEY_PREFIX + today;
        String lockKey = ANALYSIS_REDIS_KEY_PREFIX + "lock";
        if (redisCache.hasKey(lockKey)) {
            throw new ServiceException("正在执行港股市场分析，请稍后再试...");
        }
        Boolean hasKey = redisCache.hasKey(redisKey);
        if (hasKey) {
            HkStockMarketAnalysisVo result = redisCache.getCacheObject(redisKey);

            // 处理 Markdown 格式问题
            if (result.getInvestmentReport() != null) {
                // 保存原始报告（用于前端展示）
                result.setRawReport(result.getInvestmentReport());
                // 处理换行符，将 \n 转换为实际换行
                String processedReport = result.getInvestmentReport().replace("\\n", "\n");
                // 移除可能存在的 markdown 代码块标记
                processedReport = MarkdownUtils.removeMarkdownCodeBlock(processedReport);
                result.setInvestmentReport(processedReport);
                result.setRawReport(result.getInvestmentReport());
            }
            // 同样处理 compressed_news
            if (result.getCompressedNews() != null) {
                String processedNews = result.getCompressedNews().replace("\\n", "\n");
                processedNews = MarkdownUtils.removeMarkdownCodeBlock(processedNews);
                result.setCompressedNews(processedNews);
            }

            log.info("从 Redis 获取港股市场分析成功：date={}, redisKey={}", today, redisKey);
            return result;
        } else {
            // Redis 中没有，尝试实时调用
            redisCache.setCacheObject(lockKey, true, 10, TimeUnit.MINUTES);
            log.info("Redis 中未找到 {} 的港股市场分析，尝试实时调用", today);
            HkStockMarketAnalysisVo hkStockMarketAnalysisVo = analyzeHkStockMarketRealtime(new HkStockMarketAnalysisRequest());
            redisCache.setCacheObject(redisKey, hkStockMarketAnalysisVo, 12, TimeUnit.HOURS);
            redisCache.deleteObject(lockKey);
            return hkStockMarketAnalysisVo;
        }
    }

    @Override
    public HkStockMarketAnalysisVo analyzeHkStockMarketRealtime(HkStockMarketAnalysisRequest request) {
        log.info("实时调用 Python AI 服务分析港股市场：provider={}, model={}",
                request != null ? request.getProvider() : "default",
                request != null ? request.getModel() : "default");

        try {
            HkStockMarketAnalysisVo result = pythonStockRpc.analyzeHkStockMarket(request);
            String today = DateUtil.today();
            String redisKey = ANALYSIS_REDIS_KEY_PREFIX + today;
            redisCache.setCacheObject(redisKey, result, 5, TimeUnit.HOURS);

            // 处理 Markdown 格式问题
            if (result.getInvestmentReport() != null) {
                // 保存原始报告（用于前端展示）
                result.setRawReport(result.getInvestmentReport());
                // 处理换行符，将 \n 转换为实际换行
                String processedReport = result.getInvestmentReport().replace("\\n", "\n");
                // 移除可能存在的 markdown 代码块标记
                processedReport = MarkdownUtils.removeMarkdownCodeBlock(processedReport);
                result.setInvestmentReport(processedReport);
            }
            // 同样处理 compressed_news
            if (result.getCompressedNews() != null) {
                String processedNews = result.getCompressedNews().replace("\\n", "\n");
                processedNews = MarkdownUtils.removeMarkdownCodeBlock(processedNews);
                result.setCompressedNews(processedNews);
            }

            log.info("港股市场分析完成：新闻总数={}",
                    result.getNewsSummary() != null ? result.getNewsSummary().getTotalCount() : 0);
            return result;
        } catch (Exception e) {
            log.error("港股市场分析失败", e);
            throw new RuntimeException("港股市场分析失败：" + e.getMessage(), e);
        }
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

    @Override
    public TradeScoreVo analyzeTrade(TradeScoreRequest request) {
        log.info("收到贸易评分请求：股票代码={}, 交易日期={}, 买卖方向={}, 价格={}",
                request.getStockCode(), request.getTransactionDate(), request.getInstruction(), request.getPrice());

        try {
            // 调用 Python AI 服务分析贸易
            TradeScoreVo result = pythonStockRpc.analyzeTrade(request);
            log.info("贸易评分完成：股票代码={}, 评分={}, 评级={}",
                    request.getStockCode(), result.getScore(), result.getLevel());
            return result;
        } catch (Exception e) {
            log.error("贸易评分失败：股票代码={}", request.getStockCode(), e);
            throw new RuntimeException("贸易评分失败：" + e.getMessage(), e);
        }
    }

    @Override
    public BrokerScreenshotVo analyzeBrokerScreenshot(BrokerScreenshotRequest request) {
        log.info("收到券商截图识别请求：图片长度={}, provider={}, model={}",
                request.getImageBase64() != null ? request.getImageBase64().length() : 0,
                request.getProvider(), request.getModel());

        try {
            // 调用 Python AI 服务分析截图
            BrokerScreenshotVo result = pythonStockRpc.analyzeBrokerScreenshot(request);
            log.info("券商截图识别完成：检测到交易数量={}",
                    result.getTrades() != null ? result.getTrades().size() : 0);
            return result;
        } catch (Exception e) {
            log.error("券商截图识别失败", e);
            throw new RuntimeException("券商截图识别失败：" + e.getMessage(), e);
        }
    }

    @Override
    public List<AINewsVo> getNewsSummary() {
        log.info("获取 AI 新闻摘要");
        try {
            List<AINewsVo> newsList = pythonStockRpc.getNewsSummary();
            log.info("获取 AI 新闻摘要成功：数量={}", newsList != null ? newsList.size() : 0);
            return newsList;
        } catch (Exception e) {
            log.error("获取 AI 新闻摘要失败", e);
            throw new RuntimeException("获取 AI 新闻摘要失败：" + e.getMessage(), e);
        }
    }

    @Override
    public List<AIHotspotVo> getHotspots() {
        log.info("获取 AI 热点");
        try {
            List<AIHotspotVo> hotspots = pythonStockRpc.getHotspots();
            log.info("获取 AI 热点成功：数量={}", hotspots != null ? hotspots.size() : 0);
            return hotspots;
        } catch (Exception e) {
            log.error("获取 AI 热点失败", e);
            throw new RuntimeException("获取 AI 热点失败：" + e.getMessage(), e);
        }
    }
}
