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
 * @description: 股票历史数据VO
 * @date 2026/2/12
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "StockHistoryVo", description = "股票历史数据")
public class StockHistoryVo {

    @Schema(name = "stockCode", description = "股票代码")
    private String stockCode;

    @Schema(name = "tradeDate", description = "交易日期")
    private String tradeDate;

    @Schema(name = "openPrice", description = "开盘价")
    private BigDecimal openPrice;

    @Schema(name = "highPrice", description = "最高价")
    private BigDecimal highPrice;

    @Schema(name = "lowPrice", description = "最低价")
    private BigDecimal lowPrice;

    @Schema(name = "closePrice", description = "收盘价")
    private BigDecimal closePrice;

    @Schema(name = "adjClose", description = "复权收盘价")
    private BigDecimal adjClose;

    @Schema(name = "volume", description = "成交量")
    private Long volume;
}
