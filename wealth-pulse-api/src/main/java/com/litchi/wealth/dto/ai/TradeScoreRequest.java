package com.litchi.wealth.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 贸易评分请求 DTO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI 贸易评分请求参数
 * @date 2026/3/10
 */
@Data
@Schema(description = "贸易评分请求")
public class TradeScoreRequest {

    @NotBlank(message = "股票代码不能为空")
    @Schema(description = "股票代码", example = "03900.HK", required = true)
    private String stockCode;

    @NotBlank(message = "交易日期不能为空")
    @Schema(description = "交易日期", example = "2026-03-10", required = true)
    private String transactionDate;

    @NotNull(message = "买卖方向不能为空")
    @Schema(description = "买卖方向", example = "BUY", required = true)
    private String instruction;

    @NotNull(message = "成交价不能为空")
    @Positive(message = "成交价必须大于 0")
    @Schema(description = "成交价", example = "150.5", required = true)
    private BigDecimal price;

    @NotNull(message = "成交数量不能为空")
    @Positive(message = "成交数量必须大于 0")
    @Schema(description = "成交数量", example = "1000", required = true)
    private Integer quantity;

    @Schema(description = "上下文信息（可选）", example = "Current: 155.0, Hist: [148, 149, 150]")
    private String context;

    @Schema(description = "LLM 供应商", example = "doubao")
    private String provider;

    @Schema(description = "模型名称", example = "ep-xxx")
    private String model;
}
