package com.litchi.wealth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.litchi.wealth.dto.trade.StockTradeRequest;
import com.litchi.wealth.entity.StockTransactionLog;
import com.litchi.wealth.entity.UserAssetSummary;
import com.litchi.wealth.entity.UserPosition;
import com.litchi.wealth.mapper.StockTransactionLogMapper;
import com.litchi.wealth.service.*;
import com.litchi.wealth.qo.TradePageQo;
import com.litchi.wealth.utils.HkStockFeeCalculator;
import com.litchi.wealth.vo.TradeRecordVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.util.Date;

/**
* @description 股票交易流水表（记录买入和卖出操作） 服务实现类
* @author Embrace
* @git: https://github.com/embarce
* @date 2026-02-06
*/
@Slf4j
@Service
public class StockTransactionLogServiceImpl extends ServiceImpl<StockTransactionLogMapper, StockTransactionLog> implements StockTransactionLogService {

    @Autowired
    private UserAssetSummaryService userAssetSummaryService;

    @Autowired
    private UserPositionService userPositionService;

    @Override
    public IPage<TradeRecordVo> getTradeRecordPage(String userId, TradePageQo query) {
        // 创建分页对象
        Page<TradeRecordVo> page = new Page<>(
                query.getPageNum() != null ? query.getPageNum() : 1,
                query.getPageSize() != null ? query.getPageSize() : 10
        );

        // 调用 Mapper 查询
        return baseMapper.selectTradeRecordPage(page, userId, query);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void buyStock(String userId, StockTradeRequest request) {
        log.info("用户买入股票, userId={}, stockCode={}, quantity={}, price={}",
                userId, request.getStockCode(), request.getQuantity(), request.getPrice());

        // 1. 计算交易总额
        BigDecimal totalAmount = request.getQuantity().multiply(request.getPrice());
        String currency = request.getCurrency() != null ? request.getCurrency() : "HKD";

        // 2. 计算手续费（目前只支持港股HKD）
        HkStockFeeCalculator.FeeResult feeResult;
        if ("HKD".equals(currency)) {
            feeResult = HkStockFeeCalculator.calculateBuyFee(totalAmount);
            log.info("买入手续费: {}", HkStockFeeCalculator.formatFeeInfo(feeResult));
        } else {
            // 非港股暂不计算手续费
            feeResult = new HkStockFeeCalculator.FeeResult();
            feeResult.setNetAmount(totalAmount);
        }

        // 3. 检查可用现金是否足够（需要支付交易金额 + 手续费）
        UserAssetSummary assetSummary = getUserAssetSummary(userId);
        BigDecimal requiredCash = feeResult.getNetAmount();
        if (assetSummary.getAvailableCash().compareTo(requiredCash) < 0) {
            throw new RuntimeException("可用现金不足，无法买入。需要: " + requiredCash + "，可用: " + assetSummary.getAvailableCash());
        }

        // 4. 创建交易记录（包含手续费信息）
        StockTransactionLog transaction = buildTransaction(userId, request, "BUY", totalAmount, currency, feeResult);
        save(transaction);

        // 5. 更新持仓
        updatePositionForBuy(userId, request, currency);

        // 6. 更新用户资产（扣除所有费用）
        updateAssetForBuy(userId, totalAmount, feeResult.getTotalFee());

        log.info("买入股票成功, userId={}, stockCode={}, totalAmount={}, totalFee={}",
                userId, request.getStockCode(), totalAmount, feeResult.getTotalFee());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void sellStock(String userId, StockTradeRequest request) {
        log.info("用户卖出股票, userId={}, stockCode={}, quantity={}, price={}",
                userId, request.getStockCode(), request.getQuantity(), request.getPrice());

        // 1. 计算交易总额
        BigDecimal totalAmount = request.getQuantity().multiply(request.getPrice());
        String currency = request.getCurrency() != null ? request.getCurrency() : "HKD";

        // 2. 检查持仓是否足够
        UserPosition position = getUserPosition(userId, request.getStockCode());
        if (position == null || position.getQuantity().compareTo(request.getQuantity()) < 0) {
            throw new RuntimeException("持仓数量不足，无法卖出");
        }

        // 3. 计算手续费（目前只支持港股HKD）
        HkStockFeeCalculator.FeeResult feeResult;
        if ("HKD".equals(currency)) {
            feeResult = HkStockFeeCalculator.calculateSellFee(totalAmount);
            log.info("卖出手续费: {}", HkStockFeeCalculator.formatFeeInfo(feeResult));
        } else {
            // 非港股暂不计算手续费
            feeResult = new HkStockFeeCalculator.FeeResult();
            feeResult.setNetAmount(totalAmount);
        }

        // 4. 创建交易记录（包含手续费信息）
        StockTransactionLog transaction = buildTransaction(userId, request, "SELL", totalAmount, currency, feeResult);
        save(transaction);

        // 5. 更新持仓
        updatePositionForSell(userId, request, position);

        // 6. 更新用户资产（实际到账 = 交易金额 - 手续费）
        updateAssetForSell(userId, totalAmount, feeResult.getNetAmount(), feeResult.getTotalFee(),
                request.getStockCode(), request.getQuantity(), position.getAvgCost());

        log.info("卖出股票成功, userId={}, stockCode={}, totalAmount={}, netAmount={}, totalFee={}",
                userId, request.getStockCode(), totalAmount, feeResult.getNetAmount(), feeResult.getTotalFee());
    }

    /**
     * 构建交易记录
     */
    private StockTransactionLog buildTransaction(String userId, StockTradeRequest request,
                                                  String instruction, BigDecimal totalAmount, String currency,
                                                  HkStockFeeCalculator.FeeResult feeResult) {
        DecimalFormat decimalFormat = new DecimalFormat("#,##0.00");
        String amountDisplay = currencySymbol(currency) + decimalFormat.format(totalAmount);

        Date now = new Date();

        // 将平台费和其他费用合并为commission，将印花税存为tax
        BigDecimal totalCommission = feeResult.getPlatformFee()
                .add(feeResult.getSfcLevy())
                .add(feeResult.getExchangeTradingFee())
                .add(feeResult.getSettlementFee())
                .add(feeResult.getFrcLevy());

        return StockTransactionLog.builder()
                .userId(userId)
                .stockCode(request.getStockCode())
                .instruction(instruction)
                .executionDate(now)
                .executionTime(now)
                .executionDatetime(now)
                .price(request.getPrice())
                .quantity(request.getQuantity())
                .totalAmount(totalAmount)
                .totalAmountDisplay(amountDisplay)
                .currency(currency)
                .transactionStatus("COMPLETED")
                .isSettled(true)
                .commission(totalCommission)
                .tax(feeResult.getStampDuty())
                .feeTotal(feeResult.getTotalFee())
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    /**
     * 买入时更新持仓
     */
    private void updatePositionForBuy(String userId, StockTradeRequest request, String currency) {
        LambdaQueryWrapper<UserPosition> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserPosition::getUserId, userId)
                .eq(UserPosition::getStockCode, request.getStockCode());
        UserPosition position = userPositionService.getOne(queryWrapper);

        Date now = new Date();

        if (position == null) {
            // 新建持仓
            position = new UserPosition();
            position.setUserId(userId);
            position.setStockCode(request.getStockCode());
            position.setQuantity(request.getQuantity());
            position.setAvgCost(request.getPrice());
            position.setCostCurrency(currency);
            position.setPositionStatus(1); // 持有中
            position.setFirstBuyDate(now);
            position.setLastBuyDate(now);
            position.setCreatedAt(now);
            position.setUpdatedAt(now);
            userPositionService.save(position);
            log.info("创建新持仓, userId={}, stockCode={}, quantity={}, avgCost={}",
                    userId, request.getStockCode(), request.getQuantity(), request.getPrice());
        } else {
            // 更新现有持仓
            BigDecimal oldQuantity = position.getQuantity();
            BigDecimal oldAvgCost = position.getAvgCost();

            // 计算新的平均成本：(旧数量 * 旧成本 + 新数量 * 新价格) / (旧数量 + 新数量)
            BigDecimal oldTotalCost = oldQuantity.multiply(oldAvgCost);
            BigDecimal newTotalCost = request.getQuantity().multiply(request.getPrice());
            BigDecimal newQuantity = oldQuantity.add(request.getQuantity());
            BigDecimal newAvgCost = oldTotalCost.add(newTotalCost)
                    .divide(newQuantity, 2, RoundingMode.HALF_UP);

            position.setQuantity(newQuantity);
            position.setAvgCost(newAvgCost);
            position.setLastBuyDate(now);
            position.setUpdatedAt(now);
            userPositionService.updateById(position);
            log.info("更新持仓, userId={}, stockCode={}, oldQuantity={}, newQuantity={}, newAvgCost={}",
                    userId, request.getStockCode(), oldQuantity, newQuantity, newAvgCost);
        }
    }

    /**
     * 卖出时更新持仓
     */
    private void updatePositionForSell(String userId, StockTradeRequest request, UserPosition position) {
        BigDecimal newQuantity = position.getQuantity().subtract(request.getQuantity());
        Date now = new Date();

        if (newQuantity.compareTo(BigDecimal.ZERO) == 0) {
            // 全部卖出，更新状态为已清仓
            position.setPositionStatus(2); // 已清仓
            position.setLastSellDate(now);
            position.setUpdatedAt(now);
            userPositionService.updateById(position);
            log.info("全部卖出，持仓已清仓, userId={}, stockCode={}", userId, request.getStockCode());
        } else {
            // 部分卖出
            position.setQuantity(newQuantity);
            position.setPositionStatus(3); // 部分平仓
            position.setLastSellDate(now);
            position.setUpdatedAt(now);
            userPositionService.updateById(position);
            log.info("部分卖出, userId={}, stockCode={}, soldQuantity={}, remainingQuantity={}",
                    userId, request.getStockCode(), request.getQuantity(), newQuantity);
        }
    }

    /**
     * 买入时更新用户资产
     */
    private void updateAssetForBuy(String userId, BigDecimal totalAmount, BigDecimal totalFee) {
        UserAssetSummary assetSummary = getUserAssetSummary(userId);

        // 减少可用现金（交易金额 + 手续费）
        BigDecimal totalDeduct = totalAmount.add(totalFee);
        BigDecimal newAvailableCash = assetSummary.getAvailableCash().subtract(totalDeduct);
        assetSummary.setAvailableCash(newAvailableCash);

        // 增加持仓市值（用交易金额作为市值增量，不含手续费）
        BigDecimal newPositionValue = assetSummary.getPositionValue().add(totalAmount);
        assetSummary.setPositionValue(newPositionValue);

        // 重新计算总资产 = 可用现金 + 持仓市值
        BigDecimal newTotalAssets = newAvailableCash.add(newPositionValue);
        assetSummary.setTotalAssets(newTotalAssets);

        // 增加买入次数
        assetSummary.setTotalBuyCount(assetSummary.getTotalBuyCount() + 1);

        userAssetSummaryService.updateById(assetSummary);
        log.info("买入更新用户资产成功, userId={}, totalAmount={}, totalFee={}, newAvailableCash={}, newPositionValue={}",
                userId, totalAmount, totalFee, newAvailableCash, newPositionValue);
    }

    /**
     * 卖出时更新用户资产
     */
    private void updateAssetForSell(String userId, BigDecimal totalAmount, BigDecimal netAmount, BigDecimal totalFee,
                                     String stockCode, BigDecimal sellQuantity, BigDecimal avgCost) {
        UserAssetSummary assetSummary = getUserAssetSummary(userId);

        // 增加可用现金（实际到账金额，已扣除手续费）
        BigDecimal newAvailableCash = assetSummary.getAvailableCash().add(netAmount);
        assetSummary.setAvailableCash(newAvailableCash);

        // 计算盈亏（使用交易金额计算成本）
        BigDecimal cost = sellQuantity.multiply(avgCost);
        BigDecimal profit = totalAmount.subtract(cost);

        // 更新累计盈亏
        BigDecimal newCumulativeProfitLoss = assetSummary.getCumulativeProfitLoss().add(profit);
        assetSummary.setCumulativeProfitLoss(newCumulativeProfitLoss);

        // 减少持仓市值（用成本价计算）
        BigDecimal newPositionValue = assetSummary.getPositionValue().subtract(cost);
        assetSummary.setPositionValue(newPositionValue);

        // 重新计算总资产
        BigDecimal newTotalAssets = newAvailableCash.add(newPositionValue);
        assetSummary.setTotalAssets(newTotalAssets);

        // 增加卖出次数
        assetSummary.setTotalSellCount(assetSummary.getTotalSellCount() + 1);

        userAssetSummaryService.updateById(assetSummary);
        log.info("卖出更新用户资产成功, userId={}, totalAmount={}, totalFee={}, netAmount={}, profit={}, newCumulativeProfitLoss={}",
                userId, totalAmount, totalFee, netAmount, profit, newCumulativeProfitLoss);
    }

    /**
     * 获取用户资产总览，如果不存在则创建
     */
    private UserAssetSummary getUserAssetSummary(String userId) {
        LambdaQueryWrapper<UserAssetSummary> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserAssetSummary::getUserId, userId);
        UserAssetSummary assetSummary = userAssetSummaryService.getOne(queryWrapper);

        if (assetSummary == null) {
            assetSummary = new UserAssetSummary();
            assetSummary.setUserId(userId);
            assetSummary.setTotalAssets(BigDecimal.ZERO);
            assetSummary.setCumulativeProfitLoss(BigDecimal.ZERO);
            assetSummary.setAvailableCash(BigDecimal.ZERO);
            assetSummary.setPositionValue(BigDecimal.ZERO);
            assetSummary.setTotalPrincipal(BigDecimal.ZERO);
            assetSummary.setYesterdayPositionValue(BigDecimal.ZERO);
            assetSummary.setYesterdayTotalAssets(BigDecimal.ZERO);
            assetSummary.setTotalCashflow(BigDecimal.ZERO);
            assetSummary.setTotalBuyCount(0L);
            assetSummary.setTotalSellCount(0L);
            userAssetSummaryService.save(assetSummary);
            log.info("创建用户资产总览记录, userId={}", userId);
        }

        return assetSummary;
    }

    /**
     * 获取用户持仓
     */
    private UserPosition getUserPosition(String userId, String stockCode) {
        LambdaQueryWrapper<UserPosition> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserPosition::getUserId, userId)
                .eq(UserPosition::getStockCode, stockCode);
        return userPositionService.getOne(queryWrapper);
    }

    /**
     * 获取货币符号
     */
    private String currencySymbol(String currencyCode) {
        try {
            java.util.Currency currency = java.util.Currency.getInstance(currencyCode);
            return currency.getSymbol();
        } catch (Exception e) {
            return currencyCode + " ";
        }
    }
}
