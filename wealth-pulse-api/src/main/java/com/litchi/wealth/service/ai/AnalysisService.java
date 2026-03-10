package com.litchi.wealth.service.ai;

import com.litchi.wealth.dto.ai.HkStockMarketAnalysisRequest;
import com.litchi.wealth.dto.ai.KlineAnalysisRequest;
import com.litchi.wealth.dto.rpc.PositionAnalysisRequestDto;
import com.litchi.wealth.dto.rpc.StockAnalysisRequestDto;
import com.litchi.wealth.vo.ai.HkStockMarketAnalysisVo;
import com.litchi.wealth.vo.ai.KlineAnalysisVo;
import com.litchi.wealth.vo.ai.PositionAnalysisVo;
import com.litchi.wealth.vo.ai.StockAnalysisVo;
import com.litchi.wealth.vo.rpc.LLMProviderInfoVo;

import java.util.List;

/**
 * AI 分析服务接口
 *
 * @author Embrace
 * @version 1.0
 * @description: 提供 AI 股票分析相关服务
 * @date 2026/2/24
 */
public interface AnalysisService {

    /**
     * 分析 K 线数据
     *
     * @param request K 线分析请求
     * @return 分析结果
     */
    KlineAnalysisVo analyzeKline(KlineAnalysisRequest request);

    /**
     * 获取 LLM 供应商列表
     *
     * @return LLM 供应商列表
     */
    List<LLMProviderInfoVo> listProviders();

    /**
     * 获取可用的 LLM 供应商
     *
     * @return 可用的 LLM 供应商名称列表
     */
    List<String> listAvailableProviders();

    /**
     * AI 分析股票
     *
     * @param request 股票分析请求
     * @return 分析结果
     */
    StockAnalysisVo analyzeStock(StockAnalysisRequestDto request);

    /**
     * AI 分析持仓
     *
     * @param request 持仓分析请求
     * @return 分析结果
     */
    PositionAnalysisVo analyzePosition(PositionAnalysisRequestDto request);

    /**
     * 获取港股市场分析结果（从 Redis 缓存）
     * @return 港股市场分析结果
     */
    HkStockMarketAnalysisVo getHkStockMarketAnalysis();

    /**
     * 调用 Python AI 服务分析港股市场（实时调用）
     *
     * @param request 港股市场分析请求
     * @return 分析结果
     */
    HkStockMarketAnalysisVo analyzeHkStockMarketRealtime(HkStockMarketAnalysisRequest request);

    /**
     * AI 分析贸易评分
     *
     * @param request 贸易评分请求
     * @return 贸易评分结果
     */
    com.litchi.wealth.vo.ai.TradeScoreVo analyzeTrade(com.litchi.wealth.dto.ai.TradeScoreRequest request);

    /**
     * AI 分析券商截图
     *
     * @param request 券商截图识别请求
     * @return 识别结果
     */
    com.litchi.wealth.vo.ai.BrokerScreenshotVo analyzeBrokerScreenshot(com.litchi.wealth.dto.ai.BrokerScreenshotRequest request);

    /**
     * 获取 AI 新闻摘要
     *
     * @return AI 新闻摘要列表
     */
    java.util.List<com.litchi.wealth.vo.ai.AINewsVo> getNewsSummary();

    /**
     * 获取 AI 热点
     *
     * @return AI 热点列表
     */
    java.util.List<com.litchi.wealth.vo.ai.AIHotspotVo> getHotspots();
}
