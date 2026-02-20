package com.litchi.wealth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 持仓快照图表视图对象
 *
 * @author Embrace
 * @date 2026-02-17
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PositionSnapshotChartVo {

    @Schema(name = "snapshotDate", description = "快照日期")
    private String snapshotDate;

    @Schema(name = "marketValue", description = "市值")
    private BigDecimal marketValue;

}
