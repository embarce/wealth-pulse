package com.litchi.wealth.vo.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 贸易评分响应 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 贸易评分分析结果
 * @date 2026/3/10
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "贸易评分响应")
public class TradeScoreVo {

    @Schema(description = "评分 (0-100)", example = "85")
    private Integer score;

    @Schema(description = "评分理由", example = "在支撑位附近建仓，时机把握较好")
    private String rationale;

    @Schema(description = "评级", example = "good")
    private String level;
}
