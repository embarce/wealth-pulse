package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 港股增强财务指标视图对象
 *
 * @author Embrace
 * @date 2026-03-07
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股增强财务指标")
public class HkStockFinancialIndicatorEmVo {

    @Schema(description = "股票代码")
    private String stockCode;

    @Schema(description = "数据来源")
    private String datasource;

    @Schema(description = "最新报告期")
    private LatestPeriod latestPeriod;

    @Schema(description = "核心指标")
    private CoreIndicators coreIndicators;

    @Schema(description = "资产负债表指标")
    private BalanceSheet balanceSheet;

    @Schema(description = "现金流量表指标")
    private CashFlow cashFlow;

    @Schema(description = "营运能力指标")
    private OperatingCapability operatingCapability;

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
    @Schema(description = "核心指标")
    public static class CoreIndicators {
        @Schema(description = "基本每股收益 (元)")
        private Double epsBasic;

        @Schema(description = "稀释每股收益 (元)")
        private Double epsDiluted;

        @Schema(description = "每股净资产 (元)")
        private Double netAssetsPerShare;

        @Schema(description = "每股经营现金流 (元)")
        private Double operatingCashFlowPerShare;

        @Schema(description = "每股未分配利润 (元)")
        private Double retainedEarningsPerShare;

        @Schema(description = "每股资本公积 (元)")
        private Double capitalReservePerShare;

        @Schema(description = "股息率 TTM(%)")
        private Double dividendYieldTtm;

        @Schema(description = "股息支付率 (%)")
        private Double payoutRatio;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "资产负债表指标")
    public static class BalanceSheet {
        @Schema(description = "总资产 (百万元)")
        private Double totalAssets;

        @Schema(description = "流动资产合计 (百万元)")
        private Double totalCurrentAssets;

        @Schema(description = "货币资金 (百万元)")
        private Double cashAndEquivalents;

        @Schema(description = "应收账款 (百万元)")
        private Double accountsReceivable;

        @Schema(description = "存货 (百万元)")
        private Double inventory;

        @Schema(description = "非流动资产合计 (百万元)")
        private Double totalNonCurrentAssets;

        @Schema(description = "固定资产 (百万元)")
        private Double fixedAssets;

        @Schema(description = "无形资产 (百万元)")
        private Double intangibleAssets;

        @Schema(description = "商誉 (百万元)")
        private Double goodwill;

        @Schema(description = "总负债 (百万元)")
        private Double totalLiabilities;

        @Schema(description = "流动负债合计 (百万元)")
        private Double totalCurrentLiabilities;

        @Schema(description = "短期借款 (百万元)")
        private Double shortTermDebt;

        @Schema(description = "应付账款 (百万元)")
        private Double accountsPayable;

        @Schema(description = "非流动负债合计 (百万元)")
        private Double totalNonCurrentLiabilities;

        @Schema(description = "长期借款 (百万元)")
        private Double longTermDebt;

        @Schema(description = "股东权益合计 (百万元)")
        private Double totalEquity;

        @Schema(description = "归属于母公司股东权益 (百万元)")
        private Double equityAttributableToParent;

        @Schema(description = "未分配利润 (百万元)")
        private Double retainedEarnings;

        @Schema(description = "资本公积 (百万元)")
        private Double capitalReserve;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "现金流量表指标")
    public static class CashFlow {
        @Schema(description = "经营活动产生的现金流量净额 (百万元)")
        private Double netCashFromOperatingActivities;

        @Schema(description = "销售商品、提供劳务收到的现金 (百万元)")
        private Double cashFromSales;

        @Schema(description = "经营活动现金流入小计 (百万元)")
        private Double totalCashInflowFromOperating;

        @Schema(description = "经营活动现金流出小计 (百万元)")
        private Double totalCashOutflowFromOperating;

        @Schema(description = "投资活动产生的现金流量净额 (百万元)")
        private Double netCashFromInvestingActivities;

        @Schema(description = "购建固定资产、无形资产支付的现金 (百万元)")
        private Double cashPaidForFixedAssets;

        @Schema(description = "投资支付的现金 (百万元)")
        private Double cashPaidForInvestment;

        @Schema(description = "投资活动现金流入小计 (百万元)")
        private Double totalCashInflowFromInvesting;

        @Schema(description = "投资活动现金流出小计 (百万元)")
        private Double totalCashOutflowFromInvesting;

        @Schema(description = "筹资活动产生的现金流量净额 (百万元)")
        private Double netCashFromFinancingActivities;

        @Schema(description = "吸收投资收到的现金 (百万元)")
        private Double cashFromCapitalIncrease;

        @Schema(description = "取得借款收到的现金 (百万元)")
        private Double cashFromBorrowings;

        @Schema(description = "分配股利、利润支付的现金 (百万元)")
        private Double cashPaidForDividends;

        @Schema(description = "筹资活动现金流入小计 (百万元)")
        private Double totalCashInflowFromFinancing;

        @Schema(description = "筹资活动现金流出小计 (百万元)")
        private Double totalCashOutflowFromFinancing;

        @Schema(description = "现金及现金等价物净增加额 (百万元)")
        private Double netIncreaseInCash;

        @Schema(description = "期末现金及现金等价物余额 (百万元)")
        private Double endingCashBalance;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "营运能力指标")
    public static class OperatingCapability {
        @Schema(description = "应收账款周转率 (次)")
        private Double accountsReceivableTurnover;

        @Schema(description = "应收账款周转天数 (天)")
        private Double accountsReceivableTurnoverDays;

        @Schema(description = "存货周转率 (次)")
        private Double inventoryTurnover;

        @Schema(description = "存货周转天数 (天)")
        private Double inventoryTurnoverDays;

        @Schema(description = "流动资产周转率 (次)")
        private Double currentAssetsTurnover;

        @Schema(description = "总资产周转率 (次)")
        private Double totalAssetsTurnover;

        @Schema(description = "固定资产周转率 (次)")
        private Double fixedAssetsTurnover;

        @Schema(description = "应付账款周转率 (次)")
        private Double accountsPayableTurnover;
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

        @Schema(description = "营业收入 (百万元)")
        private Double revenue;

        @Schema(description = "净利润 (百万元)")
        private Double netProfit;

        @Schema(description = "基本每股收益 (元)")
        private Double epsBasic;

        @Schema(description = "稀释每股收益 (元)")
        private Double epsDiluted;

        @Schema(description = "经营活动现金流净额 (百万元)")
        private Double operatingCashFlow;

        @Schema(description = "总资产 (百万元)")
        private Double totalAssets;

        @Schema(description = "总负债 (百万元)")
        private Double totalLiabilities;

        @Schema(description = "股东权益 (百万元)")
        private Double totalEquity;

        @Schema(description = "毛利率 (%)")
        private Double grossMargin;

        @Schema(description = "净利率 (%)")
        private Double netMargin;

        @Schema(description = "ROE(%)")
        private Double roe;

        @Schema(description = "ROA(%)")
        private Double roa;
    }
}
