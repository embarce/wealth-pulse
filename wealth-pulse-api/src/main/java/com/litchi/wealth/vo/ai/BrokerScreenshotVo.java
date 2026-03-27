package com.litchi.wealth.vo.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 券商截图识别响应 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 券商截图识别结果
 * @date 2026/3/10
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "券商截图识别响应")
public class BrokerScreenshotVo {

    @Schema(description = "检测到的交易列表")
    private List<DetectedTradeVo> trades;

    @Schema(description = "分析说明")
    private String note;
}
