package com.litchi.wealth.vo.rpc;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 港股证券资料视图对象
 *
 * @author Embrace
 * @date 2026-02-20
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "港股证券资料")
public class HkStockSecurityProfileVo {


    @Schema(description = "证券代码")
    private String stockCode;


    @Schema(description = "证券简称")
    private String securityName;


    @Schema(description = "上市日期")
    private String listingDate;


    @Schema(description = "证券类型")
    private String securityType;


    @Schema(description = "发行价")
    private BigDecimal issuePrice;


    @Schema(description = "发行量(股)")
    private Long issueVolume;


    @Schema(description = "每手股数")
    private Integer lotSize;


    @Schema(description = "每股面值")
    private String parValue;

    @Schema(description = "交易所")
    private String exchange;

    @Schema(description = "板块")
    private String sector;


    @Schema(description = "年结日")
    private String yearEndDate;


    @Schema(description = "ISIN（国际证券识别编码）")
    private String isinCode;


    @Schema(description = "是否沪港通标的")
    private String isShHkStock;
}
