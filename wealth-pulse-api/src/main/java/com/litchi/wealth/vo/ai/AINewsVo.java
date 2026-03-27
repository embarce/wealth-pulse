package com.litchi.wealth.vo.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 新闻摘要 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 生成的新闻摘要
 * @date 2026/3/10
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "AI 新闻摘要")
public class AINewsVo {

    @Schema(description = "新闻标题", example = "美联储加息预期升温")
    private String title;

    @Schema(description = "新闻摘要", example = "多位美联储官员表示...")
    private String summary;

    @Schema(description = "影响方向", example = "positive")
    private String impact;

    @Schema(description = "新闻来源", example = "新浪财经")
    private String source;

    @Schema(description = "发布时间", example = "2026-03-10 14:30:00")
    private String timestamp;
}
