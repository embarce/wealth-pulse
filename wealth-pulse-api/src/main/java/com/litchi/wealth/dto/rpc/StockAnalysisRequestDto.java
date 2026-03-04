package com.litchi.wealth.dto.rpc;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 股票分析请求 DTO
 *
 * @author Embrace
 * @date 2026-03-01
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockAnalysisRequestDto {

    /**
     * 股票代码
     */
    private String stockCode;

    /**
     * 周期：daily/weekly/monthly
     */
    @Builder.Default
    private String period = "daily";

    /**
     * 获取多少天的历史数据
     */
    @Builder.Default
    private Integer days = 60;

    /**
     * 是否强制刷新（跳过缓存）
     */
    @Builder.Default
    private Boolean forceRefresh = false;

    /**
     * LLM 供应商：doubao/openai
     */
    private String provider;

    /**
     * 模型名称
     */
    private String model;
}
