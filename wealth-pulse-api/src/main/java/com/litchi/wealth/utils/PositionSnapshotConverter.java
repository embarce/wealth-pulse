package com.litchi.wealth.utils;

import com.litchi.wealth.entity.UserPositionSnapshot;
import com.litchi.wealth.vo.PositionSnapshotVo;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 持仓快照转换工具类
 *
 * @author Embrace
 * @date 2026-02-17
 */
public class PositionSnapshotConverter {

    private static final DecimalFormat CURRENCY_FORMAT = new DecimalFormat("#,##0.00");
    private static final DecimalFormat PERCENT_FORMAT = new DecimalFormat("#,##0.00");

    /**
     * 将实体转换为 VO
     */
    public static PositionSnapshotVo toVo(UserPositionSnapshot entity) {
        if (entity == null) {
            return null;
        }

        boolean isProfit = entity.getProfitLoss().compareTo(BigDecimal.ZERO) >= 0;

        return PositionSnapshotVo.builder()
                .id(entity.getId())
                .stockCode(entity.getStockCode())
                .stockName(entity.getStockName())
                .snapshotDate(entity.getSnapshotDate())
                .quantity(entity.getQuantity())
                .avgCost(entity.getAvgCost())
                .currentPrice(entity.getCurrentPrice())
                .marketValue(entity.getMarketValue())
                .marketValueDisplay(formatCurrency(entity.getMarketValue(), entity.getCurrency()))
                .costValue(entity.getCostValue())
                .profitLoss(entity.getProfitLoss())
                .profitLossDisplay(formatProfitLoss(entity.getProfitLoss(), entity.getCurrency()))
                .profitLossRate(entity.getProfitLossRate())
                .profitLossRateDisplay(formatProfitLossRate(entity.getProfitLossRate()))
                .isProfit(isProfit)
                .currency(entity.getCurrency())
                .build();
    }

    /**
     * 批量转换实体为 VO
     */
    public static List<PositionSnapshotVo> toVoList(List<UserPositionSnapshot> entities) {
        if (entities == null || entities.isEmpty()) {
            return List.of();
        }
        return entities.stream()
                .map(PositionSnapshotConverter::toVo)
                .collect(Collectors.toList());
    }

    /**
     * 格式化金额
     */
    private static String formatCurrency(BigDecimal amount, String currency) {
        if (amount == null) {
            return "-";
        }
        String symbol = getCurrencySymbol(currency);
        return symbol + CURRENCY_FORMAT.format(amount);
    }

    /**
     * 格式化盈亏金额（带±号）
     */
    private static String formatProfitLoss(BigDecimal profitLoss, String currency) {
        if (profitLoss == null) {
            return "-";
        }
        String symbol = getCurrencySymbol(currency);
        String sign = profitLoss.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
        return sign + symbol + CURRENCY_FORMAT.format(profitLoss);
    }

    /**
     * 格式化盈亏比例（带±号）
     */
    private static String formatProfitLossRate(BigDecimal rate) {
        if (rate == null) {
            return "-";
        }
        String sign = rate.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
        return sign + PERCENT_FORMAT.format(rate) + "%";
    }

    /**
     * 获取货币符号
     */
    private static String getCurrencySymbol(String currency) {
        if (currency == null) {
            return "";
        }
        String currencyUpper = currency.toUpperCase();
        switch (currencyUpper) {
            case "HKD":
                return "HK$";
            case "USD":
                return "$";
            case "CNY":
                return "¥";
            case "JPY":
                return "¥";
            default:
                return currency + " ";
        }
    }
}
