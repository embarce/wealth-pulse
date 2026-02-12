package com.litchi.wealth.dto.trade;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * @author Embrace
 * @version 1.0
 * @description: 手续费计算请求DTO
 * @date 2026/2/12
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "FeeCalculationRequest", description = "手续费计算请求")
public class FeeCalculationRequest {

    @Schema(name = "instruction", description = "交易指令: BUY-买入 SELL-卖出", requiredMode = Schema.RequiredMode.REQUIRED, example = "BUY")
    @NotBlank(message = "交易指令不能为空")
    private String instruction;

    @Schema(name = "amount", description = "交易金额", requiredMode = Schema.RequiredMode.REQUIRED, example = "10000")
    @NotNull(message = "交易金额不能为空")
    @Positive(message = "交易金额必须为正数")
    private BigDecimal amount;

    @Schema(name = "currency", description = "货币代码（默认HKD）", example = "HKD")
    private String currency;
}
