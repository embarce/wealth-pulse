package com.litchi.wealth.vo.ai;

import cn.hutool.core.annotation.Alias;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 港股市场分析结果 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 港股市场分析结果（投资建议报告）
 * @date 2026/3/8
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股市场分析结果")
public class HkStockMarketAnalysisVo {

    @Schema(description = "Markdown 格式的投资建议报告（已处理换行符）")
    @Alias("investment_report")
    private String investmentReport;

    @Schema(description = "原始 Markdown 报告（保留完整格式，用于前端展示）")
    private String rawReport;

    @Schema(description = "市场快照数据")
    @Alias("market_snapshot")
    private MarketSnapshot marketSnapshot;

    @Schema(description = "LLM 压缩后的新闻摘要")
    @Alias("compressed_news")
    private String compressedNews;

    @Schema(description = "新闻摘要统计信息")
    @Alias("news_summary")
    private NewsSummary newsSummary;

    @Schema(description = "LLM 调用信息")
    @Alias("_llm")
    private LlmInfo llmInfo;

    /**
     * 市场快照数据
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "市场快照数据")
    public static class MarketSnapshot {
        @Schema(description = "指数表现")
        @Alias("index_performance")
        private IndexPerformance indexPerformance;

        @Schema(description = "外部情绪")
        @Alias("external_sentiment")
        private ExternalSentiment externalSentiment;

        @Schema(description = "货币流动性")
        @Alias("currency_liquidity")
        private CurrencyLiquidityInfo currencyLiquidity;

        @Schema(description = "市场宽度")
        @Alias("market_breadth")
        private MarketBreadth marketBreadth;
    }

    /**
     * 货币流动性信息（包含多个子字段）
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "货币流动性信息")
    public static class CurrencyLiquidityInfo {
        @Schema(description = "美元/人民币汇率数据")
        @Alias("usd_cny")
        private CurrencyLiquidity usdCny;

        @Schema(description = "沪深港通资金流向汇总")
        @Alias("fund_flow_summary")
        private FundFlowSummary fundFlowSummary;

        @Schema(description = "北向资金汇总")
        @Alias("northbound_summary")
        private List<NorthboundItem> northboundSummary;
    }

    /**
     * 资金流向汇总
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "资金流向汇总")
    public static class FundFlowSummary {
        @Schema(description = "格式化文本")
        private String formattedText;

        @Schema(description = "数据日期")
        private String date;
    }

    /**
     * 北向资金项
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "北向资金项")
    public static class NorthboundItem {
        @Schema(description = "通道名称")
        private String channel;

        @Schema(description = "板块名称")
        private String board;

        @Schema(description = "成交净买额（亿元）")
        @Alias("net_buy")
        private Double netBuy;

        @Schema(description = "资金净流入（亿元）")
        @Alias("net_inflow")
        private Double netInflow;

        @Schema(description = "上涨家数")
        @Alias("up_count")
        private Integer upCount;

        @Schema(description = "下跌家数")
        @Alias("down_count")
        private Integer downCount;

        @Schema(description = "相关指数")
        private String index;

        @Schema(description = "指数涨跌幅")
        @Alias("index_change")
        private Double indexChange;
    }

    /**
     * 指数表现（单个指数）
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "指数表现")
    public static class IndexPerformance {
        @Schema(description = "指数名称", example = "恒生指数")
        @Alias("index_name")
        private String indexName;

        @Schema(description = "指数代码", example = "HSI")
        @Alias("index_code")
        private String indexCode;

        @Schema(description = "最新价")
        @Alias("latest_price")
        private Double latestPrice;

        @Schema(description = "涨跌幅 (%)")
        @Alias("change_rate")
        private Double changeRate;

        @Schema(description = "成交额")
        @Alias("turnover")
        private Double turnover;

        @Schema(description = "报价时间")
        @Alias("quote_time")
        private String quoteTime;
    }

    /**
     * 外部情绪
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "外部情绪")
    public static class ExternalSentiment {
        @Schema(description = "指数名称", example = "纳斯达克中国金龙指数")
        @Alias("index_name")
        private String indexName;

        @Schema(description = "最新价")
        @Alias("latest_price")
        private Double latestPrice;

        @Schema(description = "涨跌幅 (%)")
        @Alias("change_rate")
        private Double changeRate;

        @Schema(description = "备注说明")
        @Alias("note")
        private String note;
    }

    /**
     * 货币流动性
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "货币流动性")
    public static class CurrencyLiquidity {
        @Schema(description = "货币符号", example = "CNHUSD")
        private String symbol;

        @Schema(description = "货币名称", example = "离岸人民币兑美元")
        private String name;

        @Schema(description = "最新价")
        @Alias("last_price")
        private Double lastPrice;

        @Schema(description = "涨跌额")
        private Double change;

        @Schema(description = "涨跌幅 (%)")
        @Alias("change_rate")
        private Double changeRate;

        @Schema(description = "开盘价")
        private Double open;

        @Schema(description = "前收盘价")
        @Alias("pre_close")
        private Double preClose;

        @Schema(description = "当日最高价")
        private Double high;

        @Schema(description = "当日最低价")
        private Double low;

        @Schema(description = "备注说明")
        private String note;
    }

    /**
     * 市场宽度
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "市场宽度")
    public static class MarketBreadth {
        @Schema(description = "上涨家数", example = "850")
        @Alias("advancing_stocks")
        private Integer advancingStocks;

        @Schema(description = "下跌家数", example = "320")
        @Alias("declining_stocks")
        private Integer decliningStocks;

        @Schema(description = "平盘家数", example = "50")
        @Alias("unchanged_stocks")
        private Integer unchangedStocks;

        @Schema(description = "总股票数", example = "1220")
        @Alias("total_stocks")
        private Integer totalStocks;

        @Schema(description = "上涨/下跌比率", example = "2.66")
        @Alias("advance_decline_ratio")
        private Double advanceDeclineRatio;

        @Schema(description = "今日热门股票")
        @Alias("hot_stocks")
        private HotStocks hotStocks;
    }

    /**
     * 今日热门股票
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "今日热门股票")
    public static class HotStocks {
        @Schema(description = "格式化文本")
        @Alias("formatted_text")
        private String formattedText;

        @Schema(description = "热门股票列表")
        private List<HotStockItem> stocks;

        @Schema(description = "股票数量")
        private Integer count;

        @Schema(description = "行情时间")
        @Alias("hq_time")
        private String hqTime;

        @Schema(description = "市场状态")
        @Alias("hq_status")
        private String hqStatus;

        @Schema(description = "数据来源")
        @Alias("data_source")
        private String dataSource;
    }

    /**
     * 热门股票项
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "热门股票项")
    public static class HotStockItem {
        @Schema(description = "股票代码", example = "001810")
        private String symbol;

        @Schema(description = "股票名称", example = "小米集团－W")
        private String name;

        @Schema(description = "英文名称", example = "XIAOMI-W")
        private String engname;

        @Schema(description = "最新价")
        @Alias("lasttrade")
        private Double lasttrade;

        @Schema(description = "昨收价")
        @Alias("prevclose")
        private Double prevclose;

        @Schema(description = "开盘价")
        private Double open;

        @Schema(description = "最高价")
        private Double high;

        @Schema(description = "最低价")
        private Double low;

        @Schema(description = "成交量")
        private Long volume;

        @Schema(description = "成交额")
        private Double amount;

        @Schema(description = "涨跌额")
        @Alias("price_change")
        private Double priceChange;

        @Schema(description = "涨跌幅 (%)")
        @Alias("change_percent")
        private Double changePercent;

        @Schema(description = "52 周最高价")
        @Alias("high_52week")
        private Double high52week;

        @Schema(description = "52 周最低价")
        @Alias("low_52week")
        private Double low52week;

        @Schema(description = "买入价")
        private Double buy;

        @Schema(description = "卖出价")
        private Double sell;

        @Schema(description = "报价时间")
        private String ticktime;
    }

    /**
     * 新闻摘要统计
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "新闻摘要统计")
    public static class NewsSummary {
        @Schema(description = "要闻数量", example = "20")
        @Alias("important_news_count")
        private Integer importantNewsCount;

        @Schema(description = "大行研报数量", example = "15")
        @Alias("rank_news_count")
        private Integer rankNewsCount;

        @Schema(description = "公司新闻数量", example = "25")
        @Alias("company_news_count")
        private Integer companyNewsCount;

        @Schema(description = "总新闻数量", example = "60")
        @Alias("total_count")
        private Integer totalCount;
    }

    /**
     * LLM 调用信息
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "LLM 调用信息")
    public static class LlmInfo {
        @Schema(description = "LLM 供应商", example = "openai")
        private String provider;

        @Schema(description = "使用的模型", example = "gpt-4o-mini")
        private String model;

        @Schema(description = "Token 使用情况")
        private TokenUsage tokenUsage;
    }

    /**
     * Token 使用情况
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Token 使用情况")
    public static class TokenUsage {
        @Schema(description = "输入 token 数", example = "15000")
        private Integer promptTokens;

        @Schema(description = "输出 token 数", example = "2500")
        private Integer completionTokens;

        @Schema(description = "总 token 数", example = "17500")
        private Integer totalTokens;
    }
}
