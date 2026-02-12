package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * @author Embrace
 * @version 1.0
 * @description: 手续费计算结果VO
 * @date 2026/2/12
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "FeeCalculationVo", description = "手续费计算结果")
public class FeeCalculationVo {

    @Schema(name = "instruction", description = "交易指令: BUY-买入 SELL-卖出")
    private String instruction;

    @Schema(name = "amount", description = "交易金额")
    private BigDecimal amount;

    @Schema(name = "platformFee", description = "平台费")
    private BigDecimal platformFee;

    @Schema(name = "sfcLevy", description = "证监会征费")
    private BigDecimal sfcLevy;

    @Schema(name = "exchangeTradingFee", description = "交易所交易费")
    private BigDecimal exchangeTradingFee;

    @Schema(name = "settlementFee", description = "结算费")
    private BigDecimal settlementFee;

    @Schema(name = "frcLevy", description = "FRC征费")
    private BigDecimal frcLevy;

    @Schema(name = "stampDuty", description = "印花税(仅卖出)")
    private BigDecimal stampDuty;

    @Schema(name = "totalFee", description = "总费用")
    private BigDecimal totalFee;

    @Schema(name = "netAmount", description = "实际到账/支出金额")
    private BigDecimal netAmount;

    @Schema(name = "feeBreakdown", description = "费用明细说明")
    private String feeBreakdown;
}
