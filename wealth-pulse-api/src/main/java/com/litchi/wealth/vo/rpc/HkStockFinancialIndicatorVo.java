package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 港股财务指标视图对象
 *
 * @author Embrace
 * @date 2026-02-20
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股财务指标")
public class HkStockFinancialIndicatorVo {

    @Schema(description = "证券代码")
    private String stockCode;

    @Schema(description = "基本每股收益(元)")
    private String basicEps;

    @Schema(description = "每股净资产(元)")
    private String netAssetsPerShare;

    @Schema(description = "法定股本(股)")
    private String legalCapital;

    @Schema(description = "每手股")
    private String lotSize;

    @Schema(description = "每股股息TTM(港元)")
    private String dividendPerShareTtm;

    @Schema(description = "派息比率(%)")
    private String payoutRatio;

    @Schema(description = "已发行股本(股)")
    private String issuedCapital;

    @Schema(description = "已发行股本-H股(股)")
    private Long issuedCapitalHShares;

    @Schema(description = "每股经营现金流(元)")
    private String operatingCashFlowPerShare;

    @Schema(description = "股息率TTM(%)")
    private String dividendYieldTtm;

    @Schema(description = "总市值(港元)")
    private String totalMarketCapHkd;

    @Schema(description = "港股市值(港元)")
    private String hkMarketCapHkd;

    @Schema(description = "营业总收入")
    private String totalOperatingRevenue;

    @Schema(description = "营业总收入滚动环比增长(%)")
    private String operatingRevenueGrowthYoy;

    @Schema(description = "销售净利率(%)")
    private String netProfitMargin;

    @Schema(description = "净利润")
    private String netProfit;

    @Schema(description = "净利润滚动环比增长(%)")
    private String netProfitGrowthYoy;

    @Schema(description = "股东权益回报率(%)")
    private String roe;

    @Schema(description = "市盈率")
    private String peRatio;

    @Schema(description = "市净率")
    private String pbRatio;

    @Schema(description = "总资产回报率(%)")
    private String roa;
}
