package com.litchi.wealth.service.impl;

import cn.hutool.core.date.DateField;
import cn.hutool.core.date.DateTime;
import cn.hutool.core.date.DateUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.litchi.wealth.dto.trade.StockTradeRequest;
import com.litchi.wealth.entity.StockTransactionLog;
import com.litchi.wealth.entity.UserAssetSummary;
import com.litchi.wealth.entity.UserPosition;
import com.litchi.wealth.mapper.StockTransactionLogMapper;
import com.litchi.wealth.qo.TradePageQo;
import com.litchi.wealth.service.StockTransactionLogService;
import com.litchi.wealth.service.UserAssetSummaryService;
import com.litchi.wealth.service.UserPositionService;
import com.litchi.wealth.utils.HkStockFeeCalculator;
import com.litchi.wealth.utils.RedissonLock;
import com.litchi.wealth.vo.TradeRecordVo;
import com.litchi.wealth.vo.TradeStatisticsVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.util.Date;
import java.util.List;

import static com.litchi.wealth.constant.Constants.USER_ASSET_JOB_LOCK_KEY;

/**
 * @author Embrace
 * @description 股票交易流水表（记录买入和卖出操作） 服务实现类
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

    @Autowired
    private RedissonLock redissonLock;

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


        String key = USER_ASSET_JOB_LOCK_KEY.formatted(userId);
        boolean locked = false;
        try {
            locked = redissonLock.tryLock(key);
            if (locked) {
                // 2. 计算手续费（目前只支持港股HKD）zabank
                HkStockFeeCalculator.FeeResult feeResult;
                if ("HKD".equals(currency)) {
                    // 检查是否手动输入手续费（优先级最高）
                    if (request.getManualCommission() != null) {
                        // 使用部分手动费用
                        HkStockFeeCalculator.FeeResult autoFeeResult = HkStockFeeCalculator.calculateBuyFee(totalAmount);
                        BigDecimal commission = request.getManualCommission() != null ? request.getManualCommission() : autoFeeResult.getPlatformFee();
                        BigDecimal tax = autoFeeResult.getStampDuty();
                        feeResult = new HkStockFeeCalculator.FeeResult();
                        feeResult.setPlatformFee(commission);
                        feeResult.setStampDuty(tax);
                        feeResult.setSfcLevy(autoFeeResult.getSfcLevy());
                        feeResult.setExchangeTradingFee(autoFeeResult.getExchangeTradingFee());
                        feeResult.setSettlementFee(autoFeeResult.getSettlementFee());
                        feeResult.setFrcLevy(autoFeeResult.getFrcLevy());
                        // 重新计算总费用
                        BigDecimal totalFee = commission.add(tax)
                                .add(autoFeeResult.getSfcLevy())
                                .add(autoFeeResult.getExchangeTradingFee())
                                .add(autoFeeResult.getSettlementFee())
                                .add(autoFeeResult.getFrcLevy());
                        feeResult.setTotalFee(totalFee);
                        feeResult.setNetAmount(totalAmount.subtract(totalFee));
                        log.info("使用部分手动费用 - commission: {}, tax: {}, totalFee: {}", commission, tax, totalFee);
                    } else {
                        // 自动计算手续费
                        feeResult = HkStockFeeCalculator.calculateBuyFee(totalAmount);
                        log.info("自动计算买入手续费: {}", HkStockFeeCalculator.formatFeeInfo(feeResult));
                    }
                } else {
                    // 非港股暂不计算手续费
                    feeResult = new HkStockFeeCalculator.FeeResult();
                    feeResult.setNetAmount(totalAmount);
                }

                // 3. 检查购买力+可用现金是否足够（支持T+0交易）
                UserAssetSummary assetSummary = getUserAssetSummary(userId);
                BigDecimal requiredCash = feeResult.getNetAmount();

                // 计算总可用资金（购买力 + 可用现金）
                BigDecimal totalAvailable = assetSummary.getPurchasingPower().add(assetSummary.getAvailableCash());
                if (totalAvailable.compareTo(requiredCash) < 0) {
                    throw new RuntimeException("资金不足，无法买入。需要: " + requiredCash +
                            "，购买力: " + assetSummary.getPurchasingPower() +
                            "，可用现金: " + assetSummary.getAvailableCash() +
                            "，总计: " + totalAvailable);
                }

                // 4. 创建交易记录（包含手续费信息）
                StockTransactionLog transaction = buildTransaction(userId, request, "BUY", totalAmount, currency, feeResult);
                save(transaction);

                // 5. 更新持仓
                updatePositionForBuy(userId, request, currency);

                // 6. 更新用户资产（扣除所有费用，自动从可用现金补充购买力）
                updateAssetForBuy(userId, requiredCash, totalAmount, feeResult.getTotalFee());

                log.info("买入股票成功, userId={}, stockCode={}, totalAmount={}, totalFee={}",
                        userId, request.getStockCode(), totalAmount, feeResult.getTotalFee());
            }
        } finally {
            if (locked) {
                redissonLock.unlock(key);
            }
        }

    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void sellStock(String userId, StockTradeRequest request) {
        log.info("用户卖出股票, userId={}, stockCode={}, quantity={}, price={}",
                userId, request.getStockCode(), request.getQuantity(), request.getPrice());

        // 1. 计算交易总额
        BigDecimal totalAmount = request.getQuantity().multiply(request.getPrice());
        String currency = request.getCurrency() != null ? request.getCurrency() : "HKD";

        String key = USER_ASSET_JOB_LOCK_KEY.formatted(userId);
        boolean locked = false;
        try {
            locked = redissonLock.tryLock(key);
            if (locked) {
                // 2. 检查持仓是否足够
                UserPosition position = getUserPosition(userId, request.getStockCode());
                if (position == null || position.getQuantity().compareTo(request.getQuantity()) < 0) {
                    throw new RuntimeException("持仓数量不足，无法卖出");
                }

                // 3. 计算手续费（目前只支持港股HKD）
                HkStockFeeCalculator.FeeResult feeResult;
                if ("HKD".equals(currency)) {
                    // 检查是否手动输入手续费（优先级最高）
                    if (request.getManualCommission() != null) {
                        // 使用部分手动费用
                        HkStockFeeCalculator.FeeResult autoFeeResult = HkStockFeeCalculator.calculateSellFee(totalAmount);
                        BigDecimal commission = request.getManualCommission() != null ? request.getManualCommission() : autoFeeResult.getPlatformFee();
                        BigDecimal tax = autoFeeResult.getStampDuty();

                        feeResult = new HkStockFeeCalculator.FeeResult();
                        feeResult.setPlatformFee(commission);
                        feeResult.setStampDuty(tax);
                        feeResult.setSfcLevy(autoFeeResult.getSfcLevy());
                        feeResult.setExchangeTradingFee(autoFeeResult.getExchangeTradingFee());
                        feeResult.setSettlementFee(autoFeeResult.getSettlementFee());
                        feeResult.setFrcLevy(autoFeeResult.getFrcLevy());

                        // 重新计算总费用
                        BigDecimal totalFee = commission.add(tax)
                                .add(autoFeeResult.getSfcLevy())
                                .add(autoFeeResult.getExchangeTradingFee())
                                .add(autoFeeResult.getSettlementFee())
                                .add(autoFeeResult.getFrcLevy());
                        feeResult.setTotalFee(totalFee);
                        feeResult.setNetAmount(totalAmount.subtract(totalFee));
                        log.info("使用部分手动费用 - commission: {}, tax: {}, totalFee: {}", commission, tax, totalFee);
                    } else {
                        // 自动计算手续费
                        feeResult = HkStockFeeCalculator.calculateSellFee(totalAmount);
                        log.info("自动计算卖出手续费: {}", HkStockFeeCalculator.formatFeeInfo(feeResult));
                    }
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
        } finally {
            if (locked) {
                redissonLock.unlock(key);
            }
        }
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
                .isSettled(false)  // 标记为未结算，支持T+0交易
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
     * 买入时更新用户资产（新逻辑：自动从可用现金补充购买力）
     */
    private void updateAssetForBuy(String userId, BigDecimal requiredCash, BigDecimal totalAmount, BigDecimal totalFee) {
        UserAssetSummary assetSummary = getUserAssetSummary(userId);

        BigDecimal currentPurchasingPower = assetSummary.getPurchasingPower();
        BigDecimal currentAvailableCash = assetSummary.getAvailableCash();

        // 1. 如果购买力不足，从可用现金自动补充到购买力
        BigDecimal transferAmount = BigDecimal.ZERO;
        BigDecimal newPurchasingPower = currentPurchasingPower;
        BigDecimal newAvailableCash = currentAvailableCash;

        if (currentPurchasingPower.compareTo(requiredCash) < 0) {
            // 购买力不足，计算需要补充的金额
            transferAmount = requiredCash.subtract(currentPurchasingPower);

            // 从可用现金转账到购买力（只能补充到刚好够买）
            if (transferAmount.compareTo(currentAvailableCash) > 0) {
                throw new RuntimeException("可用现金不足以补充购买力。需要补充: " + transferAmount + "，可用现金: " + currentAvailableCash);
            }

            newPurchasingPower = currentPurchasingPower.add(transferAmount);
            newAvailableCash = currentAvailableCash.subtract(transferAmount);

            log.info("买入时从可用现金补充购买力, userId={}, transferAmount={}, newPurchasingPower={}, newAvailableCash={}",
                    userId, transferAmount, newPurchasingPower, newAvailableCash);
        }

        // 2. 从购买力扣除买入金额（买入优先扣取购买力）
        newPurchasingPower = newPurchasingPower.subtract(requiredCash);

        // 3. 更新资产摘要
        assetSummary.setAvailableCash(newAvailableCash);
        assetSummary.setPurchasingPower(newPurchasingPower);

        // 4. 增加持仓市值（用交易金额作为市值增量，不含手续费）
        BigDecimal newPositionValue = assetSummary.getPositionValue().add(totalAmount);
        assetSummary.setPositionValue(newPositionValue);

        // 5. 重新计算总资产 = 可用现金 + 持仓市值
        BigDecimal newTotalAssets = newAvailableCash.add(newPositionValue);
        assetSummary.setTotalAssets(newTotalAssets);

        // 6. 增加买入次数
        assetSummary.setTotalBuyCount(assetSummary.getTotalBuyCount() + 1);

        userAssetSummaryService.updateById(assetSummary);
        log.info("买入更新用户资产成功, userId={}, requiredCash={}, totalAmount={}, totalFee={}, transferAmount={}, newAvailableCash={}, newPurchasingPower={}, newPositionValue={}",
                userId, requiredCash, totalAmount, totalFee, transferAmount, newAvailableCash, newPurchasingPower, newPositionValue);
    }

    /**
     * 卖出时更新用户资产
     */
    private void updateAssetForSell(String userId, BigDecimal totalAmount, BigDecimal netAmount, BigDecimal totalFee,
                                    String stockCode, BigDecimal sellQuantity, BigDecimal avgCost) {
        UserAssetSummary assetSummary = getUserAssetSummary(userId);

        // ⚠️ 卖出时 availableCash 不变（需要T+2结算才能提现）
        // 资金暂时在"结算中"状态，待结算时转入 availableCash

        // 增加购买力（卖出后资金立即可用于T+0交易）
        BigDecimal newPurchasingPower = assetSummary.getPurchasingPower().add(netAmount);
        assetSummary.setPurchasingPower(newPurchasingPower);

        // 计算盈亏（使用交易金额计算成本）
        BigDecimal cost = sellQuantity.multiply(avgCost);
        BigDecimal profit = totalAmount.subtract(cost);

        // 更新累计盈亏
        BigDecimal newCumulativeProfitLoss = assetSummary.getCumulativeProfitLoss().add(profit);
        assetSummary.setCumulativeProfitLoss(newCumulativeProfitLoss);

        // 减少持仓市值（用成本价计算）
        BigDecimal newPositionValue = assetSummary.getPositionValue().subtract(cost);
        assetSummary.setPositionValue(newPositionValue);

        // 重新计算总资产（注意：这里不包含未结算的卖出资金）
        BigDecimal newTotalAssets = assetSummary.getAvailableCash().add(newPositionValue).subtract(cost);
        assetSummary.setTotalAssets(newTotalAssets);

        // 增加卖出次数
        assetSummary.setTotalSellCount(assetSummary.getTotalSellCount() + 1);

        userAssetSummaryService.updateById(assetSummary);
        log.info("卖出更新用户资产成功, userId={}, totalAmount={}, totalFee={}, netAmount={}, profit={}, newCumulativeProfitLoss={}, newPurchasingPower={}, availableCash不变={}",
                userId, totalAmount, totalFee, netAmount, profit, newCumulativeProfitLoss, newPurchasingPower, assetSummary.getAvailableCash());
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
            assetSummary.setPurchasingPower(BigDecimal.ZERO);  // 初始购买力为0
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

        // 兼容旧数据：如果purchasingPower为null，则初始化为availableCash
        if (assetSummary.getPurchasingPower() == null) {
            assetSummary.setPurchasingPower(assetSummary.getAvailableCash());
            userAssetSummaryService.updateById(assetSummary);
            log.info("初始化用户购买力, userId={}, purchasingPower={}", userId, assetSummary.getAvailableCash());
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

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int settleTransactions(String userId, Date date) {
        log.info("开始结算用户交易, userId={}, date={}", userId, date);
        DateTime offset = DateUtil.offset(date, DateField.DAY_OF_YEAR, -1);
        DateTime dateTime = DateUtil.beginOfDay(offset);
        // 查询所有未结算的交易
        LambdaQueryWrapper<StockTransactionLog> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(StockTransactionLog::getUserId, userId)
                .le(StockTransactionLog::getExecutionDate, dateTime)
                .eq(StockTransactionLog::getIsSettled, false);
        List<StockTransactionLog> unsettledTransactions = list(queryWrapper);

        if (unsettledTransactions.isEmpty()) {
            log.info("没有需要结算的交易, userId={}", userId);
            return 0;
        }

        // 计算卖出交易的净收入（卖出金额 - 手续费）
        BigDecimal settlementAmount = unsettledTransactions.stream()
                .filter(tx -> "SELL".equals(tx.getInstruction()))
                .map(tx -> {
                    // 卖出净收入 = 交易金额 - 总费用
                    return tx.getTotalAmount().subtract(tx.getFeeTotal());
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 批量更新为已结算
        unsettledTransactions.forEach(tx -> tx.setIsSettled(true));
        updateBatchById(unsettledTransactions);

        // 更新用户资产
        UserAssetSummary assetSummary = getUserAssetSummary(userId);
        BigDecimal currentPurchasingPower = assetSummary.getPurchasingPower();
        BigDecimal currentAvailableCash = assetSummary.getAvailableCash();

        // T+2结算：将购买力转入可用现金
        // 卖出时：purchasingPower 增加（资金立即可用于T+0交易）
        // 结算时：purchasingPower 减少，availableCash 增加（资金可以提现）

        BigDecimal actualTransfer;
        BigDecimal newPurchasingPower;
        BigDecimal newAvailableCash;

        if (currentPurchasingPower.compareTo(settlementAmount) >= 0) {
            // 场景1：购买力充足，全额转入可用现金
            actualTransfer = settlementAmount;
            newPurchasingPower = currentPurchasingPower.subtract(settlementAmount);
            newAvailableCash = currentAvailableCash.add(settlementAmount);

            log.info("结算：购买力充足，全额转入可用现金, userId={}, settlementAmount={}, newPurchasingPower={}, newAvailableCash={}",
                    userId, settlementAmount, newPurchasingPower, newAvailableCash);
        } else {
            // 场景2：购买力不足，说明部分/全部卖出资金已经重新买入
            // 将剩余购买力全部转入可用现金
            actualTransfer = currentPurchasingPower;
            newPurchasingPower = BigDecimal.ZERO;
            newAvailableCash = currentAvailableCash.add(currentPurchasingPower);

            log.warn("结算：购买力不足，说明已重新投入市场, userId={}, settlementAmount={}, currentPurchasingPower={}, actualTransfer={}, newAvailableCash={}",
                    userId, settlementAmount, currentPurchasingPower, actualTransfer, newAvailableCash);
        }

        // 更新资产
        assetSummary.setPurchasingPower(newPurchasingPower);
        assetSummary.setAvailableCash(newAvailableCash);

        // 重新计算总资产
        BigDecimal newTotalAssets = newAvailableCash.add(assetSummary.getPositionValue());
        assetSummary.setTotalAssets(newTotalAssets);

        userAssetSummaryService.updateById(assetSummary);

        log.info("结算交易完成, userId={}, settledCount={}, settlementAmount={}, actualTransfer={}, newAvailableCash={}, newPurchasingPower={}",
                userId, unsettledTransactions.size(), settlementAmount, actualTransfer, newAvailableCash, newPurchasingPower);
        return unsettledTransactions.size();
    }

    @Override
    public TradeStatisticsVo getTradeStatistics(String userId) {
        DateTime offset = DateUtil.offset(new Date(), DateField.MONTH, -1);
        log.info("查询近一个月交易统计数据, userId={}, startDate={}", userId, offset);
        TradeStatisticsVo statistics = baseMapper.selectTradeStatistics(userId, offset);
        return statistics;
    }
}
