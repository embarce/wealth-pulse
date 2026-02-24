package com.litchi.wealth.service.ai;

import com.litchi.wealth.dto.ai.KlineAnalysisRequest;
import com.litchi.wealth.vo.ai.KlineAnalysisVo;

/**
 * AI分析服务接口
 *
 * @author Embrace
 * @version 1.0
 * @description: 提供AI股票分析相关服务
 * @date 2026/2/24
 */
public interface AnalysisService {

    /**
     * 分析K线数据
     *
     * @param request K线分析请求
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
}
