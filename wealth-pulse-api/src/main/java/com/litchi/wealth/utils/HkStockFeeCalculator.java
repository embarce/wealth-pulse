package com.litchi.wealth.utils;

import lombok.Data;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 港股交易手续费计算工具类
 *
 * <p>基于特定证券服务商的收费标准，港股交易费用包括：</p>
 * <ul>
 *   <li>平台费：0.05%，最低 HKD 18/笔</li>
 *   <li>股票印花税：0.1% (香港特区政府收取)</li>
 *   <li>证监会交易征费：0.0027% (向上取整)</li>
 *   <li>交易所交易费：0.00565% (向上取整)</li>
 *   <li>交易所结算交收费：0.0042% (向上取整)</li>
 *   <li>会财局交易征费：0.00015% (向上取整)</li>
 * </ul>
 *
 * @author Embrace
 * @version 1.0
 * @date 2026/2/6 23:55
 */
public class HkStockFeeCalculator {

    /**
     * 平台费率：0.05%
     */
    private static final BigDecimal PLATFORM_FEE_RATE = new BigDecimal("0.0005");

    /**
     * 最低平台费：HKD 18
     */
    private static final BigDecimal MIN_PLATFORM_FEE = new BigDecimal("18");

    /**
     * 印花税率：0.1%
     */
    private static final BigDecimal STAMP_DUTY_RATE = new BigDecimal("0.001");

    /**
     * 证监会交易征费率：0.0027%
     */
    private static final BigDecimal SFC_LEVY_RATE = new BigDecimal("0.000027");

    /**
     * 交易所交易费率：0.00565%
     */
    private static final BigDecimal EXCHANGE_TRADING_FEE_RATE = new BigDecimal("0.0000565");

    /**
     * 交易所结算交收费率：0.0042%
     */
    private static final BigDecimal SETTLEMENT_FEE_RATE = new BigDecimal("0.000042");

    /**
     * 会财局交易征费率：0.00015%
     */
    private static final BigDecimal FRC_LEVY_RATE = new BigDecimal("0.0000015");

    /**
     * 计算结果
     */
    @Data
    public static class FeeResult {
        /**
         * 平台费
         */
        private BigDecimal platformFee;

        /**
         * 印花税
         */
        private BigDecimal stampDuty;

        /**
         * 证监会交易征费
         */
        private BigDecimal sfcLevy;

        /**
         * 交易所交易费
         */
        private BigDecimal exchangeTradingFee;

        /**
         * 交易所结算交收费
         */
        private BigDecimal settlementFee;

        /**
         * 会财局交易征费
         */
        private BigDecimal frcLevy;

        /**
         * 总费用
         */
        private BigDecimal totalFee;

        /**
         * 净交易金额（买入：交易总额 + 总费用；卖出：交易总额 - 总费用）
         */
        private BigDecimal netAmount;

        public FeeResult() {
            this.platformFee = BigDecimal.ZERO;
            this.stampDuty = BigDecimal.ZERO;
            this.sfcLevy = BigDecimal.ZERO;
            this.exchangeTradingFee = BigDecimal.ZERO;
            this.settlementFee = BigDecimal.ZERO;
            this.frcLevy = BigDecimal.ZERO;
            this.totalFee = BigDecimal.ZERO;
            this.netAmount = BigDecimal.ZERO;
        }
    }

    /**
     * 计算买入费用
     * <p>注：证监会征费、交易所交易费、结算交收费、会财局征费均向上取整</p>
     *
     * @param amount 交易金额（港币）
     * @return 费用计算结果
     */
    public static FeeResult calculateBuyFee(BigDecimal amount) {
        FeeResult result = new FeeResult();

        // 1. 平台费：0.05%，最低 HKD 18
        BigDecimal platformFee = calculatePercentage(amount, PLATFORM_FEE_RATE);
        result.setPlatformFee(platformFee.max(MIN_PLATFORM_FEE));

        // 2. 印花税：0.1%
        result.setStampDuty(calculatePercentage(amount, STAMP_DUTY_RATE, RoundingMode.HALF_UP));

        // 3. 证监会交易征费：0.0027%
        result.setSfcLevy(calculatePercentage(amount, SFC_LEVY_RATE, RoundingMode.HALF_UP));

        // 4. 交易所交易费：0.00565%
        result.setExchangeTradingFee(calculatePercentage(amount, EXCHANGE_TRADING_FEE_RATE, RoundingMode.HALF_UP));

        // 5. 交易所结算交收费：0.0042%
        result.setSettlementFee(calculatePercentage(amount, SETTLEMENT_FEE_RATE, RoundingMode.HALF_UP));

        // 6. 会财局交易征费：0.00015%
        result.setFrcLevy(calculatePercentage(amount, FRC_LEVY_RATE, RoundingMode.HALF_UP));

        // 计算总费用
        BigDecimal totalFee = result.getPlatformFee()
                .add(result.getStampDuty())
                .add(result.getSfcLevy())
                .add(result.getExchangeTradingFee())
                .add(result.getSettlementFee())
                .add(result.getFrcLevy());
        result.setTotalFee(totalFee);

        // 净金额 = 交易金额 + 总费用（买入需要支付更多）
        result.setNetAmount(amount.add(totalFee));

        return result;
    }

    /**
     * 计算卖出费用
     * <p>注：证监会征费、交易所交易费、结算交收费、会财局征费均向上取整</p>
     *
     * @param amount 交易金额（港币）
     * @return 费用计算结果
     */
    public static FeeResult calculateSellFee(BigDecimal amount) {
        FeeResult result = new FeeResult();

        // 1. 平台费：0.05%，最低 HKD 18
        BigDecimal platformFee = calculatePercentage(amount, PLATFORM_FEE_RATE);
        result.setPlatformFee(platformFee.max(MIN_PLATFORM_FEE));

        // 2. 印花税：0.1%
        result.setStampDuty(calculatePercentage(amount, STAMP_DUTY_RATE, RoundingMode.HALF_UP));

        // 3. 证监会交易征费：0.0027%
        result.setSfcLevy(calculatePercentage(amount, SFC_LEVY_RATE, RoundingMode.HALF_UP));

        // 4. 交易所交易费：0.00565%
        result.setExchangeTradingFee(calculatePercentage(amount, EXCHANGE_TRADING_FEE_RATE, RoundingMode.HALF_UP));

        // 5. 交易所结算交收费：0.0042%
        result.setSettlementFee(calculatePercentage(amount, SETTLEMENT_FEE_RATE, RoundingMode.HALF_UP));

        // 6. 会财局交易征费：0.00015%
        result.setFrcLevy(calculatePercentage(amount, FRC_LEVY_RATE, RoundingMode.HALF_UP));

        // 计算总费用
        BigDecimal totalFee = result.getPlatformFee()
                .add(result.getStampDuty())
                .add(result.getSfcLevy())
                .add(result.getExchangeTradingFee())
                .add(result.getSettlementFee())
                .add(result.getFrcLevy());
        result.setTotalFee(totalFee);

        // 净金额 = 交易金额 - 总费用（卖出实际到手更少）
        result.setNetAmount(amount.subtract(totalFee));

        return result;
    }

    /**
     * 计算百分比金额（默认四舍五入）
     *
     * @param amount 金额
     * @param rate   费率
     * @return 费用金额，四舍五入到 2 位小数
     */
    private static BigDecimal calculatePercentage(BigDecimal amount, BigDecimal rate) {
        return calculatePercentage(amount, rate, RoundingMode.HALF_UP);
    }

    /**
     * 计算百分比金额（可指定舍入模式）
     *
     * @param amount       金额
     * @param rate         费率
     * @param roundingMode 舍入模式
     * @return 费用金额，按指定舍入模式取 2 位小数
     */
    private static BigDecimal calculatePercentage(BigDecimal amount, BigDecimal rate, RoundingMode roundingMode) {
        return amount.multiply(rate)
                .setScale(2, roundingMode);
    }

    /**
     * 计算自定义平台费率的费用
     *
     * @param amount          交易金额
     * @param platformFeeRate 平台费率（如 0.0005 表示 0.05%）
     * @param minPlatformFee  最低平台费
     * @param isBuy           是否买入（true=买入，false=卖出）
     * @return 费用计算结果
     */
    public static FeeResult calculateFee(BigDecimal amount,
                                         BigDecimal platformFeeRate,
                                         BigDecimal minPlatformFee,
                                         boolean isBuy) {
        FeeResult result = new FeeResult();

        // 1. 平台费（自定义）
        BigDecimal platformFee = calculatePercentage(amount, platformFeeRate);
        result.setPlatformFee(platformFee.max(minPlatformFee != null ? minPlatformFee : MIN_PLATFORM_FEE));

        // 2. 印花税：0.1% (四舍五入)
        result.setStampDuty(calculatePercentage(amount, STAMP_DUTY_RATE));

        // 3. 证监会交易征费：0.0027% (向上取整)
        result.setSfcLevy(calculatePercentage(amount, SFC_LEVY_RATE, RoundingMode.CEILING));

        // 4. 交易所交易费：0.00565% (向上取整)
        result.setExchangeTradingFee(calculatePercentage(amount, EXCHANGE_TRADING_FEE_RATE, RoundingMode.CEILING));

        // 5. 交易所结算交收费：0.0042% (向上取整)
        result.setSettlementFee(calculatePercentage(amount, SETTLEMENT_FEE_RATE, RoundingMode.CEILING));

        // 6. 会财局交易征费：0.00015% (向上取整)
        result.setFrcLevy(calculatePercentage(amount, FRC_LEVY_RATE, RoundingMode.CEILING));

        // 计算总费用
        BigDecimal totalFee = result.getPlatformFee()
                .add(result.getStampDuty())
                .add(result.getSfcLevy())
                .add(result.getExchangeTradingFee())
                .add(result.getSettlementFee())
                .add(result.getFrcLevy());
        result.setTotalFee(totalFee);

        // 根据买卖计算净金额
        if (isBuy) {
            result.setNetAmount(amount.add(totalFee));
        } else {
            result.setNetAmount(amount.subtract(totalFee));
        }

        return result;
    }

    /**
     * 格式化费用信息为字符串（用于日志或展示）
     *
     * @param result 费用计算结果
     * @return 格式化的费用信息
     */
    public static String formatFeeInfo(FeeResult result) {
        return String.format(
                "平台费：%.2f HKD, 印花税：%.2f HKD, 证监会征费：%.2f HKD, " +
                        "交易所交易费：%.2f HKD, 结算费：%.2f HKD, 会财局征费：%.2f HKD, 总费用：%.2f HKD",
                result.getPlatformFee(),
                result.getStampDuty(),
                result.getSfcLevy(),
                result.getExchangeTradingFee(),
                result.getSettlementFee(),
                result.getFrcLevy(),
                result.getTotalFee()
        );
    }

    /**
     * 格式化费用明细（详细版）
     *
     * @param result 费用计算结果
     * @return 详细费用明细
     */
    public static String formatFeeDetail(FeeResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("========== 港股交易费用明细 ==========\n");
        sb.append(String.format("1. 平台费：          %.2f HKD (0.05%%, 最低 18 HKD)\n", result.getPlatformFee()));
        sb.append(String.format("2. 印花税：          %.2f HKD (0.1%%)\n", result.getStampDuty()));
        sb.append(String.format("3. 证监会交易征费：   %.2f HKD (0.0027%%)\n", result.getSfcLevy()));
        sb.append(String.format("4. 交易所交易费：     %.2f HKD (0.00565%%)\n", result.getExchangeTradingFee()));
        sb.append(String.format("5. 结算交收费：       %.2f HKD (0.0042%%)\n", result.getSettlementFee()));
        sb.append(String.format("6. 会财局交易征费：   %.2f HKD (0.00015%%)\n", result.getFrcLevy()));
        sb.append("----------------------------------------\n");
        sb.append(String.format("总费用：             %.2f HKD\n", result.getTotalFee()));
        sb.append("========================================");
        return sb.toString();
    }

    /**
     * 获取费用总称的中文描述
     *
     * @return 费用说明
     */
    public static String getFeeDescription() {
        return "港股交易费用说明：\n" +
                "1. 平台费：0.05%，最低 HKD 18/笔\n" +
                "2. 股票印花税：0.1% (香港特区政府收取)\n" +
                "3. 证监会交易征费：0.0027% (向上取整)\n" +
                "4. 交易所交易费：0.00565% (向上取整)\n" +
                "5. 交易所结算交收费：0.0042% (向上取整)\n" +
                "6. 会财局交易征费：0.00015% (向上取整)\n\n" +
                "印花税和平台费四舍五入，其他费用向上取整到小数点后 2 位";
    }
}
