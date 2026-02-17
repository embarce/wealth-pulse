package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 持仓快照视图对象
 *
 * @author Embrace
 * @date 2026-02-17
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PositionSnapshotVo {

    @Schema(name = "id", description = "快照ID")
    private Long id;

    @Schema(name = "stockCode", description = "股票代码")
    private String stockCode;

    @Schema(name = "stockName", description = "股票名称")
    private String stockName;

    @Schema(name = "snapshotDate", description = "快照日期")
    private LocalDate snapshotDate;

    @Schema(name = "quantity", description = "持有数量")
    private BigDecimal quantity;

    @Schema(name = "avgCost", description = "平均成本价")
    private BigDecimal avgCost;

    @Schema(name = "currentPrice", description = "快照时股价")
    private BigDecimal currentPrice;

    @Schema(name = "marketValue", description = "市值")
    private BigDecimal marketValue;

    @Schema(name = "marketValueDisplay", description = "市值显示格式")
    private String marketValueDisplay;

    @Schema(name = "costValue", description = "成本市值")
    private BigDecimal costValue;

    @Schema(name = "profitLoss", description = "盈亏金额")
    private BigDecimal profitLoss;

    @Schema(name = "profitLossDisplay", description = "盈亏显示格式(含±号)")
    private String profitLossDisplay;

    @Schema(name = "profitLossRate", description = "盈亏比例(%)")
    private BigDecimal profitLossRate;

    @Schema(name = "profitLossRateDisplay", description = "盈亏比例显示格式(含±号)")
    private String profitLossRateDisplay;

    @Schema(name = "isProfit", description = "是否盈利")
    private Boolean isProfit;

    @Schema(name = "currency", description = "币种")
    private String currency;
}
