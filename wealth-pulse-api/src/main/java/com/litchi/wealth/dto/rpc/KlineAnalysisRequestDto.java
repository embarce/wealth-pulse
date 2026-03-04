package com.litchi.wealth.dto.rpc;

import cn.hutool.core.annotation.Alias;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * K 线分析请求 DTO
 *
 * @author Embrace
 * @date 2026-03-01
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class KlineAnalysisRequestDto {

    /**
     * 股票代码
     */
    @Alias("stock_code")
    private String stockCode;

    /**
     * 股票基本信息（可选）
     */
    @Alias("stock_info")
    private StockInfoDto stockInfo;

    /**
     * 当前价格（可选，不传则使用 K 线数据最新收盘价）
     */
    @Alias("current_price")
    private BigDecimal currentPrice;

    /**
     * K 线数据列表
     */
    @Alias("kline_data")
    private List<KlineDataDto> klineData;

    /**
     * 分析周期：daily/weekly/monthly
     */
    private String period;

    /**
     * LLM 供应商：doubao/openai/qwen 等
     */
    private String provider;

    /**
     * 模型名称
     */
    private String model;

    /**
     * K 线数据项
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class KlineDataDto {
        /**
         * 日期
         */
        private String date;

        /**
         * 开盘价
         */
        private BigDecimal open;

        /**
         * 最高价
         */
        private BigDecimal high;

        /**
         * 最低价
         */
        private BigDecimal low;

        /**
         * 收盘价
         */
        private BigDecimal close;

        /**
         * 成交量
         */
        private Integer volume;

        /**
         * 成交额（可选）
         */
        private BigDecimal amount;
    }

    /**
     * 股票基本信息
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class StockInfoDto {
        /**
         * 股票代码
         */
        @Alias("stock_code")
        private String stockCode;

        /**
         * 公司名称
         */
        @Alias("company_name")
        private String companyName;

        /**
         * 所属行业
         */
        private String industry;

        /**
         * 市值
         */
        @Alias("market_cap")
        private String marketCap;
    }
}
