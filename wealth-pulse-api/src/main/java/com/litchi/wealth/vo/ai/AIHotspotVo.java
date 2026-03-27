package com.litchi.wealth.vo.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 热点 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 识别的市场热点
 * @date 2026/3/10
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "AI 热点")
public class AIHotspotVo {

    @Schema(description = "热点主题", example = "人工智能概念爆发")
    private String topic;

    @Schema(description = "热点描述", example = "多只 AI 概念股今日大涨...")
    private String description;

    @Schema(description = "热度等级 (1-5)", example = "4")
    private Integer heatLevel;
}
