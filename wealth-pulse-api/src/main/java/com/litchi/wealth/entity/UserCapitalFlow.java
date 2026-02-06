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
* @description 用户本金操作流水表
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-06
*/
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("tb_user_capital_flow")
@Schema(name="UserCapitalFlow对象", description="用户本金操作流水表")
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserCapitalFlow {


    @Schema(name = "id", description = "记录ID")
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private String id;

    @Schema(name = "userId", description = "用户ID")
    @TableField("user_id")
    private String userId;

    @Schema(name = "operationType", description = "操作类型: DEPOSIT-资金注入 WITHDRAW-本金提取")
    @TableField("operation_type")
    private String operationType;

    @Schema(name = "operationLabel", description = "操作标签(显示用，如: 资金注入、本金提取)")
    @TableField("operation_label")
    private String operationLabel;

    @Schema(name = "amount", description = "操作金额(正数表示注入，负数表示提取)")
    @TableField("amount")
    private BigDecimal amount;

    @Schema(name = "amountDisplay", description = "金额显示格式(如: +￥50,000)")
    @TableField("amount_display")
    private String amountDisplay;

    @Schema(name = "currency", description = "货币代码")
    @TableField("currency")
    private String currency;

    @Schema(name = "operatorId", description = "操作人员ID(系统操作为0)")
    @TableField("operator_id")
    private String operatorId;

    @Schema(name = "operationDate", description = "操作日期(如: 2026-01-30)")
    @TableField("operation_date")
    private Date operationDate;

    @Schema(name = "operationTime", description = "操作时间(精确到秒)")
    @TableField("operation_time")
    private Date operationTime;

    @Schema(name = "createdAt", description = "创建时间")
    @TableField("created_at")
    private Date createdAt;

    @Schema(name = "updatedAt", description = "更新时间")
    @TableField("updated_at")
    private Date updatedAt;


}
