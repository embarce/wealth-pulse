package com.litchi.wealth.vo.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 检测到的交易记录 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: 券商截图识别结果中的交易记录
 * @date 2026/3/10
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "检测到的交易记录")
public class DetectedTradeVo {

    @Schema(description = "股票代码", example = "03900.HK")
    private String stockCode;

    @Schema(description = "买卖方向", example = "BUY")
    private String instruction;

    @Schema(description = "成交价", example = "150.50")
    private BigDecimal price;

    @Schema(description = "成交数量", example = "1000")
    private Integer quantity;

    @Schema(description = "交易时间", example = "2026-03-10 14:30:00")
    private String timestamp;

    @Schema(description = "置信度 (0-1)", example = "0.95")
    private Double confidence;
}
