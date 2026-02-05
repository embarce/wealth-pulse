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
* @description 用户持仓明细表
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-05
*/
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("tb_user_position")
@Schema(name="UserPosition对象", description="用户持仓明细表")
public class UserPosition {


    @Schema(name = "id", description = "持仓ID")
    @TableId(value = "id", type = IdType.AUTO)
    private String id;

    @Schema(name = "userId", description = "用户ID")
    @TableField("user_id")
    private String userId;

    @Schema(name = "stockCode", description = "股票ID")
    @TableField("stock_code")
    private String stockCode;

    @Schema(name = "quantity", description = "持有数量")
    @TableField("quantity")
    private BigDecimal quantity;

    @Schema(name = "avgCost", description = "平均成本价")
    @TableField("avg_cost")
    private BigDecimal avgCost;

    @Schema(name = "costCurrency", description = "成本货币")
    @TableField("cost_currency")
    private String costCurrency;

    @Schema(name = "positionStatus", description = "持仓状态: 1-持有中 2-已清仓 3-部分平仓")
    @TableField("position_status")
    private Integer positionStatus;

    @Schema(name = "firstBuyDate", description = "首次买入日期")
    @TableField("first_buy_date")
    private Date firstBuyDate;

    @Schema(name = "lastBuyDate", description = "最后买入日期")
    @TableField("last_buy_date")
    private Date lastBuyDate;

    @Schema(name = "lastSellDate", description = "最后卖出日期")
    @TableField("last_sell_date")
    private Date lastSellDate;

    @Schema(name = "createdAt", description = "创建时间")
    @TableField("created_at")
    private Date createdAt;

    @Schema(name = "updatedAt", description = "更新时间")
    @TableField("updated_at")
    private Date updatedAt;


}
