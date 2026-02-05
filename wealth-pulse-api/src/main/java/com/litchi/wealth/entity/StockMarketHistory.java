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
* @description 股票历史行情表
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-05
*/
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("tb_stock_market_history")
@Schema(name="StockMarketHistory对象", description="股票历史行情表")
public class StockMarketHistory {


    @TableId(value = "id", type = IdType.AUTO)
    private String id;

    @TableField("stock_code")
    private String stockCode;

    @Schema(name = "tradeDate", description = "交易日期")
    @TableField("trade_date")
    private Date tradeDate;

    @TableField("open_price")
    private BigDecimal openPrice;

    @TableField("high_price")
    private BigDecimal highPrice;

    @TableField("low_price")
    private BigDecimal lowPrice;

    @TableField("close_price")
    private BigDecimal closePrice;

    @Schema(name = "adjClose", description = "复权收盘价")
    @TableField("adj_close")
    private BigDecimal adjClose;

    @TableField("volume")
    private Long volume;


}
