package com.litchi.wealth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.util.Date;

/**
* @description 股票交易流水表（记录买入和卖出操作）
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-06
*/
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("stock_transaction_log")
@Schema(name="StockTransactionLog对象", description="股票交易流水表（记录买入和卖出操作）")
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StockTransactionLog {


    @Schema(name = "id", description = "交易ID")
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private String id;

    @Schema(name = "userId", description = "用户ID")
    @TableField("user_id")
    private String userId;

    @Schema(name = "stockCode", description = "股票代码(如: NVDA)")
    @TableField("stock_code")
    private String stockCode;

    @Schema(name = "instruction", description = "交易指令: BUY-买入 SELL-卖出")
    @TableField("instruction")
    private String instruction;

    @Schema(name = "executionDate", description = "执行日期(如: 2026-02-05)")
    @TableField("execution_date")
    private Date executionDate;

    @Schema(name = "executionTime", description = "执行时间(如: 21:12:42)")
    @TableField("execution_time")
    private Date executionTime;

    @Schema(name = "executionDatetime", description = "完整执行时间(日期+时间)")
    @TableField("execution_datetime")
    private Date executionDatetime;

    @Schema(name = "price", description = "交易单价")
    @TableField("price")
    private BigDecimal price;

    @Schema(name = "quantity", description = "交易数量")
    @TableField("quantity")
    private BigDecimal quantity;

    @Schema(name = "totalAmount", description = "成交总额(price * quantity)")
    @TableField("total_amount")
    private BigDecimal totalAmount;

    @Schema(name = "totalAmountDisplay", description = "总额显示格式(如: ¥4,376)")
    @TableField("total_amount_display")
    private String totalAmountDisplay;

    @Schema(name = "currency", description = "交易货币")
    @TableField("currency")
    private String currency;

    @Schema(name = "transactionStatus", description = "交易状态: PENDING-待成交 COMPLETED-已成交 CANCELLED-已取消 FAILED-失败")
    @TableField("transaction_status")
    private String transactionStatus;

    @Schema(name = "isSettled", description = "是否已结算")
    @TableField("is_settled")
    private Boolean isSettled;

    @Schema(name = "commission", description = "佣金")
    @TableField("commission")
    private BigDecimal commission;

    @Schema(name = "tax", description = "税费")
    @TableField("tax")
    private BigDecimal tax;

    @Schema(name = "feeTotal", description = "总费用")
    @TableField("fee_total")
    private BigDecimal feeTotal;

    @Schema(name = "createdAt", description = "创建时间")
    @TableField("created_at")
    private Date createdAt;

    @Schema(name = "updatedAt", description = "更新时间")
    @TableField("updated_at")
    private Date updatedAt;

    @Schema(name = "remark", description = "备注")
    @TableField("remark")
    private String remark;

    @Schema(name = "extendedInfo", description = "扩展信息(JSON格式)")
    @TableField("extended_info")
    private String extendedInfo;


}
