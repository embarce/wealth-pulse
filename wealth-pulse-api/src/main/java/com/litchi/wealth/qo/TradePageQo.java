package com.litchi.wealth.qo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * @author Embrace
 * @version 1.0
 * @description: TradePageQo
 * @date 2026/2/6 21:03
 */
@Data
@Schema(name = "TradePageQo", description = "交易分页")
public class TradePageQo extends BasePageQo{
    @Schema(name = "tradeType", description = "交易类型")
    private String tradeType;

    @Schema(name = "tradeStartTime", description = "交易开始时间")
    private String tradeStartTime;

    @Schema(name = "tradeEndTime", description = "交易结束时间")
    private String tradeEndTime;
}
