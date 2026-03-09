package com.litchi.wealth.vo.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private String report;

    @Schema(description = "原始 Markdown 报告（保留完整格式，用于前端展示）")
    private String rawReport;

    @Schema(description = "新闻摘要统计信息")
    private NewsSummary newsSummary;

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
        private Integer importantNewsCount;

        @Schema(description = "大行研报数量", example = "15")
        private Integer rankNewsCount;

        @Schema(description = "公司新闻数量", example = "25")
        private Integer companyNewsCount;

        @Schema(description = "总新闻数量", example = "60")
        private Integer totalCount;
    }
}
