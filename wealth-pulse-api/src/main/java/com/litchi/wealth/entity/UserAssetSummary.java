package com.litchi.wealth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.util.Date;

/**
* @description 用户资产总览
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-05
*/
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("tb_user_asset_summary")
@Schema(name="UserAssetSummary对象", description="用户资产总览")
public class UserAssetSummary {


    @Schema(name = "id", description = "ID")
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private String id;

    @Schema(name = "updateTime", description = "更新时间")
    @TableField("update_time")
    private Date updateTime;

    @Schema(name = "userId", description = "用户ID")
    @TableField("user_id")
    private String userId;

    @Schema(name = "totalAssets", description = "总资产")
    @TableField("total_assets")
    private BigDecimal totalAssets;

    @Schema(name = "cumulativeProfitLoss", description = "累计盈亏")
    @TableField("cumulative_profit_loss")
    private BigDecimal cumulativeProfitLoss;

    @Schema(name = "availableCash", description = "可用现金（可提现）")
    @TableField("available_cash")
    private BigDecimal availableCash;

    @Schema(name = "purchasingPower", description = "购买力（可用于交易）")
    @TableField("purchasing_power")
    private BigDecimal purchasingPower;

    @Schema(name = "positionValue", description = "持仓市值")
    @TableField("position_value")
    private BigDecimal positionValue;

    @Schema(name = "totalPrincipal", description = "总本金")
    @TableField("total_principal")
    private BigDecimal totalPrincipal;

    @Schema(name = "yesterdayPositionValue", description = "昨日持仓市值")
    @TableField("yesterday_position_value")
    private BigDecimal yesterdayPositionValue;

    @Schema(name = "yesterdayTotalAssets", description = "昨日总资产")
    @TableField("yesterday_total_assets")
    private BigDecimal yesterdayTotalAssets;

    @Schema(name = "totalCashflow", description = "累计流水")
    @TableField("total_cashflow")
    private BigDecimal totalCashflow;

    @Schema(name = "totalBuyCount", description = "累计买入次数")
    @TableField("total_buy_count")
    private Long totalBuyCount;

    @Schema(name = "totalSellCount", description = "累计卖出次数")
    @TableField("total_sell_count")
    private Long totalSellCount;
}
