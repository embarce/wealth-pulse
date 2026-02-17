package com.litchi.wealth.dto.trade;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
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
 * @description: 股票交易请求DTO
 * @date 2026/2/6 23:45
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "StockTradeRequest", description = "股票交易请求")
public class StockTradeRequest {

    @Schema(name = "stockCode", description = "股票代码", requiredMode = Schema.RequiredMode.REQUIRED, example = "NVDA.US")
    @NotBlank(message = "股票代码不能为空")
    private String stockCode;

    @Schema(name = "quantity", description = "交易数量（正数）", requiredMode = Schema.RequiredMode.REQUIRED, example = "100")
    @NotNull(message = "交易数量不能为空")
    @Positive(message = "交易数量必须为正数")
    private BigDecimal quantity;

    @Schema(name = "price", description = "交易单价", requiredMode = Schema.RequiredMode.REQUIRED, example = "150.25")
    @NotNull(message = "交易单价不能为空")
    @Positive(message = "交易单价必须为正数")
    private BigDecimal price;

    @Schema(name = "currency", description = "货币代码（默认HKD）", example = "HKD")
    private String currency;

    @Schema(name = "remark", description = "备注", example = "看好长期增长")
    private String remark;

    @Schema(name = "manualCommission", description = "手动输入佣金（可选，用于纠错）", example = "5.00")
    private BigDecimal manualCommission;
}
