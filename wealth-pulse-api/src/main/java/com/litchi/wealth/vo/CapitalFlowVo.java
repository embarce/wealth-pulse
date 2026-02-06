package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Date;

/**
 * @author Embrace
 * @version 1.0
 * @description: 本金流水VO
 * @date 2026/2/6 23:00
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CapitalFlowVo {
    @Schema(name = "id", description = "记录ID")
    private String id;

    @Schema(name = "operationType", description = "操作类型: DEPOSIT-资金注入 WITHDRAW-本金提取")
    private String operationType;

    @Schema(name = "operationLabel", description = "操作标签(显示用，如: 资金注入、本金提取)")
    private String operationLabel;

    @Schema(name = "amount", description = "操作金额(正数表示注入，负数表示提取)")
    private BigDecimal amount;

    @Schema(name = "amountDisplay", description = "金额显示格式(如: +￥50,000)")
    private String amountDisplay;

    @Schema(name = "currency", description = "货币代码")
    private String currency;

    @Schema(name = "operationDate", description = "操作日期(如: 2026-01-30)")
    private Date operationDate;

    @Schema(name = "operationTime", description = "操作时间(精确到秒)")
    private Date operationTime;

    @Schema(name = "createdAt", description = "创建时间")
    private Date createdAt;
}
