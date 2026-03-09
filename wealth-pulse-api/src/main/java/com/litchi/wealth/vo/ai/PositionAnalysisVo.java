package com.litchi.wealth.vo.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 持仓分析结果 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 持仓分析结果
 * @date 2026/3/1
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "持仓分析结果")
public class PositionAnalysisVo {

    /**
     * 投资组合摘要
     */
    @Schema(description = "投资组合摘要")
    private PortfolioSummary portfolioSummary;

    /**
     * 持仓评分列表
     */
    @Schema(description = "持仓评分列表")
    private List<PositionScore> positionScores;

    /**
     * 持仓建议列表
     */
    @Schema(description = "持仓建议列表")
    private List<PositionRecommendation> positionRecommendations;

    /**
     * 整体建议
     */
    @Schema(description = "整体建议")
    private OverallRecommendation overallRecommendation;

    /**
     * 市场展望
     */
    @Schema(description = "市场展望")
    private MarketOutlook marketOutlook;

    /**
     * 投资组合摘要
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "投资组合摘要")
    public static class PortfolioSummary {
        @Schema(description = "综合评分 (0-100)", example = "82")
        private Integer overallScore;

        @Schema(description = "综合评级：优秀/良好/一般/较差/极差", example = "良好")
        private String overallRating;

        @Schema(description = "风险等级：低/中/高", example = "中")
        private String riskLevel;

        @Schema(description = "分散程度：分散/一般/集中", example = "一般")
        private String diversification;

        @Schema(description = "投资风格：价值/成长/均衡/投机型", example = "成长")
        private String investmentStyle;
    }

    /**
     * 持仓评分
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "持仓评分")
    public static class PositionScore {
        @Schema(description = "股票代码", example = "0700.HK")
        private String stockCode;

        @Schema(description = "评分 (0-100)", example = "85")
        private Integer score;

        @Schema(description = "等级：A/B/C/D/E", example = "B")
        private String grade;

        @Schema(description = "持仓质量：优质/良好/一般/较差/劣质", example = "良好")
        private String holdingQuality;

        @Schema(description = "盈利前景：看涨/震荡/看跌", example = "看涨")
        private String profitProspect;

        @Schema(description = "风险提示")
        private String riskWarning;
    }

    /**
     * 持仓建议
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "持仓建议")
    public static class PositionRecommendation {
        @Schema(description = "股票代码", example = "0700.HK")
        private String stockCode;

        @Schema(description = "建议操作：持有/加仓/减仓/清仓", example = "持有")
        private String action;

        @Schema(description = "建议理由")
        private String reason;

        @Schema(description = "目标价格区间", example = "380-420")
        private String targetPriceRange;

        @Schema(description = "建议止损价", example = "320.0")
        private Double stopLossPrice;

        @Schema(description = "置信度：high/medium/low", example = "medium")
        private String confidence;
    }

    /**
     * 整体建议
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "整体建议")
    public static class OverallRecommendation {
        @Schema(description = "策略：积极持有/稳健持有/逢高减仓/择机调仓", example = "稳健持有")
        private String strategy;

        @Schema(description = "要点列表")
        private List<String> keyPoints;

        @Schema(description = "整体风险描述")
        private String riskSummary;

        @Schema(description = "建议操作列表")
        private List<String> suggestedActions;
    }

    /**
     * 市场展望
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "市场展望")
    public static class MarketOutlook {
        @Schema(description = "趋势：看涨/震荡/看跌", example = "看涨")
        private String trend;

        @Schema(description = "置信度：high/medium/low", example = "medium")
        private String confidence;

        @Schema(description = "关键因素列表")
        private List<String> keyFactors;
    }
}
