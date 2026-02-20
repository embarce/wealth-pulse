package com.litchi.wealth.vo.rpc;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 港股增强历史数据视图对象（K线图数据）
 *
 * @author Embrace
 * @date 2026-02-20
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股增强历史数据")
public class HkStockEnhancedHistoryVo {

    @Schema(description = "股票代码")
    private String stockCode;

    @Schema(description = "周期类型: daily/weekly/monthly")
    private String period;

    @Schema(description = "交易日期")
    private LocalDate tradeDate;

    @Schema(description = "开盘价(港元)")
    private BigDecimal openPrice;

    @Schema(description = "收盘价(港元)")
    private BigDecimal closePrice;

    @Schema(description = "最高价(港元)")
    private BigDecimal highPrice;

    @Schema(description = "最低价(港元)")
    private BigDecimal lowPrice;

    @Schema(description = "成交量(股)")
    private Long volume;

    @Schema(description = "成交额(港元)")
    private BigDecimal turnover;

    @Schema(description = "振幅(%)")
    private BigDecimal amplitude;

    @Schema(description = "涨跌幅(%)")
    private BigDecimal changeRate;

    @Schema(description = "涨跌额(港元)")
    private BigDecimal changeNumber;

    @Schema(description = "换手率(%)")
    private BigDecimal turnoverRate;
}
