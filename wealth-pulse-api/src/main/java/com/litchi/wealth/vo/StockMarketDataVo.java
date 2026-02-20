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
 * @description: 股票实时行情数据VO
 * @date 2026/2/12
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "StockMarketDataVo", description = "股票实时行情数据")
public class StockMarketDataVo {

    @Schema(name = "stockCode", description = "股票代码")
    private String stockCode;

    @Schema(name = "companyName", description = "公司名称")
    private String companyName;

    @Schema(name = "companyNameCn", description = "公司中文名")
    private String companyNameCn;

    @Schema(name = "lastPrice", description = "最新价")
    private BigDecimal lastPrice;

    @Schema(name = "changeNumber", description = "涨跌额")
    private BigDecimal changeNumber;

    @Schema(name = "changeRate", description = "涨跌幅(%)")
    private BigDecimal changeRate;

    @Schema(name = "openPrice", description = "开盘价")
    private BigDecimal openPrice;

    @Schema(name = "preClose", description = "前收盘价")
    private BigDecimal preClose;

    @Schema(name = "highPrice", description = "当日最高价")
    private BigDecimal highPrice;

    @Schema(name = "lowPrice", description = "当日最低价")
    private BigDecimal lowPrice;

    @Schema(name = "volume", description = "成交量(股)")
    private Long volume;

    @Schema(name = "turnover", description = "成交额")
    private BigDecimal turnover;

    @Schema(name = "week52High", description = "52周最高")
    private BigDecimal week52High;

    @Schema(name = "week52Low", description = "52周最低")
    private BigDecimal week52Low;

    @Schema(name = "marketCap", description = "总市值")
    private String marketCap;

    @Schema(name = "peRatio", description = "市盈率")
    private BigDecimal peRatio;

    @Schema(name = "pbRatio", description = "市净率")
    private BigDecimal pbRatio;

    @Schema(name = "quoteTime", description = "行情时间")
    private String quoteTime;

    @Schema(name = "marketDate", description = "交易日")
    private String marketDate;

    @Schema(name = "currency", description = "交易货币")
    private String currency;
}
