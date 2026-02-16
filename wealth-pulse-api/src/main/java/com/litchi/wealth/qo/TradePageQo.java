package com.litchi.wealth.qo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;

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

    @Schema(name = "tradeStartTime", description = "交易开始时间", example = "2026-01-16 13:50:22")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date tradeStartTime;

    @Schema(name = "tradeEndTime", description = "交易结束时间", example = "2026-03-16 13:50:22")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date tradeEndTime;
}
