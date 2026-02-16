package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 交易统计 VO
 *
 * @author Embrace
 * @version 1.0
 * @description: 交易统计数据返回对象
 * @date 2026/2/16
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "TradeStatisticsVo", description = "交易统计数据")
public class TradeStatisticsVo {

    @Schema(name = "totalTradeVol", description = "近一个月累计交易流水总额", example = "1234567.89")
    private BigDecimal totalTradeVol;

    @Schema(name = "buyCount", description = "近一个月买入笔数", example = "25")
    private Long buyCount;

    @Schema(name = "sellCount", description = "近一个月卖出笔数", example = "18")
    private Long sellCount;
}
