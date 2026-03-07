package com.litchi.wealth.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * K 线分析请求 DTO
 *
 * @author Embrace
 * @version 1.0
 * @description: AI K 线分析请求参数
 * @date 2026/2/24
 */
@Data
@Schema(description = "K 线分析请求")
public class KlineAnalysisRequest {

    @NotBlank(message = "股票代码不能为空")
    @Schema(description = "股票代码", example = "03900.HK", required = true)
    private String stockCode;

    @NotNull(message = "K 线数据不能为空")
    @Schema(description = "K 线数据列表", required = true)
    private List<KlineData> klineData;

    @Schema(description = "分析周期", example = "daily")
    private String period = "daily";

    @Schema(description = "是否强制刷新（跳过缓存）", example = "false")
    @Deprecated
    private Boolean forceRefresh = false;

    @Schema(description = "LLM 供应商：doubao/openai/qwen 等", example = "doubao")
    private String provider;

    @Schema(description = "模型名称", example = "ep-xxx")
    private String model;

    /**
     * K 线数据
     */
    @Data
    @Schema(description = "K 线数据")
    public static class KlineData {

        @Schema(description = "日期", example = "2026-02-24")
        private String date;

        @Schema(description = "开盘价", example = "150.5")
        private BigDecimal open;

        @Schema(description = "最高价", example = "155.0")
        private BigDecimal high;

        @Schema(description = "最低价", example = "149.0")
        private BigDecimal low;

        @Schema(description = "收盘价", example = "152.3")
        private BigDecimal close;

        @Schema(description = "成交量", example = "1000000")
        private Long volume;

        @Schema(description = "成交额", example = "152300000")
        private BigDecimal amount;
    }
}
