package com.litchi.wealth.service.ai;

import com.litchi.wealth.dto.ai.KlineAnalysisRequest;
import com.litchi.wealth.dto.rpc.PositionAnalysisRequestDto;
import com.litchi.wealth.dto.rpc.StockAnalysisRequestDto;
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
     * 清除分析缓存
     *
     * @param stockCode 股票代码
     * @param period 分析周期
     * @return 是否清除成功
     */
    boolean clearCache(String stockCode, String period);

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
}
