package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 港股新闻汇总结果 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: 新浪港股新闻爬取完整结果
 * @date 2026/3/8
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股新闻汇总结果")
public class HkStockAllNewsVo {

    @Schema(description = "要闻列表")
    private List<HkStockImportantNewsVo> importantNews;

    @Schema(description = "大行研报列表")
    private List<HkStockNewsVo> rankNews;

    @Schema(description = "公司新闻列表")
    private List<HkStockNewsVo> companyNews;

    @Schema(description = "汇总统计信息")
    private NewsSummary summary;

    @Schema(description = "警告信息列表")
    private List<String> warnings;

    /**
     * 新闻汇总统计
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "新闻汇总统计")
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
