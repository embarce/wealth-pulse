package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 股票搜索结果VO
 *
 * @author Embrace
 * @date 2026-02-17
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "StockSearchResultVo", description = "股票搜索结果（包含基本信息和实时价格）")
public class StockSearchResultVo {

    @Schema(name = "stockCode", description = "股票代码")
    private String stockCode;

    @Schema(name = "companyName", description = "公司全名")
    private String companyName;

    @Schema(name = "companyNameCn", description = "公司中文名")
    private String companyNameCn;

    @Schema(name = "shortName", description = "公司简称")
    private String shortName;

    @Schema(name = "stockType", description = "股票类型: STOCK/ETF/BOND/INDEX等")
    private String stockType;

    @Schema(name = "exchange", description = "交易所: NASDAQ/NYSE/SH/SZ/HK等")
    private String exchange;

    @Schema(name = "currency", description = "交易货币: USD/HKD/CNY等")
    private String currency;

    @Schema(name = "industry", description = "行业分类")
    private String industry;

    @Schema(name = "lotSize", description = "每手股数")
    private Integer lotSize;

    // 实时行情数据
    @Schema(name = "lastPrice", description = "最新价")
    private BigDecimal lastPrice;

    @Schema(name = "changeNumber", description = "涨跌额")
    private BigDecimal changeNumber;

    @Schema(name = "changeRate", description = "涨跌幅(%)")
    private BigDecimal changeRate;

    @Schema(name = "marketCap", description = "总市值")
    private BigDecimal marketCap;

    @Schema(name = "quoteTime", description = "行情时间")
    private String quoteTime;

    @Schema(name = "marketDate", description = "交易日")
    private String marketDate;

    @Schema(name = "hasMarketData", description = "是否有实时行情数据")
    private Boolean hasMarketData;
}
