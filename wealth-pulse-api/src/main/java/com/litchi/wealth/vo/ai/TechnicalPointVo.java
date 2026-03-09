package com.litchi.wealth.vo.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 技术点位 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 分析的关键技术点位
 * @date 2026/2/24
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "技术点位")
public class TechnicalPointVo {

    @Schema(description = "点位类型：support=支撑位，resistance=压力位，stop_loss=止损位，take_profit=止盈位")
    private String type;

    @Schema(description = "价格", example = "150.5")
    private String price;

    @Schema(description = "强度（1-5，5 为最强）", example = "4")
    private Integer strength;

    @Schema(description = "说明", example = "近 30 日低点，多次触及未破")
    private String description;
}
