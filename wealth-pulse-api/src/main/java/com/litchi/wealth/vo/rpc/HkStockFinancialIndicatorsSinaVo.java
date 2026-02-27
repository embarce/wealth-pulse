package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 港股财务指标视图对象（新浪财经）
 *
 * @author Embrace
 * @date 2026-02-27
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股财务指标（新浪财经）")
public class HkStockFinancialIndicatorsSinaVo {

    @Schema(description = "股票代码")
    private String stockCode;

    @Schema(description = "数据来源")
    private String datasource;

    @Schema(description = "最新报告期数据")
    private LatestPeriod latestPeriod;

    @Schema(description = "盈利能力指标")
    private Profitability profitability;

    @Schema(description = "财务健康指标")
    private FinancialHealth financialHealth;

    @Schema(description = "历史数据列表")
    private List<HistoricalData> historicalData;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "最新报告期")
    public static class LatestPeriod {

        @Schema(description = "截止日期")
        private String endDate;

        @Schema(description = "报表类型（年报/中报/季报）")
        private String reportType;

        @Schema(description = "公告日期")
        private String announcementDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "盈利能力指标")
    public static class Profitability {

        @Schema(description = "营业收入（百万元）")
        private Double revenue;

        @Schema(description = "净利润（百万元）")
        private Double netProfit;

        @Schema(description = "毛利率（%）")
        private Double grossProfitMargin;

        @Schema(description = "净利率（%）")
        private Double netProfitMargin;

        @Schema(description = "基本每股盈利（仙）")
        private Double epsBasic;

        @Schema(description = "经营盈利（百万元）")
        private Double operatingProfit;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "财务健康指标")
    public static class FinancialHealth {

        @Schema(description = "流动比率")
        private Double currentRatio;

        @Schema(description = "负债率（%）")
        private Double debtRatio;

        @Schema(description = "经营现金流（百万元）")
        private Double operatingCashFlow;

        @Schema(description = "流动资产（百万元）")
        private Double currentAssets;

        @Schema(description = "流动负债（百万元）")
        private Double currentLiabilities;

        @Schema(description = "股东权益（百万元）")
        private Double totalEquity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "历史财务数据")
    public static class HistoricalData {

        @Schema(description = "期间索引")
        private Integer periodIndex;

        @Schema(description = "开始日期")
        private String startDate;

        @Schema(description = "截止日期")
        private String endDate;

        @Schema(description = "公告日期")
        private String announcementDate;

        @Schema(description = "报表类型")
        private String reportType;

        @Schema(description = "营业收入（百万元）")
        private Double revenue;

        @Schema(description = "净利润（百万元）")
        private Double netProfit;

        @Schema(description = "基本每股盈利（仙）")
        private Double epsBasic;

        @Schema(description = "摊薄每股盈利（仙）")
        private Double epsDiluted;
    }
}
