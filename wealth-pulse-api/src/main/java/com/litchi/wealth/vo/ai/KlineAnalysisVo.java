package com.litchi.wealth.vo.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * K线分析结果VO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI K线分析结果
 * @date 2026/2/24
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "K线分析结果")
public class KlineAnalysisVo {

    @Schema(description = "股票代码", example = "03900.HK")
    private String stockCode;

    @Schema(description = "当前价格")
    private String currentPrice;

    @Schema(description = "趋势判断: uptrend=上涨趋势, downtrend=下跌趋势, sideways=横盘整理")
    private String trend;

    @Schema(description = "趋势说明")
    private String trendDescription;

    @Schema(description = "技术点位列表")
    private List<TechnicalPointVo> technicalPoints;

    @Schema(description = "综合建议: strong_buy=强烈买入, buy=买入, hold=持有, sell=卖出, strong_sell=强烈卖出")
    private String recommendation;

    @Schema(description = "建议说明")
    private String recommendationReason;

    @Schema(description = "风险等级: low=低, medium=中, high=高")
    private String riskLevel;

    @Schema(description = "目标价格区间")
    private String targetPriceRange;

    @Schema(description = "分析说明")
    private String analysisNote;
}
