package com.litchi.wealth.dto.capital;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * @author Embrace
 * @version 1.0
 * @description: 本金操作请求DTO
 * @date 2026/2/6 23:30
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "CapitalOperationRequest", description = "本金操作请求")
public class CapitalOperationRequest {

    @Schema(name = "amount", description = "操作金额（正数）", requiredMode = Schema.RequiredMode.REQUIRED, example = "10000.00")
    @NotNull(message = "操作金额不能为空")
    @Positive(message = "操作金额必须为正数")
    private BigDecimal amount;

    @Schema(name = "currency", description = "货币代码（默认HKD）", example = "HKD")
    private String currency;

    @Schema(name = "remark", description = "备注", example = "银行转账入金")
    private String remark;
}
