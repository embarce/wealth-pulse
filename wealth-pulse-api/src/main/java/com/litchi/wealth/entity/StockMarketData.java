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
* @description 股票行情数据表
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-05
*/
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("tb_stock_market_data")
@Schema(name="StockMarketData对象", description="股票行情数据表")
public class StockMarketData {


    @Schema(name = "id", description = "行情ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @Schema(name = "stockCode", description = "股票代码(如: NVDA.US)")
    @TableField("stock_code")
    private String stockCode;

    @Schema(name = "lastPrice", description = "最新价")
    @TableField("last_price")
    private BigDecimal lastPrice;

    @Schema(name = "changeNumber", description = "涨跌额")
    @TableField("change_number")
    private BigDecimal changeNumber;

    @Schema(name = "changeRate", description = "涨跌幅(%)")
    @TableField("change_rate")
    private BigDecimal changeRate;

    @Schema(name = "openPrice", description = "开盘价")
    @TableField("open_price")
    private BigDecimal openPrice;

    @Schema(name = "preClose", description = "前收盘价")
    @TableField("pre_close")
    private BigDecimal preClose;

    @Schema(name = "highPrice", description = "当日最高价")
    @TableField("high_price")
    private BigDecimal highPrice;

    @Schema(name = "lowPrice", description = "当日最低价")
    @TableField("low_price")
    private BigDecimal lowPrice;

    @Schema(name = "volume", description = "成交量(股)")
    @TableField("volume")
    private Long volume;

    @Schema(name = "turnover", description = "成交额")
    @TableField("turnover")
    private BigDecimal turnover;

    @Schema(name = "week52High", description = "52周最高")
    @TableField("week52_high")
    private BigDecimal week52High;

    @Schema(name = "week52Low", description = "52周最低")
    @TableField("week52_low")
    private BigDecimal week52Low;

    @Schema(name = "marketCap", description = "总市值")
    @TableField("market_cap")
    private BigDecimal marketCap;

    @Schema(name = "peRatio", description = "市盈率")
    @TableField("pe_ratio")
    private BigDecimal peRatio;

    @Schema(name = "pbRatio", description = "市净率")
    @TableField("pb_ratio")
    private BigDecimal pbRatio;

    @Schema(name = "quoteTime", description = "行情时间")
    @TableField("quote_time")
    private Date quoteTime;

    @Schema(name = "marketDate", description = "交易日")
    @TableField("market_date")
    private Date marketDate;

    @Schema(name = "dataSource", description = "数据来源")
    @TableField("data_source")
    private String dataSource;


    @Schema(name = "indexStr", description = "扩展指标(JSON格式)")
    @TableField("index_str")
    private String indexStr;


}
