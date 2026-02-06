package com.litchi.wealth.vo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
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
 * @description: TradeRecordVo
 * @date 2026/2/6 23:00
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeRecordVo {
    @Schema(name = "id", description = "交易ID")
    private String id;

    @Schema(name = "stockCode", description = "股票代码(如: NVDA)")
    private String stockCode;

    @Schema(name = "companyName", description = "公司全名")
    private String companyName;

    @Schema(name = "shortName", description = "公司简称")
    private String shortName;

    @Schema(name = "instruction", description = "交易指令: BUY-买入 SELL-卖出")
    private String instruction;

    @Schema(name = "executionDate", description = "执行日期(如: 2026-02-05)")
    private Date executionDate;

    @Schema(name = "executionTime", description = "执行时间(如: 21:12:42)")
    private Date executionTime;

    @Schema(name = "executionDatetime", description = "完整执行时间(日期+时间)")
    private Date executionDatetime;

    @Schema(name = "price", description = "交易单价")
    private BigDecimal price;

    @Schema(name = "quantity", description = "交易数量")
    private BigDecimal quantity;

    @Schema(name = "totalAmount", description = "成交总额(price * quantity)")
    private BigDecimal totalAmount;

    @Schema(name = "totalAmountDisplay", description = "总额显示格式(如: ¥4,376)")
    private String totalAmountDisplay;

    @Schema(name = "currency", description = "交易货币")
    private String currency;

    @Schema(name = "isSettled", description = "是否已结算")
    private Boolean isSettled;

    @Schema(name = "commission", description = "佣金")
    private BigDecimal commission;

    @Schema(name = "tax", description = "税费")
    private BigDecimal tax;

    @Schema(name = "feeTotal", description = "总费用")
    private BigDecimal feeTotal;

    @Schema(name = "createdAt", description = "创建时间")
    private Date createdAt;

    @Schema(name = "updatedAt", description = "更新时间")
    private Date updatedAt;
}
