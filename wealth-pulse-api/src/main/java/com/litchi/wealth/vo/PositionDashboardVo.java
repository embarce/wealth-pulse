package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * 仓位总览 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: 用户仓位总览信息
 * @date 2026/2/12
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "PositionDashboardVo", description = "仓位总览")
public class PositionDashboardVo {

    @Schema(name = "totalPositionValue", description = "总持仓市值")
    private BigDecimal totalPositionValue;

    @Schema(name = "totalCost", description = "总成本")
    private BigDecimal totalCost;

    @Schema(name = "totalProfitLoss", description = "总盈亏")
    private BigDecimal totalProfitLoss;

    @Schema(name = "totalProfitLossRate", description = "总盈亏比例(%)")
    private BigDecimal totalProfitLossRate;

    @Schema(name = "positionCount", description = "持仓数量")
    private Integer positionCount;

    @Schema(name = "profitableCount", description = "盈利数量")
    private Integer profitableCount;

    @Schema(name = "lossCount", description = "亏损数量")
    private Integer lossCount;

    @Schema(name = "positions", description = "持仓明细")
    private List<PositionItemVo> positions;

    /**
     * 持仓明细项
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(name = "PositionItemVo", description = "持仓明细")
    public static class PositionItemVo {

        @Schema(name = "stockCode", description = "股票代码")
        private String stockCode;

        @Schema(name = "companyName", description = "公司名称")
        private String companyName;

        @Schema(name = "companyNameCn", description = "公司中文名称")
        private String companyNameCn;

        @Schema(name = "currency", description = "货币")
        private String currency;

        @Schema(name = "quantity", description = "持有数量")
        private BigDecimal quantity;

        @Schema(name = "avgCost", description = "平均成本价")
        private BigDecimal avgCost;

        @Schema(name = "currentPrice", description = "当前价格")
        private BigDecimal currentPrice;

        @Schema(name = "marketValue", description = "市值")
        private BigDecimal marketValue;

        @Schema(name = "costValue", description = "成本金额")
        private BigDecimal costValue;

        @Schema(name = "profitLoss", description = "盈亏")
        private BigDecimal profitLoss;

        @Schema(name = "profitLossRate", description = "盈亏比例(%)")
        private BigDecimal profitLossRate;

        @Schema(name = "positionStatus", description = "持仓状态: 1-持有中 2-已清仓 3-部分平仓")
        private Integer positionStatus;

        @Schema(name = "firstBuyDate", description = "首次买入日期")
        private String firstBuyDate;

        @Schema(name = "lastBuyDate", description = "最后买入日期")
        private String lastBuyDate;
    }
}
