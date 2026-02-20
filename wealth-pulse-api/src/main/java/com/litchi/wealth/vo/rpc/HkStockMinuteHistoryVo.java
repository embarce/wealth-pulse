package com.litchi.wealth.vo.rpc;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 港股分钟级历史数据视图对象（分时图数据）
 *
 * @author Embrace
 * @date 2026-02-20
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股分钟级历史数据")
public class HkStockMinuteHistoryVo {

    @Schema(description = "交易时间")
    private LocalDateTime tradeTime;

    @Schema(description = "股票代码")
    private String stockCode;

    @Schema(description = "周期: 1/5/15/30/60 (分钟)")
    private String period;

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

    // 1分钟数据特有字段
    @Schema(description = "最新价(港元) - 仅1分钟数据有此字段")
    private BigDecimal latestPrice;

    // 其他周期字段
    @Schema(description = "涨跌幅(%) - 非1分钟数据有此字段")
    private BigDecimal changeRate;

    @Schema(description = "涨跌额(港元) - 非1分钟数据有此字段")
    private BigDecimal changeNumber;

    @Schema(description = "振幅(%) - 非1分钟数据有此字段")
    private BigDecimal amplitude;

    @Schema(description = "换手率(%) - 非1分钟数据有此字段")
    private BigDecimal turnoverRate;
}
