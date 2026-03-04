package com.litchi.wealth.dto.rpc;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 持仓分析请求 DTO
 *
 * @author Embrace
 * @date 2026-03-01
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PositionAnalysisRequestDto {

    /**
     * 持仓列表
     */
    private List<PositionItemDto> positions;

    /**
     * 分析深度：quick/standard/deep
     */
    @Builder.Default
    private String analysisDepth = "standard";

    /**
     * LLM 供应商：doubao/openai
     */
    private String provider;

    /**
     * 模型名称
     */
    private String model;

    /**
     * 持仓项
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class PositionItemDto {
        /**
         * 股票代码
         */
        private String stockCode;

        /**
         * 买入价格
         */
        private Double buyPrice;

        /**
         * 持仓数量（股）
         */
        private Integer quantity;

        /**
         * 买入日期（可选，格式：YYYY-MM-DD）
         */
        private String buyDate;
    }
}
