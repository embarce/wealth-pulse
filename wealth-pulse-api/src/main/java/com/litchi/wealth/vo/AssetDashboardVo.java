package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 资产总览 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: 用户资产总览信息
 * @date 2026/2/12
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "AssetDashboardVo", description = "资产总览")
public class AssetDashboardVo {

    @Schema(name = "totalAssets", description = "总资产")
    private BigDecimal totalAssets;

    @Schema(name = "cumulativeProfitLoss", description = "累计盈亏")
    private BigDecimal cumulativeProfitLoss;

    @Schema(name = "cumulativeProfitLossRate", description = "累计盈亏比例(%)")
    private BigDecimal cumulativeProfitLossRate;

    @Schema(name = "availableCash", description = "可用现金（可提现）")
    private BigDecimal availableCash;

    @Schema(name = "purchasingPower", description = "购买力（可用于交易）")
    private BigDecimal purchasingPower;

    @Schema(name = "positionValue", description = "持仓市值")
    private BigDecimal positionValue;

    @Schema(name = "totalPrincipal", description = "总本金")
    private BigDecimal totalPrincipal;

    @Schema(name = "todayProfitLoss", description = "今日盈亏")
    private BigDecimal todayProfitLoss;

    @Schema(name = "todayProfitLossRate", description = "今日盈亏比例(%)")
    private BigDecimal todayProfitLossRate;

    @Schema(name = "yesterdayTotalAssets", description = "昨日总资产")
    private BigDecimal yesterdayTotalAssets;

    @Schema(name = "totalCashflow", description = "累计流水")
    private BigDecimal totalCashflow;

    @Schema(name = "totalBuyCount", description = "累计买入次数")
    private Long totalBuyCount;

    @Schema(name = "totalSellCount", description = "累计卖出次数")
    private Long totalSellCount;
}
