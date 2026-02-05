package com.litchi.wealth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.Date;

/**
* @description 股票基础信息表
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-05
*/
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("tb_stock_info")
@Schema(name="StockInfo对象", description="股票基础信息表")
public class StockInfo {


    @Schema(name = "stockCode", description = "股票代码(如: NVDA.US)")
    @TableField(value = "stock_code")
    private String stockCode;

    @Schema(name = "companyName", description = "公司全名")
    @TableField("company_name")
    private String companyName;

    @Schema(name = "shortName", description = "公司简称")
    @TableField("short_name")
    private String shortName;

    @Schema(name = "stockType", description = "股票类型: STOCK/ETF/BOND/INDEX等")
    @TableField("stock_type")
    private String stockType;

    @Schema(name = "exchange", description = "交易所: NASDAQ/NYSE/SH/SZ/HK等")
    @TableField("exchange")
    private String exchange;

    @Schema(name = "currency", description = "交易货币: USD/HKD/CNY等")
    @TableField("currency")
    private String currency;

    @Schema(name = "industry", description = "行业分类")
    @TableField("industry")
    private String industry;

    @Schema(name = "marketCap", description = "市值")
    @TableField("market_cap")
    private String marketCap;

    @Schema(name = "displayOrder", description = "显示顺序")
    @TableField("display_order")
    private Integer displayOrder;

    @Schema(name = "stockStatus", description = "状态: 1-正常交易 2-停牌 0-退市")
    @TableField("stock_status")
    private Integer stockStatus;

    @Schema(name = "createTime", description = "创建时间")
    @TableField("create_time")
    private Date createTime;

    @Schema(name = "updateTime", description = "更新时间")
    @TableField("update_time")
    private Date updateTime;


}
