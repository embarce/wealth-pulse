package com.litchi.wealth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 用户持仓快照表
 *
 * @author Embrace
 * @description 每日定时快照用户持仓数据，用于后续统计历史涨跌
 * @date 2026-02-17
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("tb_user_position_snapshot")
@Schema(name = "UserPositionSnapshot对象", description = "用户持仓快照表")
public class UserPositionSnapshot {

    @Schema(name = "id", description = "快照ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @Schema(name = "userId", description = "用户ID")
    @TableField("user_id")
    private String userId;

    @Schema(name = "stockCode", description = "股票代码")
    @TableField("stock_code")
    private String stockCode;

    @Schema(name = "stockName", description = "股票名称")
    @TableField("stock_name")
    private String stockName;

    @Schema(name = "snapshotDate", description = "快照日期")
    @TableField("snapshot_date")
    private LocalDate snapshotDate;

    @Schema(name = "quantity", description = "持有数量")
    @TableField("quantity")
    private BigDecimal quantity;

    @Schema(name = "avgCost", description = "平均成本价")
    @TableField("avg_cost")
    private BigDecimal avgCost;

    @Schema(name = "currentPrice", description = "快照时股价")
    @TableField("current_price")
    private BigDecimal currentPrice;

    @Schema(name = "marketValue", description = "市值(数量×当前价)")
    @TableField("market_value")
    private BigDecimal marketValue;

    @Schema(name = "costValue", description = "成本市值(数量×成本价)")
    @TableField("cost_value")
    private BigDecimal costValue;

    @Schema(name = "profitLoss", description = "盈亏金额(市值-成本市值)")
    @TableField("profit_loss")
    private BigDecimal profitLoss;

    @Schema(name = "profitLossRate", description = "盈亏比例(盈亏/成本市值)")
    @TableField("profit_loss_rate")
    private BigDecimal profitLossRate;

    @Schema(name = "currency", description = "币种")
    @TableField("currency")
    private String currency;
}
