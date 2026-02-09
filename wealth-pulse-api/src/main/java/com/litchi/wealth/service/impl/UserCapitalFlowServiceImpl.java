package com.litchi.wealth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.litchi.wealth.dto.capital.CapitalOperationRequest;
import com.litchi.wealth.entity.UserAssetSummary;
import com.litchi.wealth.entity.UserCapitalFlow;
import com.litchi.wealth.mapper.UserCapitalFlowMapper;
import com.litchi.wealth.qo.TradePageQo;
import com.litchi.wealth.service.UserAssetSummaryService;
import com.litchi.wealth.service.UserCapitalFlowService;
import com.litchi.wealth.utils.RedissonLock;
import com.litchi.wealth.vo.CapitalFlowVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.util.Currency;
import java.util.Date;

import static com.litchi.wealth.constant.Constants.USER_ASSET_JOB_LOCK_KEY;

/**
 * @author Embrace
 * @description 用户本金操作流水表 服务实现类
 * @git: https://github.com/embarce
 * @date 2026-02-06
 */
@Slf4j
@Service
public class UserCapitalFlowServiceImpl extends ServiceImpl<UserCapitalFlowMapper, UserCapitalFlow> implements UserCapitalFlowService {

    @Autowired
    private UserAssetSummaryService userAssetSummaryService;

    @Autowired
    private RedissonLock redissonLock;

    @Override
    public IPage<CapitalFlowVo> getCapitalFlowPage(String userId, TradePageQo query) {
        // 创建分页对象
        Page<CapitalFlowVo> page = new Page<>(
                query.getPageNum() != null ? query.getPageNum() : 1,
                query.getPageSize() != null ? query.getPageSize() : 10
        );

        // 调用 Mapper 查询
        return baseMapper.selectCapitalFlowPage(page, userId, query);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deposit(String userId, CapitalOperationRequest request) {
        log.info("用户入金, userId={}, amount={}", userId, request.getAmount());

        String key = USER_ASSET_JOB_LOCK_KEY.formatted(userId);
        boolean locked = false;
        try {
            locked = redissonLock.tryLock(key);
            if (locked) {
                // 1. 创建本金流水记录
                UserCapitalFlow flow = buildCapitalFlow(userId, request, "DEPOSIT", "资金注入");
                save(flow);

                // 2. 更新用户资产总览
                updateUserAssetForDeposit(userId, request.getAmount());
            }
        } finally {
            if (locked) {
                redissonLock.unlock(key);
            }
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void withdraw(String userId, CapitalOperationRequest request) {
        log.info("用户提取本金, userId={}, amount={}", userId, request.getAmount());

        String key = USER_ASSET_JOB_LOCK_KEY.formatted(userId);
        boolean locked = false;
        try {
            locked = redissonLock.tryLock(key);
            if (locked) {
                // 1. 检查可用现金是否足够
                UserAssetSummary assetSummary = getUserAssetSummary(userId);
                if (assetSummary.getAvailableCash().compareTo(request.getAmount()) < 0) {
                    throw new RuntimeException("可用现金不足，无法提取。需要: " + request.getAmount() + "，可用: " + assetSummary.getAvailableCash());
                }

                // 2. 创建本金流水记录
                UserCapitalFlow flow = buildCapitalFlow(userId, request, "WITHDRAW", "本金提取");
                save(flow);

                // 3. 更新用户资产总览
                updateUserAssetForWithdraw(userId, request.getAmount());
            }
        } finally {
            if (locked) {
                redissonLock.unlock(key);
            }
        }

    }

    /**
     * 构建本金流水记录
     */
    private UserCapitalFlow buildCapitalFlow(String userId, CapitalOperationRequest request,
                                             String operationType, String operationLabel) {
        // 格式化金额显示
        String currency = request.getCurrency() != null ? request.getCurrency() : "USD";
        DecimalFormat decimalFormat = new DecimalFormat("#,##0.00");
        String amountDisplay = (operationType.equals("DEPOSIT") ? "+" : "-") +
                currencySymbol(currency) +
                decimalFormat.format(request.getAmount());
        Date date = new Date();

        return UserCapitalFlow.builder()
                .userId(userId)
                .operationType(operationType)
                .operationLabel(operationLabel)
                .amount(operationType.equals("DEPOSIT") ? request.getAmount() : request.getAmount().negate())
                .amountDisplay(amountDisplay)
                .currency(currency)
                .operatorId(userId) // 操作人就是当前用户
                .operationDate(date)
                .operationTime(date)
                .build();
    }

    /**
     * 入金时更新用户资产
     */
    private void updateUserAssetForDeposit(String userId, BigDecimal amount) {
        UserAssetSummary assetSummary = getUserAssetSummary(userId);

        // 增加总本金
        BigDecimal newTotalPrincipal = assetSummary.getTotalPrincipal().add(amount);
        assetSummary.setTotalPrincipal(newTotalPrincipal);

        // 增加可用现金
        BigDecimal newAvailableCash = assetSummary.getAvailableCash().add(amount);
        assetSummary.setAvailableCash(newAvailableCash);

        // 增加购买力（存入的本金立即可用于交易）
        if (assetSummary.getPurchasingPower() == null) {
            assetSummary.setPurchasingPower(newAvailableCash);
        } else {
            BigDecimal newPurchasingPower = assetSummary.getPurchasingPower().add(amount);
            assetSummary.setPurchasingPower(newPurchasingPower);
        }

        // 增加总资产
        BigDecimal newTotalAssets = assetSummary.getTotalAssets().add(amount);
        assetSummary.setTotalAssets(newTotalAssets);

        // 增加累计流水
        BigDecimal newTotalCashflow = assetSummary.getTotalCashflow().add(amount);
        assetSummary.setTotalCashflow(newTotalCashflow);

        userAssetSummaryService.updateById(assetSummary);
        log.info("入金更新用户资产成功, userId={}, newTotalPrincipal={}, newAvailableCash={}, newPurchasingPower={}",
                userId, newTotalPrincipal, newAvailableCash, assetSummary.getPurchasingPower());
    }

    /**
     * 提取时更新用户资产
     */
    private void updateUserAssetForWithdraw(String userId, BigDecimal amount) {
        UserAssetSummary assetSummary = getUserAssetSummary(userId);

        // 减少总本金
        BigDecimal newTotalPrincipal = assetSummary.getTotalPrincipal().subtract(amount);
        assetSummary.setTotalPrincipal(newTotalPrincipal);

        // 减少可用现金
        BigDecimal newAvailableCash = assetSummary.getAvailableCash().subtract(amount);
        assetSummary.setAvailableCash(newAvailableCash);

        // 减少购买力（提取的本金不能再用于交易）
        if (assetSummary.getPurchasingPower() != null) {
            BigDecimal newPurchasingPower = assetSummary.getPurchasingPower().subtract(amount);
            // 确保购买力不为负数
            assetSummary.setPurchasingPower(newPurchasingPower.compareTo(BigDecimal.ZERO) >= 0 ? newPurchasingPower : BigDecimal.ZERO);
        }

        // 减少总资产
        BigDecimal newTotalAssets = assetSummary.getTotalAssets().subtract(amount);
        assetSummary.setTotalAssets(newTotalAssets);

        // 减少累计流水
        BigDecimal newTotalCashflow = assetSummary.getTotalCashflow().subtract(amount);
        assetSummary.setTotalCashflow(newTotalCashflow);

        userAssetSummaryService.updateById(assetSummary);
        log.info("提取本金更新用户资产成功, userId={}, newTotalPrincipal={}, newAvailableCash={}, newPurchasingPower={}",
                userId, newTotalPrincipal, newAvailableCash, assetSummary.getPurchasingPower());
    }

    /**
     * 获取用户资产总览，如果不存在则创建
     */
    private UserAssetSummary getUserAssetSummary(String userId) {
        LambdaQueryWrapper<UserAssetSummary> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(UserAssetSummary::getUserId, userId);
        UserAssetSummary assetSummary = userAssetSummaryService.getOne(queryWrapper);

        if (assetSummary == null) {
            // 如果不存在，创建新的记录
            assetSummary = new UserAssetSummary();
            assetSummary.setUserId(userId);
            assetSummary.setTotalAssets(BigDecimal.ZERO);
            assetSummary.setCumulativeProfitLoss(BigDecimal.ZERO);
            assetSummary.setAvailableCash(BigDecimal.ZERO);
            assetSummary.setPurchasingPower(BigDecimal.ZERO);
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
     * 获取货币符号
     */
    private String currencySymbol(String currencyCode) {
        try {
            java.util.Currency currency = Currency.getInstance(currencyCode);
            return currency.getSymbol();
        } catch (Exception e) {
            // 如果无法获取符号，默认返回代码本身
            return currencyCode + " ";
        }
    }
}
