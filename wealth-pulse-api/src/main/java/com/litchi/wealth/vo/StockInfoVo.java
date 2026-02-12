package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author Embrace
 * @version 1.0
 * @description: 股票基本信息VO
 * @date 2026/2/12
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "StockInfoVo", description = "股票基本信息")
public class StockInfoVo {

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

    @Schema(name = "marketCap", description = "市值")
    private String marketCap;

    @Schema(name = "stockStatus", description = "状态: 1-正常交易 2-停牌 0-退市")
    private Integer stockStatus;
}
